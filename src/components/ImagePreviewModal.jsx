import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { normalizeImageUrl } from '../lib/imageApi';

const MIN_SCALE = 0.2;
const MAX_SCALE = 8;
const FIT_SCALE = 1;

function clampScale(value) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

export function ImagePreviewModal({ images, activeIndex, title, onSelectIndex, onDownload, onClose }) {
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(images.length - 1, 0));
  const activeUrl = images[safeIndex];
  const hasMultiple = images.length > 1;

  const stageRef = useRef(null);
  const panRef = useRef(null);
  const [view, setView] = useState({ scale: FIT_SCALE, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const resetView = useCallback(() => {
    setView({ scale: FIT_SCALE, x: 0, y: 0 });
  }, []);

  // 换图后回到适应窗口，避免带着上一张的缩放和位移
  useEffect(() => {
    resetView();
  }, [activeUrl, resetView]);

  /** origin 为相对舞台中心的坐标，缺省时以中心为锚点缩放 */
  const zoomTo = useCallback((nextScale, origin) => {
    setView((current) => {
      const scale = clampScale(nextScale);
      if (scale === current.scale) return current;
      if (!origin) return { ...current, scale };
      const ratio = scale / current.scale;
      return {
        scale,
        x: origin.x - (origin.x - current.x) * ratio,
        y: origin.y - (origin.y - current.y) * ratio,
      };
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomTo(view.scale * 1.25);
        return;
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        zoomTo(view.scale / 1.25);
        return;
      }
      if (event.key === '0') {
        event.preventDefault();
        resetView();
        return;
      }
      if (!hasMultiple) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onSelectIndex((safeIndex - 1 + images.length) % images.length);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onSelectIndex((safeIndex + 1) % images.length);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasMultiple, images.length, onClose, onSelectIndex, resetView, safeIndex, view.scale, zoomTo]);

  // React 的 onWheel 是被动监听，拦不住页面滚动，这里手动绑原生事件
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    function handleWheel(event) {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      const origin = {
        x: event.clientX - (rect.left + rect.width / 2),
        y: event.clientY - (rect.top + rect.height / 2),
      };
      zoomTo(view.scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12), origin);
    }

    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [view.scale, zoomTo]);

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsPanning(true);
  }

  function handlePointerMove(event) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setView((current) => ({
      ...current,
      x: pan.originX + (event.clientX - pan.startX),
      y: pan.originY + (event.clientY - pan.startY),
    }));
  }

  function endPan(event) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    panRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setIsPanning(false);
  }

  if (!activeUrl) return null;

  const isZoomed = Math.abs(view.scale - FIT_SCALE) > 0.01 || view.x !== 0 || view.y !== 0;

  return (
    <div className="asset-modal-backdrop image-preview-backdrop" onPointerDown={onClose}>
      <section className="image-preview-modal" onPointerDown={(event) => event.stopPropagation()}>
        <header className="image-preview-header">
          <div className="asset-modal-title">
            <ImageIcon size={18} />
            <div>
              <strong>{title || '图片预览'}</strong>
              {hasMultiple ? (
                <span>
                  {safeIndex + 1} / {images.length}
                </span>
              ) : (
                <span>滚轮缩放 · 拖动查看</span>
              )}
            </div>
          </div>
          <div className="image-preview-header-actions">
            <div className="image-preview-zoom">
              <button type="button" onClick={() => zoomTo(view.scale / 1.25)} title="缩小（-）">
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                className="image-preview-zoom-value"
                onClick={resetView}
                title="恢复适应窗口（0）"
              >
                {Math.round(view.scale * 100)}%
              </button>
              <button type="button" onClick={() => zoomTo(view.scale * 1.25)} title="放大（+）">
                <ZoomIn size={15} />
              </button>
              <button type="button" onClick={resetView} title="适应窗口（0）" disabled={!isZoomed}>
                <Maximize2 size={15} />
              </button>
            </div>
            {onDownload ? (
              <button
                type="button"
                className="panel-icon"
                onClick={() => onDownload([activeUrl], title)}
                title="下载当前图片"
              >
                <Download size={16} />
              </button>
            ) : null}
            <button type="button" className="panel-icon" onClick={onClose} title="关闭">
              <X size={16} />
            </button>
          </div>
        </header>

        <div
          ref={stageRef}
          className={`image-preview-stage${isPanning ? ' is-panning' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onDoubleClick={() => (isZoomed ? resetView() : zoomTo(2))}
        >
          {hasMultiple ? (
            <button
              type="button"
              className="image-preview-nav prev"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onSelectIndex((safeIndex - 1 + images.length) % images.length)}
              title="上一张"
            >
              <ChevronLeft size={22} />
            </button>
          ) : null}
          <img
            src={normalizeImageUrl(activeUrl)}
            alt={`${title || '图片'} ${safeIndex + 1}`}
            draggable={false}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          />
          {hasMultiple ? (
            <button
              type="button"
              className="image-preview-nav next"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onSelectIndex((safeIndex + 1) % images.length)}
              title="下一张"
            >
              <ChevronRight size={22} />
            </button>
          ) : null}
        </div>

        {hasMultiple ? (
          <footer className="image-preview-thumbs">
            {images.map((imageUrl, index) => (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                className={`image-preview-thumb ${index === safeIndex ? 'active' : ''}`}
                onClick={() => onSelectIndex(index)}
                title={`查看第 ${index + 1} 张`}
              >
                <img src={normalizeImageUrl(imageUrl)} alt={`缩略图 ${index + 1}`} />
              </button>
            ))}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
