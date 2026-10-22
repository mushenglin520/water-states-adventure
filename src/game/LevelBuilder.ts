import * as THREE from 'three';
import {
  BarrierGate,
  HeavySwitchPlate,
  InteractStation,
  LevelDefinition,
  PlatformBox,
  StarCollectible,
  UpdraftZone,
  buildCondenserMesh,
  buildCoolerMesh,
  buildEvaporatorMesh,
  buildHeaterMesh,
  buildHeavySwitchMesh,
  buildStarMesh,
  createLabelSprite,
} from './Interactables';

export interface BuiltLevel {
  def: LevelDefinition;
  root: THREE.Group;
  platforms: PlatformBox[];
  gates: BarrierGate[];
  stations: InteractStation[];
  switches: HeavySwitchPlate[];
  updrafts: UpdraftZone[];
  stars: StarCollectible[];
  goalPortal: THREE.Group;
}

function addPlatform(
  root: THREE.Group,
  platforms: PlatformBox[],
  size: [number, number, number],
  pos: [number, number, number],
  color: number,
  isIce = false
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: isIce ? 0.15 : 0.65,
    metalness: isIce ? 0.25 : 0.05,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  root.add(mesh);

  const box = new THREE.Box3().setFromObject(mesh);
  platforms.push({ mesh, box, isIceSurface: isIce });
  return mesh;
}

function addGuideArrows(root: THREE.Group, zPositions: number[], y = 0.04): void {
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide });
  zPositions.forEach((z) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.75, 3), arrowMat);
    cone.rotation.x = -Math.PI / 2;
    cone.position.set(0, y, z);
    root.add(cone);
  });
}

function buildGoalPortal(pos: THREE.Vector3, title = '🏁 終點傳送門'): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(pos);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.14, 16, 36),
    new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      emissive: 0xffa000,
      emissiveIntensity: 0.55,
    })
  );
  ring.position.y = 1.25;
  ring.name = 'PortalRing';
  g.add(ring);

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 32),
    new THREE.MeshBasicMaterial({
      color: 0x40c4ff,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    })
  );
  core.position.y = 1.25;
  g.add(core);

  const label = createLabelSprite(title, '#ff8f00');
  label.position.set(0, 2.8, 0);
  g.add(label);

  return g;
}

/**
 * 第一關｜冰雪王國（MVP 核心必做關卡）
 * 流程：液態進場教學 ➔ 出口冰門鎖住 ➔ 冷卻機凝固成固態冰塊 ➔ 壓下重量開關打開冰門 ➔ 遇到窄縫柵欄（冰塊太大過不去） ➔ 暖氣區受熱融化回液態 ➔ 穿過窄縫抵達終點！
 */
