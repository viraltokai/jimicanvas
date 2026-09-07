import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

export function SaveCustomWorkflowModal({
  isOpen,
  defaultName = '',
  nodeCount = 0,
  canSaveAsSystem = false,
  suggestedCoverUrl = '',
  saving = false,
  onClose,
  onSave,
}) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('personal');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    setName(defaultName || `自定义工作流 · ${nodeCount} 节点`);
    setDescription('');
    setTarget('personal');
    setCoverFile(null);
    setCoverUrl(suggestedCoverUrl || '');
    setCoverPreview(suggestedCoverUrl || '');
    return undefined;
  }, [isOpen, defaultName, nodeCount, suggestedCoverUrl]);

  useEffect(() => {
    if (!coverFile) return undefined;
    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);

  if (!isOpen) return null;

  function clearCover() {
    setCoverFile(null);
    setCoverUrl('');
    setCoverPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName || saving) return;
    const asSystem = canSaveAsSystem && target === 'system';
    onSave?.(nextName, {
      asSystem,
      description: asSystem ? description.trim() : '',
      coverUrl: asSystem ? coverUrl || suggestedCoverUrl || '' : '',
      coverFile: asSystem ? coverFile : null,
    });
  }

  return (
    <div className="asset-modal-backdrop" onPointerDown={saving ? undefined : onClose}>
      <div
        className="save-workflow-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-workflow-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="workflow-template-header">
          <div>
            <h3 id="save-workflow-title">保存工作流</h3>
            <p>
              {canSaveAsSystem
                ? '可存为自己的自定义工作流，或以管理员身份发布为系统工作流供全站使用。'
                : '保存当前整组节点与连线到云端，之后可在「工作流模版」里一键复用。'}
            </p>
          </div>
          <button
            type="button"
            className="icon-mini"
            onClick={onClose}
            disabled={saving}
            aria-label="关闭"
          >
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
              disabled={saving}
            />
          </label>

          {canSaveAsSystem ? (
            <fieldset className="save-workflow-target">
              <legend>保存到</legend>
              <label className="save-workflow-radio">
                <input
                  type="radio"
                  name="workflow-target"
                  checked={target === 'personal'}
                  onChange={() => setTarget('personal')}
                  disabled={saving}
                />
                <span>
                  <strong>我的工作流</strong>
                  <em>仅自己可见，可在自定义 Tab 复用</em>
                </span>
              </label>
              <label className="save-workflow-radio">
                <input
                  type="radio"
                  name="workflow-target"
                  checked={target === 'system'}
                  onChange={() => setTarget('system')}
                  disabled={saving}
                />
                <span>
                  <strong>系统工作流</strong>
                  <em>全站用户可预览并一键添加到画布</em>
                </span>
              </label>
            </fieldset>
          ) : null}

          {canSaveAsSystem && target === 'system' ? (
            <label className="save-workflow-field">
              <span>
                描述 <em className="save-workflow-optional">可选</em>
              </span>
              <textarea
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="留空则自动根据节点内容生成，例如：上传产品图 → 生成模特图 → 转成短视频"
                maxLength={120}
                disabled={saving}
              />
            </label>
          ) : null}

          {canSaveAsSystem && target === 'system' ? (
            <div className="save-workflow-cover">
              <div className="save-workflow-cover-head">
                <span>封面</span>
                <em>建议上传，列表中会优先展示</em>
              </div>
              <div className="save-workflow-cover-body">
                {coverPreview ? (
                  <div className="save-workflow-cover-preview">
                    <img src={coverPreview} alt="工作流封面预览" />
                    <button
                      type="button"
                      className="save-workflow-cover-clear"
                      onClick={clearCover}
                      disabled={saving}
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="save-workflow-cover-upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                  >
                    <ImagePlus size={18} />
                    <span>上传封面图</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setCoverFile(file);
                    if (file) setCoverUrl('');
                  }}
                />
                {coverPreview ? (
                  <button
                    type="button"
                    className="confirm-dialog-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                  >
                    更换封面
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <p className="save-workflow-meta">将保存 {nodeCount} 个节点及组内连线</p>
          <div className="save-workflow-actions">
            <button type="button" className="confirm-dialog-btn" onClick={onClose} disabled={saving}>
              取消
            </button>
            <button
              type="submit"
              className="confirm-dialog-btn confirm-dialog-btn-confirm confirm-dialog-btn-warning"
              disabled={!name.trim() || saving}
            >
              {saving
                ? '保存中…'
                : target === 'system' && canSaveAsSystem
                  ? '发布系统工作流'
                  : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
