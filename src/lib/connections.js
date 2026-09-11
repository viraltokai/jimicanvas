import {
  PLACEHOLDER_IMAGE,
  DEFAULT_VIDEO_URL,
  getImageReferenceMax,
  inferVideoFamily,
  getVideoReferenceImageMax,
  normalizeSeedanceInputMode,
  getVideoReferenceVideoMax,
  resolveVideoGenerationType,
  VIDEO_FRAME_IMAGE_CONNECTION_MAX,
} from './constants';
import { isDefaultDemoImageUrl, getImageNodeDisplayImages } from './imageNodeLayout';
import { isVideoContent } from './canvas';
import { normalizeImageUrl } from './imageApi';

export function getIncomingConnections(nodeId, connections = []) {
  return connections.filter((link) => link.toNodeId === nodeId);
}

export function getTextInputLinks(nodeId, nodes = [], connections = []) {
  return getIncomingConnections(nodeId, connections)
    .map((link) => ({
      linkId: link.id,
      node: nodes.find((item) => item.id === link.fromNodeId),
    }))
    .filter((item) => item.node?.type === 'note');
}

export function getTextInputPreview(node) {
  if (!node) return '';
  const content = String(node.content || '').trim();
  const prompt = String(node.prompt || '').trim();
  const title = String(node.title || '').trim();
  // 文本引用优先用结果区 content；占位/失败文案时回退到输入 prompt
  const placeholderContents = new Set([
    '双击并编辑',
    '运行后显示结果',
    '暂无结果',
    '文本节点内容为空',
    '缺少 token',
  ]);
  const isPlaceholder =
    !content ||
    placeholderContents.has(content) ||
    node.status === 'error' ||
    content.startsWith('运行失败') ||
    content.startsWith('生成失败');
  if (!isPlaceholder) return content;
  return prompt || title;
}

