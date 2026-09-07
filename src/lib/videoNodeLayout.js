import {
  DEFAULT_VIDEO_FAMILY,
  DEFAULT_VIDEO_RATIO,
  getDefaultVideoOrientation,
} from './constants';
import { buildImageNodeLayoutPatch, parseRatioValue } from './imageNodeLayout';

/** 横屏视频节点默认更宽，避免相对下方工具栏显得过小 */
export const VIDEO_OUTPUT_LANDSCAPE_BASE_WIDTH = 460;
export const VIDEO_OUTPUT_PORTRAIT_BASE_WIDTH = 240;
export const VIDEO_OUTPUT_SQUARE_BASE_WIDTH = 320;

export function resolveVideoAspectRatio(node = {}) {
  const family = node.videoFamily || DEFAULT_VIDEO_FAMILY;

  if (family === 'sora') {
    const orientation = node.videoOrientation || getDefaultVideoOrientation('sora');
    return orientation === 'portrait'
      ? { width: 9, height: 16 }
      : { width: 16, height: 9 };
  }

  const size = String(node.videoSize || '').toLowerCase();
  const match = size.match(/^(\d+)x(\d+)$/);
  if (match) {
    return {
      width: Math.max(1, Number(match[1]) || 1),
      height: Math.max(1, Number(match[2]) || 1),
    };
  }

  return parseRatioValue(
    node.videoRatio === 'auto' ? DEFAULT_VIDEO_RATIO : node.videoRatio || DEFAULT_VIDEO_RATIO
  );
}

function resolveVideoBaseWidth(aspect) {
  const width = Math.max(1, Number(aspect?.width) || 1);
  const height = Math.max(1, Number(aspect?.height) || 1);
  if (width > height * 1.05) return VIDEO_OUTPUT_LANDSCAPE_BASE_WIDTH;
  if (height > width * 1.05) return VIDEO_OUTPUT_PORTRAIT_BASE_WIDTH;
  return VIDEO_OUTPUT_SQUARE_BASE_WIDTH;
}

export function buildVideoNodeLayoutPatch(node = {}, aspectOverride = null) {
  const aspect =
    aspectOverride?.width && aspectOverride?.height
      ? {
          width: Math.max(1, Number(aspectOverride.width) || 1),
          height: Math.max(1, Number(aspectOverride.height) || 1),
        }
      : resolveVideoAspectRatio(node);

  return buildImageNodeLayoutPatch({
    imageCount: 1,
    aspectWidth: aspect.width,
    aspectHeight: aspect.height,
    baseWidth: resolveVideoBaseWidth(aspect),
  });
}

export async function resolveVideoOutputLayout(node = {}) {
  return buildVideoNodeLayoutPatch(node);
}