function buildLevel01(): BuiltLevel {
  const root = new THREE.Group();
  const platforms: PlatformBox[] = [];
  const gates: BarrierGate[] = [];
  const stations: InteractStation[] = [];
  const switches: HeavySwitchPlate[] = [];
  const updrafts: UpdraftZone[] = [];
  const stars: StarCollectible[] = [];

  // 1. 起始雪地廣場與練習階梯
  addPlatform(root, platforms, [12, 1.2, 10], [0, -0.6, 2], 0xdff3ff, true);
  // 兩側翼台（放置冷卻機與暖氣區）
  addPlatform(root, platforms, [9, 1.2, 14], [-7.5, -0.6, -7], 0xb3e5fc, true);
  addPlatform(root, platforms, [12, 1.2, 18], [0, -0.6, -9], 0xe1f5fe, true);
  addPlatform(root, platforms, [9, 1.2, 12], [7.5, -0.6, -12], 0xcfeefb, false);
  // 終點平台
  addPlatform(root, platforms, [10, 1.2, 10], [0, -0.6, -24], 0xb2ebf2, true);

  // 裝飾冰晶山丘與企鵝雪人感立體裝飾
  for (let i = 0; i < 6; i++) {
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(1.1 + (i % 2) * 0.5, 3.2 + (i % 3), 6),
      new THREE.MeshStandardMaterial({ color: 0x81d4fa, roughness: 0.25, flatShading: true })
    );
    spire.position.set(i % 2 === 0 ? -11 : 11, 1.2, 2 - i * 5);
    root.add(spire);
  }

  // 地面引導箭頭
  addGuideArrows(root, [3, 0, -3, -6]);

  // 2. 冷卻機（左翼平台）
  const coolerPos = new THREE.Vector3(-6.2, 0, -6.5);
  const coolerMesh = buildCoolerMesh(coolerPos);
  root.add(coolerMesh);
  stations.push({
    id: 'lvl1-cooler',
    type: 'COOLER',
    position: coolerPos,
    radius: 2.3,
    promptText: '按 E 啟動【急凍冷卻機】：讓液態水遇冷凝固成冰塊！',
    mesh: coolerMesh,
  });

  // 3. 重量開關（中央廣場，需固態冰塊壓下）
  const switchPos = new THREE.Vector3(0, 0, -7.5);
  const switchMesh = buildHeavySwitchMesh(switchPos);
  root.add(switchMesh);
  switches.push({
    id: 'lvl1-switch',
    position: switchPos,
    radius: 1.5,
    isPressed: false,
    mesh: switchMesh,
    targetGateId: 'lvl1-ice-door',
  });

  // 4. 第一道上鎖的冰晶大門（由重量開關開啟）
  const doorGroup = new THREE.Group();
  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(10, 3.2, 0.6),
    new THREE.MeshStandardMaterial({
      color: 0x0288d1,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
    })
  );
  doorMesh.position.set(0, 1.6, -12.5);
  doorGroup.add(doorMesh);
  const doorLabel = createLabelSprite('🔒 冰晶連動門（需啟動冰塊重量開關）', '#01579b');
  doorLabel.position.set(0, 3.6, -12.5);
  doorGroup.add(doorLabel);
  root.add(doorGroup);

  gates.push({
    id: 'lvl1-ice-door',
    mesh: doorGroup,
    box: new THREE.Box3().setFromObject(doorMesh),
    isOpen: false,
    blockReason: '大門鎖住了！試著先到左邊【冷卻機】凝固成固態冰塊，再去踩中央的【重量開關】！',
  });

  // 5. 暖氣加熱區（右翼平台，幫助冰塊融化回液態水）
  const heaterPos = new THREE.Vector3(6.2, 0, -13.5);
  const heaterMesh = buildHeaterMesh(heaterPos);
  root.add(heaterMesh);
  stations.push({
    id: 'lvl1-heater',
    type: 'HEATER',
    position: heaterPos,
    radius: 2.3,
    promptText: '按 E 啟動【暖氣加熱區】：讓固態冰塊受熱融化成液態小水滴！',
    mesh: heaterMesh,
  });

  // 6. 窄縫水道柵欄（只有液態沒有固定形狀能穿過，固態冰塊有固定形狀會卡住）
  const grateGroup = new THREE.Group();
  const barMat = new THREE.MeshStandardMaterial({ color: 0x00bcd4, metalness: 0.5, roughness: 0.2 });
  for (let x = -4.5; x <= 4.5; x += 0.75) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 12), barMat);
    bar.position.set(x, 1.4, -17.5);
    grateGroup.add(bar);
  }
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, 0.5), barMat);
  topBeam.position.set(0, 2.8, -17.5);
  grateGroup.add(topBeam);

  const grateLabel = createLabelSprite('💧 細縫水道柵欄（僅液態水可流動穿過）', '#00838f');
  grateLabel.position.set(0, 3.55, -17.5);
  grateGroup.add(grateLabel);
  root.add(grateGroup);

  const grateCollider = new THREE.Box3(
    new THREE.Vector3(-5, 0, -17.9),
    new THREE.Vector3(5, 3, -17.1)
  );
  gates.push({
    id: 'lvl1-liquid-grate',
    mesh: grateGroup,
    box: grateCollider,
    isOpen: false,
    liquidOnlyGrate: true,
    blockReason:
      '🧊 冰塊有固定形狀，體積太大卡在細縫柵欄外了！快去右邊【暖氣加熱區】按 E 融化回液態小水滴吧！',
  });

  // 7. 探索星星 3 顆
  const starCoords: Array<[number, number, number]> = [
    [-6.2, 0, -3.2],
    [0, 0, -10.5],
    [0, 0, -20.2],
  ];
  starCoords.forEach((c, idx) => {
    const pos = new THREE.Vector3(c[0], c[1], c[2]);
    const m = buildStarMesh(pos);
    root.add(m);
    stars.push({ id: `lvl1-star-${idx}`, position: pos, collected: false, mesh: m });
  });

  // 8. 終點門
  const goalPos = new THREE.Vector3(0, 0, -24.5);
  const goalPortal = buildGoalPortal(goalPos, '🏁 冰雪王國終點');
  root.add(goalPortal);

  return {
    def: {
      index: 0,
      title: '第一關｜冰雪王國（凝固與融化）',
      initialMission: '任務：1.去左邊冷卻機凝固成冰 ➔ 2.壓下重量開關 ➔ 3.去右邊暖氣區融化穿過細縫！',
      spawnPoint: new THREE.Vector3(0, 0.2, 4.5),
      initialState: 'LIQUID',
      hints: [
        '觀察看看：前方的冰晶大門鎖住了，地面中間有一個「冰塊重量開關」，液態小水滴踩上去好像不夠硬呢！',
        '走去左邊的「❄️ 急凍冷卻機」按 E 鍵，讓小水滴遇冷凝固成固態冰塊，再去踩重量開關就能打開大門囉！',
        '大門打開後，細縫水道柵欄會擋住有固定形狀的冰塊！去右邊「🔥 暖氣加熱區」按 E 融化成液態水就能流過去！',
      ],
      victoryLearnPoints: [
        '水冷卻到適當條件（常壓約 0°C）會「凝固」成有固定形狀的固態冰塊。',
        '固態冰塊吸收熱量後會「融化」成可以自由流動、沒有固定形狀的液態水。',
        '水的三態變化屬於「物理變化」，不管是小冰塊還是小水滴，它依然是水！',
      ],
      goalPosition: goalPos,
      goalRadius: 1.6,
      requiresCycleToFinish: true,
    },
    root,
    platforms,
    gates,
    stations,
    switches,
    updrafts,
    stars,
    goalPortal,
  };
}

