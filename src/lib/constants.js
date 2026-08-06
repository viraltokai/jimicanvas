/** 画布有改动后，延迟多久再上传到云端（防抖，减少频繁保存） */
export const CLOUD_SYNC_DEBOUNCE_MS = 3000;
export const STORAGE_KEY = 'jimicanvas.documents.v1';
export const ACTIVE_CANVAS_ID_KEY = 'jimicanvas.active_canvas_id';
export const JIMIAIGO_TOKEN_STORAGE_KEY = 'jimicanvas.jimiaigo.token';
export const ADMIN_TOKEN_COOKIE_KEY = 'Admin-Token';
/** 从 jimiaiapp 跳转时暂存待打开的画布 ID */
export const PENDING_CANVAS_ID_KEY = 'jimicanvas.pending_canvas_id';
/** 从 jimiaiapp 跳转时标记需要新建画布 */
export const PENDING_NEW_CANVAS_KEY = 'jimicanvas.pending_new_canvas';
/** 新建画布时使用的预设工作流模版 ID */
export const PENDING_WORKFLOW_TEMPLATE_KEY = 'jimicanvas.pending_workflow_template';
export const DEFAULT_CHAT_API_URL = 'http://localhost:27355';
export const DEFAULT_SITE_TITLE = 'JimiCanvas';
export const DEFAULT_SITE_SLOGAN = '轻量画布工作台';
export const DEFAULT_KEFU_QR_URL = '/wechat-qrcode.png';
export const CANVAS_TUTORIAL_URL = 'https://www.bilibili.com/video/BV1GWEw6gEJ9/';
export const DEFAULT_TEXT_MODEL = 'gpt-5.4-mini';
export const DEFAULT_IMAGE_MODEL = 'gpt-image-2';
export const DEFAULT_IMAGE_RESOLUTION = '1k';
export const DEFAULT_IMAGE_RATIO = '1:1';
export const DEFAULT_IMAGE_COUNT = 1;
export const DEFAULT_IMAGE_QUALITY = 'auto';
export const DEFAULT_NODE_WIDTH = 260;
export const DEFAULT_NODE_HEIGHT = 180;
export const MIN_NOTE_WIDTH = 180;
export const MIN_NOTE_HEIGHT = 100;
export const MAX_NOTE_WIDTH = 800;
export const MAX_NOTE_HEIGHT = 640;
export const MIN_CANVAS_SCALE = 0.1;
export const MAX_CANVAS_SCALE = 1.4;
export const CANVAS_SCALE_STEP = 0.1;
export const CANVAS_WHEEL_PAN_FACTOR = 1;
export const CANVAS_GRID_CELL_SIZE = 28;
export const DEFAULT_CANVAS_BACKGROUND = 'grid';
export const CANVAS_BACKGROUND_OPTIONS = [
  { value: 'grid', label: '网格', hint: '网状参考线' },
  { value: 'dots', label: '点状', hint: '圆点参考' },
  { value: 'line', label: '横线', hint: '水平参考线' },
  { value: 'none', label: '纯色', hint: '无背景纹理' },
];
export const DEFAULT_VIDEO_URL = '/demo/default-tiktok-ecommerce-9x16.mp4';
export const DEFAULT_IMAGE_URL = '/demo/default-handsome-american-man.jpg';
export const DEFAULT_DEMO_IMAGE_RATIO = '3:2';
export const DEFAULT_VIDEO_FAMILY = 'seedance';
export const DEFAULT_VIDEO_MODEL = 'seedance-2.0-manxue';
export const DEFAULT_VIDEO_ROUTE = 'route3';
export const DEFAULT_VIDEO_DURATION = '5';
export const DEFAULT_SORA_VIDEO_DURATION = '12';
export const DEFAULT_VIDEO_ORIENTATION = 'portrait';
export const DEFAULT_VIDEO_RATIO = '9:16';
export const DEFAULT_VIDEO_SIZE = '720x1280';
export const DEFAULT_VIDEO_RESOLUTION = '720p';
export const DEFAULT_VIDEO_QUALITY = '720p';
export const DEFAULT_VIDEO_COUNT = 1;
export const DEFAULT_VEO_GENERATION_TYPE = 'frame';
export const VEO_REFERENCE_IMAGE_MAX = 3;
/** 视频节点首尾帧模式：最多连接的图片节点数 */
export const VIDEO_FRAME_IMAGE_CONNECTION_MAX = 2;
/** 视频节点参考图模式：最多连接的图片节点数 */
export const VIDEO_REFERENCE_IMAGE_CONNECTION_MAX = 3;
export const SEEDANCE_REF_IMAGE_MAX = 9;
export const SEEDANCE_REF_VIDEO_MAX = 3;
export const SEEDANCE_REF_AUDIO_MAX = 3;
export const SEEDANCE25_REF_IMAGE_MAX = 30;
export const SEEDANCE25_REF_VIDEO_MAX = 10;
export const SEEDANCE25_REF_AUDIO_MAX = 10;
export const SEEDANCE25_MODEL = 'seedance-2.5';
export const VIDEO_GENERIC_REFERENCE_MAX = 5;
/** Gemini Omni 参考图上限 */
export const OMNI_REFERENCE_IMAGE_MAX = 7;

