import { DEFAULT_VIDEO_FAMILY, DEFAULT_VIDEO_ROUTE, OMNI_REFERENCE_IMAGE_MAX } from './constants';
import { requestJimiaigo, requestJimiaigoForm } from './jimiaigoApi';
import { normalizeImageUrl, uploadAsset } from './imageApi';
import {
  DEFAULT_VIDEO_TO_PROMPT_INSTRUCTION,
  formatStructuredPromptResult as formatVideoUnderstandingResult,
  parseStructuredPromptJson as parseVideoUnderstandingStructured,
} from './promptStructured';

export {
  DEFAULT_VIDEO_TO_PROMPT_INSTRUCTION,
  formatVideoUnderstandingResult,
  parseVideoUnderstandingStructured,
};

const TASK_SUCCESS_STATUS = new Set(['success', 'completed', 'succeed', '1']);
const TASK_FAILED_STATUS = new Set(['failed', 'error', 'failure', 'fail', 'cancelled', 'canceled', '2']);
const TASK_PENDING_STATUS = new Set([
  'pending',
  'queued',
  'processing',
  'in_progress',
  'running',
  'submitted',
  'created',
  'prompt_enhancing',
  'prompt_enhancement_checking',
  'image_downloading',
  '0',
]);

export function normalizeVideoUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (
    value.startsWith('data:video') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    /^https?:\/\//.test(value)
  ) {
    return value;
  }
  // public/ 下的画布内置演示视频，走前端静态资源，不要拼到 jimiaigo API 域名
  if (value.startsWith('/demo/')) {
    return value;
  }
  return normalizeImageUrl(value);
}

export async function getSoraRouteVisibility({ token } = {}) {
  const data = await requestJson('/api/video/sora/routes', { token, method: 'GET' });
  return data;
}

function requestJson(path, options) {
  return requestJimiaigo(path, {
    ...options,
    networkErrorMessage: '请求失败，无法连接到视频服务',
  });
}

function requestForm(path, { token, formData }) {
  return requestJimiaigoForm(path, {
    token,
    body: formData,
    fallback: '上传失败',
    networkErrorMessage: '上传失败，无法连接到视频服务',
  });
}

function buildReferenceImageUrls(referenceImages = []) {
  return (referenceImages || [])
    .map((image) => normalizeImageUrl(image.url || image.data || image.uploadedUrl))
    .filter(Boolean);
}

function buildVeoFrameImageUrl(image) {
  if (!image) return '';
  return normalizeImageUrl(image.url || image.data || image.uploadedUrl);
}

function buildVeoImages({ generationType, referenceImages = [], firstFrame, lastFrame }) {
  if (generationType === 'reference') {
    return buildReferenceImageUrls(referenceImages).slice(0, 3);
  }

  const first = buildVeoFrameImageUrl(firstFrame);
  const last = first ? buildVeoFrameImageUrl(lastFrame) : '';
  return [first, last].filter(Boolean);
}

function extractTaskId(data) {
  return data?.id || data?.projectId || data?.task_id || data?.taskId || data?.TaskID;
}

async function createSoraTask({ token, prompt, settings, referenceImages }) {
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('model', settings.model);
  formData.append('route', settings.route || DEFAULT_VIDEO_ROUTE);
  formData.append('duration', String(settings.duration));
  formData.append('orientation', settings.orientation);
  formData.append('size', settings.size);

  buildReferenceImageUrls(referenceImages).forEach((url) => formData.append('images', url));

  const data = await requestForm('/api/video/unified/create', { token, formData });
  const taskId = extractTaskId(data);
  if (!taskId) {
    throw new Error('视频任务创建成功，但未返回任务 ID');
  }

  return { taskId: String(taskId), provider: 'sora' };
}

async function createVeoTask({ token, prompt, settings, referenceImages, veoFrames = {} }) {
  const generationType = settings.generationType === 'reference' ? 'reference' : 'frame';
  const images = buildVeoImages({
    generationType,
    referenceImages,
    firstFrame: veoFrames.firstFrame,
    lastFrame: veoFrames.lastFrame,
  });
  const aspectRatio = settings.ratio === 'landscape' ? '16:9' : settings.ratio === 'portrait' ? '9:16' : settings.ratio;

  const data = await requestJson('/api/video/veo/frames/create', {
    token,
    method: 'POST',
    body: {
      model: settings.model,
      prompt,
      aspect_ratio: aspectRatio,
      duration: Number(settings.duration) || 8,
      resolution: settings.resolution,
      images,
      generation_type: generationType,
    },
  });

  const taskId = extractTaskId(data);
  if (!taskId) {
    throw new Error('VEO 任务创建成功，但未返回任务 ID');
  }

  const veoSource = data?.source === 'SC_VEO' ? 'SC_VEO' : 'KYY_VEO';

  return {
    taskId: String(taskId),
    provider: 'veo',
    queryModel: settings.model,
    veoSource,
  };
}

