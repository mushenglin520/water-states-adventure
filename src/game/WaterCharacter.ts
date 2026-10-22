import * as THREE from 'three';
import { WaterState } from './WaterStateMachine';

/**
 * 建立同一組「兩隻圓形大眼睛、眼神高光、粉紅腮紅與開朗微笑嘴巴」的獨立不透明 3D 網格群組。
 * 置於半透明外殼前方，避免因透明排序造成閃爍或消失（規格書 3.3.1 & 3.3.2）。
 */
function createCuteFaceGroup(zOffset = 0.46): THREE.Group {
  const faceGroup = new THREE.Group();
  faceGroup.position.set(0, 0.08, zOffset);

  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0b1d3a });
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xff85a2,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0xd81b60 });

  // 左右大眼
  [-0.17, 0.17].forEach((x) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(x, 0.06, 0);

    // 眼白外圈
    const outerEye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 20), eyeWhiteMat);
    outerEye.scale.set(1, 1.15, 0.45);
    eyeGroup.add(outerEye);

    // 深藍黑瞳孔
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.072, 18, 18), pupilMat);
    pupil.scale.set(1, 1.12, 0.45);
    pupil.position.set(0, 0, 0.025);
    eyeGroup.add(pupil);

    // 主眼神高光（左上方大亮點）
    const catchlightBig = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 12), highlightMat);
    catchlightBig.position.set(-0.025, 0.032, 0.055);
    eyeGroup.add(catchlightBig);

    // 副眼神高光（右下方小亮點）
    const catchlightSmall = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 10), highlightMat);
    catchlightSmall.position.set(0.025, -0.022, 0.055);
    eyeGroup.add(catchlightSmall);

    faceGroup.add(eyeGroup);
  });

  // 粉紅腮紅
  [-0.26, 0.26].forEach((x) => {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 14), blushMat);
    blush.scale.set(1.3, 0.75, 0.3);
    blush.position.set(x, -0.05, -0.02);
    faceGroup.add(blush);
  });

  // 開朗微笑嘴巴（半圓弧立體嘴形）
  const smileArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.018, 12, 24, Math.PI),
    mouthMat
  );
  smileArc.rotation.z = Math.PI;
  smileArc.position.set(0, -0.06, 0.02);
  faceGroup.add(smileArc);

  return faceGroup;
}

/**
 * 產生上尖下圓的柔軟水滴 LatheGeometry
 */
function createTeardropGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI; // 0 (bottom) to PI (top)
    // 參數化水滴曲線：下方圓潤飽滿，上方收尖
    const y = -Math.cos(t) * 0.55; // -0.55 ~ +0.55
    const sinT = Math.sin(t);
    // 下半部較寬，上半部漸窄成水滴尖端
    const pinch = 1.0 - 0.36 * Math.pow((1 - Math.cos(t)) / 2, 1.4);
    const r = sinT * 0.48 * pinch;
    points.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  const geo = new THREE.LatheGeometry(points, 36);
  geo.computeVertexNormals();
  return geo;
}

/**
 * 1. 建立液態（小水滴）3D 視覺模型
 */