export const IMAGE_REFERENCE_LIMITS = {
  nanobanana2: 5,
  nanobananapro: 5,
  'gpt-image-2': 16,
  'gpt-image-1.5': 15,
};

export function getImageReferenceMax(model) {
  return IMAGE_REFERENCE_LIMITS[model] || IMAGE_REFERENCE_LIMITS[DEFAULT_IMAGE_MODEL] || 5;
}

export const DEFAULT_AUDIO_MODEL = 'gpt-4o-mini-tts';
export const DEFAULT_AUDIO_VOICE = 'alloy';
export const DEFAULT_AUDIO_SPEED = 1;
export const DEFAULT_AUDIO_NODE_WIDTH = 360;
export const DEFAULT_AUDIO_NODE_HEIGHT = 168;
export const MIN_AUDIO_NODE_HEIGHT = 168;
export const MIN_AUDIO_NODE_HEIGHT_WITH_CONTENT = 192;

export const AUDIO_VOICE_OPTIONS = [
  { value: 'alloy', label: 'Alloy', hint: '中性、平衡' },
  { value: 'echo', label: 'Echo', hint: '男声、沉稳' },
  { value: 'fable', label: 'Fable', hint: '英式、叙述' },
  { value: 'onyx', label: 'Onyx', hint: '男声、深沉' },
  { value: 'nova', label: 'Nova', hint: '女声、活力' },
  { value: 'shimmer', label: 'Shimmer', hint: '女声、温柔' },
];