async function createOmniTask({ token, prompt, settings, referenceImages }) {
  const data = await requestJson('/api/video/gemini/create', {
    token,
    method: 'POST',
    body: {
      model: settings.model,
      prompt,
      duration: Number(settings.duration) || 6,
      resolution: settings.resolution,
      aspect_ratio: settings.ratio,
      image_urls: buildReferenceImageUrls(referenceImages).slice(0, OMNI_REFERENCE_IMAGE_MAX),
    },
  });

  const taskId = extractTaskId(data);
  if (!taskId) {
    throw new Error('Omni 任务创建成功，但未返回任务 ID');
  }

  return { taskId: String(taskId), provider: 'omni', queryModel: settings.model };
}

export function pickSeedanceAssetUrl(asset) {
  if (!asset) return '';
  const url = String(asset.url || asset.assetUrl || '').trim();
  if (url.startsWith('asset://')) return url;
  if (asset.assetId) return `asset://${asset.assetId}`;
  return '';
}

export function resolveSeedanceMediaPreviewUrl(item, mediaType = 'video') {
  if (!item) return '';
  const candidates = [
    item.previewUrl,
    item.preview,
    item.originalUrl,
    item.original_url,
    item.url,
    item.data,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  for (const raw of candidates) {
    if (raw.startsWith('asset://')) continue;
    const resolved = mediaType === 'image' ? normalizeImageUrl(raw) : normalizeVideoUrl(raw);
    if (resolved) return resolved;
  }
  return '';
}

function pickSeedancePreviewUrl(asset) {
  const mediaType = asset?.type === 'image' ? 'image' : asset?.type === 'audio' ? 'audio' : 'video';
  return resolveSeedanceMediaPreviewUrl(asset, mediaType);
}

function buildSeedanceReferencePayload(referenceImages = []) {
  const referenceImageUrls = [];
  const referenceImageAssets = [];

  (referenceImages || []).forEach((image) => {
    const assetUrl = pickSeedanceAssetUrl(image);
    const previewUrl = pickSeedancePreviewUrl(image) || buildVeoFrameImageUrl(image);
    if (previewUrl) referenceImageUrls.push(previewUrl);
    if (assetUrl) referenceImageAssets.push(assetUrl);
  });

  return { referenceImageUrls, referenceImageAssets };
}

export async function getSd2ManxueAssetList({
  token,
  page = 1,
  pageSize = 24,
  mediaType = 'image',
  status = 'Active',
}) {
  const data = await requestJson('/api/video/sd2manxue/asset/list', {
    token,
    query: {
      page,
      page_size: pageSize,
      media_type: mediaType,
      status,
    },
  });
  const list = Array.isArray(data?.list) ? data.list : [];
  return {
    list: list.map((item) => {
      const mapped = {
        id: item.assetId || item.id,
        assetId: item.assetId || item.id,
        url: item.assetId ? `asset://${item.assetId}` : '',
        originalUrl: item.originalUrl || item.original_url || '',
        previewUrl: item.previewUrl || item.preview_url || item.originalUrl || item.original_url || '',
        name: item.name || '素材',
        duration: item.duration,
        status: item.status || status,
        type: mediaType,
      };
      return {
        ...mapped,
        previewUrl: resolveSeedanceMediaPreviewUrl(mapped, mediaType),
      };
    }),
    total: data?.total || list.length,
  };
}

export async function submitSd2ManxueAudit({ token, mediaType = 'image', urls = [] }) {
  const payload = { audioUrls: [], imageUrls: [], videoUrls: [] };
  const list = (urls || []).map((url) => String(url || '').trim()).filter(Boolean);
  if (mediaType === 'video') payload.videoUrls = list;
  else if (mediaType === 'audio') payload.audioUrls = list;
  else payload.imageUrls = list;

  return requestJson('/api/video/sd2manxue/audit/submit', {
    token,
    method: 'POST',
    body: payload,
    fallback: '提交素材审核失败',
  });
}

export async function querySd2ManxueAuditStatus({ token, assetIds = [] }) {
  return requestJson('/api/video/sd2manxue/audit/status', {
    token,
    method: 'POST',
    body: { assetIds },
    fallback: '查询审核状态失败',
  });
}

function auditWait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadAndAuditSeedanceAssets({ token, mediaType = 'image', files = [] }) {
  const uploadedUrls = [];
  for (const file of files) {
    const uploaded = await uploadAsset({ token, file });
    const url = mediaType === 'image' ? normalizeImageUrl(uploaded) : normalizeVideoUrl(uploaded);
    if (url) uploadedUrls.push(url);
  }
  if (uploadedUrls.length === 0) {
    throw new Error('上传失败，未获得有效文件地址');
  }

  const data = await submitSd2ManxueAudit({ token, mediaType, urls: uploadedUrls });
  const items = Array.isArray(data?.items) ? data.items : [];
  const assetIds = items.map((item) => item.assetId).filter(Boolean);
  if (assetIds.length === 0) {
    throw new Error('提交审核失败，未返回素材 ID');
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await auditWait(2000);
    const statusData = await querySd2ManxueAuditStatus({ token, assetIds });
    const statusItems = Array.isArray(statusData?.items) ? statusData.items : [];
    const allActive =
      statusItems.length > 0 && statusItems.every((item) => item.status === 'Active');
    const hasFailed = statusItems.some(
      (item) => item.status === 'Failed' || item.status === 'Rejected'
    );
    if (allActive) {
      return { passed: true, assetIds };
    }
    if (hasFailed) {
      throw new Error('素材审核未通过');
    }
  }

  return { passed: false, assetIds };
}

async function createSeedanceManxueTask({
  token,
  prompt,
  settings,
  referenceImages,
  seedanceInputs = {},
}) {
  const { referenceImageUrls, referenceImageAssets } = buildSeedanceReferencePayload(referenceImages);
  const firstFrame = seedanceInputs.firstFrame;
  const lastFrame = seedanceInputs.lastFrame;
  const firstAsset = pickSeedanceAssetUrl(firstFrame);
  const lastAsset = pickSeedanceAssetUrl(lastFrame);
  const firstPreview = pickSeedancePreviewUrl(firstFrame) || buildVeoFrameImageUrl(firstFrame);
  const lastPreview = pickSeedancePreviewUrl(lastFrame) || buildVeoFrameImageUrl(lastFrame);
  const referenceVideos = (seedanceInputs.referenceVideos || [])
    .map(pickSeedanceAssetUrl)
    .filter(Boolean);
  const referenceAudios = (seedanceInputs.referenceAudios || [])
    .map(pickSeedanceAssetUrl)
    .filter(Boolean);

  const data = await requestJson('/api/video/sd2manxue/create', {
    token,
    method: 'POST',
    body: {
      model: settings.apiModel || settings.model,
      prompt,
      duration: Number(settings.duration) || 5,
      ratio: settings.ratio || '16:9',
      first_image: firstAsset,
      image: firstAsset,
      last_image: lastAsset,
      lastFrameImage: lastAsset,
      first_image_url: firstPreview,
      last_image_url: lastPreview,
      reference_image_urls: referenceImageUrls,
      referenceImages: referenceImageAssets,
      referenceVideos,
      referenceAudios,
      video_ref_duration: Number(seedanceInputs.videoRefDuration) || 0,
    },
  });

  const taskId = data?.projectId || extractTaskId(data);
  if (!taskId) {
    throw new Error('Seedance 2.0 满血版任务创建成功，但未返回任务 ID');
  }

  return { taskId: String(taskId), provider: 'seedance-manxue' };
}

async function createGrokTask({ token, prompt, settings, referenceImages }) {
  const images = buildReferenceImageUrls(referenceImages);
  const modelName = settings.model || 'grok-imagine-video-1.5';
  const isGrok15 =
    String(modelName).includes('1.5') || String(modelName).includes('grok_video1.5');
  const defaultDuration = isGrok15 ? 10 : 6;
  const data = await requestJson('/api/video/grok/create', {
    token,
    method: 'POST',
    body: {
      modelName,
      prompt,
      duration: Number(settings.duration) || defaultDuration,
      quality: settings.quality || '720p',
      ratio: settings.ratio || '9:16',
      imgUrl: images.join(','),
    },
  });

  const taskId = extractTaskId(data);
  if (!taskId) {
    throw new Error('Grok 任务创建成功，但未返回任务 ID');
  }

  return { taskId: String(taskId), provider: 'grok' };
}

async function createMiniMaxH3Task({ token, prompt, settings, referenceImages, veoFrames = {} }) {
  const images = buildReferenceImageUrls(referenceImages);
  const ratio = settings.ratio || '16:9';
  const sizeMap = {
    '16:9': '2560x1440',
    '9:16': '1440x2560',
    '1:1': '1440x1440',
    '4:3': '1920x1440',
    '3:4': '1440x1920',
    '21:9': '3360x1440',
  };
  const firstImage = String(veoFrames.firstFrame || '').trim();
  const lastImage = String(veoFrames.lastFrame || '').trim();
  const data = await requestJson('/api/video/minimax/h3/videos', {
    token,
    method: 'POST',
    body: {
      model: 'minimax-h3',
      prompt,
      duration: Number(settings.duration) || 5,
      aspect_ratio: ratio,
      size: settings.size || sizeMap[ratio] || '2560x1440',
      reference_images: images.slice(0, 5),
      first_image: firstImage || undefined,
      last_image: lastImage || undefined,
    },
  });

  const taskId = extractTaskId(data) || data?.task_id;
  if (!taskId) {
    throw new Error('MiniMax H3 任务创建成功，但未返回任务 ID');
  }

  return { taskId: String(taskId), provider: 'minimax-h3' };
}

function pickPublicMediaUrl(item) {
  if (!item) return '';
  if (typeof item === 'string') {
    const value = item.trim();
    return value.startsWith('asset://') ? '' : value;
  }
  const candidates = [item.url, item.preview, item.previewUrl, item.data, item.originalUrl];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value && !value.startsWith('asset://')) return value;
  }
  return '';
}

