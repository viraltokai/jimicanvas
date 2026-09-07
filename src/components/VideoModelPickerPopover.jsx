import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, X } from 'lucide-react';
import { getVideoModelOptionsForVisibility } from '../lib/constants';
import { ModelIcon, getVideoFamilyIconName } from './ModelIcon';

/** 左侧保留二级展开的系列；「其他」等仍平铺 */
const NESTED_GROUP_IDS = new Set(['seedance', 'google']);

function buildPickerEntries(familyGroups = []) {
  const entries = [];
  for (const group of familyGroups) {
    const options = group.options || [];
    if (NESTED_GROUP_IDS.has(group.id) && options.length > 0) {
      entries.push({
        type: 'group',
        id: group.id,
        label: group.label,
        icon: group.icon || getVideoFamilyIconName(options[0]?.value),
        options,
      });
      continue;
    }
    for (const option of options) {
      entries.push({
        type: 'family',
        id: option.value,
        label: option.fullLabel || option.label,
        icon: option.icon || group.icon || getVideoFamilyIconName(option.value),
        family: option.value,
      });
    }
  }
  return entries;
}

function resolveFocusKey(entries, family) {
  const groupEntry = entries.find(
    (entry) => entry.type === 'group' && entry.options?.some((option) => option.value === family)
  );
  if (groupEntry) return groupEntry.id;
  if (entries.some((entry) => entry.type === 'family' && entry.id === family)) {
    return family;
  }
  return entries[0]?.id || '';
}

export function VideoModelPickerPopover({
  anchorRef,
  family,
  model,
  familyGroups = [],
  soraVisibility,
  onPickFamily,
  onPickModel,
  onClose,
}) {
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState(null);

  const entries = useMemo(() => buildPickerEntries(familyGroups), [familyGroups]);
  const [focusKey, setFocusKey] = useState(() => resolveFocusKey(entries, family));

  const focusedEntry = useMemo(
    () => entries.find((entry) => entry.id === focusKey) || entries[0] || null,
    [entries, focusKey]
  );
  const focusedGroup = focusedEntry?.type === 'group' ? focusedEntry : null;
  const focusedFamilyEntry = focusedEntry?.type === 'family' ? focusedEntry : null;

  const updatePosition = () => {
    const anchor = anchorRef?.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(560, window.innerWidth - 24);
    const height = Math.min(420, window.innerHeight - 24);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 12) {
      top = Math.max(12, rect.top - height - 8);
    }
    setPanelStyle({
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      maxHeight: `${height}px`,
      zIndex: 10060,
    });
  };

  useLayoutEffect(() => {
    updatePosition();
    const onLayout = () => updatePosition();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [anchorRef, family, model]);

  useEffect(() => {
    setFocusKey(resolveFocusKey(entries, family));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family]);

  useEffect(() => {
    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose?.();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown, true);
    }, 0);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [anchorRef, onClose]);

  if (!panelStyle) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="video-model-picker"
      style={panelStyle}
      role="dialog"
      aria-label="选择视频模型"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="video-model-picker-head">
        <strong>选择模型</strong>
        <button type="button" className="video-model-picker-close" onClick={onClose} title="关闭">
          <X size={14} />
        </button>
      </header>

      <div className="video-model-picker-body">
        <aside className="video-model-picker-nav">
          {entries.map((entry) => {
            if (entry.type === 'group') {
              const groupActive = (entry.options || []).some((option) => option.value === family);
              const focused = focusKey === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`video-model-picker-nav-item${focused ? ' is-focused' : ''}${
                    groupActive ? ' is-active' : ''
                  }`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setFocusKey(entry.id);
                  }}
                  onMouseEnter={() => setFocusKey(entry.id)}
                >
                  <ModelIcon name={entry.icon} size={16} />
                  <span className="video-model-picker-nav-copy">
                    <span className="video-model-picker-nav-label">{entry.label}</span>
                    {groupActive ? (
                      <span className="video-model-picker-nav-badge">使用中</span>
                    ) : null}
                  </span>
                  <ChevronRight size={14} className="video-model-picker-nav-chevron" />
                </button>
              );
            }

            const active = family === entry.family;
            const focused = focusKey === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                className={`video-model-picker-nav-item${focused ? ' is-focused' : ''}${
                  active ? ' is-active' : ''
                }`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setFocusKey(entry.id);
                  onPickFamily?.(entry.family);
                  onClose?.();
                }}
                onMouseEnter={() => setFocusKey(entry.id)}
              >
                <ModelIcon name={entry.icon} size={16} />
                <span className="video-model-picker-nav-copy">
                  <span className="video-model-picker-nav-label">{entry.label}</span>
                  {active ? <span className="video-model-picker-nav-badge">使用中</span> : null}
                </span>
              </button>
            );
          })}
        </aside>

        <section className="video-model-picker-detail">
          {focusedGroup ? (
            <>
              <div className="video-model-picker-detail-title">选择 {focusedGroup.label}</div>
              <div className="video-model-picker-detail-list">
                {(focusedGroup.options || []).map((familyOption) => {
                  const familyId = familyOption.value;
                  const models = getVideoModelOptionsForVisibility(familyId, soraVisibility);
                  const isFamilyActive = family === familyId;
                  const showModels = models.length > 1;

                  return (
                    <div
                      key={familyId}
                      className={`video-model-picker-card${isFamilyActive ? ' is-active' : ''}`}
                    >
                      <button
                        type="button"
                        className="video-model-picker-card-main"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onPickFamily?.(familyId);
                          if (!showModels) onClose?.();
                        }}
                      >
                        <span className="video-model-picker-card-row">
                          <ModelIcon
                            name={familyOption.icon || focusedGroup.icon || 'gemini'}
                            size={16}
                          />
                          <span className="video-model-picker-card-label">
                            {familyOption.fullLabel || familyOption.label}
                          </span>
                        </span>
                        {isFamilyActive && !showModels ? <Check size={14} /> : null}
                      </button>

                      {showModels ? (
                        <div className="video-model-picker-sublist">
                          {models.map((modelOption) => {
                            const isModelActive = isFamilyActive && model === modelOption.value;
                            return (
                              <button
                                key={modelOption.value}
                                type="button"
                                className={`video-model-picker-subitem${
                                  isModelActive ? ' is-active' : ''
                                }`}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  onPickModel?.(familyId, modelOption.value);
                                  onClose?.();
                                }}
                              >
                                <span>{modelOption.label}</span>
                                {isModelActive ? <Check size={13} /> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : focusedFamilyEntry ? (
            <div className="video-model-picker-flat-detail">
              <div className="video-model-picker-flat-title-row">
                <ModelIcon name={focusedFamilyEntry.icon} size={20} />
                <div className="video-model-picker-flat-title">{focusedFamilyEntry.label}</div>
              </div>
              <p className="video-model-picker-flat-desc">点击左侧即可切换到该模型</p>
              {family === focusedFamilyEntry.family ? (
                <span className="video-model-picker-flat-badge">当前使用中</span>
              ) : null}
            </div>
          ) : (
            <p className="video-model-picker-empty">暂无可用模型</p>
          )}
        </section>
      </div>
    </div>,
    document.body
  );
}