export function createLiquidVisual(highQuality = true): THREE.Group {
  const group = new THREE.Group();
  group.name = 'LiquidVisual';

  const bodyGeo = createTeardropGeometry();
  const bodyMat = highQuality
    ? new THREE.MeshPhysicalMaterial({
        color: 0x29b6f6,
        emissive: 0x0277bd,
        emissiveIntensity: 0.22,
        roughness: 0.12,
        metalness: 0.02,
        transmission: 0.55,
        thickness: 0.9,
        ior: 1.333, // 水的折射率
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        transparent: true,
        opacity: 0.9,
      })
    : new THREE.MeshPhongMaterial({
        color: 0x29b6f6,
        emissive: 0x0277bd,
        emissiveIntensity: 0.25,
        shininess: 110,
        specular: 0xffffff,
        transparent: true,
        opacity: 0.88,
      });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 0.56;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // 邊緣清新高光外框（確保在亮/暗背景輪廓都清楚）
  const rimGeo = bodyGeo.clone();
  const rimMat = new THREE.MeshBasicMaterial({
    color: 0xb3e5fc,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.35,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 0.56;
  rimMesh.scale.setScalar(1.05);
  group.add(rimMesh);

  // 水珠內部頂端高光亮斑
  const specularBubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xe1f5fe, transparent: true, opacity: 0.75 })
  );
  specularBubble.scale.set(1.4, 0.7, 0.4);
  specularBubble.position.set(-0.16, 0.85, 0.28);
  specularBubble.rotation.z = 0.5;
  group.add(specularBubble);

  // 可愛短圓小手與小腳掌（參考封面圖活潑動態）
  const limbMat = new THREE.MeshStandardMaterial({
    color: 0x039be5,
    roughness: 0.25,
    metalness: 0.05,
  });
  [-0.45, 0.45].forEach((x, idx) => {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 14), limbMat);
    hand.scale.set(1.1, 0.85, 0.85);
    hand.position.set(x, 0.5, 0.08);
    hand.name = idx === 0 ? 'LeftHand' : 'RightHand';
    group.add(hand);
  });

  [-0.19, 0.19].forEach((x, idx) => {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), limbMat);
    foot.scale.set(1.0, 0.65, 1.35);
    foot.position.set(x, 0.08, 0.06);
    foot.name = idx === 0 ? 'LeftFoot' : 'RightFoot';
    group.add(foot);
  });

  // 加上共通大眼睛與微笑
  const face = createCuteFaceGroup(0.45);
  face.position.y = 0.54;
  group.add(face);

  return group;
}

/**
 * 2. 建立固態（小冰滴／晶體冰塊）3D 視覺模型
 * 參考圖片右側：晶瑩切角冰晶立方體＋四周小雪花粒子＋同樣的可愛大眼與微笑
 */
export function createSolidVisual(highQuality = true): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SolidVisual';

  // 圓角切面立方體 + 八面體混合晶體感
  const boxGeo = new THREE.BoxGeometry(0.88, 0.88, 0.88, 2, 2, 2);
  // 對頂點做輕微晶體切角處理
  const pos = boxGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const len = v.length();
    if (len > 0.62) {
      v.normalize().multiplyScalar(0.62);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  boxGeo.computeVertexNormals();

  const iceMat = highQuality
    ? new THREE.MeshPhysicalMaterial({
        color: 0x80d8ff,
        emissive: 0x0091ea,
        emissiveIntensity: 0.25,
        roughness: 0.15,
        metalness: 0.08,
        transmission: 0.62,
        thickness: 1.2,
        ior: 1.31, // 冰的折射率
        clearcoat: 1.0,
        flatShading: true,
        transparent: true,
        opacity: 0.92,
      })
    : new THREE.MeshPhongMaterial({
        color: 0x80d8ff,
        emissive: 0x0288d1,
        emissiveIntensity: 0.3,
        shininess: 140,
        flatShading: true,
        transparent: true,
        opacity: 0.9,
      });

  const iceCube = new THREE.Mesh(boxGeo, iceMat);
  iceCube.position.y = 0.54;
  iceCube.rotation.y = Math.PI * 0.04;
  iceCube.castShadow = true;
  group.add(iceCube);

  // 冰晶稜線高光框（讓切面在任何背景都清楚立體）
  const edgesGeo = new THREE.EdgesGeometry(boxGeo, 18);
  const edgesMat = new THREE.LineBasicMaterial({
    color: 0xe0f7fa,
    transparent: true,
    opacity: 0.85,
  });
  const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
  wireframe.position.copy(iceCube.position);
  wireframe.rotation.copy(iceCube.rotation);
  wireframe.scale.setScalar(1.01);
  group.add(wireframe);

  // 頭頂小冰晶冠
  const crownGeo = new THREE.OctahedronGeometry(0.18, 0);
  const crownMesh = new THREE.Mesh(crownGeo, iceMat);
  crownMesh.position.set(0, 1.02, 0);
  crownMesh.scale.set(0.8, 1.2, 0.8);
  group.add(crownMesh);

  // 環繞小冰晶粒子（不遮擋臉部）
  const crystalRing = new THREE.Group();
  crystalRing.name = 'IceCrystalOrbit';
  const shardGeo = new THREE.OctahedronGeometry(0.065, 0);
  const shardMat = new THREE.MeshBasicMaterial({ color: 0xe0f7fa });
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.5;
    const shard = new THREE.Mesh(shardGeo, shardMat);
    shard.position.set(Math.cos(angle) * 0.65, 0.65 + (i % 2) * 0.18, Math.sin(angle) * 0.65);
    crystalRing.add(shard);
  }
  group.add(crystalRing);

  // 共通大眼睛與微笑
  const face = createCuteFaceGroup(0.45);
  face.position.y = 0.52;
  group.add(face);

  return group;
}

