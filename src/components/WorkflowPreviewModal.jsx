import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Film,
  Headphones,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Scan,
  StickyNote,
  X,
} from 'lucide-react';
import { normalizeImageUrl } from '../lib/imageApi';
import { normalizeVideoUrl } from '../lib/videoApi';
import { normalizeAudioUrl } from '../lib/audioApi';

const TYPE_META = {
  note: { label: '文本', Icon: StickyNote, color: '#94a3b8' },
  image: { label: '图片', Icon: ImageIcon, color: '#34d399' },
  video: { label: '视频', Icon: Film, color: '#38bdf8' },
  audio: { label: '音频', Icon: Headphones, color: '#a78bfa' },
};

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;
const CONTENT_PAD = 40;

function getNodeSize(node) {
  return {
    width: Math.max(160, Number(node?.width) || 260),
    height: Math.max(120, Number(node?.height) || 180),
  };
}

function pickUrl(candidates, normalizer) {
  for (const item of candidates) {
    const url = normalizer(String(item || '').trim());
    if (url) return url;
  }
  return '';
}

function pickImageUrl(node) {
  return pickUrl([...(Array.isArray(node?.images) ? node.images : []), node?.content], normalizeImageUrl);
}

function pickVideoUrl(node) {
  return pickUrl([...(Array.isArray(node?.videos) ? node.videos : []), node?.content], normalizeVideoUrl);
}

function pickAudioUrl(node) {
  return pickUrl([...(Array.isArray(node?.audios) ? node.audios : []), node?.content], normalizeAudioUrl);
}

function getPromptText(node) {
  return String(node?.prompt || '').trim();
}

/** 媒体节点的 content 通常是资源链接，展示时应忽略 */
function getNoteText(node) {
  const value = String(node?.content || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|blob:|\/)/i.test(value)) return '';
  return value;
}

function orderNodesByProcess(nodes = [], connections = []) {
  if (!nodes.length) return [];
  const idSet = new Set(nodes.map((node) => node.id));
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));

  connections.forEach((link) => {
    if (!idSet.has(link.fromNodeId) || !idSet.has(link.toNodeId)) return;
    incoming.set(link.toNodeId, (incoming.get(link.toNodeId) || 0) + 1);
    outgoing.get(link.fromNodeId)?.push(link.toNodeId);
  });

  const queue = nodes
    .filter((node) => (incoming.get(node.id) || 0) === 0)
    .sort((a, b) => (Number(a.x) || 0) - (Number(b.x) || 0) || (Number(a.y) || 0) - (Number(b.y) || 0));
  const ordered = [];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current.id)) continue;
    visited.add(current.id);
    ordered.push(current);
    (outgoing.get(current.id) || []).forEach((nextId) => {
      incoming.set(nextId, (incoming.get(nextId) || 0) - 1);
      if ((incoming.get(nextId) || 0) <= 0) {
        const nextNode = nodes.find((node) => node.id === nextId);
        if (nextNode && !visited.has(nextId)) queue.push(nextNode);
      }
    });
  }

  nodes.forEach((node) => {
    if (!visited.has(node.id)) ordered.push(node);
  });

  return ordered;
}

function describeStep(node, index) {
  const meta = TYPE_META[node.type] || TYPE_META.note;
  const prompt = getPromptText(node);
  const note = getNoteText(node);

  if (node.type === 'note') {
    return { title: node.title || `步骤 ${index + 1} · 文本`, detail: note || prompt || '文本节点' };
  }
  if (node.type === 'image') {
    return {
      title: node.title || `步骤 ${index + 1} · 生图`,
      detail: prompt || (pickImageUrl(node) ? '已有参考/结果图' : '图片节点'),
    };
  }
  if (node.type === 'video') {
    return {
      title: node.title || `步骤 ${index + 1} · 生视频`,
      detail: prompt || (pickVideoUrl(node) ? '已有参考/结果视频' : '视频节点'),
    };
  }
  if (node.type === 'audio') {
    return {
      title: node.title || `步骤 ${index + 1} · 音频`,
      detail: prompt || (pickAudioUrl(node) ? '已有音频结果' : '音频节点'),
    };
  }
  return {
    title: node.title || `步骤 ${index + 1} · ${meta.label}`,
    detail: prompt || note || meta.label,
  };
}