async function createSeedance25Task({
  token,
  prompt,
  settings,
  referenceImages,
  seedanceInputs = {},
}) {
  const images = buildReferenceImageUrls(referenceImages).slice(0, 30);
  const audios = (seedanceInputs.referenceAudios || []).map(pickPublicMediaUrl).filter(Boolean).slice(0, 10);
  const resolution = String(settings.resolution || '480p').toLowerCase() === '720p' ? '720p' : '480p';
  const ratio = ['16:9', '9:16', '1:1'].includes(settings.ratio) ? settings.ratio : '9:16';
  const duration = Math.min(30, Math.max(4, Number(settings.duration) || 4));

  const data = await requestJson('/api/video/seedance/25/videos', {
    token,
    method: 'POST',
    body: {
      model: 'seedance-2.5',
      prompt,
      duration,
      aspect_ratio: ratio,
      resolution,
      reference_images: images,
      reference_audios: audios,
    },
  });

  const taskId = extractTaskId(data) || data?.task_id;
  if (!taskId) {
    throw new Error('Seedance 2.5 任务创建成功，但未返回任务 ID');
  }

  return { taskId: String(taskId), provider: 'seedance-2.5' };
}

async function createFlux3Task({
  token,
  prompt,
  settings,
  referenceImages,
  veoFrames = {},
}) {
  const mode = String(settings.flux3Mode || 't2v').toLowerCase();
  const model =
    mode === 'i2v'
      ? 'flux-3-i2v-draft'
      : mode === 'flf'
        ? 'flux-3-flf-draft'
        : mode === 'enhance'
          ? 'flux-3-enhance'
          : 'flux-3-draft';
  const images = buildReferenceImageUrls(referenceImages);
  const duration = Math.min(20, Math.max(5, Number(settings.duration) || 5));
  const ratio = settings.ratio || '16:9';
  const generateAudio = settings.flux3GenerateAudio !== false;

  const body = {
    model,
    duration,
    aspect_ratio: ratio,
  };
  if (mode !== 'enhance') {
    body.prompt = prompt;
    body.generate_audio = generateAudio;
  }
  if (mode === 'i2v') {
    body.image_url = images[0] || undefined;
  }
  if (mode === 'flf') {
    body.start_image_url = String(veoFrames.firstFrame || '').trim() || undefined;
    body.end_image_url = String(veoFrames.lastFrame || '').trim() || undefined;
  }
  if (mode === 'enhance') {
    body.draft_cache_url = String(settings.flux3DraftCacheUrl || '').trim() || undefined;
  }

  const data = await requestJson('/api/video/flux3/videos', {
    token,
    method: 'POST',
    body,
  });

  const taskId = extractTaskId(data) || data?.task_id;
  if (!taskId) {
    throw new Error('Flux 3 任务创建成功，但未返回任务 ID');
  }

  return { taskId: String(taskId), provider: 'flux3' };
}

