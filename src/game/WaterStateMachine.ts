export type WaterState = 'LIQUID' | 'SOLID' | 'GAS';

export interface StateMetadata {
  state: WaterState;
  name: string;
  icon: string;
  temperature: number; // 簡化示意溫度
  tempLabel: string;
  thermoPercent: number;
  scienceReminder: string;
  moveSpeed: number;
  jumpForce: number;
  friction: number; // 地面阻尼（冰塊滑行感較強）
  canPassNarrow: boolean; // 液態可穿過窄縫與水道
  canPressHeavySwitch: boolean; // 固態可壓下重量機關（遊戲規則）
  canFloatInUpdraft: boolean; // 氣態可乘上升氣流
}

export const WATER_STATE_CONFIG: Record<WaterState, StateMetadata> = {
  LIQUID: {
    state: 'LIQUID',
    name: '液態（小水滴）',
    icon: '💧',
    temperature: 22,
    tempLabel: '22°C（常溫液態）',
    thermoPercent: 46,
    scienceReminder: '水可以流動，沒有固定形狀，能穿過窄縫與水道。',
    moveSpeed: 6.4,
    jumpForce: 8.8,
    friction: 0.82,
    canPassNarrow: true,
    canPressHeavySwitch: false,
    canFloatInUpdraft: false,
  },
  SOLID: {
    state: 'SOLID',
    name: '固態（小冰滴）',
    icon: '🧊',
    temperature: -5,
    tempLabel: '-5°C（遇冷凝固成冰）',
    thermoPercent: 14,
    scienceReminder: '水冷卻到約 0°C 以下會凝固成有固定形狀的冰塊！（遊戲中可啟動重量開關）',
    moveSpeed: 5.8,
    jumpForce: 7.4,
    friction: 0.93, // 冰塊滑行慣性
    canPassNarrow: false,
    canPressHeavySwitch: true,
    canFloatInUpdraft: false,
  },
  GAS: {
    state: 'GAS',
    name: '氣態（水蒸氣示意）',
    icon: '☁️',
    temperature: 65,
    tempLabel: '65°C（受熱加速蒸發）',
    thermoPercent: 86,
    scienceReminder: '蒸發不必等到 100°C！真正的水蒸氣肉眼看不見，畫面角色只是遊戲示意喔！',
    moveSpeed: 5.6,
    jumpForce: 6.5,
    friction: 0.88,
    canPassNarrow: true,
    canPressNarrow: true,
    canPressHeavySwitch: false,
    canFloatInUpdraft: true,
  } as StateMetadata,
};

export interface PhaseTransitionInfo {
  from: WaterState;
  to: WaterState;
  processName: string;
  bannerTitle: string;
  bannerDesc: string;
}

export function getTransitionInfo(from: WaterState, to: WaterState): PhaseTransitionInfo {
  if (from === 'LIQUID' && to === 'SOLID') {
    return {
      from,
      to,
      processName: '凝固',
      bannerTitle: '❄️ 遇冷凝固！液態水 ➔ 固態冰塊',
      bannerDesc:
        '水冷卻到約 0°C 以下時，會「凝固」成有固定形狀的固態冰塊！這是物理變化，滴滴本質還是水喔！',
    };
  }
  if (from === 'SOLID' && to === 'LIQUID') {
    return {
      from,
      to,
      processName: '融化',
      bannerTitle: '🔥 受熱融化！固態冰塊 ➔ 液態水',
      bannerDesc:
        '冰塊吸收熱量、溫度上升後，會「融化」成可以自由流動、沒有固定形狀的液態小水滴！',
    };
  }
  if (from === 'LIQUID' && to === 'GAS') {
    return {
      from,
      to,
      processName: '蒸發',
      bannerTitle: '☀️ 受熱蒸發！液態水 ➔ 氣態水蒸氣（示意）',
      bannerDesc:
        '水吸收熱量會加速「蒸發」成水蒸氣（不必等到 100°C 沸騰喔）！注意：真正的水蒸氣是看不見的，畫面上的透明小雲朵只是方便辨識的遊戲圖示！',
    };
  }
  if (from === 'GAS' && to === 'LIQUID') {
    return {
      from,
      to,
      processName: '凝結',
      bannerTitle: '💧 遇冷凝結！氣態水蒸氣 ➔ 液態小水滴',
      bannerDesc:
        '看不見的水蒸氣遇到高空冷空氣時，會「凝結」成細小的液態小水滴，聚集起來就形成雲和雨滴回到地面！',
    };
  }
  return {
    from,
    to,
    processName: '狀態改變',
    bannerTitle: `✨ 水的三態變化：${WATER_STATE_CONFIG[to].name}`,
    bannerDesc: WATER_STATE_CONFIG[to].scienceReminder,
  };
}
