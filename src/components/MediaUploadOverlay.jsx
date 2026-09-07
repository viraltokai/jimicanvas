import { CloudUpload, LoaderCircle } from 'lucide-react';

export function MediaUploadOverlay({
  active = false,
  current = 0,
  total = 0,
  label = '正在上传',
  detail = '',
  variant = 'toast',
}) {
  if (!active) return null;

  const safeTotal = Math.max(0, Number(total) || 0);
  const safeCurrent = Math.min(safeTotal, Math.max(0, Number(current) || 0));
  const hasProgress = safeTotal > 0;
  const percent = hasProgress ? Math.round((safeCurrent / safeTotal) * 100) : null;
  const statusText =
    detail ||
    (hasProgress ? `已完成 ${safeCurrent} / ${safeTotal}` : '正在处理文件，请稍候…');

  if (variant === 'inline') {
    return (
      <div className="media-upload-inline" role="status" aria-live="polite" aria-busy="true">
        <div className="media-upload-inline-row">
          <LoaderCircle size={14} className="spin-icon" />
          <strong>{label}</strong>
        </div>
        <p className="media-upload-inline-detail">{statusText}</p>
        <div className="media-upload-track" aria-hidden="true">
          <div
            className={`media-upload-fill${hasProgress ? '' : ' is-indeterminate'}`}
            style={hasProgress ? { width: `${Math.max(percent, 8)}%` } : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="media-upload-toast" role="status" aria-live="polite" aria-busy="true">
      <span className="media-upload-toast-icon" aria-hidden="true">
        <CloudUpload size={16} />
      </span>
      <div className="media-upload-toast-body">
        <strong className="media-upload-toast-title">{label}</strong>
        <p className="media-upload-toast-detail">{statusText}</p>
        <div className="media-upload-track" aria-hidden="true">
          <div
            className={`media-upload-fill${hasProgress ? '' : ' is-indeterminate'}`}
            style={hasProgress ? { width: `${Math.max(percent, 8)}%` } : undefined}
          />
        </div>
      </div>
      <span className="media-upload-toast-meta">
        <LoaderCircle size={14} className="spin-icon" />
        {hasProgress ? `${percent}%` : '上传中'}
      </span>
    </div>
  );
}