/**
 * 第二關｜水滴迷宮（流動、沒有固定形狀、水閘門與形態切換解謎）
 */
function buildLevel02(): BuiltLevel {
  const root = new THREE.Group();
  const platforms: PlatformBox[] = [];
  const gates: BarrierGate[] = [];
  const stations: InteractStation[] = [];
  const switches: HeavySwitchPlate[] = [];
  const updrafts: UpdraftZone[] = [];
  const stars: StarCollectible[] = [];

  // 山林溪流風格平台
  addPlatform(root, platforms, [12, 1.2, 10], [0, -0.6, 2], 0x4db6ac, false);
  addPlatform(root, platforms, [14, 1.2, 14], [0, -0.6, -9], 0x26a69a, false);
  addPlatform(root, platforms, [12, 1.2, 12], [0, -0.6, -21], 0x4db6ac, false);

  // 透明彎曲水道護欄視覺
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x80deea,
    transparent: true,
    opacity: 0.45,
  });
  [-5.5, 5.5].forEach((x) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 28), wallMat);
    wall.position.set(x, 0.8, -9);
    root.add(wall);
  });

  // 第一道窄縫濾網（液態水直接流過）
  const grate1 = new THREE.Group();
  const barMat = new THREE.MeshStandardMaterial({ color: 0x00897b });
  for (let x = -5; x <= 5; x += 0.8) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 10), barMat);
    b.position.set(x, 1.2, -3.5);
    grate1.add(b);
  }
  const l1 = createLabelSprite('💧 第一道細縫水道（水無固定形狀可流過）', '#00695c');
  l1.position.set(0, 2.9, -3.5);
  grate1.add(l1);
  root.add(grate1);
  gates.push({
    id: 'lvl2-grate-1',
    mesh: grate1,
    box: new THREE.Box3(new THREE.Vector3(-5.5, 0, -3.9), new THREE.Vector3(5.5, 2.6, -3.1)),
    isOpen: false,
    liquidOnlyGrate: true,
    blockReason: '只有液態水能順著細縫水道流過去喔！',
  });

  // 中央區域：冷卻機 + 冰塊重量開關 + 暖氣區
  const coolerPos = new THREE.Vector3(-4.2, 0, -8.5);
  const coolerMesh = buildCoolerMesh(coolerPos);
  root.add(coolerMesh);
  stations.push({
    id: 'lvl2-cooler',
    type: 'COOLER',
    position: coolerPos,
    radius: 2.2,
    promptText: '按 E 啟動【冷卻機】：凝固成冰塊以壓下水閘開關',
    mesh: coolerMesh,
  });

  const switchPos = new THREE.Vector3(0, 0, -10);
  const switchMesh = buildHeavySwitchMesh(switchPos);
  root.add(switchMesh);
  switches.push({
    id: 'lvl2-switch',
    position: switchPos,
    radius: 1.5,
    isPressed: false,
    mesh: switchMesh,
    targetGateId: 'lvl2-floodgate',
  });

  const heaterPos = new THREE.Vector3(4.2, 0, -11.5);
  const heaterMesh = buildHeaterMesh(heaterPos);
  root.add(heaterMesh);
  stations.push({
    id: 'lvl2-heater',
    type: 'HEATER',
    position: heaterPos,
    radius: 2.2,
    promptText: '按 E 啟動【暖氣區】：融化回液態小水滴穿過終點窄管',
    mesh: heaterMesh,
  });

  // 水閘大門 + 終點前細縫管線
  const floodgateGroup = new THREE.Group();
  const fgMesh = new THREE.Mesh(
    new THREE.BoxGeometry(11, 3.0, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.4 })
  );
  fgMesh.position.set(0, 1.5, -14.5);
  floodgateGroup.add(fgMesh);
  const fgLabel = createLabelSprite('🔒 迷宮水閘門（需固態冰塊壓開關）', '#e65100');
  fgLabel.position.set(0, 3.4, -14.5);
  floodgateGroup.add(fgLabel);
  root.add(floodgateGroup);

  gates.push({
    id: 'lvl2-floodgate',
    mesh: floodgateGroup,
    box: new THREE.Box3().setFromObject(fgMesh),
    isOpen: false,
    blockReason: '水閘門關閉中！請先用冷卻機變成冰塊，踩下中央的水閘重量開關。',
  });

  // 終點前第二道窄管濾網
  const grate2 = new THREE.Group();
  for (let x = -5; x <= 5; x += 0.8) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 10), barMat);
    b.position.set(x, 1.2, -17.5);
    grate2.add(b);
  }
  const l2 = createLabelSprite('💧 終點透明窄管（需融化回液態通過）', '#00838f');
  l2.position.set(0, 2.9, -17.5);
  grate2.add(l2);
  root.add(grate2);

  gates.push({
    id: 'lvl2-grate-2',
    mesh: grate2,
    box: new THREE.Box3(new THREE.Vector3(-5.5, 0, -17.9), new THREE.Vector3(5.5, 2.6, -17.1)),
    isOpen: false,
    liquidOnlyGrate: true,
    blockReason: '冰塊有固定形狀無法鑽進窄管！請到右方暖氣區融化回液態水。',
  });

  // 星星
  [
    [0, 0, -1.5],
    [-4.2, 0, -11.5],
    [0, 0, -19.5],
  ].forEach((c, i) => {
    const pos = new THREE.Vector3(c[0], c[1], c[2]);
    const m = buildStarMesh(pos);
    root.add(m);
    stars.push({ id: `lvl2-star-${i}`, position: pos, collected: false, mesh: m });
  });

  const goalPos = new THREE.Vector3(0, 0, -23.5);
  const goalPortal = buildGoalPortal(goalPos, '🏁 水滴迷宮終點');
  root.add(goalPortal);

  return {
    def: {
      index: 1,
      title: '第二關｜水滴迷宮（流動與形狀）',
      initialMission: '任務：利用液態水可穿過細縫、固態冰塊可壓開關的特性，突破雙層水道迷宮！',
      spawnPoint: new THREE.Vector3(0, 0.2, 4.5),
      initialState: 'LIQUID',
      hints: [
        '液態水沒有固定形狀，可以直接穿過第一道綠色細縫水道！',
        '穿過細縫後，先去左邊冷卻機變成冰塊壓開水閘門，再去右邊暖氣區變回液態水穿過終點窄管！',
      ],
      victoryLearnPoints: [
        '液態水具有「流動性」且「沒有固定形狀」，能順著容器與細縫通道改變外型（遊戲以擬人化水滴呈現）。',
        '固態冰塊有固定形狀與體積，無法穿過狹窄水道，但能用來啟動重量機關。',
      ],
      goalPosition: goalPos,
      goalRadius: 1.6,
      requiresCycleToFinish: true,
    },
    root,
    platforms,
    gates,
    stations,
    switches,
    updrafts,
    stars,
    goalPortal,
  };
}