export function formatTextInputLabel(node, maxLength = 18) {
  if (!node) return '空文本';

  const preview = getTextInputPreview(node).replace(/\s+/g, ' ');
  const label = preview || '文本节点';

  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength)}…`;
}

export function resolveImagePrompt(node, nodes = [], connections = []) {
  const ownPrompt = String(node?.prompt || '').trim();
  if (ownPrompt) return ownPrompt;

  return getTextInputLinks(node.id, nodes, connections)
    .map((item) => getTextInputPreview(item.node))
    .filter(Boolean)
    .join('\n\n');
}

export function resolveAudioPrompt(node, nodes = [], connections = []) {
  return resolveImagePrompt(node, nodes, connections);
}

export function hasImagePromptSource(node, nodes = [], connections = []) {
  return Boolean(resolveImagePrompt(node, nodes, connections));
}

export function getImageInputLinks(nodeId, nodes = [], connections = []) {
  return getIncomingConnections(nodeId, connections)
    .map((link) => ({
      linkId: link.id,
      node: nodes.find((item) => item.id === link.fromNodeId),
    }))
    .filter((item) => item.node?.type === 'image');
}

export function getVideoInputLinks(nodeId, nodes = [], connections = []) {
  return getIncomingConnections(nodeId, connections)
    .map((link) => ({
      linkId: link.id,
      node: nodes.find((item) => item.id === link.fromNodeId),
    }))
    .filter((item) => item.node?.type === 'video');
}

export function getImageNodeOutputUrl(node) {
  if (!node || node.type !== 'image') return '';
  const display = getImageNodeDisplayImages(node);
  return display[0] || '';
}

export function getImageNodeReferenceUrl(node) {
  const url = getImageNodeOutputUrl(node);
  if (!url || isDefaultDemoImageUrl(url)) return '';
  return normalizeImageUrl(url) || url;
}

export function isDefaultDemoVideoUrl(url) {
  const value = String(url || '').trim();
  if (!value || !DEFAULT_VIDEO_URL) return false;
  return value === DEFAULT_VIDEO_URL || value.endsWith(DEFAULT_VIDEO_URL);
}

export function getVideoNodeOutputUrl(node) {
  if (!node || node.type !== 'video') return '';

  const videos = Array.isArray(node.videos) && node.videos.length > 0 ? node.videos : [];
  if (videos[0]) return videos[0];

  const content = String(node.content || '').trim();
  if (content && isVideoContent(content)) return content;

  return '';
}

export function getVideoNodeReferenceUrl(node) {
  const url = getVideoNodeOutputUrl(node);
  if (!url || isDefaultDemoVideoUrl(url)) return '';
  return url;
}

export function resolveNoteVideoInputUrls(videoInputLinks = []) {
  return (videoInputLinks || [])
    .map(({ linkId, node }) => {
      const url = getVideoNodeReferenceUrl(node);
      return url ? { linkId, node, url } : null;
    })
    .filter(Boolean);
}

export function isVideoToPromptNode(node, videoInputLinks = []) {
  if (!node || node.type !== 'note') return false;
  if (node.workflowMode === 'video-to-prompt') return true;
  if (node.workflowMode === 'image-to-prompt') return false;
  return (videoInputLinks || []).length > 0;
}

export function resolveNoteImageInputUrls(imageInputLinks = []) {
  return (imageInputLinks || [])
    .map(({ linkId, node }) => {
      const url = getImageNodeReferenceUrl(node);
      return url ? { linkId, node, url } : null;
    })
    .filter(Boolean);
}

export function isImageToPromptNode(node, imageInputLinks = []) {
  if (!node || node.type !== 'note') return false;
  if (node.workflowMode === 'video-to-prompt') return false;
  if (node.workflowMode === 'image-to-prompt') return true;
  return (imageInputLinks || []).length > 0;
}

function dedupeReferenceImages(references = []) {
  const seen = new Set();
  return references.filter((item) => {
    const key = item.url || item.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeImageReferenceImages(node, imageInputLinks = []) {
  const maxRef = getImageReferenceMax(node?.imageModel);
  const assetRefs = Array.isArray(node?.referenceImages) ? [...node.referenceImages] : [];
  const connected = (imageInputLinks || [])
    .map((item) => {
      const url = getImageNodeReferenceUrl(item.node);
      if (!url) return null;
      return {
        id: `conn-${item.linkId}`,
        linkId: item.linkId,
        url,
        name: formatImageInputLabel(item.node),
        source: 'connection',
      };
    })
    .filter(Boolean);

  return dedupeReferenceImages([...connected, ...assetRefs]).slice(0, maxRef);
}

export function resolveImageReferenceImages(node, nodes = [], connections = []) {
  return mergeImageReferenceImages(node, getImageInputLinks(node.id, nodes, connections));
}

export function formatImageInputLabel(node, maxLength = 18) {
  if (!node) return '图片节点';

  const title = String(node.title || '').trim();
  if (title && title !== '图片节点') {
    return title.length <= maxLength ? title : `${title.slice(0, maxLength)}…`;
  }

  return '图片节点';
}

export function formatVideoInputLabel(node, maxLength = 18) {
  if (!node) return '视频节点';

  const title = String(node.title || '').trim();
  if (title && title !== '视频节点') {
    return title.length <= maxLength ? title : `${title.slice(0, maxLength)}…`;
  }

  return '视频节点';
}

export function resolveVideoPrompt(node, nodes = [], connections = []) {
  const ownPrompt = String(node?.prompt || '').trim();
  if (ownPrompt) return ownPrompt;

  return getTextInputLinks(node.id, nodes, connections)
    .map((item) => getTextInputPreview(item.node))
    .filter(Boolean)
    .join('\n\n');
}

export function isVideoFrameImageMode(node) {
  const family = inferVideoFamily(node);
  if (family === 'veo' || family === 'minimax') {
    return resolveVideoGenerationType(node) === 'frame';
  }
  if (family === 'flux3') {
    return String(node?.videoFlux3Mode || 't2v') === 'flf';
  }
  if (family === 'seedance' || family === 'seedance25gz') {
    return normalizeSeedanceInputMode(node?.videoGenerationType, node) === 'frame';
  }
  return false;
}

export function isVideoReferenceImageMode(node) {
  const family = inferVideoFamily(node);
  if (family === 'veo' || family === 'minimax') {
    return resolveVideoGenerationType(node) === 'reference';
  }
  if (family === 'flux3') {
    const mode = String(node?.videoFlux3Mode || 't2v');
    return mode === 'i2v' || mode === 'keyframes';
  }
  if (family === 'seedance' || family === 'seedance25gz') {
    return normalizeSeedanceInputMode(node?.videoGenerationType, node) === 'reference';
  }
  // 其他模型仅支持参考图，不支持首尾帧
  return true;
}

export function getVideoImageConnectionMax(node) {
  const family = inferVideoFamily(node);
  if (family === 'seedance' || family === 'seedance25gz') {
    const mode = normalizeSeedanceInputMode(node?.videoGenerationType, node);
    if (mode === 't2v') return 0;
    if (mode === 'frame') return VIDEO_FRAME_IMAGE_CONNECTION_MAX;
    return getVideoReferenceImageMax(node);
  }
  if (family === 'veo' || family === 'minimax') {
    if (resolveVideoGenerationType(node) === 'frame') {
      return VIDEO_FRAME_IMAGE_CONNECTION_MAX;
    }
    return getVideoReferenceImageMax(node);
  }
  if (isVideoFrameImageMode(node)) {
    return VIDEO_FRAME_IMAGE_CONNECTION_MAX;
  }
  return getVideoReferenceImageMax(node);
}

export function buildVideoConnectedImageAsset(linkItem) {
  if (!linkItem?.linkId || !linkItem?.node) return null;
  const url = getImageNodeReferenceUrl(linkItem.node);
  return {
    id: `conn-${linkItem.linkId}`,
    linkId: linkItem.linkId,
    url: url || '',
    name: formatImageInputLabel(linkItem.node),
    source: 'connection',
    pending: !url,
  };
}

export function resolveVideoConnectedImageAssets(imageInputLinks = []) {
  return (imageInputLinks || []).map(buildVideoConnectedImageAsset).filter(Boolean);
}

export function buildVideoConnectedVideoAsset(linkItem) {
  if (!linkItem?.linkId || !linkItem?.node) return null;
  const url = getVideoNodeReferenceUrl(linkItem.node);
  return {
    id: `conn-${linkItem.linkId}`,
    linkId: linkItem.linkId,
    url: url || '',
    name: formatVideoInputLabel(linkItem.node),
    source: 'connection',
    pending: !url,
  };
}

export function resolveVideoConnectedVideoAssets(videoInputLinks = []) {
  return (videoInputLinks || []).map(buildVideoConnectedVideoAsset).filter(Boolean);
}

function dedupeReferenceMedia(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.linkId || item.id || item.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveVideoToolbarReferences(node, imageInputLinks = []) {
  const assetRefs = Array.isArray(node?.referenceImages) ? [...node.referenceImages] : [];
  if (!isVideoReferenceImageMode(node)) {
    return [];
  }

  const connected = resolveVideoConnectedImageAssets(imageInputLinks);
  const max = getVideoReferenceImageMax(node);

  return dedupeReferenceImages([...connected, ...assetRefs]).slice(0, max);
}

export function resolveVideoToolbarReferenceVideos(node, videoInputLinks = [], maxAssetCount = Infinity) {
  const assetRefs = Array.isArray(node?.videoReferenceVideos) ? [...node.videoReferenceVideos] : [];
  const connected = resolveVideoConnectedVideoAssets(videoInputLinks);
  const limitedAssets =
    Number.isFinite(maxAssetCount) && maxAssetCount >= 0 ? assetRefs.slice(0, maxAssetCount) : assetRefs;
  return dedupeReferenceMedia([...connected, ...limitedAssets]);
}

export function resolveVideoToolbarFrames(node, imageInputLinks = []) {
  const connected = resolveVideoConnectedImageAssets(imageInputLinks);
  let connIdx = 0;

  let firstFrame = node?.videoFirstFrame || null;
  let lastFrame = node?.videoLastFrame || null;
  let firstConnectionLinkId = null;
  let lastConnectionLinkId = null;

  if (!firstFrame && connected[connIdx]) {
    firstFrame = connected[connIdx];
    firstConnectionLinkId = connected[connIdx].linkId;
    connIdx += 1;
  }
  if (!lastFrame && connected[connIdx]) {
    lastFrame = connected[connIdx];
    lastConnectionLinkId = connected[connIdx].linkId;
  }

  return {
    firstFrame,
    lastFrame,
    firstConnectionLinkId,
    lastConnectionLinkId,
  };
}

export function resolveVideoGenerationFrames(node, nodes = [], connections = []) {
  if (!isVideoFrameImageMode(node)) {
    return { firstFrame: null, lastFrame: null };
  }
  const imageInputLinks = getImageInputLinks(node.id, nodes, connections);
  const { firstFrame, lastFrame } = resolveVideoToolbarFrames(node, imageInputLinks);
  return {
    firstFrame: firstFrame?.url ? firstFrame : null,
    lastFrame: lastFrame?.url ? lastFrame : null,
  };
}

export function validateVideoImageConnection(videoNode, imageInputLinks = []) {
  if (!videoNode || videoNode.type !== 'video') return null;

  const max = getVideoImageConnectionMax(videoNode);
  if (max <= 0) {
    return '当前模式不支持连接图片，请先切换到首尾帧或全能参考';
  }
  if (imageInputLinks.length >= max) {
    if (isVideoFrameImageMode(videoNode)) {
      return `首尾帧模式最多连接 ${VIDEO_FRAME_IMAGE_CONNECTION_MAX} 张图片`;
    }
    return `参考图模式最多连接 ${max} 张图片`;
  }

  return null;
}

/** 校验节点连线是否合法；返回错误文案，合法则返回 null */
export function validateNodeConnection(fromNode, toNode) {
  if (!fromNode || !toNode) return '无效节点';
  if (fromNode.id === toNode.id) return '不能连接到自身';

  // 图片节点只接受文本 / 图片引用，不允许视频节点连入
  if (fromNode.type === 'video' && toNode.type === 'image') {
    return '图片节点不支持引用视频节点';
  }

  return null;
}

export function resolveVideoReferenceImages(node, nodes = [], connections = []) {
  if (!isVideoReferenceImageMode(node)) {
    return [];
  }
  const imageInputLinks = getImageInputLinks(node.id, nodes, connections);
  return resolveVideoToolbarReferences(node, imageInputLinks)
    .filter((item) => item.url)
    .map((item) => ({
      id: item.id,
      linkId: item.linkId,
      url: item.url,
      name: item.name,
      source: item.source,
    }));
}

export function resolveVideoReferenceVideos(node, nodes = [], connections = [], maxAssetCount = Infinity) {
  const videoInputLinks = getVideoInputLinks(node.id, nodes, connections);
  return resolveVideoToolbarReferenceVideos(node, videoInputLinks, maxAssetCount).filter((item) => item.url);
}

export function resolveVideoToolbarVideos(node, videoInputLinks = []) {
  const max = getVideoReferenceVideoMax(node);
  if (max <= 0) return [];
  return resolveVideoToolbarReferenceVideos(node, videoInputLinks, max);
}

export function validateVideoVideoConnection(videoNode, videoInputLinks = []) {
  if (!videoNode || videoNode.type !== 'video') return null;

  const family = inferVideoFamily(videoNode);
  const max = getVideoReferenceVideoMax(videoNode);
  if (max <= 0) {
    if (family === 'sora') return 'Sora 暂不支持参考视频，连线不会传入生成参数';
    if (family === 'veo') return 'VEO 暂不支持参考视频，连线不会传入生成参数';
    if (family === 'grok') return 'Grok 暂不支持参考视频，连线不会传入生成参数';
    return '当前模型暂不支持参考视频';
  }
  if (family === 'seedance' && isVideoFrameImageMode(videoNode)) {
    return '首尾帧模式不可添加参考视频';
  }
  if (videoInputLinks.length >= max) {
    return `参考视频最多连接 ${max} 个`;
  }
  return null;
}

export function hasVideoPromptSource(node, nodes = [], connections = []) {
  return Boolean(resolveVideoPrompt(node, nodes, connections));
}
