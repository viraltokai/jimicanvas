import { CloudUpload, LoaderCircle } from 'lucide-react';

export function MediaUploadOverlay({
  active = false,
  current = 0,
  total = 0,
  label = '正在上传',
  detail = '',
}) {
  if (!active) return null;

  const safeTotal = Math.max(0, Number(total) || 0);
  const safeCurrent = Math.min(safeTotal, Math.max(0, Number(current) || 0));
  const hasProgress = safeTotal > 0;
  const percent = hasProgress ? Math.round((safeCurrent / safeTotal) * 100) : null;

  return (
    <div className="media-upload-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="media-upload-card">
        <div className="media-upload-visual" aria-hidden="true">
          <span className="media-upload-ring" />
          <span className="media-upload-ring media-upload-ring--delay" />
          <span className="media-upload-orb">
            <CloudUpload size={22} />
          </span>
        </div>
        <strong className="media-upload-title">{label}</strong>
        <p className="media-upload-detail">
          {detail ||
            (hasProgress
              ? `已完成 ${safeCurrent} / ${safeTotal}`
              : '正在处理文件，请稍候…')}
        </p>
        <div className="media-upload-track" aria-hidden="true">
          <div
            className={`media-upload-fill${hasProgress ? '' : ' is-indeterminate'}`}
            style={hasProgress ? { width: `${Math.max(percent, 8)}%` } : undefined}
          />
        </div>
        <div className="media-upload-meta">
          <LoaderCircle size={14} className="spin-icon" />
          <span>{hasProgress ? `${percent}%` : '上传中'}</span>
        </div>
      </div>
    </div>
  );
}