async function createSeedance933Task({
  token,
  prompt,
  settings,
  referenceImages,
  seedanceInputs = {},
}) {
  const images = buildReferenceImageUrls(referenceImages).slice(0, 9);
  const videos = (seedanceInputs.referenceVideos || []).map(pickPublicMediaUrl).filter(Boolean).slice(0, 3);
  const audios = (seedanceInputs.referenceAudios || []).map(pickPublicMediaUrl).filter(Boolean).slice(0, 3);

  const resolution = settings.resolution || '480p';
  const ratio = settings.ratio || '16:9';
  const duration = Number(settings.duration) || 4;

  const data = await requestJson('/api/video/seedance/933/videos', {
    token,
    method: 'POST',
    body: {
      model: 'seedance2.0-933',
      prompt,
      duration,
      ratio,
      aspect_ratio: ratio,
      resolution,
      reference_images: images,
      images,
      reference_videos: videos,
      videos,
      reference_audios: audios,
      audios,
    },
  });

  const taskId = extractTaskId(data) || data?.task_id;
  if (!taskId) {
    throw new Error('Seedance 2.0 933 任务创建成功，但未返回任务 ID');
  }

  return { taskId: String(taskId), provider: 'seedance-933' };
}

export async function createVideoGenerationTask({
  token,
  prompt,
  settings,
  referenceImages = [],
  veoFrames = {},
  seedanceInputs = {},
}) {
  const family = settings.family || DEFAULT_VIDEO_FAMILY;

  switch (family) {
    case 'veo':
      return createVeoTask({ token, prompt, settings, referenceImages, veoFrames });
    case 'omni':
      return createOmniTask({ token, prompt, settings, referenceImages });
    case 'seedance':
      if (settings.model === 'seedance2.0-933') {
        return createSeedance933Task({ token, prompt, settings, referenceImages, seedanceInputs });
      }
      return createSeedanceManxueTask({ token, prompt, settings, referenceImages, seedanceInputs });
    case 'seedance25':
      return createSeedance25Task({ token, prompt, settings, referenceImages, seedanceInputs });
    case 'flux3':
      return createFlux3Task({ token, prompt, settings, referenceImages, veoFrames });
    case 'grok':
      return createGrokTask({ token, prompt, settings, referenceImages });
    case 'minimax':
      return createMiniMaxH3Task({ token, prompt, settings, referenceImages, veoFrames });
    case 'sora':
    default:
      return createSoraTask({ token, prompt, settings, referenceImages });
  }
}

