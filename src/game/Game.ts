import * as THREE from 'three';
import { CameraController } from './CameraController';
import { WaterCharacter } from './WaterCharacter';
import {
  WATER_STATE_CONFIG,
  WaterState,
  getTransitionInfo,
} from './WaterStateMachine';
import { BuiltLevel, createLevelByIndex } from './LevelBuilder';
import { InteractStation } from './Interactables';
import { HUDController } from '../ui/HUD';
import { SoundManager } from './SoundManager';

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraCtrl: CameraController;
  private character: WaterCharacter;
  private hud: HUDController;
  private sound = new SoundManager();

  private currentLevel!: BuiltLevel;
  private currentLevelIndex = 0;

  // 玩家物理與運動狀態（將外觀 visualRoot 與物理座標分離）
  private playerPos = new THREE.Vector3();
  private playerVel = new THREE.Vector3();
  private lastSafeCheckpoint = new THREE.Vector3();
  private isGrounded = false;
  private highQuality = true;
  private isPaused = true; // 初始在標題畫面

  // 追蹤本關經歷過的相變與失敗次數（用於主動提示與驗證過關條件）
  private experiencedStates = new Set<WaterState>();
  private failCount = 0;
  private hintCursor = 0;
  private bannerHideTimer: number | null = null;

  // 鍵盤狀態
  private keys: Record<string, boolean> = {};
  private nearestStation: InteractStation | null = null;

  private clock = new THREE.Clock();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f2c4c);
    this.scene.fog = new THREE.FogExp2(0x0f2c4c, 0.016);

    this.cameraCtrl = new CameraController(window.innerWidth / window.innerHeight);
    this.setupLights();

    this.character = new WaterCharacter(this.highQuality);
    this.scene.add(this.character.root);

    this.hud = new HUDController(() => {
      this.character.skipTransitionAnimation();
    });

    this.loadLevel(0);
    this.bindEvents();
    this.animate();
  }

  private setupLights(): void {
    const hemiLight = new THREE.HemisphereLight(0xdff6ff, 0x102a45, 1.15);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
    dirLight.position.set(12, 22, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 65;
    const d = 24;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);
  }

  public loadLevel(index: number): void {
    if (this.currentLevel) {
      this.scene.remove(this.currentLevel.root);
    }

    this.currentLevelIndex = index;
    this.currentLevel = createLevelByIndex(index);
    this.scene.add(this.currentLevel.root);

    // 依據關卡調整天空背景色調
    if (index === 0) {
      this.scene.background = new THREE.Color(0x10345c);
      this.scene.fog = new THREE.FogExp2(0x10345c, 0.015);
    } else if (index === 1) {
      this.scene.background = new THREE.Color(0x0d3b3e);
      this.scene.fog = new THREE.FogExp2(0x0d3b3e, 0.015);
    } else {
      this.scene.background = new THREE.Color(0x1b4d7e);
      this.scene.fog = new THREE.FogExp2(0x1b4d7e, 0.012);
    }

    const def = this.currentLevel.def;
    this.playerPos.copy(def.spawnPoint);
    this.lastSafeCheckpoint.copy(def.spawnPoint);
    this.playerVel.set(0, 0, 0);

    this.character.currentState = def.initialState;
    this.character.triggerPhaseChange(def.initialState);
    this.character.skipTransitionAnimation();
    this.character.root.position.copy(this.playerPos);

    this.experiencedStates.clear();
    this.experiencedStates.add(def.initialState);
    this.failCount = 0;
    this.hintCursor = 0;

    this.cameraCtrl.snapTo(this.playerPos);

    this.hud.setLevelHeader(def.title, def.initialMission);
    this.hud.updateStateUI(def.initialState);
    this.hud.updateStars(0, this.currentLevel.stars.length);
    this.hud.hidePhaseBanner();
    this.hud.showFairyMessage(
      `歡迎來到【${def.title}】！用方向鍵或 WASD 移動「滴滴」，空白鍵跳躍，靠近設備按 E 互動喔！`,
      '出發引導'
    );
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.cameraCtrl.resize(window.innerWidth / window.innerHeight);
    });

    window.addEventListener('keydown', (e) => {
      const code = e.code;
      this.keys[code] = true;

      if (code === 'Escape') {
        this.togglePauseModal();
        return;
      }

      if (code === 'KeyM') {
        this.hud.toggleMicroscope();
        return;
      }

      if (code === 'KeyH') {
        this.triggerNextHint();
        return;
      }

      if (this.isPaused) return;

      if (code === 'Space') {
        e.preventDefault();
        this.tryJump();
      } else if (code === 'KeyE') {
        this.tryInteract();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // 標題畫面選關按鈕
    document.querySelectorAll('.level-select-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lvl = Number((btn as HTMLElement).dataset.level || '0');
        document.getElementById('title-modal')?.classList.remove('active');
        this.loadLevel(lvl);
        this.isPaused = false;
      });
    });

    // 頂部 HUD 按鈕
    document.getElementById('btn-microscope')?.addEventListener('click', () => {
      this.hud.toggleMicroscope();
    });

    document.getElementById('btn-hint')?.addEventListener('click', () => {
      this.triggerNextHint();
    });

    document.getElementById('btn-quality')?.addEventListener('click', (e) => {
      this.highQuality = !this.highQuality;
      this.renderer.shadowMap.enabled = this.highQuality;
      this.character.rebuildQuality(this.highQuality);
      (e.currentTarget as HTMLElement).textContent = this.highQuality
        ? '⚡ 高畫質'
        : '💻 教室流暢';
      this.hud.showFairyMessage(
        this.highQuality
          ? '已切換為【高畫質晶瑩折射材質】模式！'
          : '已切換為【教室電腦流暢降級模式】，關閉陰影與高階折射以確保穩定 60 FPS！',
        '畫質設定'
      );
    });

    document.getElementById('btn-sound')?.addEventListener('click', (e) => {
      const on = this.sound.toggle();
      (e.currentTarget as HTMLElement).textContent = on ? '🔊 音效' : '🔇 靜音';
    });

    document.getElementById('btn-pause')?.addEventListener('click', () => {
      this.togglePauseModal(true);
    });

    // 暫停選單按鈕
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.togglePauseModal(false);
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this.togglePauseModal(false);
      this.loadLevel(this.currentLevelIndex);
    });

    document.getElementById('btn-to-title')?.addEventListener('click', () => {
      this.togglePauseModal(false);
      this.isPaused = true;
      document.getElementById('title-modal')?.classList.add('active');
    });

    // 過關結算選單按鈕
    document.getElementById('btn-next-level')?.addEventListener('click', () => {
      document.getElementById('victory-modal')?.classList.remove('active');
      const next = (this.currentLevelIndex + 1) % 3;
      this.loadLevel(next);
      this.isPaused = false;
    });

    document.getElementById('btn-replay-level')?.addEventListener('click', () => {
      document.getElementById('victory-modal')?.classList.remove('active');
      this.loadLevel(this.currentLevelIndex);
      this.isPaused = false;
    });

    document.getElementById('btn-victory-home')?.addEventListener('click', () => {
      document.getElementById('victory-modal')?.classList.remove('active');
      this.isPaused = true;
      document.getElementById('title-modal')?.classList.add('active');
    });
  }

  private togglePauseModal(force?: boolean): void {
    const modal = document.getElementById('pause-modal')!;
    const active = force !== undefined ? force : !modal.classList.contains('active');
    modal.classList.toggle('active', active);
    this.isPaused = active;
  }

  private triggerNextHint(): void {
    const hints = this.currentLevel.def.hints;
    const msg = hints[this.hintCursor % hints.length];
    this.hintCursor++;
    this.hud.showFairyMessage(msg, `引導提示 (${((this.hintCursor - 1) % hints.length) + 1}/${hints.length})`);
  }

  private tryJump(): void {
    if (!this.isGrounded) return;
    const cfg = WATER_STATE_CONFIG[this.character.currentState];
    this.playerVel.y = cfg.jumpForce;
    this.isGrounded = false;
    this.sound.playJump(this.character.currentState);
  }

  private tryInteract(): void {
    if (!this.nearestStation) return;
    const st = this.nearestStation;
    const cur = this.character.currentState;

    if (st.type === 'COOLER') {
      if (cur === 'SOLID') {
        this.hud.showFairyMessage('滴滴現在已經是固態冰塊囉！快去踩中央的【重量開關】吧！', '狀態提醒');
        return;
      }
      this.performPhaseChange('SOLID');
    } else if (st.type === 'HEATER') {
      if (cur === 'LIQUID') {
        this.hud.showFairyMessage('滴滴現在已經是液態小水滴囉！可以直接穿過細縫水道！', '狀態提醒');
        return;
      }
      this.performPhaseChange('LIQUID');
    } else if (st.type === 'EVAPORATOR') {
      if (cur === 'GAS') {
        this.hud.showFairyMessage(
          '已經是氣態水蒸氣（示意）囉！快走進前方的【上升氣流柱】飛往雲端吧！',
          '狀態提醒'
        );
        return;
      }
      this.performPhaseChange('GAS');
    } else if (st.type === 'CONDENSER') {
      if (cur === 'LIQUID') {
        this.hud.showFairyMessage('已經凝結回液態小水滴囉！快前往終點完成水循環吧！', '狀態提醒');
        return;
      }
      this.performPhaseChange('LIQUID');
    }
  }

  private performPhaseChange(toState: WaterState): void {
    const fromState = this.character.currentState;
    const info = getTransitionInfo(fromState, toState);

    this.character.triggerPhaseChange(toState);
    this.experiencedStates.add(toState);
    this.sound.playPhaseChange(toState);

    this.hud.updateStateUI(toState);
    this.hud.showPhaseBanner(info);
    this.hud.showFairyMessage(info.bannerDesc, `科學現象：${info.processName}`);

    if (this.bannerHideTimer) {
      window.clearTimeout(this.bannerHideTimer);
    }
    this.bannerHideTimer = window.setTimeout(() => {
      this.hud.hidePhaseBanner();
    }, 6500);
  }

  private updatePhysicsAndInteractions(dt: number): void {
    const state = this.character.currentState;
    const cfg = WATER_STATE_CONFIG[state];

    // 1. 讀取鍵盤輸入方向
    let moveX = 0;
    let moveZ = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    const inputDir = new THREE.Vector3(moveX, 0, moveZ);
    if (inputDir.lengthSq() > 0) {
      inputDir.normalize();
      // 平滑轉向角色面向
      const targetAngle = Math.atan2(inputDir.x, inputDir.z);
      const curAngle = this.character.visualRoot.rotation.y;
      let diff = targetAngle - curAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.character.visualRoot.rotation.y += diff * Math.min(1, dt * 12);
    }

    // 水平移動速度與冰面慣性
    const targetVx = inputDir.x * cfg.moveSpeed;
    const targetVz = inputDir.z * cfg.moveSpeed;
    const accel = state === 'SOLID' ? 5.5 : 11.5;
    this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, targetVx, Math.min(1, dt * accel));
    this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, targetVz, Math.min(1, dt * accel));

    // 2. 檢查是否在上升氣流區（第三關氣態能力）
    let inUpdraft = false;
    for (const up of this.currentLevel.updrafts) {
      if (up.box.containsPoint(this.playerPos)) {
        if (cfg.canFloatInUpdraft) {
          inUpdraft = true;
          this.playerVel.y = 5.2;
          this.isGrounded = false;
        } else {
          this.failCount++;
          if (this.failCount >= 2) {
            this.hud.showFairyMessage(
              '液態小水滴太重了，沒辦法被氣流吹上高空！試著先去左邊【☀️ 暖陽蒸發區】按 E 變成水蒸氣吧！',
              '科學小精靈提示'
            );
          }
        }
      }
    }

    // 重力
    if (!inUpdraft) {
      const gravity = state === 'GAS' ? -11.5 : -22.0;
      this.playerVel.y += gravity * dt;
    }

    // 3. 嘗試移動並檢查門欄碰撞
    const nextPos = this.playerPos.clone().addScaledVector(this.playerVel, dt);
    const playerRadius = 0.48;

    for (const gate of this.currentLevel.gates) {
      if (gate.isOpen) continue;
      // 若為液態專用窄縫且玩家目前可穿過（液態），直接放行！
      if (gate.liquidOnlyGrate && state === 'LIQUID') {
        continue;
      }

      const expandedBox = gate.box.clone().expandByScalar(playerRadius);
      if (expandedBox.containsPoint(nextPos)) {
        // 阻擋前進並顯示科學原因
        nextPos.x = this.playerPos.x;
        nextPos.z = this.playerPos.z;
        this.playerVel.x = 0;
        this.playerVel.z = 0;
        if (gate.blockReason) {
          this.failCount++;
          this.hud.showFairyMessage(gate.blockReason, '觀察與思考');
        }
      }
    }

    // 4. 平台地面碰撞檢測
    this.isGrounded = false;
    for (const plat of this.currentLevel.platforms) {
      const b = plat.box;
      if (
        nextPos.x >= b.min.x - 0.35 &&
        nextPos.x <= b.max.x + 0.35 &&
        nextPos.z >= b.min.z - 0.35 &&
        nextPos.z <= b.max.z + 0.35
      ) {
        const topY = b.max.y;
        if (this.playerPos.y >= topY - 0.25 && nextPos.y <= topY + 0.08 && this.playerVel.y <= 0) {
          nextPos.y = topY;
          this.playerVel.y = 0;
          this.isGrounded = true;
          this.lastSafeCheckpoint.set(nextPos.x, topY + 0.1, nextPos.z);
          break;
        }
      }
    }

    this.playerPos.copy(nextPos);

    // 掉出平台安全重試（規格書 4.3：回到最近安全檢查點，不扣分）
    if (this.playerPos.y < -6.5) {
      this.playerPos.copy(this.lastSafeCheckpoint);
      this.playerVel.set(0, 0, 0);
      this.failCount++;
      this.hud.showFairyMessage(
        '哎呀，不小心滑出平台了！別擔心，已經幫你回到安全位置，不扣分喔！' +
          (this.failCount >= 2 ? '（需要幫忙可按 H 鍵看提示）' : ''),
        '安全返回'
      );
    }

    this.character.root.position.copy(this.playerPos);

    // 5. 檢查靠近哪一個互動裝置 (冷卻機 / 暖氣區 / 蒸發區 / 凝結區)
    this.nearestStation = null;
    for (const st of this.currentLevel.stations) {
      const icon = st.mesh.getObjectByName('RotatingIcon');
      if (icon) icon.rotation.y += dt * 1.8;

      const dist = this.playerPos.distanceTo(st.position);
      if (dist <= st.radius) {
        this.nearestStation = st;
      }
    }
    this.hud.showInteractPrompt(this.nearestStation ? this.nearestStation.promptText : null);

    // 6. 檢查重量開關（規格書：只有固態冰塊能壓下啟動）
    for (const sw of this.currentLevel.switches) {
      const dist = this.playerPos.distanceTo(sw.position);
      if (dist <= sw.radius && !sw.isPressed) {
        if (cfg.canPressHeavySwitch) {
          sw.isPressed = true;
          this.sound.playSwitch();
          const plate = sw.mesh.getObjectByName('SwitchPlate');
          if (plate) plate.position.y = 0.09;

          // 打開對應大門
          const gate = this.currentLevel.gates.find((g) => g.id === sw.targetGateId);
          if (gate) {
            gate.isOpen = true;
            gate.mesh.visible = false;
          }
          this.hud.showFairyMessage(
            '🎉 太棒了！固態冰塊成功壓下重量開關，前方的連動大門打開囉！接著觀察看看怎麼通過下一道細縫水道吧！',
            '機關啟動'
          );
        } else {
          this.failCount++;
          this.hud.showFairyMessage(
            '💧 液態水沒有固定形狀、會流開，壓不下這個重量開關！找找看附近有沒有讓水變冷凝固的【❄️ 冷卻機】？',
            '觀察環境'
          );
        }
      }
    }

    // 7. 檢查收集星星
    let collectedCount = 0;
    for (const star of this.currentLevel.stars) {
      if (!star.collected) {
        star.mesh.rotation.y += dt * 2.4;
        if (this.playerPos.distanceTo(star.position) <= 1.25) {
          star.collected = true;
          star.mesh.visible = false;
          this.sound.playStar();
        }
      }
      if (star.collected) collectedCount++;
    }
    this.hud.updateStars(collectedCount, this.currentLevel.stars.length);

    // 8. 檢查是否抵達終點傳送門
    const portalRing = this.currentLevel.goalPortal.getObjectByName('PortalRing');
    if (portalRing) portalRing.rotation.z += dt * 1.5;

    const distToGoal = this.playerPos.distanceTo(this.currentLevel.def.goalPosition);
    if (distToGoal <= this.currentLevel.def.goalRadius) {
      // 第三關終點要求凝結回液態小水滴完成水循環
      if (this.currentLevelIndex === 2 && state !== 'LIQUID') {
        this.hud.showFairyMessage(
          '你現在還是氣態水蒸氣（示意）喔！請先去旁邊的【🌬️ 高空冷空氣區】按 E 遇冷凝結成液態小水滴，才能降落完成水循環！',
          '水循環最後一步'
        );
        return;
      }
      this.handleLevelVictory(collectedCount);
    }
  }

  private handleLevelVictory(starsCollected: number): void {
    this.isPaused = true;
    this.sound.playStar();

    const def = this.currentLevel.def;
    const modal = document.getElementById('victory-modal')!;
    const titleEl = document.getElementById('victory-title')!;
    const starsEl = document.getElementById('victory-stars')!;
    const listEl = document.getElementById('victory-learn-list')!;

    titleEl.textContent = `🎉 完成：${def.title}`;
    const starCount = Math.max(1, starsCollected);
    starsEl.textContent = '⭐'.repeat(starCount);

    listEl.innerHTML = def.victoryLearnPoints.map((pt) => `<li>${pt}</li>`).join('');
    modal.classList.add('active');
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (!this.isPaused) {
      this.updatePhysicsAndInteractions(dt);
      const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
      this.character.update(dt, horizSpeed, this.isGrounded);
      this.cameraCtrl.update(dt, this.playerPos);
    }

    this.renderer.render(this.scene, this.cameraCtrl.camera);
  };
}
