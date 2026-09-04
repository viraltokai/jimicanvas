import {
  GROK_10S_MODEL,
  GROK_15_MODEL,
  GROK_MAX_MODEL,
  GROK_VIDEO3_MODEL,
  buildWan30BillingModel,
  isGrok10sModel,
  isGrok15Model,
  isGrokMaxModel,
} from './constants';

export function getUserPriceType(profile) {
  if (!profile) return 'standard';
  const roles = profile.roles || [];
  if (roles.includes('proxy') || roles.includes('agent')) {
    return 'agent_self';
  }
  if (profile.is_proxy_subordinate) {
    return 'proxy_sub';
  }
  return 'standard';
}

export function calculateCost(pricingList, modelName, profile) {
  if (!pricingList || !modelName) return 0;
  const p = pricingList.find(item => item.model_name === modelName);
  if (!p) return 0;

  const status = getUserPriceType(profile);
  const price = parseFloat(p.price) || 0;
  const proxyPrice = parseFloat(p.proxy_price) || 0;

  if (status === 'agent_self' || status === 'proxy_sub') {
    return proxyPrice > 0 ? proxyPrice : price;
  }
  // 创始会员 / 月付 / 年付 / 普通用户：消费统一走标准价
  return price;
}

export function resolveBillingModelName(node, options = {}) {
  const { hasVideoRefs = false } = options;

  if (node.type === 'image') {
    const model = node.imageModel || 'gpt-image-2';
    if (model === 'gpt-image-1.5') {
      const quality = String(node.imageQuality || 'auto').toLowerCase();
      if (!quality || quality === 'auto') return 'gpt-image-1.5';
      if (quality === 'low' || quality === 'medium' || quality === 'high') {
        return `gpt-image-1.5-${quality}`;
      }
      return 'gpt-image-1.5';
    }
    if (model === 'gpt-image-2') {
      const quality = String(node.imageQuality || 'auto').toLowerCase();
      const resolution = String(node.imageResolution || '1k').toLowerCase();
      if (quality === 'low' || quality === 'medium' || quality === 'high') {
        return `gpt-image-2-${quality}`;
      }
      // auto / 空：与后端一致，由分辨率映射到画质档
      if (resolution === '4k') return 'gpt-image-2-high';
      if (resolution === '2k') return 'gpt-image-2-medium';
      return 'gpt-image-2-low';
    }
    if (model === 'grok-imagine-image-2') {
      const resolution = String(node.imageResolution || '1k').toLowerCase();
      const quality = String(node.imageQuality || 'medium').toLowerCase() === 'low' ? 'low' : 'medium';
      return `grok-imagine-image-2-${resolution === '2k' ? '2k' : '1k'}-${quality}`;
    }
    const resolution = String(node.imageResolution || '1k').toLowerCase();
    return `${model}-${resolution}`;
  }
  
  if (node.type === 'video') {
    const family = node.videoFamily || 'seedance';
    const model = node.videoModel || (family === 'sora' ? 'sora2-gz-sp' : family === 'seedance' ? 'seedance-2.0-manxue' : '');
    const resolution = String(node.videoResolution || '720p').toLowerCase();
    const duration = String(node.videoDuration || '8');

    if (family === 'sora') {
      return model;
    }
    if (family === 'veo') {
      const isVeo31Route1 = ['veo3.1-fl', 'veo-3.1', 'veo3.1'].includes(model.toLowerCase());
      if (isVeo31Route1) {
        const is1080 = resolution === '1080p';
        const isRef = node.videoGenerationType === 'reference';
        if (isRef) {
          return is1080 ? 'veo3.1-hd' : 'veo3.1';
        } else {
          return is1080 ? 'veo3.1-hd-fl' : 'veo3.1-fl';
        }
      } else {
        if (resolution && resolution !== '720p') {
          return `${model}-${resolution}`;
        }
        return model;
      }
    }
    if (family === 'omni') {
      if (model === 'omni-10s') {
        return 'omni-10s';
      }
      if (hasVideoRefs) {
        return `${model}-${resolution}-video`;
      }
      return `${model}-${resolution}-${duration}s`;
    }
    if (family === 'seedance') {
      const modelName = String(node.videoModel || options.model || '').trim();
      if (modelName === 'seedance2.0-933' || modelName.includes('933')) {
        const res = resolution === '1080p' ? '1080p' : (resolution === '720p' ? '720p' : '480p');
        return `seedance2.0-933-${res}`;
      }
      const map = {
        '720p': 'sd2_mx_720p',
        '1080p': 'sd2_mx_1080p',
        '2k': 'sd2_mx_2k',
        '4k': 'sd2_mx_4k',
      };
      return map[resolution] || 'sd2_mx_720p';
    }
    if (family === 'seedance25') {
      return `seedance-2.5-${resolution === '720p' ? '720p' : '480p'}`;
    }
    if (family === 'seedance25gz') {
      const hasVideoRefs = Boolean(options.hasVideoRefs) || (Array.isArray(node.videoReferenceVideos) && node.videoReferenceVideos.length > 0);
      const res = resolution === '480p' ? '480p' : '720p';
      return hasVideoRefs ? `seedance2.5-gz-video-${res}` : `seedance2.5-gz-${res}`;
    }
    if (family === 'seedance25ar') {
      const modelName = String(node.videoModel || options.model || 'seedance2.5-md').trim();
      return modelName.includes('30s') ? 'seedance2.5-30s' : 'seedance2.5-md';
    }
    if (family === 'flux3') {
      const mode = String(node.videoFlux3Mode || options.flux3Mode || 't2v').toLowerCase();
      if (mode === 'i2v') return 'flux-3-i2v-draft';
      if (mode === 'flf') return 'flux-3-flf-draft';
      if (mode === 'keyframes') return 'flux-3-keyframes-draft';
      if (mode === 'enhance') return 'flux-3-enhance';
      return 'flux-3-draft';
    }
    if (family === 'grok') {
      const modelName = String(node.videoModel || options.model || '').trim();
      if (isGrok15Model(modelName)) return GROK_15_MODEL;
      if (isGrok10sModel(modelName)) return GROK_10S_MODEL;
      if (isGrokMaxModel(modelName)) return GROK_MAX_MODEL;
      return GROK_VIDEO3_MODEL;
    }
    if (family === 'minimax') {
      return 'minimax-h3';
    }
    if (family === 'wan30') {
      return buildWan30BillingModel(resolution || node.videoResolution || '480p');
    }
  }

  if (node.type === 'audio') {
    return 'gpt-4o-mini-tts';
  }

  return '';
}

