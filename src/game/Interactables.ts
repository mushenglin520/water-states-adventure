import * as THREE from 'three';
import { WaterState } from './WaterStateMachine';

export interface PlatformBox {
  mesh: THREE.Object3D;
  box: THREE.Box3;
  isIceSurface?: boolean;
}

export interface BarrierGate {
  id: string;
  mesh: THREE.Object3D;
  box: THREE.Box3;
  isOpen: boolean;
  /** 若為窄縫通道：只有液態（或氣態）能穿過，固態冰塊太大會被擋住 */
  liquidOnlyGrate?: boolean;
  blockReason?: string;
}

export type StationType =
  | 'COOLER' // 冷卻機：液態 ➔ 固態
  | 'HEATER' // 暖氣區：固態 ➔ 液態
  | 'EVAPORATOR' // 暖陽蒸發台：液態 ➔ 氣態
  | 'CONDENSER' // 高空冷空氣區：氣態 ➔ 液態
  | 'VALVE_SWITCH'; // 第二關水閘控制閥

export interface InteractStation {
  id: string;
  type: StationType;
  position: THREE.Vector3;
  radius: number;
  promptText: string;
  mesh: THREE.Group;
  targetGateId?: string;
}

export interface HeavySwitchPlate {
  id: string;
  position: THREE.Vector3;
  radius: number;
  isPressed: boolean;
  mesh: THREE.Group;
  targetGateId: string;
}

export interface UpdraftZone {
  box: THREE.Box3;
  targetY: number;
  mesh: THREE.Group;
}

export interface StarCollectible {
  id: string;
  position: THREE.Vector3;
  collected: boolean;
  mesh: THREE.Group;
}

export interface LevelDefinition {
  index: number;
  title: string;
  initialMission: string;
  spawnPoint: THREE.Vector3;
  initialState: WaterState;
  hints: string[];
  victoryLearnPoints: string[];
  goalPosition: THREE.Vector3;
  goalRadius: number;
  requiresCycleToFinish: boolean;
}

/**
 * 建立 3D 浮動文字標籤 Sprite（清楚標示冷卻機、暖氣區、重量開關等）
 */
export function createLabelSprite(text: string, bgColor = '#0288d1'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // 圓角背景
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 96, 36);
  ctx.fill();

  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 40px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.2, 0.8, 1);
  return sprite;
}

/**
 * 建立冷卻機 3D 裝置
 */
export function buildCoolerMesh(pos: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(pos);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.25, 0.3, 24),
    new THREE.MeshStandardMaterial({ color: 0x0277bd, roughness: 0.3, metalness: 0.4 })
  );
  base.position.y = 0.15;
  g.add(base);

  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.5, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x80d8ff, roughness: 0.2, metalness: 0.2 })
  );
  pillar.position.y = 1.05;
  pillar.castShadow = true;
  g.add(pillar);

  const snowCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42, 0),
    new THREE.MeshBasicMaterial({ color: 0xe0f7fa, wireframe: false })
  );
  snowCrystal.position.y = 2.15;
  snowCrystal.name = 'RotatingIcon';
  g.add(snowCrystal);

  const label = createLabelSprite('❄️ 急凍冷卻機 (按 E)', '#0277bd');
  label.position.set(0, 2.95, 0);
  g.add(label);

  return g;
}

/**
 * 建立暖氣加熱區 3D 裝置
 */
export function buildHeaterMesh(pos: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(pos);

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.3, 0.28, 24),
    new THREE.MeshStandardMaterial({
      color: 0xe65100,
      emissive: 0xff6d00,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    })
  );
  pad.position.y = 0.14;
  g.add(pad);

  const lamp = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.3, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffb300,
      emissive: 0xff8f00,
      emissiveIntensity: 0.5,
    })
  );
  lamp.position.y = 1.05;
  lamp.name = 'RotatingIcon';
  g.add(lamp);

  const label = createLabelSprite('🔥 暖氣加熱區 (按 E)', '#e65100');
  label.position.set(0, 2.5, 0);
  g.add(label);

  return g;
}

/**
 * 建立暖陽蒸發區 3D 裝置（第三關）
 */
export function buildEvaporatorMesh(pos: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(pos);

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.45, 0.26, 24),
    new THREE.MeshStandardMaterial({
      color: 0xfbc02d,
      emissive: 0xf57f17,
      emissiveIntensity: 0.4,
    })
  );
  pad.position.y = 0.13;
  g.add(pad);

  const sunOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff176 })
  );
  sunOrb.position.y = 1.3;
  sunOrb.name = 'RotatingIcon';
  g.add(sunOrb);

  const label = createLabelSprite('☀️ 暖陽蒸發區 (按 E)', '#f57c00');
  label.position.set(0, 2.55, 0);
  g.add(label);

  return g;
}

/**
 * 建立高空冷空氣凝結區 3D 裝置（第三關）
 */
export function buildCondenserMesh(pos: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(pos);

  const cloudBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.3, 0.25, 24),
    new THREE.MeshStandardMaterial({ color: 0x4fc3f7, roughness: 0.3 })
  );
  cloudBase.position.y = 0.12;
  g.add(cloudBase);

  const dropOrb = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 1),
    new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b0ff,
      emissiveIntensity: 0.4,
    })
  );
  dropOrb.position.y = 1.25;
  dropOrb.name = 'RotatingIcon';
  g.add(dropOrb);

  const label = createLabelSprite('🌬️ 高空冷空氣區・遇冷凝結 (按 E)', '#00838f');
  label.position.set(0, 2.5, 0);
  g.add(label);

  return g;
}

/**
 * 建立固態冰塊專用的重量開關
 */
export function buildHeavySwitchMesh(pos: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(pos);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.35, 0.16, 24),
    new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.5 })
  );
  rim.position.y = 0.08;
  g.add(rim);

  const buttonPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.05, 0.26, 24),
    new THREE.MeshStandardMaterial({
      color: 0x00b0ff,
      emissive: 0x0091ea,
      emissiveIntensity: 0.3,
    })
  );
  buttonPlate.position.y = 0.22;
  buttonPlate.name = 'SwitchPlate';
  g.add(buttonPlate);

  const label = createLabelSprite('🧊 冰塊重量開關', '#1565c0');
  label.position.set(0, 1.65, 0);
  g.add(label);

  return g;
}

/**
 * 建立探索星星
 */
export function buildStarMesh(pos: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(pos);

  const starGeo = new THREE.OctahedronGeometry(0.38, 0);
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffd54f,
    emissive: 0xffa000,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.6,
  });
  const mesh = new THREE.Mesh(starGeo, starMat);
  mesh.scale.set(1, 1.25, 0.55);
  mesh.position.y = 0.75;
  mesh.name = 'StarCore';
  g.add(mesh);

  return g;
}
