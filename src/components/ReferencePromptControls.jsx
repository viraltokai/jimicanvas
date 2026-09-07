import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Type, X } from 'lucide-react';
import {
  detectReferenceMention,
  filterReferenceMentionOptions,
  getReferenceLabel,
} from '../lib/referencePrompt';
import {
  getReferencePromptCursorOffset,
  renderReferencePromptEditor,
  restoreReferencePromptCursor,
  serializeReferencePromptEditor,
} from '../lib/referencePromptEditor';
import { getTextInputPreview } from '../lib/connections';

export function ReferenceImageChip({
  image,
  index,
  previewSrc,
  onRemove,
  onPreview,
  removeTitle = '移除参考图',
}) {
  const alt = image?.name || getReferenceLabel(index);

  return (
    <div className={`image-reference-chip${onPreview ? ' is-previewable' : ''}`}>
      <span className="image-reference-index">{index + 1}</span>
      {onPreview ? (
        <button
          type="button"
          className="image-reference-preview"
          onClick={onPreview}
          title="预览参考图"
        >
          <img src={previewSrc} alt={alt} />
        </button>
      ) : (
        <img src={previewSrc} alt={alt} />
      )}
      <button type="button" onClick={onRemove} title={removeTitle}>
        <X size={11} />
      </button>
    </div>
  );
}

/** 文本引用芯片：序号 + 默认图标，点击预览结果文本 */
export function TextReferenceChip({
  index,
  textNode,
  onRemove,
  removeTitle = '移除文本引用并断开连线',
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const previewText = getTextInputPreview(textNode);

  const updatePopoverPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    const spaceAbove = rect.top;
    const preferAbove = spaceAbove > 220;
    setPopoverStyle({
      position: 'fixed',
      left: `${left}px`,
      width: `${width}px`,
      zIndex: 10050,
      ...(preferAbove
        ? { bottom: `${window.innerHeight - rect.top + 8}px`, top: 'auto' }
        : { top: `${rect.bottom + 8}px`, bottom: 'auto' }),
    });
  };

  useLayoutEffect(() => {
    if (!previewOpen) {
      setPopoverStyle(null);
      return undefined;
    }
    updatePopoverPosition();
    const onLayout = () => updatePopoverPosition();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [previewOpen, previewText]);

  useEffect(() => {
    if (!previewOpen) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setPreviewOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setPreviewOpen(false);
    };

    // 避免同一次点击立刻把刚打开的预览关掉
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown, true);
    }, 0);

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [previewOpen]);

  const popover =
    previewOpen && popoverStyle
      ? createPortal(
          <div
            ref={popoverRef}
            className="text-reference-popover"
            style={popoverStyle}
            role="dialog"
            aria-label="文本引用预览"
          >
            <div className="text-reference-popover-head">
              <strong>文本引用 {index + 1}</strong>
              <button
                type="button"
                className="text-reference-popover-close"
                onClick={() => setPreviewOpen(false)}
                title="关闭预览"
              >
                <X size={14} />
              </button>
            </div>
            <pre className="text-reference-popover-body">{previewText || '（空文本）'}</pre>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`text-reference-chip is-icon${previewOpen ? ' is-preview-open' : ''}`}>
      <span className="text-reference-index" aria-hidden="true">
        {index + 1}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="text-reference-preview-trigger"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPreviewOpen((prev) => !prev);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        title={previewText || '预览文本'}
        aria-label={`预览文本引用 ${index + 1}`}
        aria-expanded={previewOpen}
      >
        <Type size={22} strokeWidth={2.25} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="text-reference-remove"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove?.();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        title={removeTitle}
      >
        <X size={11} />
      </button>
      {popover}
    </div>
  );
}