export const AUDIO_SPEED_OPTIONS = [
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

export const VEO_GENERATION_TYPE_OPTIONS = [
  { value: 'frame', label: '首尾帧' },
  { value: 'reference', label: '参考图' },
];

/** 可选视频家族（Sora 是否展示由 admin 线路开关控制） */
export const VIDEO_FAMILY_OPTIONS = [
  { value: 'sora', label: 'Sora' },
  { value: 'veo', label: 'VEO' },
  { value: 'omni', label: 'Omni' },
  { value: 'seedance', label: 'Seedance' },
  { value: 'seedance25', label: 'Seedance 2.5' },
  { value: 'grok', label: 'Grok' },
  { value: 'minimax', label: 'MiniMax H3' },
];

export const VIDEO_COUNT_OPTIONS = [
  { value: 1, label: '1 次' },
  { value: 2, label: '2 次' },
  { value: 3, label: '3 次' },
];

export const VIDEO_FAMILY_CONFIG = {
  sora: {
    provider: 'sora',
    route: 'route3',
    defaultDuration: '12',
    defaultOrientation: 'portrait',
    models: [
      { value: 'sora2-gz-sp', label: 'Sora2 特价版' },
      { value: 'sora2-gz-stable', label: 'Sora2 稳定版' },
    ],
    ratios: [
      { value: 'landscape', label: '横屏 16:9' },
      { value: 'portrait', label: '竖屏 9:16' },
    ],
    durations: [
      { value: '4', label: '4 秒' },
      { value: '8', label: '8 秒' },
      { value: '12', label: '12 秒' },
    ],
    maxCount: 3,
    resolutionKey: 'size',
    ratioKey: 'orientation',
  },
  veo: {
    provider: 'veo',
    defaultDuration: '8',
    models: [{ value: 'sc-veo3.1-fast', label: 'VEO 3.1 Fast' }],
    resolutions: [
      { value: '720p', label: '720p' },
      { value: '1080p', label: '1080p' },
      { value: '4k', label: '4K' },
    ],
    ratios: [
      { value: '16:9', label: '16:9' },
      { value: '9:16', label: '9:16' },
      { value: '1:1', label: '1:1' },
    ],
    durations: [{ value: '8', label: '8 秒' }],
    maxCount: 3,
    resolutionKey: 'resolution',
    ratioKey: 'ratio',
  },
  omni: {
    provider: 'omni',
    models: [{ value: 'Gemini-Omini', label: 'Gemini Omni' }],
    resolutions: [
      { value: '720p', label: '720p' },
      { value: '1080p', label: '1080p' },
      { value: '4k', label: '4K' },
    ],
    ratios: [
      { value: '16:9', label: '16:9' },
      { value: '9:16', label: '9:16' },
      { value: '1:1', label: '1:1' },
    ],
    durations: [
      { value: '4', label: '4 秒' },
      { value: '6', label: '6 秒' },
      { value: '8', label: '8 秒' },
      { value: '10', label: '10 秒' },
    ],
    maxCount: 7,
    resolutionKey: 'resolution',
    ratioKey: 'ratio',
  },
  seedance: {
    provider: 'seedance-manxue',
    models: [
      { value: 'seedance-2.0-manxue', label: 'Seedance 2.0 满血版' },
      { value: 'seedance2.0-933', label: 'Seedance 2.0 933' },
    ],
    resolutions: [
      { value: '480p', label: '480p' },
      { value: '720p', label: '720p' },
    ],
    manxueResolutions: [
      { value: '720p', label: '720P' },
      { value: '1080p', label: '1080P' },
      { value: '2k', label: '2K' },
      { value: '4k', label: '4K' },
    ],
    c933Resolutions: [
      { value: '480p', label: '480p' },
      { value: '720p', label: '720p' },
      { value: '1080p', label: '1080p' },
    ],
    manxueDurations: [
      { value: '4', label: '4 秒' },
      { value: '5', label: '5 秒' },
      { value: '6', label: '6 秒' },
      { value: '8', label: '8 秒' },
      { value: '10', label: '10 秒' },
      { value: '12', label: '12 秒' },
      { value: '15', label: '15 秒' },
    ],
    standardDurations: [
      { value: '5', label: '5 秒' },
      { value: '10', label: '10 秒' },
      { value: '15', label: '15 秒' },
    ],
    c933Durations: [
      { value: '4', label: '4 秒' },
      { value: '5', label: '5 秒' },
      { value: '6', label: '6 秒' },
      { value: '8', label: '8 秒' },
      { value: '10', label: '10 秒' },
      { value: '12', label: '12 秒' },
      { value: '15', label: '15 秒' },
    ],
    ratios: [
      { value: '16:9', label: '16:9' },
      { value: '9:16', label: '9:16' },
      { value: '1:1', label: '1:1' },
      { value: '4:3', label: '4:3' },
      { value: '3:4', label: '3:4' },
    ],
    durations: [
      { value: '5', label: '5 秒' },
      { value: '10', label: '10 秒' },
      { value: '15', label: '15 秒' },
    ],
    maxCount: 3,
    resolutionKey: 'resolution',
    ratioKey: 'ratio',
  },
  seedance25: {
    provider: 'seedance-2.5',
    models: [{ value: 'seedance-2.5', label: 'Seedance 2.5' }],
    resolutions: [
      { value: '480p', label: '480p' },
      { value: '720p', label: '720p' },
    ],
    ratios: [
      { value: '16:9', label: '16:9' },
      { value: '9:16', label: '9:16' },
      { value: '1:1', label: '1:1' },
    ],
    durations: Array.from({ length: 27 }, (_, i) => {
      const value = String(i + 4);
      return { value, label: `${value} 秒` };
    }),
    defaultDuration: '4',
    defaultOrientation: 'portrait',
    maxCount: 1,
    resolutionKey: 'resolution',
    ratioKey: 'ratio',
  },
  grok: {
    provider: 'grok',
    models: [
      { value: 'grok-imagine-video-1.5', label: 'Grok 1.5' },
    ],
    resolutions: [
      { value: '720p', label: '720p' },
      { value: '480p', label: '480p' },
    ],
    ratios: [
      { value: '9:16', label: '9:16' },
      { value: '16:9', label: '16:9' },
      { value: '1:1', label: '1:1' },
      { value: '3:2', label: '3:2' },
      { value: '2:3', label: '2:3' },
    ],
    durations: [
      { value: '6', label: '6 秒' },
      { value: '10', label: '10 秒' },
      { value: '15', label: '15 秒' },
      { value: '20', label: '20 秒' },
      { value: '30', label: '30 秒' },
    ],
    grok15Durations: [
      { value: '10', label: '10 秒' },
      { value: '15', label: '15 秒' },
    ],
    grok10sDurations: [{ value: '10', label: '10 秒' }],
    grokMaxDurations: [
      { value: '6', label: '6 秒' },
      { value: '10', label: '10 秒' },
      { value: '12', label: '12 秒' },
      { value: '16', label: '16 秒' },
      { value: '20', label: '20 秒' },
      { value: '30', label: '30 秒' },
    ],
    grokMaxRatios: [
      { value: '9:16', label: '9:16' },
      { value: '16:9', label: '16:9' },
      { value: '1:1', label: '1:1' },
    ],
    defaultDuration: '10',
    maxCount: 3,
    resolutionKey: 'quality',
    ratioKey: 'ratio',
  },
  minimax: {
    provider: 'minimax-h3',
    models: [{ value: 'minimax-h3', label: 'MiniMax H3' }],
    ratios: [
      { value: '16:9', label: '16:9' },
      { value: '9:16', label: '9:16' },
      { value: '1:1', label: '1:1' },
      { value: '4:3', label: '4:3' },
      { value: '3:4', label: '3:4' },
      { value: '21:9', label: '21:9' },
    ],
    sizes: {
      '16:9': '2560x1440',
      '9:16': '1440x2560',
      '1:1': '1440x1440',
      '4:3': '1920x1440',
      '3:4': '1440x1920',
      '21:9': '3360x1440',
    },
    durations: [
      { value: '5', label: '5 秒' },
      { value: '6', label: '6 秒' },
      { value: '7', label: '7 秒' },
      { value: '8', label: '8 秒' },
      { value: '9', label: '9 秒' },
      { value: '10', label: '10 秒' },
      { value: '11', label: '11 秒' },
      { value: '12', label: '12 秒' },
      { value: '13', label: '13 秒' },
      { value: '14', label: '14 秒' },
      { value: '15', label: '15 秒' },
    ],
    defaultDuration: '5',
    defaultOrientation: 'landscape',
    maxCount: 1,
    resolutionKey: 'size',
    ratioKey: 'ratio',
  },
};

export const MINIMAX_H3_MODEL = 'minimax-h3';
export const MINIMAX_REFERENCE_IMAGE_MAX = 5;

export function getMiniMaxH3Size(ratio = '16:9') {
  const config = VIDEO_FAMILY_CONFIG.minimax;
  return config.sizes?.[ratio] || config.sizes?.['16:9'] || '2560x1440';
}

export function isMiniMaxH3Model(model = '') {
  const value = String(model).toLowerCase();
  return value === MINIMAX_H3_MODEL || value.includes('minimax-h3') || value.includes('minimax_h3');
}

export const GROK_15_MODEL = 'grok-imagine-video-1.5';
export const GROK_VIDEO3_MODEL = 'grok_video3';
export const GROK_10S_MODEL = 'grok-10s';
export const GROK_MAX_MODEL = 'grok-max';

export function isGrok15Model(model = '') {
  const value = String(model).toLowerCase();
  return (
    value === GROK_15_MODEL ||
    value === 'grok_video1.5_pro' ||
    value.includes('grok-imagine-video-1.5') ||
    value.includes('1.5_pro')
  );
}

export function isGrok10sModel(model = '') {
  return String(model).toLowerCase() === GROK_10S_MODEL;
}

export function isGrokMaxModel(model = '') {
  return String(model).toLowerCase() === GROK_MAX_MODEL;
}

export function getGrokReferenceImageMax(model = '') {
  if (isGrok15Model(model)) return 1;
  if (isGrokMaxModel(model)) return 5;
  return 7;
}

export function grokRequiresReferenceImage(model = '') {
  return isGrok15Model(model);
}

export const SEEDANCE_MANXUE_MODEL = 'seedance-2.0-manxue';

export function isSeedanceManxueModel(model = '') {
  const value = String(model).toLowerCase();
  return (
    value === SEEDANCE_MANXUE_MODEL ||
    value.startsWith('sd2_mx_') ||
    value.startsWith('sd2_manxue_') ||
    value === 'doubao-seedance-2.0-fast'
  );
}

export function isSeedanceStandardModel(model = '') {
  return String(model) === 'doubao-seedance-2.0';
}

export function isSeedance933Model(model = '') {
  return String(model).toLowerCase().includes('933');
}

export function resolutionFromManxueModel(model = '') {
  const value = String(model).toLowerCase();
  if (value.includes('720p')) return '720p';
  if (value.includes('1080p')) return '1080p';
  if (value.includes('2k')) return '2k';
  if (value.includes('4k')) return '4k';
  return '720p';
}

export function getDefaultVideoOrientation(family = DEFAULT_VIDEO_FAMILY) {
  return getVideoFamilyConfig(family).defaultOrientation || DEFAULT_VIDEO_ORIENTATION;
}

export function defaultSoraSize(orientation) {
  const resolved = orientation ?? getDefaultVideoOrientation('sora');
  return resolved === 'portrait' ? '720x1280' : '1280x720';
}

export function buildManxueApiModel(resolution = '720p') {
  const map = {
    '720p': 'sd2_mx_720p',
    '1080p': 'sd2_mx_1080p',
    '2k': 'sd2_mx_2k',
    '4k': 'sd2_mx_4k',
  };
  return map[String(resolution).toLowerCase()] || 'sd2_mx_720p';
}

export function normalizeSeedanceUiModel(model = '') {
  if (isSeedanceManxueModel(model) && model !== SEEDANCE_MANXUE_MODEL) {
    return SEEDANCE_MANXUE_MODEL;
  }
  if (model === 'doubao-seedance-2.0-fast') {
    return SEEDANCE_MANXUE_MODEL;
  }
  return model;
}

export function isSeedance25Model(model = '') {
  const value = String(model).toLowerCase().replace(/_/g, '-');
  return (
    value === SEEDANCE25_MODEL ||
    value === 'seedance2.5' ||
    value === 'seedance25' ||
    value.startsWith('seedance-2.5-') ||
    value.startsWith('seedance2.5-')
  );
}

export function buildSeedance25BillingModel(resolution = '480p') {
  const res = String(resolution).toLowerCase() === '720p' ? '720p' : '480p';
  return `${SEEDANCE25_MODEL}-${res}`;
}

export function inferVideoFamily(node = {}) {
  if (node.videoFamily && VIDEO_FAMILY_CONFIG[node.videoFamily]) {
    return node.videoFamily;
  }

  const model = String(node.videoModel || '').toLowerCase();
  if (model.includes('minimax') || model.includes('hailuo') || isMiniMaxH3Model(model)) return 'minimax';
  if (model.includes('grok')) return 'grok';
  if (isSeedance25Model(model)) return 'seedance25';
  if (isSeedanceManxueModel(model) || model.includes('seedance') || model.includes('doubao')) return 'seedance';
  if (model.includes('veo') || model.startsWith('sc-veo')) return 'veo';
  if (model.includes('omni') || model.includes('gemini')) return 'omni';
  if (model.includes('sora')) return 'sora';
  return DEFAULT_VIDEO_FAMILY;
}

export function getVideoReferenceImageMax(node = {}) {
  const family = inferVideoFamily(node);
  if (family === 'veo') return VEO_REFERENCE_IMAGE_MAX;
  if (family === 'seedance') return SEEDANCE_REF_IMAGE_MAX;
  if (family === 'seedance25') return SEEDANCE25_REF_IMAGE_MAX;
  if (family === 'omni') return OMNI_REFERENCE_IMAGE_MAX;
  if (family === 'grok') return getGrokReferenceImageMax(node.videoModel);
  if (family === 'minimax') return MINIMAX_REFERENCE_IMAGE_MAX;
  return VIDEO_GENERIC_REFERENCE_MAX;
}

export function getVideoFamilyConfig(family = DEFAULT_VIDEO_FAMILY) {
  return VIDEO_FAMILY_CONFIG[family] || VIDEO_FAMILY_CONFIG[DEFAULT_VIDEO_FAMILY];
}

export function getVideoModelOptions(family) {
  return getVideoFamilyConfig(family).models;
}

export function getVisibleVideoFamilyOptions(soraVisibility) {
  const showSora = isSoraFamilyVisible(soraVisibility);
  return VIDEO_FAMILY_OPTIONS.filter((item) => item.value !== 'sora' || showSora);
}

export function getVisibleSoraModelOptions(soraVisibility) {
  const visibility = normalizeSoraRouteVisibility(soraVisibility);
  return (VIDEO_FAMILY_CONFIG.sora?.models || []).filter((model) => {
    const value = String(model.value || '').toLowerCase();
    if (value.includes('stable')) return visibility.route3_visible;
    if (value.includes('gz-sp') || value.includes('-sp')) return visibility.route1_visible;
    return visibility.route1_visible || visibility.route3_visible;
  });
}

export function getVideoModelOptionsForVisibility(family, soraVisibility) {
  if (family === 'sora') {
    return getVisibleSoraModelOptions(soraVisibility);
  }
  return getVideoModelOptions(family);
}

export const DEFAULT_SORA_ROUTE_VISIBILITY = {
  route1_visible: true,
  route3_visible: true,
  route4_visible: true,
  route6_visible: false,
};

export function normalizeSoraRouteVisibility(raw) {
  return {
    route1_visible: raw?.route1_visible ?? DEFAULT_SORA_ROUTE_VISIBILITY.route1_visible,
    route3_visible: raw?.route3_visible ?? DEFAULT_SORA_ROUTE_VISIBILITY.route3_visible,
    route4_visible: raw?.route4_visible ?? DEFAULT_SORA_ROUTE_VISIBILITY.route4_visible,
    route6_visible: raw?.route6_visible ?? DEFAULT_SORA_ROUTE_VISIBILITY.route6_visible,
  };
}

/** canvas：Sora 特价/稳定版对应 admin route1 / route3（route4 仅控制 web 端 openai_sora-2） */
export function isSoraFamilyVisible(soraVisibility) {
  const visibility = normalizeSoraRouteVisibility(soraVisibility);
  return visibility.route1_visible || visibility.route3_visible;
}

export function getVideoResolutionOptions(family, model = '') {
  const config = getVideoFamilyConfig(family);
  if (family === 'sora' || family === 'minimax') {
    return [];
  }
  if (family === 'seedance' && isSeedanceManxueModel(model)) {
    return config.manxueResolutions || [];
  }
  if (family === 'seedance' && isSeedanceStandardModel(model)) {
    return config.resolutions || [];
  }
  if (family === 'seedance' && isSeedance933Model(model)) {
    return config.c933Resolutions || [];
  }
  return config.resolutions || [];
}

export function getVideoRatioOptions(family, model = '') {
  const config = getVideoFamilyConfig(family);
  if (family === 'grok' && isGrokMaxModel(model) && config.grokMaxRatios) {
    return config.grokMaxRatios;
  }
  return config.ratios || [];
}

export function getVideoDurationOptions(family, model = '') {
  const config = getVideoFamilyConfig(family);
  if (family === 'seedance' && isSeedanceManxueModel(model)) {
    return config.manxueDurations || config.durations || [];
  }
  if (family === 'seedance' && isSeedanceStandardModel(model)) {
    return config.standardDurations || config.durations || [];
  }
  if (family === 'seedance' && isSeedance933Model(model)) {
    return config.c933Durations || config.durations || [];
  }
  if (family === 'grok') {
    if (isGrok15Model(model)) return config.grok15Durations || config.durations || [];
    if (isGrok10sModel(model)) return config.grok10sDurations || config.durations || [];
    if (isGrokMaxModel(model)) return config.grokMaxDurations || config.durations || [];
  }
  return config.durations || [];
}

export function getVideoCountOptions(family) {
  const maxCount = getVideoFamilyConfig(family).maxCount;
  return VIDEO_COUNT_OPTIONS.filter((option) => option.value <= maxCount);
}

export function getDefaultVideoDuration(family = DEFAULT_VIDEO_FAMILY) {
  return getVideoFamilyConfig(family).defaultDuration || DEFAULT_VIDEO_DURATION;
}

export function normalizeVeoGenerationType(value) {
  return VEO_GENERATION_TYPE_OPTIONS.some((option) => option.value === value)
    ? value
    : DEFAULT_VEO_GENERATION_TYPE;
}

export function normalizeVideoModelSettings({
  family = DEFAULT_VIDEO_FAMILY,
  model = DEFAULT_VIDEO_MODEL,
  size = DEFAULT_VIDEO_SIZE,
  resolution = DEFAULT_VIDEO_RESOLUTION,
  orientation,
  ratio = DEFAULT_VIDEO_RATIO,
  quality = DEFAULT_VIDEO_QUALITY,
  duration,
  generationType,
  count = DEFAULT_VIDEO_COUNT,
  route = DEFAULT_VIDEO_ROUTE,
} = {}) {
  const config = getVideoFamilyConfig(family);
  const effectiveDuration = duration ?? getDefaultVideoDuration(family);
  const normalizedGenerationType = family === 'veo' ? normalizeVeoGenerationType(generationType) : undefined;
  const effectiveOrientation = orientation ?? getDefaultVideoOrientation(family);
  const modelOptions = config.models || [];
  const ratioOptions =
    family === 'grok' ? getVideoRatioOptions(family, model) : config.ratios || [];

  const isManxueSeedance = family === 'seedance' && isSeedanceManxueModel(model);
  const manxueResolutionOptions = config.manxueResolutions || [];

  let normalizedModel = modelOptions.some((option) => option.value === normalizeSeedanceUiModel(model))
    ? normalizeSeedanceUiModel(model)
    : isManxueSeedance
      ? SEEDANCE_MANXUE_MODEL
      : modelOptions[0]?.value;

  if (family === 'seedance' && isSeedanceManxueModel(model) && model !== SEEDANCE_MANXUE_MODEL) {
    normalizedModel = SEEDANCE_MANXUE_MODEL;
  }

  const durationOptions = getVideoDurationOptions(family, normalizedModel);
  const effectiveRatioOptions =
    family === 'grok' ? getVideoRatioOptions(family, normalizedModel) : ratioOptions;

  const normalizedRatio = effectiveRatioOptions.some((option) => option.value === (family === 'sora' ? effectiveOrientation : ratio))
    ? family === 'sora'
      ? effectiveOrientation
      : ratio
    : family === 'sora'
      ? getDefaultVideoOrientation(family)
      : effectiveRatioOptions[0]?.value;

  let normalizedResolution = resolution;
  if (family === 'sora') {
    normalizedResolution = defaultSoraSize(normalizedRatio);
  } else if (family === 'minimax') {
    // MiniMax H3 用 size（由比例映射），不走 resolution 列表
    normalizedResolution = undefined;
  } else if (family === 'seedance' && isSeedanceManxueModel(normalizedModel)) {
    const manxueResolutionFromModel = isManxueSeedance && model !== SEEDANCE_MANXUE_MODEL
      ? resolutionFromManxueModel(model)
      : resolution;
    normalizedResolution = manxueResolutionOptions.some(
      (option) => option.value === manxueResolutionFromModel
    )
      ? manxueResolutionFromModel
      : manxueResolutionOptions[0]?.value || '720p';
  } else if (family === 'grok') {
    const resolutionOptions = config.resolutions || [];
    const preferredQuality = quality || DEFAULT_VIDEO_QUALITY;
    normalizedResolution = resolutionOptions.some((option) => option.value === preferredQuality)
      ? preferredQuality
      : resolutionOptions[0]?.value || '720p';
  } else {
    const resolutionOptions = getVideoResolutionOptions(family, normalizedModel);
    normalizedResolution = resolutionOptions.some((option) => option.value === resolution)
      ? resolution
      : resolutionOptions[0]?.value;
  }

  const familyDefaultDuration = getDefaultVideoDuration(family);
  const modelDefaultDuration =
    family === 'grok' && isGrok15Model(normalizedModel)
      ? '10'
      : family === 'grok' && isGrok10sModel(normalizedModel)
        ? '10'
        : family === 'grok' && isGrokMaxModel(normalizedModel)
          ? '10'
          : family === 'grok'
            ? '6'
            : familyDefaultDuration;

  const normalizedDuration = durationOptions.some((option) => option.value === String(effectiveDuration))
    ? String(effectiveDuration)
    : durationOptions.some((option) => option.value === String(modelDefaultDuration))
      ? String(modelDefaultDuration)
      : durationOptions[0]?.value || familyDefaultDuration;

  const isManxueProvider = family === 'seedance' && isSeedanceManxueModel(normalizedModel);
  const provider = isManxueProvider ? 'seedance-manxue' : config.provider;
  const apiModel = isManxueProvider ? buildManxueApiModel(normalizedResolution) : normalizedModel;

  return {
    family,
    model: normalizedModel,
    apiModel,
    route: family === 'sora' ? route || config.route : undefined,
    provider,
    size:
      family === 'sora'
        ? normalizedResolution
        : family === 'minimax'
          ? getMiniMaxH3Size(normalizedRatio)
          : undefined,
    resolution: family === 'sora' || family === 'minimax' ? undefined : normalizedResolution,
    quality: family === 'grok' ? normalizedResolution : undefined,
    orientation: family === 'sora' ? normalizedRatio : undefined,
    ratio: family === 'sora' ? undefined : normalizedRatio,
    duration: normalizedDuration,
    generationType: normalizedGenerationType,
    count: Math.min(config.maxCount, Math.max(1, Number(count) || DEFAULT_VIDEO_COUNT)),
  };
}

export const IMAGE_MODEL_OPTIONS = [
  { value: 'gpt-image-2', label: 'gpt image2' },
  { value: 'gpt-image-1.5', label: 'gpt image 1.5' },
  { value: 'nanobanana2', label: 'nano banana2' },
  { value: 'nanobananapro', label: 'nano banana pro' },
];

export const IMAGE_RESOLUTION_OPTIONS = [
  { value: '1k', label: '1K' },
  { value: '2k', label: '2K' },
  { value: '4k', label: '4K' },
];

export const IMAGE_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1' },
  { value: '3:4', label: '3:4' },
  { value: '4:3', label: '4:3' },
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
];

