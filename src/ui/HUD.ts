import { WATER_STATE_CONFIG, WaterState, PhaseTransitionInfo } from '../game/WaterStateMachine';

export class HUDController {
  private levelTitleEl = document.getElementById('hud-level-title')!;
  private missionTextEl = document.getElementById('hud-mission-text')!;
  private stateCardEl = document.getElementById('hud-state-card')!;
  private stateIconEl = document.getElementById('hud-state-icon')!;
  private stateNameEl = document.getElementById('hud-state-name')!;
  private stateSciEl = document.getElementById('hud-state-sci')!;
  private starsEl = document.getElementById('hud-stars')!;
  private tempValEl = document.getElementById('hud-temp-val')!;
  private tempMarkerEl = document.getElementById('hud-temp-marker')!;

  private interactPromptEl = document.getElementById('interact-prompt')!;
  private interactTextEl = document.getElementById('interact-text')!;

  private fairyBoxEl = document.getElementById('fairy-dialogue')!;
  private fairyTagEl = document.getElementById('fairy-tag')!;
  private fairyTextEl = document.getElementById('fairy-text')!;

  private phaseBannerEl = document.getElementById('phase-banner')!;
  private phaseTitleEl = document.getElementById('phase-banner-title')!;
  private phaseDescEl = document.getElementById('phase-banner-desc')!;

  private microscopeModal = document.getElementById('microscope-modal')!;
  private animFrameId = 0;

  constructor(onSkipPhaseAnim: () => void) {
    document.getElementById('fairy-close')?.addEventListener('click', () => {
      this.fairyBoxEl.classList.add('hidden');
    });

    document.getElementById('phase-skip-btn')?.addEventListener('click', () => {
      onSkipPhaseAnim();
      this.phaseBannerEl.classList.add('hidden');
    });

    document.getElementById('microscope-close')?.addEventListener('click', () => {
      this.toggleMicroscope(false);
    });

    this.startMicroscopeCanvasLoop();
  }

  public setLevelHeader(title: string, mission: string): void {
    this.levelTitleEl.textContent = title;
    this.missionTextEl.textContent = mission;
  }

  public updateMission(mission: string): void {
    this.missionTextEl.textContent = mission;
  }

  public updateStateUI(state: WaterState): void {
    const cfg = WATER_STATE_CONFIG[state];
    this.stateIconEl.textContent = cfg.icon;
    this.stateNameEl.textContent = cfg.name;
    this.stateSciEl.textContent = cfg.scienceReminder;

    this.stateCardEl.className = `state-card state-${state.toLowerCase()}`;
    this.tempValEl.textContent = cfg.tempLabel;
    this.tempMarkerEl.style.left = `${cfg.thermoPercent}%`;

    // 同步高亮粒子觀察鏡目前狀態
    document.getElementById('micro-col-solid')?.classList.toggle('active-state', state === 'SOLID');
    document
      .getElementById('micro-col-liquid')
      ?.classList.toggle('active-state', state === 'LIQUID');
    document.getElementById('micro-col-gas')?.classList.toggle('active-state', state === 'GAS');
  }

  public updateStars(collected: number, total: number): void {
    this.starsEl.textContent = `${collected} / ${total}`;
  }

  public showInteractPrompt(text: string | null): void {
    if (!text) {
      this.interactPromptEl.classList.add('hidden');
    } else {
      this.interactTextEl.textContent = text;
      this.interactPromptEl.classList.remove('hidden');
    }
  }

  public showFairyMessage(text: string, tag = '科學提示'): void {
    this.fairyTagEl.textContent = tag;
    this.fairyTextEl.textContent = text;
    this.fairyBoxEl.classList.remove('hidden');
  }

  public showPhaseBanner(info: PhaseTransitionInfo): void {
    this.phaseTitleEl.textContent = info.bannerTitle;
    this.phaseDescEl.textContent = info.bannerDesc;
    this.phaseBannerEl.classList.remove('hidden');
  }

  public hidePhaseBanner(): void {
    this.phaseBannerEl.classList.add('hidden');
  }

  public toggleMicroscope(force?: boolean): boolean {
    const isNowActive =
      force !== undefined ? force : !this.microscopeModal.classList.contains('active');
    this.microscopeModal.classList.toggle('active', isNowActive);
    return isNowActive;
  }

  /**
   * 繪製三態粒子示意動畫（規格書 2.2 & 2.3：概念觀察，標明「示意」）
   */
  private startMicroscopeCanvasLoop(): void {
    const cSolid = document.getElementById('canvas-particle-solid') as HTMLCanvasElement | null;
    const cLiquid = document.getElementById('canvas-particle-liquid') as HTMLCanvasElement | null;
    const cGas = document.getElementById('canvas-particle-gas') as HTMLCanvasElement | null;
    if (!cSolid || !cLiquid || !cGas) return;

    const ctxS = cSolid.getContext('2d')!;
    const ctxL = cLiquid.getContext('2d')!;
    const ctxG = cGas.getContext('2d')!;

    // 液態與氣態粒子位置狀態
    const liquidPts = Array.from({ length: 18 }, (_, i) => ({
      x: 35 + (i % 6) * 26 + Math.random() * 6,
      y: 78 + Math.floor(i / 6) * 22,
      vx: (Math.random() - 0.5) * 0.9,
      vy: (Math.random() - 0.5) * 0.5,
    }));

    const gasPts = Array.from({ length: 8 }, () => ({
      x: 20 + Math.random() * 160,
      y: 20 + Math.random() * 100,
      vx: (Math.random() - 0.5) * 3.2,
      vy: (Math.random() - 0.5) * 3.2,
    }));

    let t = 0;
    const render = () => {
      t += 0.08;
      if (this.microscopeModal.classList.contains('active')) {
        // 1. 固態：整齊晶格原位微幅振動
        ctxS.clearRect(0, 0, 200, 140);
        ctxS.fillStyle = '#80d8ff';
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 5; c++) {
            const bx = 44 + c * 28 + Math.sin(t * 3 + r + c) * 1.6;
            const by = 42 + r * 28 + Math.cos(t * 3 + r * 2) * 1.6;
            ctxS.beginPath();
            ctxS.arc(bx, by, 8, 0, Math.PI * 2);
            ctxS.fill();
          }
        }

        // 2. 液態：底部聚集、彼此滑動換位
        ctxL.clearRect(0, 0, 200, 140);
        ctxL.fillStyle = '#29b6f6';
        liquidPts.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 24 || p.x > 176) p.vx *= -1;
          if (p.y < 68 || p.y > 124) p.vy *= -1;
          ctxL.beginPath();
          ctxL.arc(p.x, p.y, 8, 0, Math.PI * 2);
          ctxL.fill();
        });

        // 3. 氣態：距離遠、快速充滿整個空間
        ctxG.clearRect(0, 0, 200, 140);
        ctxG.fillStyle = '#b3e5fc';
        gasPts.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 14 || p.x > 186) p.vx *= -1;
          if (p.y < 14 || p.y > 126) p.vy *= -1;
          ctxG.beginPath();
          ctxG.arc(p.x, p.y, 7, 0, Math.PI * 2);
          ctxG.fill();
        });
      }
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }
}