function pickTaskVideoUrl(task) {
  if (!task) return '';
  return normalizeVideoUrl(task.videoPath || task.video_path || '');
}

export async function queryOmniVideoTaskOnce({ token, taskId, queryModel }) {
  return requestJson('/api/video/gemini/query', {
    token,
    query: {
      id: taskId,
      model: queryModel || 'Gemini-Omini',
    },
  });
}

export function pickOmniQueryVideoUrl(data) {
  if (!data) return '';
  return normalizeVideoUrl(
    data.result?.video_url ||
      data.result?.videoUrl ||
      data.video_url ||
      data.videoUrl ||
      data.mediaUrl ||
      ''
  );
}

function normalizeTaskStatus(status) {
  return String(status ?? '').trim().toLowerCase();
}

function isTaskSuccess(status) {
  const normalized = normalizeTaskStatus(status);
  return TASK_SUCCESS_STATUS.has(normalized);
}

function isTaskFailed(status) {
  const normalized = normalizeTaskStatus(status);
  return TASK_FAILED_STATUS.has(normalized);
}

function isTaskPending(status) {
  const normalized = normalizeTaskStatus(status);
  return !normalized || TASK_PENDING_STATUS.has(normalized);
}

/** 后端创建视频后异步写入 ai_tasks，首轮轮询可能返回「任务不存在」 */
function isTaskRecordPendingError(error) {
  const message = String(error?.message || error || '');
  return /任务不存在/.test(message);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getTaskDetail({ token, taskId, allowPendingRecord = false } = {}) {
  try {
    return await requestJson(`/api/task/${encodeURIComponent(taskId)}`, { token });
  } catch (error) {
    if (allowPendingRecord && isTaskRecordPendingError(error)) {
      return null;
    }
    throw error;
  }
}

export async function waitForVideoTask({
  token,
  taskId,
  maxAttempts = 400,
  intervalMs = 3000,
  onProgress,
}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const task = await getTaskDetail({ token, taskId, allowPendingRecord: true });

    if (!task) {
      if (onProgress) {
        onProgress({
          status: 'pending',
          progress: 0,
        });
      }
      // 落库有延迟：前几次短间隔重试，之后按正常轮询间隔
      await wait(attempt < 12 ? 500 : intervalMs);
      continue;
    }

    const status = task?.status;

    if (onProgress) {
      onProgress({
        status,
        progress: Number(task?.progress) || 0,
      });
    }

    if (isTaskSuccess(status)) {
      const videoUrl = pickTaskVideoUrl(task);
      if (!videoUrl) {
        await wait(intervalMs);
        continue;
      }
      return videoUrl;
    }

    if (isTaskFailed(status)) {
      throw new Error(task?.remark || '视频生成失败');
    }

    if (!isTaskPending(status)) {
      throw new Error(`未知的视频任务状态: ${status || 'unknown'}`);
    }

    await wait(intervalMs);
  }

  throw new Error('视频生成超时，请稍后重试');
}