export const GPT_IMAGE_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '5:4', label: '5:4' },
  { value: '4:5', label: '4:5' },
  { value: '2:1', label: '2:1' },
  { value: '1:2', label: '1:2' },
  { value: '21:9', label: '21:9' },
  { value: '9:21', label: '9:21' },
];

/** GPT Image 1.5 官方线路仅支持 1:1 / 2:3 / 3:2（对齐 jimiaiopengo） */
export const GPT_IMAGE15_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1' },
  { value: '2:3', label: '2:3' },
  { value: '3:2', label: '3:2' },
];

export const IMAGE_COUNT_OPTIONS = [
  { value: 1, label: '1 次' },
  { value: 2, label: '2 次' },
  { value: 3, label: '3 次' },
  { value: 4, label: '4 次' },
  { value: 5, label: '5 次' },
];

export const IMAGE_QUALITY_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
];

export const IMAGE_MODEL_LIMITS = {
  nanobanana2: {
    resolutions: ['1k', '2k', '4k'],
    ratios: IMAGE_RATIO_OPTIONS.map((option) => option.value),
    maxCount: 5,
  },
  nanobananapro: {
    resolutions: ['1k', '2k', '4k'],
    ratios: IMAGE_RATIO_OPTIONS.map((option) => option.value),
    maxCount: 5,
  },
  'gpt-image-2': {
    resolutions: ['1k', '2k', '4k'],
    ratios: GPT_IMAGE_RATIO_OPTIONS.map((option) => option.value),
    qualities: IMAGE_QUALITY_OPTIONS.map((option) => option.value),
    maxCount: 5,
  },
  'gpt-image-1.5': {
    resolutions: [],
    ratios: GPT_IMAGE15_RATIO_OPTIONS.map((option) => option.value),
    qualities: IMAGE_QUALITY_OPTIONS.map((option) => option.value),
    maxCount: 5,
  },
};