export function ReferencePromptInput({
  value,
  onChange,
  references = [],
  resolvePreviewUrl,
  placeholder = '输入提示词',
  disabled = false,
  wrapClassName = 'node-prompt-wrap reference-mention-wrap',
  extraActions,
}) {
  const editorRef = useRef(null);
  const [mention, setMention] = useState(null);

  const resolvedPlaceholder =
    references.length > 0 ? `${placeholder}，输入 @ 引用参考图` : placeholder;

  const mentionOptions = useMemo(
    () =>
      mention && references.length > 0
        ? filterReferenceMentionOptions(references, mention.query, resolvePreviewUrl)
        : [],
    [mention, references, resolvePreviewUrl]
  );

  const activeMentionIndex = mention
    ? Math.min(mention.activeIndex, Math.max(mentionOptions.length - 1, 0))
    : 0;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    renderReferencePromptEditor(editor, value || '', references, resolvePreviewUrl);
  }, [value, references, resolvePreviewUrl]);

  function syncPlainTextFromEditor() {
    const editor = editorRef.current;
    if (!editor) return '';
    const plainText = serializeReferencePromptEditor(editor);
    if (plainText !== (value || '')) {
      onChange(plainText);
    }
    return plainText;
  }

  function updateMentionFromEditor() {
    const editor = editorRef.current;
    if (!editor) return;
    const plainText = serializeReferencePromptEditor(editor);
    updateMentionState(plainText, getReferencePromptCursorOffset(editor));
  }

  function updateMentionState(plainText, cursor) {
    const detected = detectReferenceMention(plainText, cursor);
    if (!detected || references.length === 0) {
      setMention(null);
      return;
    }

    const options = filterReferenceMentionOptions(references, detected.query, resolvePreviewUrl);
    if (options.length === 0) {
      setMention(null);
      return;
    }

    setMention((current) => {
      if (current && current.start === detected.start && current.query === detected.query) {
        return current;
      }
      return { ...detected, activeIndex: 0 };
    });
  }

  function insertMention(option) {
    const editor = editorRef.current;
    if (!editor || !mention) return;

    const plainText = serializeReferencePromptEditor(editor);
    const cursor = getReferencePromptCursorOffset(editor);
    const before = plainText.slice(0, mention.start);
    const after = plainText.slice(cursor);
    const nextValue = `${before}${option.token} ${after}`;
    const nextCursor = before.length + option.token.length + 1;

    onChange(nextValue);
    setMention(null);

    renderReferencePromptEditor(editor, nextValue, references, resolvePreviewUrl);
    requestAnimationFrame(() => {
      restoreReferencePromptCursor(editor, nextCursor);
      editor.focus();
    });
  }

  function handleInput() {
    syncPlainTextFromEditor();
    updateMentionFromEditor();
  }

  function handleBlur() {
    const editor = editorRef.current;
    if (!editor) return;
    const plainText = serializeReferencePromptEditor(editor);
    if (plainText !== (value || '')) {
      onChange(plainText);
    }
    renderReferencePromptEditor(editor, plainText, references, resolvePreviewUrl);
    setMention(null);
  }

  function handleEditorKeyDown(event) {
    if (mention && mentionOptions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setMention((current) => ({
          ...current,
          activeIndex: Math.min(current.activeIndex + 1, mentionOptions.length - 1),
        }));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setMention((current) => ({
          ...current,
          activeIndex: Math.max(current.activeIndex - 1, 0),
        }));
        return;
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        insertMention(mentionOptions[activeMentionIndex]);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setMention(null);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey && (!mention || mentionOptions.length === 0)) {
      requestAnimationFrame(() => syncPlainTextFromEditor());
    }
  }

  function handleEditorKeyUp() {
    updateMentionFromEditor();
  }

  function handleEditorMouseUp() {
    updateMentionFromEditor();
  }

  function handleSelect(option) {
    insertMention(option);
  }

  return (
    <div className={wrapClassName}>
      <div
        ref={editorRef}
        className={`reference-prompt-editor reference-prompt-preview ${disabled ? 'is-disabled' : ''}`}
        contentEditable={disabled ? 'false' : 'true'}
        role="textbox"
        aria-multiline="true"
        aria-placeholder={resolvedPlaceholder}
        data-placeholder={resolvedPlaceholder}
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleEditorKeyDown}
        onKeyUp={handleEditorKeyUp}
        onMouseUp={handleEditorMouseUp}
      />
      {extraActions && <div className="prompt-editor-actions">{extraActions}</div>}
      {mention && mentionOptions.length > 0 ? (
        <div className="reference-mention-dropdown" role="listbox">
          {mentionOptions.map((option, optionIndex) => (
            <button
              key={option.token}
              type="button"
              role="option"
              aria-selected={optionIndex === activeMentionIndex}
              className={`reference-mention-option ${optionIndex === activeMentionIndex ? 'active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(option)}
            >
              <span className="reference-mention-option-index">{option.index + 1}</span>
              {option.previewUrl ? (
                <img src={option.previewUrl} alt={option.label} className="reference-mention-option-thumb" />
              ) : (
                <span className="reference-mention-option-thumb reference-mention-option-thumb-empty" />
              )}
              <span className="reference-mention-option-label">{option.label}</span>
              <span className="reference-mention-option-token">{option.token}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