export function calculateEstimatedCost(pricingList, node, profile, options = {}) {
  if (!pricingList || !node) return 0;
  
  const billingModel = resolveBillingModelName(node, options);
  if (!billingModel) return 0;

  let resolvedBillingModel = billingModel;
  let p = pricingList.find(item => item.model_name === resolvedBillingModel);
  if (!p && node.type === 'image' && (node.imageModel || '') === 'gpt-image-2') {
    const resolution = String(node.imageResolution || '1k').toLowerCase();
    const legacy = `gpt-image-2-${resolution === '4k' || resolution === '2k' || resolution === '1k' ? resolution : '1k'}`;
    const candidates = [billingModel, legacy, 'gpt-image-2'];
    for (const name of candidates) {
      const found = pricingList.find((item) => item.model_name === name);
      if (found) {
        resolvedBillingModel = name;
        p = found;
        break;
      }
    }
  }
  if (!p && node.type === 'image' && (node.imageModel || '') === 'grok-imagine-image-2') {
    const resolution = String(node.imageResolution || '1k').toLowerCase() === '2k' ? '2k' : '1k';
    const quality = String(node.imageQuality || 'medium').toLowerCase() === 'low' ? 'low' : 'medium';
    const candidates = [`grok-imagine-image-2-${resolution}-${quality}`];
    if (quality === 'medium') candidates.push(`grok-imagine-image-2-${resolution}`);
    candidates.push('grok-imagine-image-2');
    for (const name of candidates) {
      const found = pricingList.find((item) => item.model_name === name);
      if (found) {
        resolvedBillingModel = name;
        p = found;
        break;
      }
    }
  }
  if (!p) return 0;

  const unitPrice = calculateCost(pricingList, resolvedBillingModel, profile);
  const pricingType = p.pricing_type || 'standard';

  if (node.type === 'image' && (node.imageModel || '') === 'grok-imagine-image-2') {
    const refCount = Array.isArray(node.referenceImages)
      ? node.referenceImages.filter((item) => item && (item.url || item.data || item.path)).length
      : 0;
    let cost = unitPrice;
    if (refCount > 0) {
      const refUnit = calculateCost(pricingList, 'grok-imagine-image-2', profile);
      cost += refCount * refUnit;
    }
    return Math.round(cost * 10000) / 10000;
  }

  const family = node.type === 'video' ? node.videoFamily : '';
  const duration = Number(options.duration || (node.type === 'video' ? node.videoDuration : 0)) || 0;

  // Seedance 2.5 / Grok / Flux 3 / Wan 3.0 等按秒模型：强制单价 × 时长（不依赖 pricing_type 配置）
  if (
    family === 'seedance25' ||
    family === 'seedance25gz' ||
    family === 'grok' ||
    family === 'flux3' ||
    family === 'wan30'
  ) {
    if (duration > 0) {
      return Math.round(unitPrice * duration * 10000) / 10000;
    }
    return 0;
  }

  if (pricingType === 'seconds') {
    if (duration > 0) {
      return Math.round(unitPrice * duration * 10000) / 10000;
    }
    return 0;
  }
  
  return unitPrice;
}
