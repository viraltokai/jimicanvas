import { DEFAULT_TEXT_MODEL, TEXT_MODEL_OPTIONS } from './constants';

/** 与小咪助手 GlobalChatWidget 共用，切换任一侧即可同步偏好 */
export const GLOBAL_CHAT_MODEL_STORAGE_KEY = 'global_chat_model_v1';

const ALLOWED = new Set(TEXT_MODEL_OPTIONS.map((item) => item.value));

export function normalizeTextModel(model) {
  const value = String(model || '').trim();
  if (ALLOWED.has(value)) return value;
  return DEFAULT_TEXT_MODEL;
}

export function resolvePreferredTextModel() {
  if (typeof window === 'undefined') return DEFAULT_TEXT_MODEL;
  try {
    return normalizeTextModel(window.localStorage.getItem(GLOBAL_CHAT_MODEL_STORAGE_KEY));
  } catch {
    return DEFAULT_TEXT_MODEL;
  }
}

export function persistPreferredTextModel(model) {
  const next = normalizeTextModel(model);
  if (typeof window === 'undefined') return next;
  try {
    window.localStorage.setItem(GLOBAL_CHAT_MODEL_STORAGE_KEY, next);
  } catch {
    // ignore quota / private mode
  }
  return next;
}
