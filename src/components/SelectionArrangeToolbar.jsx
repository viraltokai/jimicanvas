import { Columns3, Group, LayoutGrid, Play, Rows3, Save, Ungroup } from 'lucide-react';
import { GROUP_BACKGROUND_PRESETS } from '../lib/constants';

const LAYOUT_ACTIONS = [
  { id: 'layout-row', title: '横向排列', Icon: Columns3 },
  { id: 'layout-column', title: '纵向排列', Icon: Rows3 },
  { id: 'layout-grid', title: '网格排列', Icon: LayoutGrid },
];

export function SelectionArrangeToolbar({
  count = 0,
  canUngroup = false,
  isRunningGroup = false,
  groupBackground = '',
  style = null,
  onArrange,
  onGroup,
  onUngroup,
  onRunGroup,
  onGroupBackgroundChange,
  onSaveWorkflow,
}) {
  if (count < 2) return null;

  return (
    <div
      className="selection-arrange-toolbar"
      role="toolbar"
      aria-label="多选排列与打组"
      style={style || undefined}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="selection-arrange-count">已选 {count}</span>

      <div className="selection-arrange-divider" aria-hidden="true" />

      <div className="selection-arrange-group" role="group" aria-label="排列方式">
        {LAYOUT_ACTIONS.map(({ id, title, Icon }) => (
          <button
            key={id}
            type="button"
            className="selection-arrange-btn"
            title={title}
            aria-label={title}
            onClick={() => onArrange?.(id)}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>

      <div className="selection-arrange-divider" aria-hidden="true" />

      <div className="selection-arrange-group" role="group" aria-label="打组">
        {!canUngroup ? (
          <button
            type="button"
            className="selection-arrange-btn selection-arrange-btn-label"
            title="打组"
            aria-label="打组"
            onClick={() => onGroup?.()}
          >
            <Group size={15} />
            <span>打组</span>
          </button>
        ) : (
          <button
            type="button"
            className="selection-arrange-btn selection-arrange-btn-label"
            title="取消打组"
            aria-label="取消打组"
            onClick={() => onUngroup?.()}
          >
            <Ungroup size={15} />
            <span>解组</span>
          </button>
        )}
        <button
          type="button"
          className="selection-arrange-btn selection-arrange-btn-label"
          title="存为自定义工作流"
          aria-label="存为自定义工作流"
          onClick={() => onSaveWorkflow?.()}
        >
          <Save size={15} />
          <span>存为工作流</span>
        </button>
      </div>

      {canUngroup ? (
        <>
          <div className="selection-arrange-divider" aria-hidden="true" />
          <div className="selection-arrange-group selection-arrange-colors" role="group" aria-label="组背景色">
            {GROUP_BACKGROUND_PRESETS.map((preset) => {
              const isActive = (groupBackground || '') === (preset.value || '');
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={`selection-arrange-swatch${isActive ? ' is-active' : ''}${
                    !preset.value ? ' is-default' : ''
                  }`}
                  title={`组背景：${preset.label}`}
                  aria-label={`组背景：${preset.label}`}
                  aria-pressed={isActive}
                  style={preset.value ? { background: preset.value } : undefined}
                  onClick={() => onGroupBackgroundChange?.(preset.value)}
                />
              );
            })}
            <label className="selection-arrange-color-picker" title="自定义组背景色">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(groupBackground) ? groupBackground : '#38bdf8'}
                onChange={(event) => onGroupBackgroundChange?.(event.target.value)}
                aria-label="自定义组背景色"
              />
            </label>
          </div>
        </>
      ) : null}

      <div className="selection-arrange-divider" aria-hidden="true" />

      <button
        type="button"
        className="selection-arrange-btn selection-arrange-btn-label selection-arrange-btn-run"
        title="整组执行"
        aria-label="整组执行"
        disabled={isRunningGroup}
        onClick={() => onRunGroup?.()}
      >
        <Play size={15} />
        <span>{isRunningGroup ? '执行中…' : '整组执行'}</span>
      </button>
    </div>
  );
}
