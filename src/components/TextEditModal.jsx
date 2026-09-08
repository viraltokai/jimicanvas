import { useEffect, useRef, useState } from 'react';
import { Eye, FileText, Pencil, X } from 'lucide-react';
import { NoteContentStyleToolbar } from './NoteContentStyleToolbar';
import { NoteRichText } from './NoteRichText';
import {
  getNoteContentStyleCss,
  patchNoteContentStyle,
} from '../lib/noteContentStyle';
import {
  BOLD_MARK,
  ITALIC_MARK,
  isSelectionMarked,
  toggleInlineMark,
} from '../lib/noteRichText';

const FIELD_META = {
  content: {
    title: '编辑结果',
    subtitle: '文本节点生成结果',
    placeholder: '编辑结果文字',
  },
  prompt: {
    title: '编辑输入',
    subtitle: '运行前的输入内容',
    placeholder: '输入文字',
  },
};

export function TextEditModal({ node, field, onUpdateNode, onClose }) {
  const textareaRef = useRef(null);
  const pendingSelectionRef = useRef(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [mode, setMode] = useState('edit');
  const meta = FIELD_META[field] || FIELD_META.content;
  const value = field === 'prompt' ? node.prompt || '' : node.content || '';
  const isContentField = field === 'content';
  const contentStyleCss = isContentField ? getNoteContentStyleCss(node.contentStyle) : null;
  const isPreview = isContentField && mode === 'preview';
  const hasSelection = !isPreview && selection.end > selection.start;
  const selectionMarks = hasSelection
    ? {
        bold: isSelectionMarked(value, selection.start, selection.end, BOLD_MARK),
        italic: isSelectionMarked(value, selection.start, selection.end, ITALIC_MARK),
      }
    : null;

  // 首次打开、以及从预览切回编辑时，都把光标放到文末
  useEffect(() => {
    if (isPreview) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    const length = textarea.value.length;
    textarea.setSelectionRange(length, length);
  }, [isPreview]);

  // 加/去标记后文本长度变了，重新把选区落回同一段文字上
  useEffect(() => {
    const textarea = textareaRef.current;
    const pending = pendingSelectionRef.current;
    if (!textarea || !pending) return;
    pendingSelectionRef.current = null;
    textarea.focus();
    textarea.setSelectionRange(pending.start, pending.end);
    setSelection(pending);
  }, [value]);

  function handleChange(event) {
    const patch = field === 'prompt' ? { prompt: event.target.value } : { content: event.target.value };
    onUpdateNode(node.id, { ...patch, status: 'idle' });
  }

  function syncSelection(event) {
    const textarea = event.currentTarget;
    setSelection({ start: textarea.selectionStart, end: textarea.selectionEnd });
  }

  /** 返回 true 表示已作用于选区，工具栏就不再改整段样式 */
  function applyInlineMark(kind) {
    const textarea = textareaRef.current;
    if (!textarea) return false;

    const { selectionStart: start, selectionEnd: end } = textarea;
    if (start === end) return false;

    const next = toggleInlineMark(value, start, end, kind === 'bold' ? BOLD_MARK : ITALIC_MARK);
    pendingSelectionRef.current = { start: next.start, end: next.end };
    const patch = field === 'prompt' ? { prompt: next.value } : { content: next.value };
    onUpdateNode(node.id, { ...patch, status: 'idle' });
    return true;
  }

  function handleContentStyleChange(patch) {
    onUpdateNode(node.id, {
      contentStyle: patchNoteContentStyle(node.contentStyle, patch),
      status: 'idle',
    });
  }

  return (
    <div className="asset-modal-backdrop" onPointerDown={onClose}>
      <section className="text-edit-modal" onPointerDown={(event) => event.stopPropagation()}>
        <header className="asset-modal-header">
          <div className="asset-modal-title">
            <FileText size={18} />
            <div>
              <strong>{node.title || meta.title}</strong>
              <span>{meta.subtitle}</span>
            </div>
          </div>
          <div className="text-edit-modal-head-actions">
            {isContentField ? (
              <div className="text-edit-mode-switch" role="tablist" aria-label="编辑模式">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'edit'}
                  className={mode === 'edit' ? 'is-active' : ''}
                  onClick={() => setMode('edit')}
                >
                  <Pencil size={12} />
                  编辑
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'preview'}
                  className={mode === 'preview' ? 'is-active' : ''}
                  onClick={() => setMode('preview')}
                >
                  <Eye size={12} />
                  预览
                </button>
              </div>
            ) : null}
            <button className="panel-icon" onClick={onClose} title="关闭" type="button">
              <X size={16} />
            </button>
          </div>
        </header>

        {isContentField ? (
          <NoteContentStyleToolbar
            contentStyle={node.contentStyle}
            onChange={handleContentStyleChange}
            hasSelection={hasSelection}
            selectionMarks={selectionMarks}
            onToggleInlineMark={applyInlineMark}
          />
        ) : null}

        <div className="text-edit-modal-body">
          {isPreview ? (
            <div
              className="text-edit-modal-preview"
              style={contentStyleCss || undefined}
              onDoubleClick={() => setMode('edit')}
              title="双击回到编辑"
            >
              {value.trim() ? (
                <NoteRichText text={value} />
              ) : (
                <span className="text-edit-modal-preview-empty">{meta.placeholder}</span>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              className="text-edit-modal-input"
              value={value}
              onChange={handleChange}
              onSelect={syncSelection}
              onKeyUp={syncSelection}
              onMouseUp={syncSelection}
              style={contentStyleCss || undefined}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  onClose();
                  return;
                }
                if (!(event.metaKey || event.ctrlKey)) return;
                const key = event.key.toLowerCase();
                if (key !== 'b' && key !== 'i') return;
                if (applyInlineMark(key === 'b' ? 'bold' : 'italic')) {
                  event.preventDefault();
                }
              }}
              placeholder={meta.placeholder}
            />
          )}
        </div>

        <footer className="asset-modal-footer">
          <span>
            Esc 关闭 · 修改会实时保存
            {isContentField
              ? isPreview
                ? ' · 预览按节点里的效果显示，双击可回到编辑'
                : ' · 选中文字后加粗/斜体只作用于选中部分，未选中则整段生效'
              : ''}
          </span>
          <button className="icon-button primary" onClick={onClose} type="button">
            完成
          </button>
        </footer>
      </section>
    </div>
  );
}