export async function downloadVideoFile(url, filename = 'video.mp4') {
  const href = normalizeVideoUrl(url);
  if (!href) throw new Error('没有可下载的视频');

  try {
    const response = await fetch(href);
    if (!response.ok) throw new Error('下载失败');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  }
}

const VIDEO_UNDERSTAND_POLL_INTERVAL_MS = 3000;
const VIDEO_UNDERSTAND_MAX_RETRIES = 100;

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToVideoInlineData(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mime_type: match[1],
    data: match[2],
  };
}

async function urlToVideoInlineData(url) {
  const normalized = normalizeVideoUrl(url);
  if (!normalized) return null;

  if (normalized.startsWith('data:')) {
    return dataUrlToVideoInlineData(normalized);
  }

  const response = await fetch(normalized, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`视频读取失败: ${response.statusText}`);
  }

  const blob = await response.blob();
  const dataUrl = await fileToDataUrl(blob);
  const inlineData = dataUrlToVideoInlineData(dataUrl);
  if (inlineData && !inlineData.mime_type) {
    inlineData.mime_type = blob.type || 'video/mp4';
  }
  return inlineData;
}

async function pollVideoUnderstandingTask(token, taskId) {
  for (let attempt = 0; attempt < VIDEO_UNDERSTAND_MAX_RETRIES; attempt += 1) {
    const task = await requestJson(`/api/video/understand/task/${encodeURIComponent(taskId)}`, {
      token,
      method: 'GET',
      networkErrorMessage: '视频理解状态查询失败，无法连接到服务',
    });

    const status = String(task?.status || '').toLowerCase();
    if (status === 'completed') {
      const result = String(task?.result || '').trim();
      if (!result) {
        throw new Error('视频理解返回内容为空');
      }
      return result;
    }

    if (status === 'failed') {
      throw new Error(String(task?.error || '视频理解失败'));
    }

    await sleep(VIDEO_UNDERSTAND_POLL_INTERVAL_MS);
  }

  throw new Error('视频理解任务执行时间过长，请稍后在任务中心查看');
}

export async function understandVideo({
  token,
  videoUrls = [],
  promptText = '',
  language = 'zh',
  type = '',
}) {
  const urls = (videoUrls || []).map((url) => String(url || '').trim()).filter(Boolean);
  if (!urls.length) {
    throw new Error('请先连接有效视频或上传视频后再反推提示词');
  }

  const parts = [];
  for (const videoUrl of urls) {
    const inlineData = await urlToVideoInlineData(videoUrl);
    if (inlineData) {
      parts.push({ inline_data: inlineData });
    }
  }

  if (!parts.length) {
    throw new Error('无法读取视频内容，请检查视频是否可访问');
  }

  const instruction = String(promptText || '').trim() || DEFAULT_VIDEO_TO_PROMPT_INSTRUCTION;
  parts.push({ text: instruction });

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {},
  };
  if (language) body.language = language;
  if (type) body.type = type;

  const submission = await requestJson('/api/video/understand/async', {
    token,
    method: 'POST',
    body,
    networkErrorMessage: '视频理解失败，无法连接到服务',
  });

  const taskId = submission?.taskId || submission?.task_id;
  if (!taskId) {
    throw new Error('视频理解任务提交失败，未返回任务 ID');
  }

  await sleep(2000);
  return pollVideoUnderstandingTask(token, taskId);
}
