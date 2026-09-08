import { Bold, Italic } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import {
  NOTE_BACKGROUND_PRESETS,
  NOTE_CONTENT_FONT_SIZES,
  NOTE_TEXT_COLOR_PRESETS,
  isSameNoteBackground,
  isSameNoteTextColor,
  normalizeNoteContentStyle,
} from '../lib/noteContentStyle';

const FONT_SIZE_OPTIONS = NOTE_CONTENT_FONT_SIZES.map((size) => ({
  value: size,
  label: `${size}px`,
}));

export function NoteContentStyleToolbar({
  contentStyle,
  onChange,
  hasSelection = false,
  selectionMarks = null,
  onToggleInlineMark = null,
}) {
  const style = normalizeNoteContentStyle(contentStyle);
  const isBold = style.fontWeight === 'bold';
  const isItalic = style.fontStyle === 'italic';
  // 有选区时按钮只作用于选中的文字，状态也跟着选区走
  const boldActive = hasSelection ? Boolean(selectionMarks?.bold) : isBold;
  const italicActive = hasSelection ? Boolean(selectionMarks?.italic) : isItalic;

  function update(patch) {
    onChange(patch);
  }

  function toggleBold() {
    if (hasSelection && onToggleInlineMark?.('bold')) return;
    update({ fontWeight: isBold ? 'normal' : 'bold' });
  }

  function toggleItalic() {
    if (hasSelection && onToggleInlineMark?.('italic')) return;
    update({ fontStyle: isItalic ? 'normal' : 'italic' });
  }

  return (
    <div className="note-content-style-toolbar" onPointerDown={(event) => event.stopPropagation()}>
      <div className="note-style-group">
        <CustomSelect
          compact
          className="note-style-font-select"
          label="字号"
          title="字号"
          value={style.fontSize}
          options={FONT_SIZE_OPTIONS}
          onChange={(value) => update({ fontSize: Number(value) })}
        />
      </div>

      <div className="note-style-group note-style-toggle-group">
        <button
          type="button"
          className={`note-style-toggle ${boldActive ? 'active' : ''}`}
          title={hasSelection ? '加粗选中文字（⌘/Ctrl + B）' : '整段加粗'}
          onClick={toggleBold}
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          className={`note-style-toggle ${italicActive ? 'active' : ''}`}
          title={hasSelection ? '选中文字改斜体（⌘/Ctrl + I）' : '整段斜体'}
          onClick={toggleItalic}
        >
          <Italic size={14} />
        </button>
      </div>

      <div className="note-style-group">
        <span className="note-style-label">底色</span>
        <div className="note-style-swatches">
          {NOTE_BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`note-style-swatch ${isSameNoteBackground(style.backgroundColor, preset.value) ? 'active' : ''}`}
              style={{ background: preset.value }}
              title={preset.label}
              onClick={() => update({ backgroundColor: preset.value })}
            />
          ))}
          <label className="note-style-color-input" title="自定义底色">
            <input
              type="color"
              value={toHexColor(style.backgroundColor, '#0f172a')}
              onChange={(event) => update({ backgroundColor: event.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="note-style-group">
        <span className="note-style-label">字色</span>
        <div className="note-style-swatches">
          {NOTE_TEXT_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`note-style-swatch text ${isSameNoteTextColor(style.color, preset.value) ? 'active' : ''}`}
              style={{ background: preset.value }}
              title={preset.label}
              onClick={() => update({ color: preset.value })}
            />
          ))}
          <label className="note-style-color-input" title="自定义字色">
            <input
              type="color"
              value={toHexColor(style.color, '#e2e8f0')}
              onChange={(event) => update({ color: event.target.value })}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function toHexColor(value, fallback) {
  if (typeof value !== 'string') return fallback;
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  return fallback;
}
