let MODEL_ACTIVE_MAP = null;

export function updateModelActiveMap(list) {
  if (!Array.isArray(list)) return;
  const next = {};
  list.forEach((item) => {
    const name = String(item?.model_name || '').trim();
    if (name) next[name] = item.is_active !== false;
  });
  MODEL_ACTIVE_MAP = next;
}

export function hasModelActiveMap() {
  return MODEL_ACTIVE_MAP != null;
}

function resolveActiveMapKey(modelName) {
  if (!MODEL_ACTIVE_MAP || !modelName) return null;
  if (modelName in MODEL_ACTIVE_MAP) return modelName;
  const lower = String(modelName).toLowerCase();
  const actual = Object.keys(MODEL_ACTIVE_MAP).find((key) => key.toLowerCase() === lower);
  return actual || null;
}

/** 价格表未收录视为可用；收录且停用则不可用。未加载时不过滤。 */
export function isPricedModelActive(modelName) {
  if (!MODEL_ACTIVE_MAP) return true;
  const key = resolveActiveMapKey(modelName);
  if (!key) return true;
  return MODEL_ACTIVE_MAP[key] !== false;
}

/** 画布图片生成走队列，看异步键 gpt-image-2-4k，不看 -sync。 */
export function isResolutionEnabled(baseModel, resolution, sync = false) {
  const res = String(resolution || '').toLowerCase().trim();
  if (!baseModel || !res) return true;
  const asyncName = `${baseModel}-${res}`;
  const syncName = `${asyncName}-sync`;
  if (sync) {
    if (resolveActiveMapKey(syncName)) return isPricedModelActive(syncName);
    return isPricedModelActive(asyncName);
  }
  return isPricedModelActive(asyncName);
}

export function filterActiveResolutions(baseModel, options, sync = false) {
  if (!MODEL_ACTIVE_MAP || !Array.isArray(options)) return options || [];
  return options.filter((item) =>
    isResolutionEnabled(baseModel, String(item?.value || item?.id || ''), sync),
  );
}

/** 产品在价格表中有变体时，至少一条启用才显示；未收录则保持显示。 */
export function isProductPricingActive(productId) {
  if (!MODEL_ACTIVE_MAP) return true;
  const id = String(productId || '').trim().toLowerCase();
  if (!id) return true;
  const related = Object.keys(MODEL_ACTIVE_MAP).filter((key) => {
    const n = key.toLowerCase();
    return n === id || n.startsWith(`${id}-`) || n.startsWith(`${id}_`);
  });
  if (related.length === 0) return true;
  return related.some((key) => MODEL_ACTIVE_MAP?.[key] !== false);
}