/**
 * 第三關｜天空之城（蒸發、上升氣流、高空遇冷凝結、水循環）
 */
function buildLevel03(): BuiltLevel {
  const root = new THREE.Group();
  const platforms: PlatformBox[] = [];
  const gates: BarrierGate[] = [];
  const stations: InteractStation[] = [];
  const switches: HeavySwitchPlate[] = [];
  const updrafts: UpdraftZone[] = [];
  const stars: StarCollectible[] = [];

  // 1. 地面暖陽島嶼 (y = 0)
  addPlatform(root, platforms, [12, 1.2, 12], [0, -0.6, 0], 0x81c784, false);

  // 2. 高空雲端島嶼 (y = 6.0)
  addPlatform(root, platforms, [14, 1.2, 14], [0, 5.4, -14], 0xe1f5fe, false);

  // 3. 暖陽蒸發區（地面）
  const evapPos = new THREE.Vector3(-3.2, 0, -1.5);
  const evapMesh = buildEvaporatorMesh(evapPos);
  root.add(evapMesh);
  stations.push({
    id: 'lvl3-evaporator',
    type: 'EVAPORATOR',
    position: evapPos,
    radius: 2.3,
    promptText: '按 E 在【暖陽蒸發區】吸收熱量：蒸發成輕盈的氣態水蒸氣（示意）！',
    mesh: evapMesh,
  });

  // 4. 上升氣流柱（連接地面 z=-5 到雲端島嶼 y=6.2）
  const updraftGroup = new THREE.Group();
  const cylGeo = new THREE.CylinderGeometry(2.1, 2.1, 7.5, 24, 1, true);
  const cylMat = new THREE.MeshBasicMaterial({
    color: 0x80deea,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  });
  const cylMesh = new THREE.Mesh(cylGeo, cylMat);
  cylMesh.position.set(0, 3.5, -5.5);
  updraftGroup.add(cylMesh);

  const updraftLabel = createLabelSprite('🌪️ 上升氣流柱（氣態水蒸氣可乘風飛上雲端）', '#00acc1');
  updraftLabel.position.set(0, 2.2, -5.5);
  updraftGroup.add(updraftLabel);
  root.add(updraftGroup);

  updrafts.push({
    box: new THREE.Box3(new THREE.Vector3(-2.3, -0.2, -7.8), new THREE.Vector3(2.3, 7.5, -3.2)),
    targetY: 6.4,
    mesh: updraftGroup,
  });

  // 5. 雲端島嶼上的「高空冷空氣凝結區」
  const condPos = new THREE.Vector3(-3.5, 6.0, -13.5);
  const condMesh = buildCondenserMesh(condPos);
  root.add(condMesh);
  stations.push({
    id: 'lvl3-condenser',
    type: 'CONDENSER',
    position: condPos,
    radius: 2.3,
    promptText: '按 E 進入【高空冷空氣區】：讓水蒸氣遇冷凝結成液態小水滴！',
    mesh: condMesh,
  });

  // 6. 終點水循環收集池（需凝結回液態小水滴才能進入完成水循環）
  const goalPos = new THREE.Vector3(2.8, 6.0, -16.5);
  const goalPortal = buildGoalPortal(goalPos, '🏁 完成水循環終點（需液態水滴）');
  root.add(goalPortal);

  // 星星（地面、氣流中、雲端）
  [
    [3.0, 0, -1.5],
    [0, 3.6, -5.5],
    [0, 6.0, -11.5],
  ].forEach((c, i) => {
    const pos = new THREE.Vector3(c[0], c[1], c[2]);
    const m = buildStarMesh(pos);
    root.add(m);
    stars.push({ id: `lvl3-star-${i}`, position: pos, collected: false, mesh: m });
  });

  return {
    def: {
      index: 2,
      title: '第三關｜天空之城（蒸發、凝結與水循環）',
      initialMission:
        '任務：1.到暖陽區蒸發成水蒸氣 ➔ 2.走進上升氣流飛上雲端 ➔ 3.遇冷凝結回小水滴抵達終點！',
      spawnPoint: new THREE.Vector3(0, 0.2, 3.2),
      initialState: 'LIQUID',
      hints: [
        '雲端島嶼好高跳不上去！先去左邊「☀️ 暖陽蒸發區」按 E，讓液態水吸收熱量蒸發成水蒸氣（遊戲示意）吧！',
        '變成氣態角色後，走進前方的「🌪️ 上升氣流柱」，就會輕盈地飄浮上升到高空雲端島嶼！',
        '到達高空後，去「🌬️ 高空冷空氣區」按 E 遇冷凝結回液態小水滴，就能走進終點完成自然水循環！',
      ],
      victoryLearnPoints: [
        '液態水吸收熱量會「蒸發」變成氣態水蒸氣，而且蒸發在一般溫度就會發生，不必等到 100°C 沸騰喔！',
        '真正的水蒸氣是「肉眼看不見」的！遊戲中的淡藍透明雲朵是幫助辨識的圖示；生活裡看到的白霧其實是細小的液態水滴。',
        '水蒸氣上升到高空遇到冷空氣，會「凝結」成小水滴，進而形成雲與降雨，構成大自然奇妙的水循環！',
      ],
      goalPosition: goalPos,
      goalRadius: 1.7,
      requiresCycleToFinish: true,
    },
    root,
    platforms,
    gates,
    stations,
    switches,
    updrafts,
    stars,
    goalPortal,
  };
}

export function createLevelByIndex(index: number): BuiltLevel {
  if (index === 1) return buildLevel02();
  if (index === 2) return buildLevel03();
  return buildLevel01();
}