export function getImageModelLimits(model) {
  return IMAGE_MODEL_LIMITS[model] || IMAGE_MODEL_LIMITS[DEFAULT_IMAGE_MODEL];
}

export function getImageResolutionOptions(model) {
  const allowed = new Set(getImageModelLimits(model).resolutions || []);
  return IMAGE_RESOLUTION_OPTIONS.filter((option) => allowed.has(option.value));
}

export function getImageRatioOptions(model) {
  const allowed = new Set(getImageModelLimits(model).ratios);
  const source =
    model === 'gpt-image-2'
      ? GPT_IMAGE_RATIO_OPTIONS
      : model === 'gpt-image-1.5'
        ? GPT_IMAGE15_RATIO_OPTIONS
        : IMAGE_RATIO_OPTIONS;
  return source.filter((option) => allowed.has(option.value));
}

export function getImageCountOptions(model) {
  const maxCount = getImageModelLimits(model).maxCount;
  return IMAGE_COUNT_OPTIONS.filter((option) => option.value <= maxCount);
}

export function getImageQualityOptions(model) {
  const allowed = getImageModelLimits(model).qualities;
  if (!allowed) return [];
  const allowedSet = new Set(allowed);
  return IMAGE_QUALITY_OPTIONS.filter((option) => allowedSet.has(option.value));
}