/**
 * 3. 建立氣態（水蒸氣的遊戲擬人化示意）3D 視覺模型
 * 規格書 2.3 & 3.3：真正的水蒸氣看不見！此處以淡藍半透明蓬鬆流線輪廓＋氣流光環呈現「遊戲示意」
 */
export function createGasVisual(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GasVisual';

  const vaporMat = new THREE.MeshStandardMaterial({
    color: 0xdff6ff,
    emissive: 0x4fc3f7,
    emissiveIntensity: 0.35,
    roughness: 0.5,
    transparent: true,
    opacity: 0.68,
  });

  // 主雲團與側邊蓬鬆球體（參考封面圖中間小水蒸氣造型，但保持淡藍半透明示意質感）
  const puffs: Array<[number, number, number, number]> = [
    [0, 0.62, 0, 0.42],
    [-0.32, 0.55, 0.02, 0.28],
    [0.32, 0.55, 0.02, 0.28],
    [-0.18, 0.82, -0.04, 0.26],
    [0.18, 0.82, -0.04, 0.26],
    [0, 0.44, -0.08, 0.28],
  ];

  const puffGroup = new THREE.Group();
  puffGroup.name = 'VaporPuffs';
  puffs.forEach(([x, y, z, r]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), vaporMat);
    m.position.set(x, y, z);
    puffGroup.add(m);
  });
  group.add(puffGroup);

  // 螺旋上升氣流流線環（提醒這是氣態擴散與上升示意）
  const streamGroup = new THREE.Group();
  streamGroup.name = 'VaporStreams';
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x80deea,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.53, 32), ringMat);
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = 0.28;
  streamGroup.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.66, 32), ringMat);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = 0.14;
  streamGroup.add(ring2);
  group.add(streamGroup);

  // 共通大眼睛與微笑
  const face = createCuteFaceGroup(0.42);
  face.position.y = 0.6;
  group.add(face);

  return group;
}

/**
 * 主角「滴滴」角色管理類別
 * 將外觀 (visualRoot) 與碰撞體 (collider) 分離，支援相變過渡動畫與 Q 彈步伐
 */
export class WaterCharacter {
  public readonly root = new THREE.Group();
  public readonly visualRoot = new THREE.Group();

  private liquidMesh: THREE.Group;
  private solidMesh: THREE.Group;
  private gasMesh: THREE.Group;

  // 相變粒子特效
  private transitionParticles: THREE.Points;
  private transitionTimer = 0;
  private isTransitioning = false;

  public currentState: WaterState = 'LIQUID';
  private walkTime = 0;

  constructor(highQuality = true) {
    this.root.add(this.visualRoot);

    this.liquidMesh = createLiquidVisual(highQuality);
    this.solidMesh = createSolidVisual(highQuality);
    this.gasMesh = createGasVisual();

    this.visualRoot.add(this.liquidMesh);
    this.visualRoot.add(this.solidMesh);
    this.visualRoot.add(this.gasMesh);

    this.transitionParticles = this.createBurstParticles();
    this.root.add(this.transitionParticles);

    this.applyStateVisibility('LIQUID');
  }

