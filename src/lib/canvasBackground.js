import {
  CANVAS_BACKGROUND_COLOR_PRESETS,
  CANVAS_BACKGROUND_OPTIONS,
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_BACKGROUND_COLOR,
} from './constants';

const VALID_BACKGROUNDS = new Set(CANVAS_BACKGROUND_OPTIONS.map((option) => option.value));
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeCanvasBackground(value) {
  const next = String(value || '').trim();
  return VALID_BACKGROUNDS.has(next) ? next : DEFAULT_CANVAS_BACKGROUND;
}

export function normalizeCanvasBackgroundColor(value) {
  const next = String(value || '').trim();
  if (!next) return DEFAULT_CANVAS_BACKGROUND_COLOR;
  if (!HEX_COLOR_PATTERN.test(next)) return DEFAULT_CANVAS_BACKGROUND_COLOR;
  if (next.length === 4) {
    const [, r, g, b] = next;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return next.toLowerCase();
}

export function getCanvasBackgroundOption(value) {
  const normalized = normalizeCanvasBackground(value);
  return (
    CANVAS_BACKGROUND_OPTIONS.find((option) => option.value === normalized) ||
    CANVAS_BACKGROUND_OPTIONS[0]
  );
}

export function getCanvasBackgroundColorPreset(value) {
  const normalized = normalizeCanvasBackgroundColor(value);
  return (
    CANVAS_BACKGROUND_COLOR_PRESETS.find((option) => option.value === normalized) || {
      value: normalized,
      label: '自定义',
    }
  );
}