export function normalizeImageModelSettings({
  model = DEFAULT_IMAGE_MODEL,
  resolution = DEFAULT_IMAGE_RESOLUTION,
  ratio = DEFAULT_IMAGE_RATIO,
  count = DEFAULT_IMAGE_COUNT,
  quality = DEFAULT_IMAGE_QUALITY,
} = {}) {
  const resolutionOptions = getImageResolutionOptions(model);
  const ratioOptions = getImageRatioOptions(model);
  const qualityOptions = getImageQualityOptions(model);
  const maxCount = getImageModelLimits(model).maxCount;

  return {
    model,
    resolution:
      resolutionOptions.length === 0
        ? ''
        : resolutionOptions.some((option) => option.value === resolution)
          ? resolution
          : resolutionOptions[0]?.value || DEFAULT_IMAGE_RESOLUTION,
    ratio: ratioOptions.some((option) => option.value === ratio)
      ? ratio
      : ratioOptions[0]?.value || DEFAULT_IMAGE_RATIO,
    count: Math.min(maxCount, Math.max(1, Number(count) || DEFAULT_IMAGE_COUNT)),
    quality:
      qualityOptions.length === 0
        ? undefined
        : qualityOptions.some((option) => option.value === quality)
          ? quality
          : qualityOptions[0]?.value || DEFAULT_IMAGE_QUALITY,
  };
}

export const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1d4ed8"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" rx="24" fill="url(#g)"/>
    <rect x="44" y="44" width="552" height="272" rx="20" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)"/>
    <circle cx="204" cy="156" r="32" fill="#38bdf8"/>
    <path d="M118 268L244 160L332 236L418 188L538 268" fill="none" stroke="#e0f2fe" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="320" y="312" text-anchor="middle" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="24">Canvas image node</text>
  </svg>
`)}`;