function PreviewNodeBody({ node }) {
  const meta = TYPE_META[node.type] || TYPE_META.note;
  const Icon = meta.Icon;
  const prompt = getPromptText(node);
  const note = getNoteText(node);
  const imageUrl = node.type === 'image' ? pickImageUrl(node) : '';
  const videoUrl = node.type === 'video' ? pickVideoUrl(node) : '';
  const audioUrl = node.type === 'audio' ? pickAudioUrl(node) : '';
  const caption = prompt || (node.type === 'note' ? '' : note);

  return (
    <>
      <div className="workflow-preview-node-head" style={{ borderColor: meta.color }}>
        <span style={{ color: meta.color }}>
          <Icon size={13} />
        </span>
        <strong>{node.title || meta.label}</strong>
        <em>{meta.label}</em>
      </div>

      <div className="workflow-preview-node-media">
        {imageUrl ? <img src={imageUrl} alt="" draggable={false} /> : null}
        {!imageUrl && videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            onPointerDown={(event) => event.stopPropagation()}
          />
        ) : null}
        {!imageUrl && !videoUrl && audioUrl ? (
          <div className="workflow-preview-node-audio">
            <Headphones size={18} />
            <span>音频素材</span>
            <audio
              src={audioUrl}
              controls
              preload="metadata"
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
        ) : null}
        {!imageUrl && !videoUrl && !audioUrl && node.type === 'note' ? (
          <div className="workflow-preview-node-text">{note || '暂无文本内容'}</div>
        ) : null}
        {!imageUrl && !videoUrl && !audioUrl && node.type !== 'note' ? (
          <div className="workflow-preview-node-empty">
            <Icon size={18} />
            <span>暂无成品预览</span>
          </div>
        ) : null}
      </div>

      {caption ? <p className="workflow-preview-node-prompt">{caption}</p> : null}
    </>
  );
}

