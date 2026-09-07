export function ModelIcon({ name = '', size = 18, className = '', invertOnDark = false }) {
  const normalized = String(name || '').toLowerCase();

  const iconId = (() => {
    if (normalized.includes('openai') || normalized.includes('gpt') || normalized === 'sora') {
      return normalized.includes('sora') ? 'sora' : 'openai';
    }
    if (normalized.includes('sora')) return 'sora';
    if (normalized.includes('google') || normalized.includes('gemini') || normalized.includes('veo') || normalized.includes('omni')) {
      return 'gemini';
    }
    if (normalized.includes('doubao') || normalized.includes('seedance') || normalized.includes('seedream') || normalized.includes('bytedance')) {
      return 'doubao';
    }
    if (normalized.includes('grok') || normalized.includes('xai')) return 'grok';
    if (normalized.includes('nanobanana') || normalized.includes('nano')) return 'nanobanana';
    if (normalized.includes('flux') || normalized.includes('blackforest') || normalized === 'bfl') {
      return 'blackforestlabs';
    }
    if (normalized.includes('minimax')) return 'minimax';
    if (normalized.includes('qwen') || normalized.includes('wan') || normalized.includes('tongyi') || normalized.includes('alibaba')) {
      return 'qwen';
    }
    return normalized || 'openai';
  })();

  const localUrl = (() => {
    const noSuffix = new Set(['openai', 'grok', 'blackforestlabs', 'bfl']);
    if (noSuffix.has(iconId)) return `/${iconId}.svg`;
    if (iconId === 'sora') return '/sora-color.svg';
    if (iconId === 'gemini') return '/gemini-color.svg';
    if (iconId === 'doubao') return '/doubao-color.svg';
    if (iconId === 'nanobanana') return '/nanobanana-color.svg';
    if (iconId === 'minimax') return '/minimax-color.svg';
    if (iconId === 'qwen') return '/qwen-color.svg';
    return `/${iconId}-color.svg`;
  })();

  const shouldInvert =
    invertOnDark || iconId === 'openai' || iconId === 'grok' || iconId === 'blackforestlabs';

  return (
    <img
      src={localUrl}
      alt=""
      width={size}
      height={size}
      className={`model-icon${shouldInvert ? ' model-icon--invertible' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

export function getImageModelIconName(model = '') {
  const value = String(model || '').toLowerCase();
  if (value.includes('nano')) return 'nanobanana';
  if (value.includes('grok')) return 'grok';
  if (value.includes('seedream')) return 'doubao';
  if (value.includes('gpt')) return 'openai';
  return 'openai';
}

export function getVideoFamilyIconName(family = '') {
  const value = String(family || '').toLowerCase();
  if (value.includes('seedance')) return 'doubao';
  if (value === 'veo' || value === 'omni') return 'gemini';
  if (value === 'sora') return 'sora';
  if (value === 'grok') return 'grok';
  if (value === 'flux3') return 'blackforestlabs';
  if (value === 'minimax') return 'minimax';
  if (value === 'wan30') return 'qwen';
  return 'doubao';
}
