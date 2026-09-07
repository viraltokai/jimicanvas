import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export function SaveCustomWorkflowModal({
  isOpen,
  defaultName = '',
  nodeCount = 0,
  onClose,
  onSave,
}) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (!isOpen) return undefined;
    setName(defaultName || `自定义工作流 · ${nodeCount} 节点`);
    return undefined;
  }, [isOpen, defaultName, nodeCount]);

  if (!isOpen) return null;

  function handleSubmit(event) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    onSave?.(nextName);
  }

  return (
    <div className="asset-modal-backdrop" onPointerDown={onClose}>
      <div
        className="save-workflow-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-workflow-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="workflow-template-header">
          <div>
            <h3 id="save-workflow-title">存为自定义工作流</h3>
            <p>保存当前整组节点与连线到云端，之后可在「工作流模版」里一键复用。</p>
          </div>
          <button type="button" className="icon-mini" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        <form className="save-workflow-form" onSubmit={handleSubmit}>
          <label className="save-workflow-field">
            <span>名称</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：产品图生视频流程"
              maxLength={48}
            />
          </label>
          <p className="save-workflow-meta">将保存 {nodeCount} 个节点及组内连线</p>
          <div className="save-workflow-actions">
            <button type="button" className="confirm-dialog-btn" onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              className="confirm-dialog-btn confirm-dialog-btn-confirm confirm-dialog-btn-warning"
              disabled={!name.trim()}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