export function WorkflowPreviewModal({
  isOpen,
  workflow = null,
  onClose,
  onAdd,
  adding = false,
  canDelete = false,
  onDelete,
  addLabel = '添加到画布',
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const stageRef = useRef(null);
  const panRef = useRef(null);

  const processNodes = useMemo(
    () => orderNodesByProcess(workflow?.nodes || [], workflow?.connections || []),
    [workflow]
  );

  const layout = useMemo(() => {
    const nodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
    if (!nodes.length) return { nodes: [], connections: [], width: 640, height: 360 };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodes.forEach((node) => {
      const { width, height } = getNodeSize(node);
      const x = Number(node.x) || 0;
      const y = Number(node.y) || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    return {
      nodes: nodes.map((node) => {
        const { width, height } = getNodeSize(node);
        return {
          ...node,
          px: (Number(node.x) || 0) - minX + CONTENT_PAD,
          py: (Number(node.y) || 0) - minY + CONTENT_PAD,
          width,
          height,
        };
      }),
      connections: Array.isArray(workflow?.connections) ? workflow.connections : [],
      width: Math.max(1, maxX - minX) + CONTENT_PAD * 2,
      height: Math.max(1, maxY - minY) + CONTENT_PAD * 2,
    };
  }, [workflow]);

  const zoomBy = useCallback((factor, anchor) => {
    setView((prev) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      if (nextScale === prev.scale) return prev;
      const rect = stageRef.current?.getBoundingClientRect();
      const ax = anchor?.x ?? (rect ? rect.width / 2 : 0);
      const ay = anchor?.y ?? (rect ? rect.height / 2 : 0);
      const ratio = nextScale / prev.scale;
      return {
        scale: nextScale,
        x: ax - (ax - prev.x) * ratio,
        y: ay - (ay - prev.y) * ratio,
      };
    });
  }, []);

  const fitView = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !layout.width || !layout.height) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const scale = Math.min(rect.width / layout.width, rect.height / layout.height, 1);
    setView({
      scale,
      x: (rect.width - layout.width * scale) / 2,
      y: (rect.height - layout.height * scale) / 2,
    });
  }, [layout.width, layout.height]);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(fitView, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, fullscreen, fitView]);

  useEffect(() => {
    if (!isOpen) return undefined;
    setFullscreen(false);
    return undefined;
  }, [isOpen, workflow?.id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (fullscreen) {
        setFullscreen(false);
        return;
      }
      onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, fullscreen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleResize = () => fitView();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, fitView]);

  // React 的 onWheel 是被动监听，无法阻止页面滚动，这里手动绑定
  useEffect(() => {
    const stage = stageRef.current;
    if (!isOpen || !stage) return undefined;
    const handleWheel = (event) => {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      zoomBy(event.deltaY < 0 ? 1.12 : 1 / 1.12, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };
    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [isOpen, fullscreen, zoomBy]);

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    // 音视频控件自己处理点击，不触发画布拖拽
    if (event.target instanceof Element && event.target.closest('video, audio')) return;
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setView((prev) => ({
      ...prev,
      x: pan.originX + (event.clientX - pan.startX),
      y: pan.originY + (event.clientY - pan.startY),
    }));
  }

  function handlePointerUp(event) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    panRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  if (!isOpen || !workflow) return null;

  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));
  const scalePercent = Math.round(view.scale * 100);

  return (
    <div
      className={`asset-modal-backdrop${fullscreen ? ' is-fullscreen-backdrop' : ''}`}
      onPointerDown={onClose}
    >
      <div
        className={`workflow-preview-dialog is-rich${fullscreen ? ' is-fullscreen' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-preview-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="workflow-template-header">
          <div>
            <h3 id="workflow-preview-title">{workflow.name || '系统工作流预览'}</h3>
            <p>
              {workflow.description ||
                '完整预览创作链路中的素材、提示词与结果，确认后可一键加入画布'}
            </p>
          </div>
          <div className="workflow-preview-head-actions">
            <button
              type="button"
              className="icon-mini"
              onClick={() => setFullscreen((prev) => !prev)}
              title={fullscreen ? '退出全屏' : '全屏预览'}
              aria-label={fullscreen ? '退出全屏' : '全屏预览'}
            >
              {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button type="button" className="icon-mini" onClick={onClose} aria-label="关闭">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="workflow-preview-process" aria-label="创作过程">
          <div className="workflow-preview-process-title">创作过程 · {processNodes.length} 步</div>
          <ol className="workflow-preview-process-list">
            {processNodes.map((node, index) => {
              const meta = TYPE_META[node.type] || TYPE_META.note;
              const Icon = meta.Icon;
              const step = describeStep(node, index);
              const thumb =
                (node.type === 'image' && pickImageUrl(node)) ||
                (node.type === 'video' && pickVideoUrl(node)) ||
                '';
              return (
                <li key={node.id} className="workflow-preview-process-item">
                  <span className="workflow-preview-process-index">{index + 1}</span>
                  <span className="workflow-preview-process-thumb" style={{ borderColor: meta.color }}>
                    {thumb ? (
                      node.type === 'video' ? (
                        <video src={thumb} muted playsInline preload="metadata" />
                      ) : (
                        <img src={thumb} alt="" />
                      )
                    ) : (
                      <Icon size={16} style={{ color: meta.color }} />
                    )}
                  </span>
                  <span className="workflow-preview-process-copy">
                    <strong>{step.title}</strong>
                    <em>{step.detail}</em>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div
          ref={stageRef}
          className="workflow-preview-stage is-rich"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            className="workflow-preview-canvas"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            }}
          >
            <svg
              className="workflow-preview-svg"
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
            >
              {layout.connections.map((link) => {
                const from = nodeMap.get(link.fromNodeId);
                const to = nodeMap.get(link.toNodeId);
                if (!from || !to) return null;
                const x1 = from.px + from.width;
                const y1 = from.py + from.height / 2;
                const x2 = to.px;
                const y2 = to.py + to.height / 2;
                const bend = Math.max(60, Math.abs(x2 - x1) * 0.35);
                return (
                  <path
                    key={link.id || `${link.fromNodeId}-${link.toNodeId}`}
                    d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.55)"
                    strokeWidth="2.5"
                  />
                );
              })}
            </svg>

            {layout.nodes.map((node) => {
              const meta = TYPE_META[node.type] || TYPE_META.note;
              return (
                <div
                  key={node.id}
                  className="workflow-preview-node is-rich"
                  style={{
                    left: node.px,
                    top: node.py,
                    width: node.width,
                    height: node.height,
                    borderColor: meta.color,
                  }}
                >
                  <PreviewNodeBody node={node} />
                </div>
              );
            })}
          </div>

          <div className="workflow-preview-zoom" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => zoomBy(1 / 1.2)} aria-label="缩小">
              <Minus size={14} />
            </button>
            <span>{scalePercent}%</span>
            <button type="button" onClick={() => zoomBy(1.2)} aria-label="放大">
              <Plus size={14} />
            </button>
            <button type="button" onClick={fitView} aria-label="适应窗口" title="适应窗口">
              <Scan size={14} />
            </button>
          </div>

          <span className="workflow-preview-readonly-tag">只读预览 · 可拖动 / 滚轮缩放</span>
        </div>

        <footer className="workflow-preview-footer">
          {canDelete ? (
            <button
              type="button"
              className="confirm-dialog-btn"
              onClick={() => onDelete?.(workflow.id)}
            >
              删除系统工作流
            </button>
          ) : (
            <span className="workflow-preview-meta">
              {processNodes.length} 个节点 ·{' '}
              {Array.isArray(workflow.connections) ? workflow.connections.length : 0} 条连线
            </span>
          )}
          <div className="workflow-preview-actions">
            <button type="button" className="confirm-dialog-btn" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="confirm-dialog-btn confirm-dialog-btn-confirm confirm-dialog-btn-warning"
              disabled={adding}
              onClick={() => onAdd?.(workflow)}
            >
              {adding ? '添加中…' : addLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