  private createBurstParticles(): THREE.Points {
    const count = 36;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.65;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = 0.2 + Math.random() * 0.9;
      positions[i * 3 + 2] = Math.sin(theta) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x80deea,
      size: 0.14,
      transparent: true,
      opacity: 0,
    });
    return new THREE.Points(geo, mat);
  }

  public rebuildQuality(highQuality: boolean): void {
    this.visualRoot.remove(this.liquidMesh);
    this.visualRoot.remove(this.solidMesh);
    this.liquidMesh = createLiquidVisual(highQuality);
    this.solidMesh = createSolidVisual(highQuality);
    this.visualRoot.add(this.liquidMesh);
    this.visualRoot.add(this.solidMesh);
    this.applyStateVisibility(this.currentState);
  }

  private applyStateVisibility(state: WaterState): void {
    this.liquidMesh.visible = state === 'LIQUID';
    this.solidMesh.visible = state === 'SOLID';
    this.gasMesh.visible = state === 'GAS';
  }

  /**
   * 觸發相變視覺動畫（約 0.9 秒 Q 彈縮放與粒子閃耀）
   */
  public triggerPhaseChange(toState: WaterState): void {
    this.currentState = toState;
    this.applyStateVisibility(toState);
    this.isTransitioning = true;
    this.transitionTimer = 0.95;

    const pMat = this.transitionParticles.material as THREE.PointsMaterial;
    pMat.color.setHex(
      toState === 'SOLID' ? 0xe0f7fa : toState === 'LIQUID' ? 0x29b6f6 : 0xb3e5fc
    );
    pMat.opacity = 1.0;
  }

  public skipTransitionAnimation(): void {
    this.isTransitioning = false;
    this.transitionTimer = 0;
    this.visualRoot.scale.set(1, 1, 1);
    (this.transitionParticles.material as THREE.PointsMaterial).opacity = 0;
  }

  /**
   * 每幀更新待機呼吸、行走彈性變形 (squash & stretch) 與狀態專屬動態
   */
  public update(dt: number, horizontalSpeed: number, isGrounded: boolean): void {
    this.walkTime += dt * (horizontalSpeed > 0.2 ? 9.5 : 2.6);

    // 相變動畫過渡
    if (this.isTransitioning) {
      this.transitionTimer -= dt;
      const progress = Math.max(0, 1 - this.transitionTimer / 0.95);
      const pulse = 1 + Math.sin(progress * Math.PI * 3) * 0.22 * (1 - progress);
      this.visualRoot.scale.set(pulse, 2 - pulse, pulse);

      this.transitionParticles.rotation.y += dt * 4.5;
      (this.transitionParticles.material as THREE.PointsMaterial).opacity = Math.max(
        0,
        this.transitionTimer
      );

      if (this.transitionTimer <= 0) {
        this.isTransitioning = false;
        this.visualRoot.scale.set(1, 1, 1);
      }
      return;
    }

    if (this.currentState === 'LIQUID') {
      // 液態：2~5% 柔軟 Q 彈 squash & stretch
      const amp = horizontalSpeed > 0.2 && isGrounded ? 0.065 : 0.028;
      const sy = 1 + Math.sin(this.walkTime) * amp;
      const sxz = 1 / Math.sqrt(sy);
      this.visualRoot.scale.set(sxz, sy, sxz);
      this.visualRoot.position.y =
        horizontalSpeed > 0.2 && isGrounded ? Math.abs(Math.sin(this.walkTime)) * 0.06 : 0;
    } else if (this.currentState === 'SOLID') {
      // 固態冰塊：形狀固定、剛性微傾，環繞冰晶緩慢旋轉
      this.visualRoot.scale.set(1, 1, 1);
      this.visualRoot.position.y = 0;
      const orbit = this.solidMesh.getObjectByName('IceCrystalOrbit');
      if (orbit) {
        orbit.rotation.y += dt * 1.6;
      }
    } else if (this.currentState === 'GAS') {
      // 氣態示意：輕飄上下浮動與流線旋轉
      const bob = Math.sin(this.walkTime * 0.8) * 0.08;
      this.visualRoot.position.y = 0.12 + bob;
      const scalePulse = 1 + Math.sin(this.walkTime * 0.6) * 0.035;
      this.visualRoot.scale.set(scalePulse, 1 / scalePulse, scalePulse);
      const streams = this.gasMesh.getObjectByName('VaporStreams');
      if (streams) {
        streams.rotation.z += dt * 1.8;
      }
    }
  }
}
