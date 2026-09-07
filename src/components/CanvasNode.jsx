import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bot,
  FileText,
  Film,
  FolderOpen,
  Headphones,
  Image as ImageIcon,
  Upload,
  Copy,
  Download,
  Languages,
  LoaderCircle,
  Maximize2,
  Play,
  Trash2,
  X,
  Scissors,
  Check,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { getNoteContentStyleCss } from '../lib/noteContentStyle';
import { MediaUploadOverlay } from './MediaUploadOverlay';
import {
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
  DEFAULT_TEXT_MODEL,
  TEXT_MODEL_OPTIONS,
  TEXT_MODE_OPTIONS,
  DEFAULT_TEXT_MODE,
  getImageCountOptions,
  getVideoCountOptions,
  getVideoDurationOptions,
  getVideoRatioOptions,
  getVideoResolutionOptions,
  defaultSoraSize,
  inferVideoFamily,
  getVideoReferenceImageMax,
  grokRequiresReferenceImage,
  IMAGE_MODEL_OPTIONS,
  getVisibleImageModelOptions,
  getGroupedImageModelOptions,
  getImageRatioOptions,
  getImageResolutionOptions,
  getImageQualityOptions,
  normalizeImageModelSettings,
  normalizeVideoModelSettings,
  normalizeSoraRouteVisibility,
  getVisibleVideoFamilyOptions,
  getGroupedVideoFamilyOptions,
  getVideoModelOptionsForVisibility,
  isSoraFamilyVisible,
  isSeedance933Model,
  SEEDANCE_933_ENABLED,
  VIDEO_FAMILY_OPTIONS,
  VEO_GENERATION_TYPE_OPTIONS,
  SEEDANCE_INPUT_MODE_OPTIONS,
  normalizeSeedanceInputMode,
  normalizeVeoGenerationType,
  DEFAULT_IMAGE_URL,
  DEFAULT_VIDEO_URL,
  PLACEHOLDER_IMAGE,
  VEO_REFERENCE_IMAGE_MAX,
  SEEDANCE_REF_IMAGE_MAX,
  SEEDANCE_REF_VIDEO_MAX,
  SEEDANCE_REF_AUDIO_MAX,
  SEEDANCE25_REF_VIDEO_MAX,
  SEEDANCE25_REF_AUDIO_MAX,
  SEEDANCE25_GZ_REF_VIDEO_MAX,
  WAN30_REF_VIDEO_MAX,
  WAN30_REF_AUDIO_MAX,
  FLUX3_MODE_OPTIONS,
  FLUX3_REF_KEYFRAME_MAX,
  getImageReferenceMax,
  AUDIO_VOICE_OPTIONS,
  AUDIO_SPEED_OPTIONS,
  MIN_AUDIO_NODE_HEIGHT,
  MIN_AUDIO_NODE_HEIGHT_WITH_CONTENT,
  DEFAULT_AUDIO_NODE_WIDTH,
  DEFAULT_AUDIO_MODEL,
} from '../lib/constants';
import { getStoredChatToken } from '../lib/jimiaigoApi';
import { normalizeTextModel, persistPreferredTextModel } from '../lib/textModel';
import {
  getSoraRouteVisibility,
  normalizeVideoUrl,
  resolveSeedanceMediaPreviewUrl,
  VIDEO_TRANSLATE_LANGUAGES,
} from '../lib/videoApi';
import { isImageContent, isVideoContent, isAudioContent } from '../lib/canvas';
import { normalizeAudioUrl, AUDIO_FILE_ACCEPT, filterAudioFiles } from '../lib/audioApi';
import {
  formatImageInputLabel,
  formatVideoInputLabel,
  getImageNodeOutputUrl,
  getTextInputPreview,
  getVideoNodeOutputUrl,
  isImageToPromptNode,
  isVideoToPromptNode,
  mergeImageReferenceImages,
  resolveNoteImageInputUrls,
  resolveNoteVideoInputUrls,
  resolveVideoToolbarFrames,
  resolveVideoToolbarReferences,
  resolveVideoToolbarReferenceVideos,
} from '../lib/connections';
import {
  buildImageNodeLayoutPatch,
  getImageNodeDisplayImages,
  hasRealImageNodeOutput,
  isDefaultDemoImageOutput,
  resolveImageOutputLayout,
} from '../lib/imageNodeLayout';
import { buildVideoNodeLayoutPatch } from '../lib/videoNodeLayout';
import { normalizeImageUrl } from '../lib/imageApi';
import { calculateEstimatedCost } from '../lib/pricing';
import JimicoinIcon from './JimicoinIcon';
import { CustomSelect } from './CustomSelect';
import { NodeGenerationState } from './NodeGenerationState';
import { ReferenceImageChip, ReferencePromptInput, TextReferenceChip } from './ReferencePromptControls';
import { VideoModelPickerPopover } from './VideoModelPickerPopover';
import { ImageModelPickerPopover } from './ImageModelPickerPopover';
import { ModelIcon, getImageModelIconName, getVideoFamilyIconName } from './ModelIcon';

function NodeIcon({ type }) {
  if (type === 'image') return <ImageIcon size={14} />;
  if (type === 'video') return <Film size={14} />;
  if (type === 'audio') return <Headphones size={14} />;
  return <FileText size={14} />;
}

function getImageDisplayImages(node) {
  return getImageNodeDisplayImages(node);
}

function isDefaultDemoMediaUrl(url, defaultUrl) {
  const value = String(url || '').trim();
  if (!value || !defaultUrl) return false;
  return value === defaultUrl || value.endsWith(defaultUrl);
}

function DemoSampleBadge() {
  return <span className="node-output-demo-badge">示例</span>;
}

function RunActionButton({
  label = '运行',
  title,
  disabled = false,
  isRunning = false,
  cost = null,
  onClick,
}) {
  const hasCost = typeof cost === 'number' && Number.isFinite(cost);
  const costText = hasCost ? cost.toFixed(4) : '';
  const resolvedTitle = hasCost ? `${title || label} · 预估 ${costText}` : title || label;

  return (
    <button
      type="button"
      className="icon-button primary run-action-btn"
      onClick={onClick}
      title={resolvedTitle}
      disabled={disabled}
    >
      {isRunning ? <LoaderCircle size={14} className="spin-icon" /> : <Play size={14} />}
      <span className="run-action-label">{label}</span>
      {hasCost ? (
        <span className="run-action-cost" aria-label={`预估消耗 ${costText}`}>
          <JimicoinIcon size={12} />
          {costText}
        </span>
      ) : null}
    </button>
  );
}

function OptionSegment({ title, options, value, onChange, renderIcon }) {
  return (
    <div className="option-segment">
      <div className="option-segment-title">{title}</div>
      <div className="option-segment-control">
        {options.map((option) => {
          const isActive = option.value === value;
          const tooltip = option.hint
            ? `${option.fullLabel || option.label} · ${option.hint}`
            : option.fullLabel || option.label;
          return (
            <button
              key={option.value}
              type="button"
              className={`option-segment-button ${option.hint ? 'has-hint' : ''} ${isActive ? 'active' : ''}`}
              onClick={() => onChange(option.value)}
              title={tooltip}
            >
              {renderIcon ? renderIcon(option) : null}
              <span className="option-segment-button-text">
                <span className="option-segment-button-label">{option.label}</span>
                {option.hint ? (
                  <span className="option-segment-button-hint">{option.hint}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 工具栏生成次数：仅可多选时显示；用 portal 避免被 stage/toolbar overflow 裁切 */
function GenerationCountControl({
  options = [],
  value = 1,
  unit = '次',
  open = false,
  title = '生成次数',
  menuRef = null,
  onToggle,
  onChange,
}) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return undefined;
    }

    const updatePosition = () => {
      const anchor = triggerRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = 104;
      const left = Math.min(
        Math.max(8, rect.left + rect.width / 2 - width / 2),
        window.innerWidth - width - 8
      );
      let top = rect.bottom + 8;
      const estimatedHeight = Math.min(220, 16 + options.length * 34);
      if (top + estimatedHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - estimatedHeight - 8);
      }
      setPanelStyle({
        position: 'fixed',
        top,
        left,
        width,
        zIndex: 1200,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!menuRef) return undefined;
    if (!open) {
      if (menuRef.current === panelRef.current || menuRef.current === triggerRef.current) {
        menuRef.current = null;
      }
      return undefined;
    }
    menuRef.current = panelRef.current;
    return () => {
      if (menuRef.current === panelRef.current) menuRef.current = null;
    };
  }, [open, menuRef, panelStyle]);

  if (!Array.isArray(options) || options.length <= 1) return null;

  const menu =
    open && panelStyle
      ? createPortal(
          <div
            ref={panelRef}
            className="generation-count-menu"
            style={panelStyle}
            role="listbox"
            aria-label={title}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            {options.map((option) => {
              const isActive = Number(value) === Number(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`generation-count-menu-item${isActive ? ' is-active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange?.(Number(option.value));
                  }}
                >
                  <span>
                    {option.value}
                    {unit}
                  </span>
                  {isActive ? <Check size={12} aria-hidden="true" /> : <span className="generation-count-menu-spacer" />}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="generation-count-control">
      <button
        ref={triggerRef}
        type="button"
        className={`icon-button settings-trigger-btn generation-count-trigger${open ? ' active' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggle?.();
        }}
        title={title}
        aria-label={title}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>×{value || 1}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {menu}
    </div>
  );
}

function GroupedOptionSegment({ title, groups, value, onChange }) {
  return (
    <div className="option-segment option-segment-grouped">
      <div className="option-segment-title">{title}</div>
      <div className="option-segment-groups">
        {groups.map((group) => (
          <div key={group.id} className="option-segment-group">
            <div className="option-segment-group-label">{group.label}</div>
            <div className="option-segment-control">
              {group.options.map((option) => {
                const isActive = option.value === value;
                const tooltip = option.fullLabel || option.label;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`option-segment-button ${isActive ? 'active' : ''}`}
                    onClick={() => onChange(option.value)}
                    title={tooltip}
                  >
                    <span className="option-segment-button-text">
                      <span className="option-segment-button-label">{option.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DurationRangeSlider({ title, value, options, onChange }) {
  const values = options.map((option) => Number(option.value)).filter((n) => Number.isFinite(n));
  const min = values.length ? Math.min(...values) : 4;
  const max = values.length ? Math.max(...values) : 30;
  const current = Number(value);
  const safeValue = Number.isFinite(current) ? Math.min(max, Math.max(min, current)) : min;

  return (
    <div className="option-segment">
      <div className="option-segment-title">
        {title}
        <span className="option-segment-title-value">{safeValue}s</span>
      </div>
      <div className="option-segment-control option-segment-slider">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={safeValue}
          onChange={(event) => onChange(String(event.target.value))}
          aria-label={title}
        />
        <div className="option-segment-slider-labels">
          <span>{min}s</span>
          <span>{max}s</span>
        </div>
      </div>
    </div>
  );
}

function RatioIcon({ value }) {
  const [width = 1, height = 1] = String(value)
    .split(':')
    .map((part) => Number(part) || 1);
  const isTall = height > width;
  const isWide = width > height;

  return (
    <span
      className={`ratio-icon ${isWide ? 'wide' : ''} ${isTall ? 'tall' : ''}`}
      aria-hidden="true"
    />
  );
}

function NodeEnlargeButton({ title, onClick }) {
  return (
    <button
      className="node-enlarge-button"
      type="button"
      title={title}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
    >
      <Maximize2 size={12} />
    </button>
  );
}

function NoteBody({ node, isSelected, isRunning, onBeginDrag, onOpenTextEdit }) {
  const contentStyleCss = getNoteContentStyleCss(node.contentStyle);

  if (isRunning) {
    return (
      <NodeGenerationState
        node={node}
        kind="text"
        label="正在运行"
        onBeginDrag={onBeginDrag}
      />
    );
  }

  function openContentEdit(event) {
    event?.stopPropagation?.();
    onOpenTextEdit(node.id, 'content');
  }

  if (node.status === 'error') {
    return (
      <div className="node-field-wrap node-text-display-wrap">
        {isSelected ? (
          <NodeEnlargeButton title="放大编辑结果" onClick={(event) => openContentEdit(event)} />
        ) : null}
        <div
          className="node-error-display"
          onPointerDown={(event) => onBeginDrag(event, node)}
          onDoubleClick={(event) => openContentEdit(event)}
        >
          <strong>运行失败</strong>
          <span style={contentStyleCss}>{node.content || '生成失败'}</span>
        </div>
      </div>
    );
  }

  const displayContent = String(node.content || '').trim() || (
    node.textMode === 'ai' ? '运行后显示结果' : '双击并编辑'
  );
  const isPlaceholder =
    displayContent === '双击并编辑' || displayContent === '运行后显示结果';

  return (
    <div className="node-field-wrap node-text-display-wrap">
      {isSelected ? (
        <NodeEnlargeButton title="放大编辑结果" onClick={(event) => openContentEdit(event)} />
      ) : null}
      <div
        className={`node-text-display${isPlaceholder ? ' is-placeholder' : ''}`}
        style={contentStyleCss}
        onPointerDown={(event) => onBeginDrag(event, node)}
        onDoubleClick={(event) => openContentEdit(event)}
      >
        {displayContent}
      </div>
    </div>
  );
}

function useImageOutputLayout(node, displayImages, onSyncOutputLayout) {
  const layoutSignatureRef = useRef('');
  const onSyncOutputLayoutRef = useRef(onSyncOutputLayout);
  const displayImagesKey = displayImages.join('|');

  onSyncOutputLayoutRef.current = onSyncOutputLayout;

  useEffect(() => {
    let cancelled = false;

    async function syncLayout() {
      const layout = await resolveImageOutputLayout({
        imageUrls: displayImages,
        imageRatio: node.imageRatio,
        imageCount: displayImages.length > 0 ? displayImages.length : node.imageCount,
      });
      const signature = `${layout.width}x${layout.height}x${layout.outputAspectCss}x${displayImages.length}`;
      if (layoutSignatureRef.current === signature) return;
      layoutSignatureRef.current = signature;

      if (!cancelled) {
        onSyncOutputLayoutRef.current?.(node.id, layout);
      }
    }

    syncLayout();
    return () => {
      cancelled = true;
    };
  }, [displayImagesKey, node.id]);
}

function ImageBody({
  node,
  isRunning,
  showOutputActions = false,
  isInputsHighlighted = false,
  onBeginDrag,
  onHighlightInputs,
  onOpenAssetLibrary,
  onUploadImageOutput,
  onSyncOutputLayout,
}) {
  const displayImages = getImageDisplayImages(node);
  const showDemoBadge = isDefaultDemoImageOutput(displayImages);
  const imageCount = Math.min(Math.max(displayImages.length || 1, 1), 4);
  const maxUploadCount = Math.min(4, Math.max(1, Number(node.imageCount) || 1));
  const outputFileInputRef = useRef(null);

  useImageOutputLayout(node, displayImages, onSyncOutputLayout);

  if (isRunning) {
    return (
      <NodeGenerationState
        node={node}
        kind="image"
        label="正在生成图片"
        onBeginDrag={onBeginDrag}
      />
    );
  }

  if (node.status === 'error') {
    return (
      <div
        className="node-error-display image-error-display"
        onPointerDown={(event) => onBeginDrag(event, node)}
      >
        <strong>生成失败</strong>
        <span>{node.content || '图片生成失败'}</span>
      </div>
    );
  }

  return (
    <div
      className={`image-output-grid image-count-${imageCount} ${isInputsHighlighted ? 'inputs-highlighted' : ''}`}
      onPointerDown={(event) => {
        onHighlightInputs?.(node.id);
        onBeginDrag(event, node);
      }}
    >
      {showDemoBadge ? (
        <div className="node-output-demo-badge-wrap" onPointerDown={(event) => event.stopPropagation()}>
          <DemoSampleBadge />
        </div>
      ) : null}

      {showOutputActions && (onOpenAssetLibrary || onUploadImageOutput) ? (
        <div
          className="image-output-actions"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {onUploadImageOutput ? (
            <>
              <button
                type="button"
                className="image-output-action-button"
                title="上传本地图片"
                onClick={(event) => {
                  event.stopPropagation();
                  outputFileInputRef.current?.click();
                }}
              >
                <Upload size={12} />
                <span>上传</span>
              </button>
              <input
                ref={outputFileInputRef}
                type="file"
                accept="image/*"
                multiple={maxUploadCount > 1}
                hidden
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  if (files.length > 0) {
                     onUploadImageOutput(node.id, files);
                  }
                  event.target.value = '';
                }}
              />
            </>
          ) : null}
          {onOpenAssetLibrary ? (
            <button
              type="button"
              className="image-output-action-button"
              title="从资产库选择图片"
              onClick={(event) => {
                event.stopPropagation();
                onOpenAssetLibrary(node.id, 'output');
              }}
            >
              <FolderOpen size={12} />
              <span>资产库</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {displayImages.length > 0 ? (
        displayImages.map((imageUrl, index) => (
          <div className="image-output-thumb" key={`${imageUrl}-${index}`}>
            <img
              src={normalizeImageUrl(imageUrl)}
              alt={`${node.title}-${index + 1}`}
              draggable={false}
            />
          </div>
        ))
      ) : (
        <div className="image-empty">
          <span>输入提示词生成图片</span>
        </div>
      )}
    </div>
  );
}

function getVideoDisplayUrl(node) {
  const videos = Array.isArray(node.videos) && node.videos.length > 0 ? node.videos : [];
  if (videos.length > 0) return videos[0];
  if (isVideoContent(node.content)) return node.content;
  return '';
}

function useVideoOutputLayout(node, displayVideo, onSyncOutputLayout) {
  const layoutSignatureRef = useRef('');
  const onSyncOutputLayoutRef = useRef(onSyncOutputLayout);

  onSyncOutputLayoutRef.current = onSyncOutputLayout;

  useEffect(() => {
    // 真实成片按 metadata 适配；示例/空节点跟设置比例走，方便统一放大横屏默认尺寸
    const isDemo = !displayVideo || isDefaultDemoMediaUrl(displayVideo, DEFAULT_VIDEO_URL);
    if (!isDemo) return undefined;

    const layout = buildVideoNodeLayoutPatch(node);
    const signature = `${layout.width}x${layout.height}x${layout.outputAspectCss}`;
    if (layoutSignatureRef.current === signature) return undefined;
    layoutSignatureRef.current = signature;
    onSyncOutputLayoutRef.current?.(node.id, layout);
    return undefined;
  }, [displayVideo, node.id, node.videoFamily, node.videoOrientation, node.videoRatio, node.videoSize]);
}

function shouldApplyVideoLayout(node, layout) {
  return !(
    node.width === layout.width &&
    node.height === layout.height &&
    node.outputAspectCss === layout.outputAspectCss
  );
}

function applyVideoNodeLayout(node, onSyncOutputLayout, aspectWidth, aspectHeight) {
  const layout = buildVideoNodeLayoutPatch(
    node,
    aspectWidth && aspectHeight ? { width: aspectWidth, height: aspectHeight } : null
  );
  if (!shouldApplyVideoLayout(node, layout)) return;
  onSyncOutputLayout?.(node.id, layout);
}

function VideoBody({
  node,
  isRunning,
  showOutputActions = false,
  isInputsHighlighted = false,
  onBeginDrag,
  onHighlightInputs,
  onOpenAssetLibrary,
  onUploadVideoOutput,
  onSyncOutputLayout,
  onExtractVideoFrame,
  onExtractVideoClip,
  onExtractVideoAudio,
  onTranslateVideo,
}) {
  const displayVideo = getVideoDisplayUrl(node);
  const showDemoBadge = isDefaultDemoMediaUrl(displayVideo, DEFAULT_VIDEO_URL);
  const loadedAspectRef = useRef('');
  const videoRef = useRef(null);
  const hoverPreviewRef = useRef(false);
  const outputFileInputRef = useRef(null);

  const [videoDuration, setVideoDuration] = useState(0);
  const [isClipping, setIsClipping] = useState(false);
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState(VIDEO_TRANSLATE_LANGUAGES[0].value);
  const [translateMode, setTranslateMode] = useState('speed');
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(10);
  const trackRef = useRef(null);

  const handlePointerDown = (event, type) => {
    event.stopPropagation();
    event.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const duration = videoDuration || 10;

    const handlePointerMove = (moveEvent) => {
      const offsetX = moveEvent.clientX - rect.left;
      const percentage = Math.min(1, Math.max(0, offsetX / rect.width));
      const targetTime = percentage * duration;

      if (type === 'start') {
        const nextStart = Math.min(targetTime, clipEnd - 0.5);
        setClipStart(nextStart);
        if (videoRef.current) {
          videoRef.current.currentTime = nextStart;
        }
      } else {
        const nextEnd = Math.max(targetTime, clipStart + 0.5);
        setClipEnd(nextEnd);
        if (videoRef.current) {
          videoRef.current.currentTime = nextEnd;
        }
      }
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  function handleConfirmClip() {
    onExtractVideoClip?.(node.id, displayVideo, clipStart, clipEnd);
    setIsClipping(false);
  }

  async function handleExtractAudio(event) {
    event.stopPropagation();
    event.preventDefault();
    if (isExtractingAudio || !onExtractVideoAudio) return;

    hoverPreviewRef.current = false;
    videoRef.current?.pause();

    let seedAudioContext = null;
    try {
      seedAudioContext = new AudioContext();
      if (seedAudioContext.state === 'suspended') {
        void seedAudioContext.resume();
      }
    } catch {
      seedAudioContext = null;
    }

    setIsExtractingAudio(true);
    try {
      await onExtractVideoAudio(node.id, displayVideo, {
        audioContext: seedAudioContext,
      });
    } finally {
      if (seedAudioContext && seedAudioContext.state !== 'closed') {
        void seedAudioContext.close();
      }
      setIsExtractingAudio(false);
    }
  }

  useVideoOutputLayout(node, displayVideo, onSyncOutputLayout);

  function stopHoverPreview() {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // ignore seek errors while metadata is loading
    }
  }

  async function startHoverPreview() {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.readyState < 1) return;
      video.currentTime = 0;
      video.muted = false;
      await video.play();
    } catch {
      // If unmuted playback is blocked, try muted playback as fallback
      try {
        video.muted = true;
        await video.play();
      } catch {
        // ignore
      }
    }
  }

  function handleVideoLoadedMetadata(event) {
    const video = event.currentTarget;
    setVideoDuration(video.duration || 0);
    setClipEnd(video.duration || 10);
    const aspectWidth = video.videoWidth;
    const aspectHeight = video.videoHeight;
    if (!aspectWidth || !aspectHeight) return;

    const signature = `${aspectWidth}x${aspectHeight}`;
    if (loadedAspectRef.current === signature) return;
    loadedAspectRef.current = signature;

    // 内置示例视频是竖屏素材，不要用其真实比例覆盖节点默认横屏布局
    if (!isDefaultDemoMediaUrl(displayVideo, DEFAULT_VIDEO_URL)) {
      applyVideoNodeLayout(node, onSyncOutputLayout, aspectWidth, aspectHeight);
    }
    if (hoverPreviewRef.current) {
      startHoverPreview();
    }
  }

  if (isRunning) {
    return (
      <NodeGenerationState
        node={node}
        kind="video"
        label={node.videoTranslateJob ? '正在翻译视频' : '正在生成视频'}
        onBeginDrag={onBeginDrag}
      />
    );
  }

  if (node.status === 'error') {
    return (
      <div
        className="node-error-display image-error-display"
        onPointerDown={(event) => onBeginDrag(event, node)}
      >
        <strong>生成失败</strong>
        <span>{node.content || '视频生成失败'}</span>
      </div>
    );
  }

  return (
    <div
      className={`video-output-preview ${isInputsHighlighted ? 'inputs-highlighted' : ''}`}
      onPointerDown={(event) => {
        onHighlightInputs?.(node.id);
        onBeginDrag(event, node);
      }}
    >
      {showDemoBadge ? (
        <div className="node-output-demo-badge-wrap" onPointerDown={(event) => event.stopPropagation()}>
          <DemoSampleBadge />
        </div>
      ) : null}

      {showOutputActions && (onOpenAssetLibrary || onUploadVideoOutput) ? (
        <div
          className="image-output-actions"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {onUploadVideoOutput ? (
            <>
              <button
                type="button"
                className="image-output-action-button"
                title="上传本地视频"
                onClick={(event) => {
                  event.stopPropagation();
                  outputFileInputRef.current?.click();
                }}
              >
                <Upload size={12} />
                <span>上传</span>
              </button>
              <input
                ref={outputFileInputRef}
                type="file"
                accept="video/*"
                hidden
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  if (files.length > 0) {
                    onUploadVideoOutput(node.id, files);
                  }
                  event.target.value = '';
                }}
              />
            </>
          ) : null}
          {onOpenAssetLibrary ? (
            <button
              type="button"
              className="image-output-action-button"
              title="从资产库选择视频"
              onClick={(event) => {
                event.stopPropagation();
                onOpenAssetLibrary(node.id, 'video-output');
              }}
            >
              <FolderOpen size={12} />
              <span>资产库</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {displayVideo ? (
        <div
          className="video-output-thumb"
          onPointerEnter={() => {
            if (isClipping) return;
            hoverPreviewRef.current = true;
            startHoverPreview();
          }}
          onPointerLeave={() => {
            if (isClipping) return;
            hoverPreviewRef.current = false;
            stopHoverPreview();
          }}
        >
          <video
            ref={videoRef}
            key={displayVideo}
            src={normalizeVideoUrl(displayVideo)}
            muted={false}
            playsInline
            preload="auto"
            draggable={false}
            onLoadedMetadata={handleVideoLoadedMetadata}
            onEnded={stopHoverPreview}
          />
          {!isClipping && (
            <div
              className={`video-frame-extract-actions ${isExtractingAudio ? 'is-active' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="image-output-action-button"
                title="截取视频第一帧为图片节点"
                data-tooltip="截首帧"
                onClick={(event) => {
                  event.stopPropagation();
                  onExtractVideoFrame?.(node.id, displayVideo, 'first');
                }}
              >
                <ImageIcon size={13} />
                <span>截首帧</span>
              </button>
              <button
                type="button"
                className="image-output-action-button"
                title="截取视频最后一帧为图片节点"
                data-tooltip="截尾帧"
                onClick={(event) => {
                  event.stopPropagation();
                  onExtractVideoFrame?.(node.id, displayVideo, 'last');
                }}
              >
                <ImageIcon size={13} />
                <span>截尾帧</span>
              </button>
              <button
                type="button"
                className="image-output-action-button"
                title="剪辑视频片段"
                data-tooltip="剪辑"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsClipping(true);
                  videoRef.current?.pause();
                }}
              >
                <Scissors size={13} />
                <span>剪辑</span>
              </button>
              <button
                type="button"
                className="image-output-action-button"
                title="分离视频为音频节点和无声画面节点"
                data-tooltip={isExtractingAudio ? '分离中' : '分离音视频'}
                disabled={isExtractingAudio}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                }}
                onClick={handleExtractAudio}
              >
                {isExtractingAudio ? <LoaderCircle size={13} className="spin" /> : <Headphones size={13} />}
                <span>{isExtractingAudio ? '分离中' : '分离音视频'}</span>
              </button>
              <button
                type="button"
                className="image-output-action-button"
                title="将视频翻译为目标语言"
                data-tooltip="视频翻译"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsTranslating(true);
                  videoRef.current?.pause();
                }}
              >
                <Languages size={13} />
                <span>翻译</span>
              </button>
            </div>
          )}

          {isExtractingAudio ? (
            <div className="video-audio-extract-overlay" onPointerDown={(event) => event.stopPropagation()}>
              <LoaderCircle size={18} className="spin-icon" />
              <span>正在分离音频和画面…</span>
            </div>
          ) : null}

          {isTranslating ? (
            <div className="video-translate-overlay" onPointerDown={(event) => event.stopPropagation()}>
              <button className="video-clip-btn cancel" onClick={() => setIsTranslating(false)} title="取消">
                <X size={14} />
              </button>
              <strong>视频翻译</strong>
              <CustomSelect
                compact
                label="语言"
                value={translateLang}
                options={VIDEO_TRANSLATE_LANGUAGES}
                onChange={setTranslateLang}
              />
              <div className="video-translate-modes">
                <button
                  type="button"
                  className={translateMode === 'speed' ? 'active' : ''}
                  onClick={() => setTranslateMode('speed')}
                >
                  极速
                </button>
                <button
                  type="button"
                  className={translateMode === 'precision' ? 'active' : ''}
                  onClick={() => setTranslateMode('precision')}
                >
                  精翻
                </button>
              </div>
              <button
                type="button"
                className="video-translate-submit"
                onClick={() => {
                  setIsTranslating(false);
                  onTranslateVideo?.(node.id, displayVideo, {
                    language: translateLang,
                    mode: translateMode,
                    duration: videoDuration,
                  });
                }}
              >
                开始翻译
              </button>
            </div>
          ) : null}

          {isClipping && (
            <div className="video-clip-overlay" onPointerDown={(e) => e.stopPropagation()}>
              <button className="video-clip-btn cancel" onClick={() => setIsClipping(false)} title="取消">
                <X size={14} />
              </button>
              
              <div className="video-clip-timeline-wrapper">
                <div className="video-clip-timeline-frames">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const duration = videoDuration || 10;
                    const t = (i + 0.5) * (duration / 8);
                    return (
                      <div key={i} className="video-clip-frame-thumb">
                        <video
                          src={`${normalizeVideoUrl(displayVideo)}#t=${t.toFixed(2)}`}
                          preload="metadata"
                          muted
                          playsInline
                        />
                      </div>
                    );
                  })}
                </div>

                <div 
                  className="video-clip-timeline-mask left-mask"
                  style={{ width: `${(clipStart / (videoDuration || 10)) * 100}%` }}
                />
                <div 
                  className="video-clip-timeline-mask right-mask"
                  style={{ left: `${(clipEnd / (videoDuration || 10)) * 100}%`, right: 0 }}
                />

                <div className="video-clip-timeline-track" ref={trackRef}>
                  <div 
                    className="video-clip-timeline-selection"
                    style={{
                      left: `${(clipStart / (videoDuration || 10)) * 100}%`,
                      width: `${((clipEnd - clipStart) / (videoDuration || 10)) * 100}%`
                    }}
                  />
                  
                  <div 
                    className="video-clip-handle left-handle" 
                    style={{ left: `${(clipStart / (videoDuration || 10)) * 100}%` }}
                    onPointerDown={(e) => handlePointerDown(e, 'start')}
                  >
                    <div className="handle-bar" />
                  </div>
                  
                  <div 
                    className="video-clip-handle right-handle" 
                    style={{ left: `${(clipEnd / (videoDuration || 10)) * 100}%` }}
                    onPointerDown={(e) => handlePointerDown(e, 'end')}
                  >
                    <div className="handle-bar" />
                  </div>

                  <div className="video-clip-duration-badge">
                    {(clipEnd - clipStart).toFixed(1)}s
                  </div>
                </div>
              </div>
              
              <button className="video-clip-btn confirm" onClick={handleConfirmClip} title="确定">
                <Check size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="image-empty">
          <span>输入提示词生成视频</span>
        </div>
      )}
    </div>
  );
}

function getAudioDisplayUrl(node) {
  const audioUrl = String(node.audioUrl || '').trim();
  if (audioUrl) return audioUrl;
  const content = String(node.content || '').trim();
  if (content && isAudioContent(content)) return content;
  return '';
}

function getAudioDisplayName(url, fallbackTitle = '音频') {
  const value = String(url || '').trim();
  if (!value) return fallbackTitle;
  if (value.startsWith('data:')) return '本地 MP3';

  try {
    const normalized = normalizeAudioUrl(value);
    const pathname = normalized.startsWith('http')
      ? new URL(normalized).pathname
      : normalized.split('?')[0];
    const filename = decodeURIComponent(pathname.split('/').pop() || '').trim();
    if (filename) return filename;
  } catch {
    const tail = value.split('/').pop()?.split('?')[0];
    if (tail) return decodeURIComponent(tail);
  }

  return fallbackTitle;
}

function AudioWaveform({ active = false }) {
  return (
    <div className={`audio-waveform ${active ? 'is-active' : ''}`} aria-hidden="true">
      {Array.from({ length: 14 }, (_, index) => (
        <span
          key={index}
          className="audio-waveform-bar"
          style={{ '--bar-delay': `${index * 0.08}s` }}
        />
      ))}
    </div>
  );
}

function AudioPlayerCard({ src, title }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  return (
    <div className={`audio-player-card ${isPlaying ? 'is-playing' : ''}`}>
      <div className="audio-player-card-glow" aria-hidden="true" />
      <div className="audio-player-card-header">
        <div className="audio-player-icon">
          <Headphones size={18} />
        </div>
        <div className="audio-player-meta">
          <div className="audio-player-title-row">
            <span className="audio-player-title" title={title}>
              {title}
            </span>
            <span className="audio-player-badge">MP3</span>
          </div>
        </div>
      </div>
      <AudioWaveform active={isPlaying} />
      <div
        className="audio-player-controls"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <audio ref={audioRef} controls preload="metadata" src={src} />
      </div>
    </div>
  );
}

function AudioBody({
  node,
  isRunning,
  showOutputActions = false,
  isInputsHighlighted = false,
  onBeginDrag,
  onHighlightInputs,
  onOpenAssetLibrary,
  onUploadAudioOutput,
  onSyncAudioLayout,
}) {
  const displayAudio = getAudioDisplayUrl(node);
  const outputFileInputRef = useRef(null);

  useEffect(() => {
    if (!onSyncAudioLayout) return undefined;

    const minHeight = displayAudio
      ? MIN_AUDIO_NODE_HEIGHT_WITH_CONTENT
      : MIN_AUDIO_NODE_HEIGHT;
    const minWidth = DEFAULT_AUDIO_NODE_WIDTH;
    const nextHeight = Math.max(Number(node.height) || 0, minHeight);
    const nextWidth = Math.max(Number(node.width) || 0, minWidth);

    if (nextHeight !== node.height || nextWidth !== node.width) {
      onSyncAudioLayout(node.id, { height: nextHeight, width: nextWidth });
    }

    return undefined;
  }, [displayAudio, node.id, node.height, node.width, onSyncAudioLayout]);

  if (isRunning) {
    return (
      <NodeGenerationState
        node={node}
        kind="audio"
        label="正在合成语音"
        onBeginDrag={onBeginDrag}
      />
    );
  }

  if (node.status === 'error') {
    return (
      <div
        className="node-error-display image-error-display"
        onPointerDown={(event) => onBeginDrag(event, node)}
      >
        <strong>操作失败</strong>
        <span>{node.content || '音频处理失败'}</span>
      </div>
    );
  }

  return (
    <div
      className={`audio-output-preview ${isInputsHighlighted ? 'inputs-highlighted' : ''}`}
      onPointerDown={(event) => {
        onHighlightInputs?.(node.id);
        onBeginDrag(event, node);
      }}
    >
      {showOutputActions && (onOpenAssetLibrary || onUploadAudioOutput) ? (
        <div
          className="image-output-actions"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {onUploadAudioOutput ? (
            <>
              <button
                type="button"
                className="image-output-action-button"
                title="上传本地音频"
                onClick={(event) => {
                  event.stopPropagation();
                  outputFileInputRef.current?.click();
                }}
              >
                <Upload size={12} />
                <span>上传</span>
              </button>
              <input
                ref={outputFileInputRef}
                type="file"
                accept={AUDIO_FILE_ACCEPT}
                hidden
                onChange={(event) => {
                  const files = filterAudioFiles(event.target.files || []);
                  if (files.length > 0) {
                    onUploadAudioOutput(node.id, files);
                  }
                  event.target.value = '';
                }}
              />
            </>
          ) : null}
          {onOpenAssetLibrary ? (
            <button
              type="button"
              className="image-output-action-button"
              title="从资产库选择音频"
              onClick={(event) => {
                event.stopPropagation();
                onOpenAssetLibrary(node.id, 'audio-output');
              }}
            >
              <FolderOpen size={12} />
              <span>资产库</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {displayAudio ? (
        <div className="audio-player-shell">
          <AudioPlayerCard
            src={normalizeAudioUrl(displayAudio)}
            title={getAudioDisplayName(displayAudio, node.title || '音频')}
          />
        </div>
      ) : (
        <div className="audio-empty-state">
          <div className="audio-empty-icon">
            <Headphones size={22} aria-hidden="true" />
          </div>
          <strong>添加音频</strong>
          <span>上传 MP3 或从资产库选择，也可在下方合成</span>
        </div>
      )}
    </div>
  );
}

function ratioIconValue(family, value) {
  if (family === 'sora') {
    return value === 'portrait' ? '9:16' : '16:9';
  }
  return value;
}

function referencePreviewSrc(image) {
  if (!image) return '';
  const preview = image.previewUrl || image.preview;
  if (preview) return preview;
  const value = image.url || image.data;
  if (!value || String(value).startsWith('asset://')) return '';
  return image.source === 'local' ? value : normalizeImageUrl(value);
}

function getReferencePreviewUrls(references, resolvePreviewUrl = referencePreviewSrc) {
  return references.map((image) => resolvePreviewUrl(image)).filter(Boolean);
}

function useMediaHoverPopover(enabled) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const triggerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const updatePopoverPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 12
    );
    const preferAbove = rect.top > 260;
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
    if (!hoverOpen || !enabled) {
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
  }, [hoverOpen, enabled]);

  useEffect(() => () => clearCloseTimer(), []);

  const openHover = () => {
    if (!enabled) return;
    clearCloseTimer();
    setHoverOpen(true);
  };

  const scheduleCloseHover = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setHoverOpen(false), 80);
  };

  return {
    hoverOpen: hoverOpen && enabled,
    popoverStyle,
    triggerRef,
    openHover,
    scheduleCloseHover,
  };
}

function OmniVideoChip({ item, index, disabled, onRemove, onPreview }) {
  const previewSrc = resolveSeedanceMediaPreviewUrl(item, 'video');
  const canPreview = Boolean(previewSrc);
  const { hoverOpen, popoverStyle, triggerRef, openHover, scheduleCloseHover } =
    useMediaHoverPopover(canPreview);

  const popover =
    hoverOpen && previewSrc && popoverStyle
      ? createPortal(
          <div
            className="seedance-omni-hover-preview is-video"
            style={popoverStyle}
            role="dialog"
            aria-label={`视频${index + 1}预览`}
            onPointerEnter={openHover}
            onPointerLeave={scheduleCloseHover}
          >
            <video src={previewSrc} muted playsInline autoPlay loop preload="metadata" />
            {item.name ? <span className="seedance-omni-hover-preview-name">{item.name}</span> : null}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="seedance-omni-chip is-video">
      <button
        ref={triggerRef}
        type="button"
        className={`seedance-omni-chip-preview is-media${canPreview ? ' is-previewable' : ''}`}
        title={canPreview ? item.name || `预览视频${index + 1}` : item.name || `视频${index + 1}`}
        onPointerEnter={openHover}
        onPointerLeave={scheduleCloseHover}
        onClick={() => {
          if (!canPreview) return;
          onPreview?.(previewSrc, item.name || `视频${index + 1}`);
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Film size={18} aria-hidden="true" />
      </button>
      <span className="seedance-omni-chip-label">视频{index + 1}</span>
      <button
        type="button"
        className="seedance-omni-chip-remove"
        onClick={() => onRemove?.(index)}
        disabled={disabled}
        title="移除参考视频"
      >
        <X size={11} />
      </button>
      {popover}
    </div>
  );
}

/** 参考素材统一托盘：图片 / 视频 / 音频 / 文本分区 */
function SeedanceOmniReferenceTray({
  images = [],
  videos = [],
  audios = [],
  textLinks = [],
  maxImages = SEEDANCE_REF_IMAGE_MAX,
  maxVideos = SEEDANCE_REF_VIDEO_MAX,
  maxAudios = SEEDANCE_REF_AUDIO_MAX,
  disabled = false,
  imagePickLabel = '图片 · 资产库',
  resolveImagePreview,
  onPreviewImage,
  onPreviewVideo,
  onPickImage,
  onPickVideo,
  onPickAudio,
  onRemoveImage,
  onRemoveVideo,
  onRemoveAudio,
  onRemoveText,
}) {
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef(null);
  const canAddImage = maxImages > 0 && images.length < maxImages;
  const canAddVideo = maxVideos > 0 && videos.length < maxVideos;
  const canAddAudio = maxAudios > 0 && audios.length < maxAudios;
  const canAddAny = canAddImage || canAddVideo || canAddAudio;

  useEffect(() => {
    if (!addOpen) return undefined;
    const onPointerDown = (event) => {
      if (addRef.current?.contains(event.target)) return;
      setAddOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [addOpen]);

  return (
    <div className="seedance-omni-tray" aria-label="参考素材">
      <div className="seedance-omni-tray-list">
        {images.map((image, index) => {
          const previewSrc = resolveImagePreview?.(image) || image.url;
          return (
          <div key={image.id || image.url || `image-${index}`} className="seedance-omni-chip is-image">
            <button
              type="button"
              className={`seedance-omni-chip-preview${!previewSrc ? ' is-media' : ''}`}
              onClick={() => onPreviewImage?.(index)}
              disabled={!onPreviewImage || !previewSrc}
              title={previewSrc ? '预览参考图' : image.name || '图片引用（等待生成）'}
            >
              {previewSrc ? <img src={previewSrc} alt="" /> : <ImageIcon size={18} aria-hidden="true" />}
            </button>
            <span className="seedance-omni-chip-label">图片{index + 1}</span>
            <button
              type="button"
              className="seedance-omni-chip-remove"
              onClick={() => onRemoveImage?.(index)}
              disabled={disabled}
              title="移除参考图"
            >
              <X size={11} />
            </button>
          </div>
          );
        })}

        {videos.map((item, index) => (
          <OmniVideoChip
            key={item.id || item.url || `video-${index}`}
            item={item}
            index={index}
            disabled={disabled}
            onRemove={onRemoveVideo}
            onPreview={onPreviewVideo}
          />
        ))}

        {audios.map((item, index) => (
          <div key={item.id || item.url || `audio-${index}`} className="seedance-omni-chip is-audio">
            <div className="seedance-omni-chip-preview is-media" title={item.name || `音频${index + 1}`}>
              <Headphones size={18} aria-hidden="true" />
            </div>
            <span className="seedance-omni-chip-label">音频{index + 1}</span>
            <button
              type="button"
              className="seedance-omni-chip-remove"
              onClick={() => onRemoveAudio?.(index)}
              disabled={disabled}
              title="移除参考音频"
            >
              <X size={11} />
            </button>
          </div>
        ))}

        {textLinks.length > 0 && (images.length > 0 || videos.length > 0 || audios.length > 0) ? (
          <span className="seedance-omni-divider" aria-hidden="true" />
        ) : null}

        {textLinks.map(({ linkId, node: textNode }, index) => (
          <div key={linkId} className="seedance-omni-chip is-text">
            <div
              className="seedance-omni-chip-preview is-media"
              title={getTextInputPreview(textNode) || `文本${index + 1}`}
            >
              <FileText size={18} aria-hidden="true" />
            </div>
            <span className="seedance-omni-chip-label">文本{index + 1}</span>
            <button
              type="button"
              className="seedance-omni-chip-remove"
              onClick={() => onRemoveText?.(linkId)}
              disabled={disabled}
              title="移除文本引用并断开连线"
            >
              <X size={11} />
            </button>
          </div>
        ))}

        {canAddAny ? (
          <div className="seedance-omni-add" ref={addRef}>
            <button
              type="button"
              className="seedance-omni-add-btn"
              disabled={disabled}
              aria-expanded={addOpen}
              aria-haspopup="menu"
              title="从资产库添加参考"
              onClick={() => setAddOpen((prev) => !prev)}
            >
              <FolderOpen size={16} aria-hidden="true" />
            </button>
            {addOpen ? (
              <div className="seedance-omni-add-menu" role="menu">
                {maxImages > 0 ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={disabled || !canAddImage}
                    onClick={() => {
                      setAddOpen(false);
                      onPickImage?.();
                    }}
                  >
                    {imagePickLabel}
                  </button>
                ) : null}
                {maxVideos > 0 ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={disabled || !canAddVideo}
                    onClick={() => {
                      setAddOpen(false);
                      onPickVideo?.();
                    }}
                  >
                    视频 · 资产库
                  </button>
                ) : null}
                {maxAudios > 0 ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={disabled || !canAddAudio}
                    onClick={() => {
                      setAddOpen(false);
                      onPickAudio?.();
                    }}
                  >
                    音频 · 资产库
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VeoFrameSlot({ label, optional, image, disabled, blockedHint, onPick, onClear, onPreview }) {
  const isBlocked = Boolean(disabled && blockedHint);
  const previewSrc = image ? referencePreviewSrc(image) : '';
  const [hoverOpen, setHoverOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const triggerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const updatePopoverPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
    const spaceAbove = rect.top;
    const preferAbove = spaceAbove > 240;
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
    if (!hoverOpen || !previewSrc) {
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
  }, [hoverOpen, previewSrc]);

  useEffect(() => () => clearCloseTimer(), []);

  const openHover = () => {
    if (!previewSrc) return;
    clearCloseTimer();
    setHoverOpen(true);
  };

  const scheduleCloseHover = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setHoverOpen(false), 80);
  };

  const popover =
    hoverOpen && previewSrc && popoverStyle
      ? createPortal(
          <div
            className="veo-frame-hover-preview"
            style={popoverStyle}
            role="dialog"
            aria-label={`${label}预览`}
            onPointerEnter={openHover}
            onPointerLeave={scheduleCloseHover}
          >
            <img src={previewSrc} alt={label} />
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`veo-frame-slot ${optional ? 'is-optional' : ''} ${isBlocked ? 'is-blocked' : ''}`}>
      <div className="veo-frame-slot-label">
        {label}
        {optional ? <span className="veo-frame-optional">可选</span> : null}
      </div>
      {image ? (
        <div
          ref={triggerRef}
          className={`veo-frame-preview${onPreview && previewSrc ? ' is-previewable' : ''}`}
          onPointerEnter={openHover}
          onPointerLeave={scheduleCloseHover}
        >
          {onPreview && previewSrc ? (
            <button
              type="button"
              className="veo-frame-preview-hit"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onPreview();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              title={`预览${label}`}
              aria-label={`预览${label}`}
            >
              <img src={previewSrc} alt={label} />
            </button>
          ) : (
            <img src={previewSrc} alt={label} />
          )}
          <button type="button" onClick={onClear} disabled={disabled} title={`移除${label}`}>
            <X size={11} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="veo-frame-add"
          onClick={onPick}
          disabled={disabled}
          title={blockedHint || `选择${label}`}
        >
          <FolderOpen size={14} />
          选择
        </button>
      )}
      {isBlocked ? <span className="veo-frame-hint">{blockedHint}</span> : null}
      {popover}
    </div>
  );
}

export function VideoToolbar({
  node,
  variant = 'dock',
  isRunning,
  isTranslating,
  textInputLinks = [],
  imageInputLinks = [],
  videoInputLinks = [],
  onRunVideoGeneration,
  onOpenAssetLibrary,
  onRemoveImageReference,
  onRemoveTextReference,
  onRemoveVeoFrame,
  onRemoveSeedanceMedia,
  onUpdateNode,
  onOpenEnlargedSettings,
  onVideoGenerationTypeChange,
  onPreviewImage,
  onPreviewVideo,
  pricingList,
  userProfile,
}) {
  const toolbarRef = useRef(null);
  const [activePopover, setActivePopover] = useState(null); // 'model' | 'params' | 'count' | null
  const [soraVisibility, setSoraVisibility] = useState(() => normalizeSoraRouteVisibility());
  const popoverRef = useRef(null);
  const modelTriggerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = getStoredChatToken();
        const res = await getSoraRouteVisibility({ token });
        if (cancelled) return;
        const payload = res?.data ?? res;
        setSoraVisibility(normalizeSoraRouteVisibility(payload));
      } catch {
        // Sora 已下线：失败时保持默认隐藏
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activePopover || activePopover === 'model') return;
    const handleOutsideClick = (event) => {
      const target = event.target;
      if (target?.closest?.('.generation-count-menu')) return;
      if (target?.closest?.('.settings-trigger-btn')) return;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      setActivePopover(null);
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [activePopover]);
  const showSettingsPopover = Boolean(activePopover);
  const hasTextInput = textInputLinks.length > 0;
  const isPromptEmpty = !String(node.prompt || '').trim() && !hasTextInput;
  const resolvedReferences = resolveVideoToolbarReferences(node, imageInputLinks);
  const assetReferences = Array.isArray(node.referenceImages) ? node.referenceImages : [];
  const {
    firstFrame: resolvedFirstFrame,
    lastFrame: resolvedLastFrame,
    firstConnectionLinkId,
    lastConnectionLinkId,
  } = resolveVideoToolbarFrames(node, imageInputLinks);
  const referenceAudios = Array.isArray(node.videoReferenceAudios) ? node.videoReferenceAudios : [];
  const family = inferVideoFamily(node);
  const isVeo = family === 'veo';
  const isSeedance = family === 'seedance';
  const isSeedance25 = family === 'seedance25';
  const isSeedance25Gz = family === 'seedance25gz';
  const isSeedance25Ar = family === 'seedance25ar';
  const isFlux3 = family === 'flux3';
  const isMinimax = family === 'minimax';
  const isWan30 = family === 'wan30';
  const veoGenerationType =
    isVeo || isMinimax ? normalizeVeoGenerationType(node.videoGenerationType) : 'frame';
  const seedanceInputMode = isSeedance
    ? normalizeSeedanceInputMode(node.videoGenerationType, node)
    : 'frame';
  const seedance25GzInputMode = isSeedance25Gz
    ? normalizeSeedanceInputMode(node.videoGenerationType, node)
    : 'frame';
  const flux3Mode = node.videoFlux3Mode || 't2v';
  const showVeoReferenceImages = isVeo && veoGenerationType === 'reference';
  const showMinimaxReferenceImages = isMinimax && veoGenerationType === 'reference';
  const seedanceReferenceMode = isSeedance && seedanceInputMode === 'reference';
  const showSeedanceFrames = isSeedance && seedanceInputMode === 'frame';
  const hasSeedanceFrames = showSeedanceFrames && Boolean(resolvedFirstFrame || resolvedLastFrame);
  const showMinimaxFrames = isMinimax && veoGenerationType === 'frame';
  const showSeedance25GzFrames = isSeedance25Gz && seedance25GzInputMode === 'frame';
  const showFlux3Frames = isFlux3 && flux3Mode === 'flf';
  const showFlux3ReferenceImages = isFlux3 && (flux3Mode === 'i2v' || flux3Mode === 'keyframes');
  const showSeedance25Media =
    isSeedance25 || isWan30 || (isSeedance25Gz && seedance25GzInputMode === 'reference');
  // 仅图片参考的模型（不含已有独立模式切换的家族）
  const showGenericReferenceImages =
    !isVeo &&
    !isSeedance &&
    !isFlux3 &&
    !isSeedance25Gz &&
    !isMinimax &&
    !showSeedance25Media;
  const seedance25VideoMax = isWan30
    ? WAN30_REF_VIDEO_MAX
    : isSeedance25Gz
      ? SEEDANCE25_GZ_REF_VIDEO_MAX
      : SEEDANCE25_REF_VIDEO_MAX;
  const referenceVideoAssetMax = seedanceReferenceMode
    ? SEEDANCE_REF_VIDEO_MAX
    : showSeedance25Media
      ? seedance25VideoMax
      : 0;
  const referenceVideos = resolveVideoToolbarReferenceVideos(
    node,
    videoInputLinks,
    referenceVideoAssetMax
  );
  const showUnifiedReferenceTray =
    seedanceReferenceMode ||
    showSeedance25Media ||
    showVeoReferenceImages ||
    showMinimaxReferenceImages ||
    showFlux3ReferenceImages ||
    showGenericReferenceImages ||
    referenceVideos.length > 0;
  const showSeedanceStyleModeSwitch = isSeedance || isSeedance25Gz;
  const seedanceStyleInputMode = isSeedance25Gz ? seedance25GzInputMode : seedanceInputMode;
  const showFrameReferenceModeSwitch = isVeo || isMinimax;
  const seedance25AudioMax = isWan30 ? WAN30_REF_AUDIO_MAX : SEEDANCE25_REF_AUDIO_MAX;
  const familyOptions = getVisibleVideoFamilyOptions(soraVisibility);
  const familyGroups = getGroupedVideoFamilyOptions(soraVisibility);
  const modelOptions = getVideoModelOptionsForVisibility(family, soraVisibility);
  const model = modelOptions.some((option) => option.value === node.videoModel)
    ? node.videoModel
    : modelOptions[0]?.value || node.videoModel;
  const resolutionOptions = getVideoResolutionOptions(family, model);
  const ratioOptions = getVideoRatioOptions(family, model);
  const durationOptions = getVideoDurationOptions(family, model);
  const countOptions = getVideoCountOptions(family);
  const normalizedSettings = normalizeVideoModelSettings({
    family,
    model: node.videoModel,
    size: node.videoSize,
    resolution: node.videoResolution,
    orientation: node.videoOrientation,
    ratio: node.videoRatio,
    quality: node.videoQuality,
    duration: node.videoDuration,
    generationType: node.videoGenerationType,
    count: node.videoCount,
    route: node.videoRoute,
  });

  const resolutionValue =
    family === 'sora'
      ? normalizedSettings.size
      : family === 'grok'
        ? normalizedSettings.quality
        : normalizedSettings.resolution;
  const ratioValue = family === 'sora' ? normalizedSettings.orientation : normalizedSettings.ratio;
  const resolutionTitle = family === 'grok' ? '画质' : '分辨率';
  const genericReferenceMax = getVideoReferenceImageMax(node);
  const requiresGrokReference = family === 'grok' && grokRequiresReferenceImage(model);
  const referencePreviewUrls = getReferencePreviewUrls(resolvedReferences);
  const hasVideoRefs = videoInputLinks.length > 0;
  const videoCost = pricingList ? calculateEstimatedCost(pricingList, node, userProfile, { hasVideoRefs }) : 0;

  function previewReferenceAt(index) {
    const targetUrl = referencePreviewSrc(resolvedReferences[index]);
    if (!targetUrl || !onPreviewImage) return;
    const activeIndex = referencePreviewUrls.indexOf(targetUrl);
    onPreviewImage(referencePreviewUrls, activeIndex >= 0 ? activeIndex : 0);
  }

  function previewFrameImage(frame) {
    const url = referencePreviewSrc(frame);
    if (!url || !onPreviewImage) return;
    onPreviewImage([url], 0);
  }

  useEffect(() => {
    if (variant === 'modal' || !isSeedance) return undefined;

    const toolbar = toolbarRef.current;
    if (!toolbar) return undefined;

    let animationFrame = 0;

    const updateSeedanceViewport = () => {
      toolbar.style.setProperty('--seedance-toolbar-offset-y', '0px');

      const rect = toolbar.getBoundingClientRect();
      const stage = toolbar.closest('.stage');
      const scale = Number.parseFloat(getComputedStyle(stage || document.documentElement).getPropertyValue('--canvas-scale')) || 1;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const gap = 12;
      const naturalTop = rect.top;
      const naturalAvailable = viewportHeight - naturalTop - gap;
      const desiredHeight = Math.min(toolbar.scrollHeight * scale, Math.max(280, viewportHeight - gap * 2));
      const maxOffset = Math.max(0, naturalTop - gap);
      const offset = Math.min(Math.max(0, desiredHeight - naturalAvailable), maxOffset);
      const visibleHeight = Math.max(280, viewportHeight - (naturalTop - offset) - gap);
      const nextMaxHeight = `${Math.round(visibleHeight / scale)}px`;
      const nextOffset = `${Math.round(-(offset / scale))}px`;

      if (toolbar.style.getPropertyValue('--seedance-toolbar-max-height') !== nextMaxHeight) {
        toolbar.style.setProperty('--seedance-toolbar-max-height', nextMaxHeight);
      }
      if (toolbar.style.getPropertyValue('--seedance-toolbar-offset-y') !== nextOffset) {
        toolbar.style.setProperty('--seedance-toolbar-offset-y', nextOffset);
      }
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateSeedanceViewport);
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.visualViewport?.addEventListener('resize', scheduleUpdate);

    const stage = toolbar.closest('.stage');
    const mutationObserver =
      typeof MutationObserver !== 'undefined' && stage
        ? new MutationObserver(scheduleUpdate)
        : null;
    mutationObserver?.observe(stage, { attributes: true, attributeFilter: ['style', 'class'] });

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
      mutationObserver?.disconnect();
      toolbar.style.removeProperty('--seedance-toolbar-max-height');
      toolbar.style.removeProperty('--seedance-toolbar-offset-y');
    };
  }, [
    variant,
    isSeedance,
    showSeedanceStyleModeSwitch,
    node.id,
    resolvedReferences.length,
    referenceVideos.length,
    referenceAudios.length,
    hasSeedanceFrames,
    showUnifiedReferenceTray,
  ]);

  function patchVideoLayout(overrides = {}) {
    return buildVideoNodeLayoutPatch({ ...node, ...overrides });
  }

  function applyFamilyChange(nextFamily, preferredModel) {
    const nextSettings = normalizeVideoModelSettings({
      family: nextFamily,
      model: preferredModel,
      generationType: node.videoGenerationType,
    });
    const patch = {
      videoFamily: nextFamily,
      videoModel: nextSettings.model,
      videoRoute: nextSettings.route,
      videoSize: nextSettings.size || node.videoSize,
      videoResolution: nextSettings.resolution || node.videoResolution,
      videoQuality: nextSettings.quality || node.videoQuality,
      videoOrientation: nextSettings.orientation || node.videoOrientation,
      videoRatio: nextSettings.ratio || node.videoRatio,
      videoDuration: nextSettings.duration,
      videoCount: nextSettings.count,
      status: 'idle',
    };

    if (nextFamily === 'veo' || nextFamily === 'minimax') {
      patch.videoGenerationType = nextSettings.generationType || 'frame';
      if (patch.videoGenerationType === 'frame') {
        patch.referenceImages = [];
      } else {
        patch.videoFirstFrame = null;
        patch.videoLastFrame = null;
      }
    } else if (nextFamily === 'seedance' || nextFamily === 'seedance25gz') {
      patch.videoGenerationType =
        nextSettings.generationType || normalizeSeedanceInputMode(node.videoGenerationType, node);
    } else {
      patch.videoGenerationType = undefined;
    }

    if (nextFamily === 'flux3') {
      patch.videoFlux3Mode = node.videoFlux3Mode || 't2v';
      patch.flux3GenerateAudio = node.flux3GenerateAudio !== false;
      patch.flux3DraftCacheUrl = node.flux3DraftCacheUrl || '';
    }

    if (nextFamily !== 'veo' && nextFamily !== 'seedance' && nextFamily !== 'minimax' && nextFamily !== 'flux3' && nextFamily !== 'seedance25gz') {
      patch.videoFirstFrame = null;
      patch.videoLastFrame = null;
    }

    if (nextFamily !== 'seedance' && nextFamily !== 'seedance25' && nextFamily !== 'seedance25gz' && nextFamily !== 'wan30') {
      patch.videoReferenceVideos = [];
      patch.videoReferenceAudios = [];
    }

    onUpdateNode(node.id, {
      ...patch,
      ...patchVideoLayout({
        videoFamily: patch.videoFamily,
        videoOrientation: patch.videoOrientation,
        videoRatio: patch.videoRatio,
        videoSize: patch.videoSize,
      }),
    });
  }

  function applyVeoGenerationTypeChange(value) {
    if (onVideoGenerationTypeChange) {
      onVideoGenerationTypeChange(node.id, value);
      return;
    }
    const patch = { videoGenerationType: value, status: 'idle' };
    const clearMediaRefs = isSeedance || isSeedance25Gz;
    if (value === 'frame') {
      patch.referenceImages = [];
      if (clearMediaRefs) {
        patch.videoReferenceVideos = [];
        patch.videoReferenceAudios = [];
      }
    } else if (value === 'reference') {
      patch.videoFirstFrame = null;
      patch.videoLastFrame = null;
    } else {
      // t2v
      patch.referenceImages = [];
      patch.videoFirstFrame = null;
      patch.videoLastFrame = null;
      if (clearMediaRefs) {
        patch.videoReferenceVideos = [];
        patch.videoReferenceAudios = [];
      }
    }
    onUpdateNode(node.id, patch);
  }

  function applySeedanceInputModeChange(value) {
    applyVeoGenerationTypeChange(value);
  }

  function getUnifiedTrayConfig() {
    if (seedanceReferenceMode) {
      return {
        imagePickMode: 'seedance-reference',
        imagePickLabel: '图片 · 素材库',
        maxImages: SEEDANCE_REF_IMAGE_MAX,
        maxVideos: SEEDANCE_REF_VIDEO_MAX,
        maxAudios: SEEDANCE_REF_AUDIO_MAX,
      };
    }
    if (showSeedance25Media) {
      return {
        imagePickMode: 'reference',
        imagePickLabel: '图片 · 资产库',
        maxImages: genericReferenceMax,
        maxVideos: seedance25VideoMax,
        maxAudios: seedance25AudioMax,
      };
    }
    if (showVeoReferenceImages || showMinimaxReferenceImages) {
      return {
        imagePickMode: showVeoReferenceImages ? 'veo-reference' : 'reference',
        imagePickLabel: '图片 · 资产库',
        maxImages: showVeoReferenceImages ? VEO_REFERENCE_IMAGE_MAX : genericReferenceMax,
        maxVideos: 0,
        maxAudios: 0,
      };
    }
    if (showFlux3ReferenceImages) {
      const maxImages = flux3Mode === 'keyframes' ? FLUX3_REF_KEYFRAME_MAX : 1;
      return {
        imagePickMode: 'reference',
        imagePickLabel: flux3Mode === 'keyframes' ? '关键帧 · 资产库' : '图片 · 资产库',
        maxImages,
        maxVideos: 0,
        maxAudios: 0,
      };
    }
    if (showGenericReferenceImages) {
      return {
        imagePickMode: 'reference',
        imagePickLabel: requiresGrokReference ? '图片 · 资产库（必填）' : '图片 · 资产库',
        maxImages: genericReferenceMax,
        maxVideos: 0,
        maxAudios: 0,
      };
    }
    return null;
  }

  function renderUnifiedReferenceTray(overrides = {}) {
    const config = { ...getUnifiedTrayConfig(), ...overrides };
    if (!config?.imagePickMode && !overrides.imagePickMode) return null;
    const imagePickMode = config.imagePickMode || 'reference';
    return (
      <SeedanceOmniReferenceTray
        images={resolvedReferences}
        videos={referenceVideos}
        audios={referenceAudios}
        textLinks={textInputLinks}
        maxImages={config.maxImages ?? genericReferenceMax}
        maxVideos={config.maxVideos ?? 0}
        maxAudios={config.maxAudios ?? 0}
        disabled={isRunning}
        imagePickLabel={config.imagePickLabel || '图片 · 资产库'}
        resolveImagePreview={referencePreviewSrc}
        onPreviewImage={onPreviewImage ? previewReferenceAt : undefined}
        onPreviewVideo={onPreviewVideo}
        onPickImage={() => onOpenAssetLibrary(node.id, imagePickMode)}
        onPickVideo={() =>
          onOpenAssetLibrary(
            node.id,
            imagePickMode.startsWith('seedance-') ? 'seedance-ref-video' : 's25-ref-video'
          )
        }
        onPickAudio={() =>
          onOpenAssetLibrary(
            node.id,
            imagePickMode.startsWith('seedance-') ? 'seedance-ref-audio' : 's25-ref-audio'
          )
        }
        onRemoveImage={(index) => removeVideoReferenceAt(index)}
        onRemoveVideo={(index) => {
          const item = referenceVideos[index];
          if (item?.source === 'connection' && item.linkId) {
            onRemoveTextReference(item.linkId);
            return;
          }
          const assetOnly = referenceVideos.filter((video) => video.source !== 'connection');
          const assetIndex = assetOnly.findIndex(
            (video) =>
              (item?.id && video.id === item.id) || (item?.url && video.url === item.url)
          );
          const currentAssets = Array.isArray(node.videoReferenceVideos)
            ? node.videoReferenceVideos
            : [];
          const next =
            assetIndex >= 0
              ? currentAssets.filter((_, i) => i !== assetIndex)
              : currentAssets.filter(
                  (video) =>
                    !(item?.id && video.id === item.id) && !(item?.url && video.url === item.url)
                );
          onUpdateNode(node.id, { videoReferenceVideos: next, status: 'idle' });
        }}
        onRemoveAudio={(index) => {
          const next = referenceAudios.filter((_, i) => i !== index);
          onUpdateNode(node.id, { videoReferenceAudios: next, status: 'idle' });
        }}
        onRemoveText={(linkId) => onRemoveTextReference(linkId)}
      />
    );
  }

  function removeVideoReferenceAt(index) {
    const image = resolvedReferences[index];
    if (!image) return;
    if (image.source === 'connection' && image.linkId) {
      onRemoveTextReference(image.linkId);
      return;
    }
    const assetIndex = assetReferences.findIndex(
      (item) =>
        (image.id && item.id === image.id) ||
        (image.url && (item.url === image.url || item.data === image.url))
    );
    if (assetIndex >= 0) {
      onRemoveImageReference(node.id, assetIndex);
    }
  }

  function clearResolvedFirstFrame() {
    if (firstConnectionLinkId) {
      onRemoveTextReference(firstConnectionLinkId);
      return;
    }
    onRemoveVeoFrame(node.id, 'first');
  }

  function clearResolvedLastFrame() {
    if (lastConnectionLinkId) {
      onRemoveTextReference(lastConnectionLinkId);
      return;
    }
    onRemoveVeoFrame(node.id, 'last');
  }

  function applyModelChange(value) {
    const defaultResolution = value === 'seedance-2.0-manxue' ? '720p' : node.videoResolution;
    const nextSettings = normalizeVideoModelSettings({
      family,
      model: value,
      size: node.videoSize,
      resolution: defaultResolution,
      orientation: node.videoOrientation,
      ratio: family === 'grok' ? undefined : node.videoRatio,
      quality: family === 'grok' ? (node.videoQuality || '720p') : node.videoQuality,
      duration: family === 'grok' ? undefined : node.videoDuration,
      count: node.videoCount,
      route: node.videoRoute,
    });
    const maxRefs = getVideoReferenceImageMax({ ...node, videoModel: nextSettings.model, videoFamily: family });
    const nextRefs = Array.isArray(node.referenceImages)
      ? node.referenceImages.slice(0, maxRefs)
      : node.referenceImages;
    onUpdateNode(node.id, {
      videoModel: nextSettings.model,
      videoSize: nextSettings.size,
      videoResolution: nextSettings.resolution,
      videoQuality: nextSettings.quality,
      videoOrientation: nextSettings.orientation,
      videoRatio: nextSettings.ratio,
      videoDuration: nextSettings.duration,
      videoCount: nextSettings.count,
      referenceImages: nextRefs,
      ...patchVideoLayout({
        videoOrientation: nextSettings.orientation,
        videoRatio: nextSettings.ratio,
        videoSize: nextSettings.size,
      }),
    });
  }

  useEffect(() => {
    if (family !== 'sora') return;
    if (!isSoraFamilyVisible(soraVisibility)) {
      applyFamilyChange('seedance');
      return;
    }
    const visibleModels = getVideoModelOptionsForVisibility('sora', soraVisibility);
    if (visibleModels.length === 0) {
      applyFamilyChange('seedance');
      return;
    }
    if (!visibleModels.some((option) => option.value === node.videoModel)) {
      applyModelChange(visibleModels[0].value);
    }
  }, [family, soraVisibility, node.videoModel, node.id]);

  useEffect(() => {
    if (SEEDANCE_933_ENABLED) return;
    if (family !== 'seedance') return;
    if (!isSeedance933Model(node.videoModel)) return;
    const visibleModels = getVideoModelOptionsForVisibility('seedance', soraVisibility);
    if (visibleModels[0]?.value) {
      applyModelChange(visibleModels[0].value);
    }
  }, [family, soraVisibility, node.videoModel, node.id]);

  const showResolutionControl = resolutionOptions.length > 0;
  const shareRatioDurationRow = ratioOptions.length <= 3 && durationOptions.length <= 3;

  const ratioSegment = (
    <OptionSegment
      title="宽高比"
      value={ratioValue}
      options={ratioOptions}
      onChange={(value) => {
        if (family === 'sora') {
          const size = defaultSoraSize(value);
          onUpdateNode(node.id, {
            videoOrientation: value,
            videoSize: size,
            ...patchVideoLayout({ videoOrientation: value, videoSize: size }),
          });
          return;
        }
        onUpdateNode(node.id, {
          videoRatio: value,
          ...patchVideoLayout({ videoRatio: value }),
        });
      }}
      renderIcon={(option) => <RatioIcon value={ratioIconValue(family, option.value)} />}
    />
  );

  const durationSegment =
    durationOptions.length > 8 ? (
      <DurationRangeSlider
        title="时长"
        value={normalizedSettings.duration}
        options={durationOptions}
        onChange={(value) => onUpdateNode(node.id, { videoDuration: value })}
      />
    ) : (
      <OptionSegment
        title="时长"
        value={normalizedSettings.duration}
        options={durationOptions}
        onChange={(value) => onUpdateNode(node.id, { videoDuration: value })}
      />
    );

  const videoParamPanels = (
    <div className="settings-options-stack">
      <div className="settings-options-row">
        {showResolutionControl ? (
          <OptionSegment
            title={resolutionTitle}
            value={resolutionValue}
            options={resolutionOptions}
            onChange={(value) => {
              if (family === 'grok') {
                onUpdateNode(node.id, { videoQuality: value });
                return;
              }
              onUpdateNode(node.id, { videoResolution: value });
            }}
          />
        ) : null}
      </div>
      {showFrameReferenceModeSwitch ? (
        <OptionSegment
          title="生成类型"
          value={veoGenerationType}
          options={VEO_GENERATION_TYPE_OPTIONS}
          onChange={applyVeoGenerationTypeChange}
        />
      ) : null}
      {showSeedanceStyleModeSwitch ? (
        <OptionSegment
          title="输入模式"
          value={seedanceStyleInputMode}
          options={SEEDANCE_INPUT_MODE_OPTIONS}
          onChange={applySeedanceInputModeChange}
        />
      ) : null}
      {isFlux3 ? (
        <OptionSegment
          title="生成模式"
          value={flux3Mode}
          options={FLUX3_MODE_OPTIONS}
          onChange={(value) => {
            const patch = { videoFlux3Mode: value, status: 'idle' };
            if (value !== 'i2v' && value !== 'keyframes') patch.referenceImages = [];
            if (value !== 'flf') {
              patch.videoFirstFrame = null;
              patch.videoLastFrame = null;
            }
            if (value !== 'enhance') patch.flux3DraftCacheUrl = node.flux3DraftCacheUrl || '';
            onUpdateNode(node.id, patch);
          }}
        />
      ) : null}
      {shareRatioDurationRow ? (
        <div className="settings-options-row">
          {flux3Mode === 'enhance' && isFlux3 ? null : ratioSegment}
          {!isSeedance25Ar ? durationSegment : null}
        </div>
      ) : (
        <>
          {flux3Mode === 'enhance' && isFlux3 ? null : ratioSegment}
          {!isSeedance25Ar ? durationSegment : null}
        </>
      )}
      {isSeedance25Ar ? (
        <p className="video-manxue-hint">固定 15s/30s · 9:16/16:9 · 仅支持参考图 · 按次计费</p>
      ) : null}
      {isFlux3 && flux3Mode !== 'enhance' ? (
        <label className="settings-inline-toggle">
          <input
            type="checkbox"
            checked={node.flux3GenerateAudio !== false}
            onChange={(event) =>
              onUpdateNode(node.id, { flux3GenerateAudio: event.target.checked, status: 'idle' })
            }
          />
          <span>生成音频</span>
        </label>
      ) : null}
      {isFlux3 && flux3Mode === 'enhance' ? (
        <div className="settings-text-field">
          <span className="settings-text-field-label">draft_cache_url</span>
          <input
            type="text"
            value={node.flux3DraftCacheUrl || ''}
            placeholder="草稿任务返回的 draft_cache_url"
            onChange={(event) =>
              onUpdateNode(node.id, { flux3DraftCacheUrl: event.target.value, status: 'idle' })
            }
          />
        </div>
      ) : null}
    </div>
  );

  const durationLabel = node.videoDuration ? `${node.videoDuration}s` : '';
  const summaryParts = [
    durationLabel,
    ratioValue,
    resolutionValue
  ].filter(Boolean);
  const summaryText = summaryParts.join(' | ') || '参数';
  const familyLabel =
    familyOptions.find((option) => option.value === family)?.label ||
    VIDEO_FAMILY_OPTIONS.find((option) => option.value === family)?.label ||
    family;
  const modelOptionLabel = modelOptions.find((option) => option.value === normalizedSettings.model)?.label;
  const modelTriggerText =
    modelOptions.length > 1 && modelOptionLabel && modelOptionLabel !== familyLabel
      ? `${familyLabel} · ${modelOptionLabel}`
      : familyLabel;
  const videoModelIconName =
    familyGroups.find((group) => group.options?.some((option) => option.value === family))?.options?.find(
      (option) => option.value === family
    )?.icon || getVideoFamilyIconName(family);

  const settingsContent = activePopover === 'params' ? videoParamPanels : null;

  const extraActions =
    variant === 'dock' && onOpenEnlargedSettings ? (
      <NodeEnlargeButton title="放大编辑提示词" onClick={onOpenEnlargedSettings} />
    ) : null;

  const frameSlotsAbovePrompt = (
    <>
      {showSeedanceFrames ? (
        <div className="seedance-above-prompt">
          <div className="seedance-above-row">
            <VeoFrameSlot
              label="首帧"
              image={resolvedFirstFrame}
              disabled={isRunning}
              onPick={() => onOpenAssetLibrary(node.id, 'seedance-first')}
              onClear={clearResolvedFirstFrame}
              onPreview={onPreviewImage ? () => previewFrameImage(resolvedFirstFrame) : undefined}
            />
            <VeoFrameSlot
              label="尾帧"
              optional
              image={resolvedLastFrame}
              disabled={isRunning || !resolvedFirstFrame}
              onPick={() => {
                if (!resolvedFirstFrame) return;
                onOpenAssetLibrary(node.id, 'seedance-last');
              }}
              onClear={clearResolvedLastFrame}
              onPreview={onPreviewImage ? () => previewFrameImage(resolvedLastFrame) : undefined}
            />
          </div>
        </div>
      ) : null}
      {isVeo && veoGenerationType === 'frame' ? (
        <div className="seedance-above-prompt">
          <div className="veo-frame-row">
            <VeoFrameSlot
              label="首帧"
              image={resolvedFirstFrame}
              disabled={isRunning}
              onPick={() => onOpenAssetLibrary(node.id, 'veo-first')}
              onClear={clearResolvedFirstFrame}
              onPreview={onPreviewImage ? () => previewFrameImage(resolvedFirstFrame) : undefined}
            />
            <VeoFrameSlot
              label="尾帧"
              optional
              image={resolvedLastFrame}
              disabled={isRunning || !resolvedFirstFrame}
              onPick={() => {
                if (!resolvedFirstFrame) return;
                onOpenAssetLibrary(node.id, 'veo-last');
              }}
              onClear={clearResolvedLastFrame}
              onPreview={onPreviewImage ? () => previewFrameImage(resolvedLastFrame) : undefined}
            />
          </div>
        </div>
      ) : null}
      {showMinimaxFrames || showFlux3Frames || showSeedance25GzFrames ? (
        <div className="seedance-above-prompt">
          <div className="veo-frame-row">
            <VeoFrameSlot
              label="首帧"
              optional
              image={resolvedFirstFrame}
              disabled={isRunning}
              onPick={() => onOpenAssetLibrary(node.id, 'veo-first')}
              onClear={clearResolvedFirstFrame}
              onPreview={onPreviewImage ? () => previewFrameImage(resolvedFirstFrame) : undefined}
            />
            <VeoFrameSlot
              label="尾帧"
              optional
              image={resolvedLastFrame}
              disabled={isRunning}
              onPick={() => onOpenAssetLibrary(node.id, 'veo-last')}
              onClear={clearResolvedLastFrame}
              onPreview={onPreviewImage ? () => previewFrameImage(resolvedLastFrame) : undefined}
            />
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <div
      ref={toolbarRef}
      className={`node-bottom-toolbar image-toolbar video-toolbar ${showSeedanceStyleModeSwitch || showFrameReferenceModeSwitch ? 'video-toolbar-seedance' : ''} ${variant === 'modal' ? 'node-settings-toolbar-modal' : ''}`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {showSeedanceStyleModeSwitch ? (
        <div className="seedance-mode-switch" role="tablist" aria-label="输入模式">
          {SEEDANCE_INPUT_MODE_OPTIONS.map((option) => {
            const isActive = seedanceStyleInputMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`seedance-mode-switch-btn${isActive ? ' is-active' : ''}`}
                disabled={isRunning}
                onClick={() => applySeedanceInputModeChange(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {showFrameReferenceModeSwitch ? (
        <div className="seedance-mode-switch" role="tablist" aria-label="生成类型">
          {VEO_GENERATION_TYPE_OPTIONS.map((option) => {
            const isActive = veoGenerationType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`seedance-mode-switch-btn${isActive ? ' is-active' : ''}`}
                disabled={isRunning}
                onClick={() => applyVeoGenerationTypeChange(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {frameSlotsAbovePrompt}

      {showUnifiedReferenceTray ? (
        <div className="seedance-above-prompt">{renderUnifiedReferenceTray()}</div>
      ) : null}

      {hasTextInput && !showUnifiedReferenceTray ? (
        <div className="image-reference-row">
          <div className="image-reference-list">
            {textInputLinks.map(({ linkId, node: textNode }, index) => (
              <TextReferenceChip
                key={linkId}
                index={index}
                textNode={textNode}
                onRemove={() => onRemoveTextReference(linkId)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {family !== 'seedance' && family !== 'sora' ? (
        <ReferencePromptInput
          value={node.prompt || ''}
          onChange={(prompt) => onUpdateNode(node.id, { prompt, status: 'idle' })}
          references={resolvedReferences}
          resolvePreviewUrl={referencePreviewSrc}
          placeholder="输入视频提示词，回车换行；支持 @ 引用参考图"
          disabled={isRunning}
          extraActions={extraActions}
        />
      ) : (
        <div className="node-prompt-wrap node-prompt-wrap--plain">
          <textarea
            className="node-prompt-input"
            value={node.prompt || ''}
            onChange={(event) => onUpdateNode(node.id, { prompt: event.target.value, status: 'idle' })}
            placeholder="输入视频提示词"
          />
          {extraActions ? <div className="prompt-editor-actions">{extraActions}</div> : null}
        </div>
      )}

      {showSettingsPopover && activePopover === 'params' ? (
        isSeedance ? (
          <div className="toolbar-settings-inline" ref={popoverRef} data-popover={activePopover}>
            {settingsContent}
          </div>
        ) : (
          <div
            className="toolbar-settings-popover toolbar-settings-popover--params"
            ref={popoverRef}
            data-popover={activePopover}
          >
            {settingsContent}
          </div>
        )
      ) : null}

      {activePopover === 'model' ? (
        <VideoModelPickerPopover
          anchorRef={modelTriggerRef}
          family={family}
          model={normalizedSettings.model}
          familyGroups={familyGroups}
          soraVisibility={soraVisibility}
          onPickFamily={(nextFamily) => {
            applyFamilyChange(nextFamily);
            const nextModels = getVideoModelOptionsForVisibility(nextFamily, soraVisibility);
            if (nextModels.length <= 1) {
              setActivePopover(null);
            }
          }}
          onPickModel={(nextFamily, nextModel) => {
            if (nextFamily === family) {
              applyModelChange(nextModel);
            } else {
              applyFamilyChange(nextFamily, nextModel);
            }
            setActivePopover(null);
          }}
          onClose={() => setActivePopover(null)}
        />
      ) : null}

      <div className="node-bottom-actions image-bottom-actions">
        <button
          ref={modelTriggerRef}
          type="button"
          className={`icon-button settings-trigger-btn ${activePopover === 'model' ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActivePopover((prev) => (prev === 'model' ? null : 'model'));
          }}
          title="选择模型"
        >
          <ModelIcon name={videoModelIconName} size={14} />
          <span>{modelTriggerText}</span>
          <ChevronDown size={12} />
        </button>
        <button
          type="button"
          className={`icon-button settings-trigger-btn ${activePopover === 'params' ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActivePopover((prev) => (prev === 'params' ? null : 'params'));
          }}
          title="参数设置"
        >
          <SlidersHorizontal size={14} />
          <span>{summaryText}</span>
        </button>
        <GenerationCountControl
          options={countOptions}
          value={normalizedSettings.count || 1}
          unit="次"
          open={activePopover === 'count'}
          title="生成次数"
          menuRef={popoverRef}
          onToggle={() => setActivePopover((prev) => (prev === 'count' ? null : 'count'))}
          onChange={(nextCount) => {
            onUpdateNode(node.id, { videoCount: nextCount });
            setActivePopover(null);
          }}
        />

        <div className="node-run-actions">
          <button
            className="icon-button"
            onClick={() => onRunVideoGeneration(node, 'translate')}
            title="翻译提示词"
            disabled={isTranslating || isRunning || isPromptEmpty}
          >
            {isTranslating ? <LoaderCircle size={14} className="spin-icon" /> : <Languages size={14} />}
            翻译
          </button>
          <RunActionButton
            title="运行视频生成"
            isRunning={isRunning}
            disabled={isRunning || isTranslating || isPromptEmpty}
            cost={pricingList ? videoCost : null}
            onClick={() => onRunVideoGeneration(node)}
          />
        </div>
      </div>
    </div>
  );
}

export function ImageToolbar({
  node,
  variant = 'dock',
  isRunning,
  isTranslating,
  textInputLinks = [],
  imageInputLinks = [],
  onRunImageGeneration,
  onOpenAssetLibrary,
  onRemoveImageReference,
  onRemoveTextReference,
  onUpdateNode,
  onOpenEnlargedSettings,
  onPreviewImage,
  pricingList,
  userProfile,
}) {
  const [activePopover, setActivePopover] = useState(null); // 'model' | 'params' | 'count' | null
  const popoverRef = useRef(null);
  const modelTriggerRef = useRef(null);

  useEffect(() => {
    if (!activePopover || activePopover === 'model') return;
    const handleOutsideClick = (event) => {
      const target = event.target;
      if (target?.closest?.('.generation-count-menu')) return;
      if (target?.closest?.('.settings-trigger-btn')) return;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      setActivePopover(null);
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [activePopover]);
  const showSettingsPopover = Boolean(activePopover);

  const hasTextInput = textInputLinks.length > 0;
  const isPromptEmpty = !String(node.prompt || '').trim() && !hasTextInput;
  const assetReferences = Array.isArray(node.referenceImages) ? node.referenceImages : [];
  const resolvedReferences = mergeImageReferenceImages(node, imageInputLinks);
  const modelOptions = getVisibleImageModelOptions(node.imageModel);
  const modelGroups = getGroupedImageModelOptions(node.imageModel);
  const model = node.imageModel || modelOptions[0]?.value || IMAGE_MODEL_OPTIONS[0].value;
  const maxReferenceCount = getImageReferenceMax(model);
  const resolutionOptions = getImageResolutionOptions(model);
  const ratioOptions = getImageRatioOptions(model);
  const countOptions = getImageCountOptions(model);
  const qualityOptions = getImageQualityOptions(model);
  const normalizedSettings = normalizeImageModelSettings({
    model,
    resolution: node.imageResolution,
    ratio: node.imageRatio,
    count: node.imageCount,
    quality: node.imageQuality,
  });
  const displayImages = getImageDisplayImages(node);
  const hasOutputImages = displayImages.length > 0;
  const referencePreviewUrls = getReferencePreviewUrls(resolvedReferences, referencePreviewSrc);
  const resolveImageReferencePreview = referencePreviewSrc;

  function previewReferenceAt(index) {
    const targetUrl = resolveImageReferencePreview(resolvedReferences[index]);
    if (!targetUrl || !onPreviewImage) return;
    const activeIndex = referencePreviewUrls.indexOf(targetUrl);
    onPreviewImage(referencePreviewUrls, activeIndex >= 0 ? activeIndex : 0);
  }

  function patchLayoutForEmptyNode(overrides = {}) {
    if (hasOutputImages) return {};
    return buildImageNodeLayoutPatch({
      imageRatio: overrides.imageRatio ?? node.imageRatio,
      imageCount: overrides.imageCount ?? node.imageCount,
    });
  }

  const modelLabel =
    modelOptions.find((option) => option.value === model)?.label ||
    IMAGE_MODEL_OPTIONS.find((option) => option.value === model)?.label ||
    model.replace(/^gpt-image-/, 'GPT-').toUpperCase();
  const modelIconName =
    modelOptions.find((option) => option.value === model)?.icon ||
    IMAGE_MODEL_OPTIONS.find((option) => option.value === model)?.icon ||
    getImageModelIconName(model);
  const summaryParts = [
    normalizedSettings.resolution,
    qualityOptions.length > 0 ? (normalizedSettings.quality || 'auto') : '',
    normalizedSettings.ratio,
  ].filter(Boolean);
  const summaryText = summaryParts.join(' | ') || '参数';

  function applyImageModelChange(value) {
    const nextSettings = normalizeImageModelSettings({
      model: value,
      resolution: node.imageResolution,
      ratio: node.imageRatio,
      count: node.imageCount,
      quality: node.imageQuality,
    });
    onUpdateNode(node.id, {
      imageModel: value,
      imageResolution: nextSettings.resolution,
      imageRatio: nextSettings.ratio,
      imageCount: nextSettings.count,
      imageQuality: nextSettings.quality,
      ...patchLayoutForEmptyNode({
        imageRatio: nextSettings.ratio,
        imageCount: nextSettings.count,
      }),
    });
  }

  const imageParamPanels = (
    <div className="settings-options-stack">
      <div className="settings-options-row">
        {resolutionOptions.length > 0 ? (
          <OptionSegment
            title="分辨率"
            value={normalizedSettings.resolution}
            options={resolutionOptions}
            onChange={(value) => onUpdateNode(node.id, { imageResolution: value })}
          />
        ) : null}
        {qualityOptions.length > 0 ? (
          <OptionSegment
            title="画质"
            value={normalizedSettings.quality}
            options={qualityOptions}
            onChange={(value) => onUpdateNode(node.id, { imageQuality: value, status: 'idle' })}
          />
        ) : null}
      </div>
      <OptionSegment
        title="尺寸"
        value={normalizedSettings.ratio}
        options={ratioOptions}
        onChange={(value) =>
          onUpdateNode(node.id, {
            imageRatio: value,
            status: 'idle',
          })
        }
        renderIcon={(option) => <RatioIcon value={option.value} />}
      />
    </div>
  );

  const settingsContent = activePopover === 'params' ? imageParamPanels : null;

  const extraActions = (
    <>
      <button
        type="button"
        className="prompt-asset-button"
        onClick={() => onOpenAssetLibrary(node.id, 'reference')}
        disabled={isRunning || resolvedReferences.length >= maxReferenceCount}
        title={`从资产库选择参考图（最多 ${maxReferenceCount} 张，支持多选）`}
      >
        <FolderOpen size={14} />
      </button>
      {variant === 'dock' && onOpenEnlargedSettings ? (
        <NodeEnlargeButton title="放大编辑提示词" onClick={onOpenEnlargedSettings} />
      ) : null}
    </>
  );

  return (
    <div
      className={`node-bottom-toolbar image-toolbar ${variant === 'modal' ? 'node-settings-toolbar-modal' : ''}`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {resolvedReferences.length > 0 ? (
        <div className="image-reference-row image-reference-row-top image-reference-row-chips-only">
          <div className="image-reference-list">
            {resolvedReferences.map((image, index) => {
              const isConnection = image.source === 'connection';
              const assetIndex = isConnection
                ? -1
                : assetReferences.findIndex((ref) => ref.id === image.id);

              return (
                <ReferenceImageChip
                  key={image.id || image.url || index}
                  image={image}
                  index={index}
                  previewSrc={resolveImageReferencePreview(image)}
                  onPreview={() => previewReferenceAt(index)}
                  onRemove={() => {
                    if (isConnection) {
                      onRemoveTextReference(image.linkId);
                    } else if (assetIndex >= 0) {
                      const nextRefs = [...assetReferences];
                      nextRefs.splice(assetIndex, 1);
                      onUpdateNode(node.id, { referenceImages: nextRefs });
                    }
                  }}
                  removeTitle={isConnection ? '移除图片引用并断开连线' : '移除参考图'}
                />
              );
            })}
          </div>
        </div>
      ) : null}
      <ReferencePromptInput
        value={node.prompt || ''}
        onChange={(prompt) => onUpdateNode(node.id, { prompt, status: 'idle' })}
        references={resolvedReferences}
        resolvePreviewUrl={referencePreviewSrc}
        placeholder="输入图片提示词"
        disabled={isRunning}
        extraActions={extraActions}
      />

      {showSettingsPopover && activePopover === 'params' ? (
        <div
          className="toolbar-settings-popover toolbar-settings-popover--params"
          ref={popoverRef}
          data-popover={activePopover}
        >
          {settingsContent}
        </div>
      ) : null}

      {activePopover === 'model' ? (
        <ImageModelPickerPopover
          anchorRef={modelTriggerRef}
          model={model}
          modelGroups={modelGroups}
          onPickModel={(nextModel) => {
            applyImageModelChange(nextModel);
            setActivePopover(null);
          }}
          onClose={() => setActivePopover(null)}
        />
      ) : null}

      {hasTextInput ? (
        <div className="image-reference-row">
          <div className="image-reference-list">
            {textInputLinks.map(({ linkId, node: textNode }, index) => (
              <TextReferenceChip
                key={linkId}
                index={index}
                textNode={textNode}
                onRemove={() => onRemoveTextReference(linkId)}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="node-bottom-actions image-bottom-actions">
        <button
          ref={modelTriggerRef}
          type="button"
          className={`icon-button settings-trigger-btn ${activePopover === 'model' ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActivePopover((prev) => (prev === 'model' ? null : 'model'));
          }}
          title="选择模型"
        >
          <ModelIcon name={modelIconName} size={14} />
          <span>{modelLabel}</span>
          <ChevronDown size={12} />
        </button>
        <button
          type="button"
          className={`icon-button settings-trigger-btn ${activePopover === 'params' ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActivePopover((prev) => (prev === 'params' ? null : 'params'));
          }}
          title="参数设置"
        >
          <SlidersHorizontal size={14} />
          <span>{summaryText}</span>
        </button>
        <GenerationCountControl
          options={countOptions}
          value={normalizedSettings.count || 1}
          unit="张"
          open={activePopover === 'count'}
          title="生成数量"
          menuRef={popoverRef}
          onToggle={() => setActivePopover((prev) => (prev === 'count' ? null : 'count'))}
          onChange={(nextCount) => {
            onUpdateNode(node.id, {
              imageCount: nextCount,
              ...patchLayoutForEmptyNode({ imageCount: nextCount }),
            });
            setActivePopover(null);
          }}
        />

        <div className="node-run-actions">
          <button
            className="icon-button"
            onClick={() => onRunImageGeneration(node, 'translate')}
            title="翻译提示词"
            disabled={isTranslating || isRunning || isPromptEmpty}
          >
            {isTranslating ? <LoaderCircle size={14} className="spin-icon" /> : <Languages size={14} />}
            翻译
          </button>
          <RunActionButton
            title="运行图片生成"
            isRunning={isRunning}
            disabled={isRunning || isTranslating || isPromptEmpty}
            cost={pricingList ? calculateEstimatedCost(pricingList, node, userProfile) : null}
            onClick={() => onRunImageGeneration(node)}
          />
        </div>
      </div>
    </div>
  );
}

function AudioToolbar({
  node,
  isRunning,
  isTranslating,
  textInputLinks = [],
  onRunAudioGeneration,
  onRemoveTextReference,
  onUpdateNode,
  pricingList,
  userProfile,
}) {
  const hasTextInput = textInputLinks.length > 0;
  const isPromptEmpty = !String(node.prompt || '').trim() && !hasTextInput;

  return (
    <div className="node-bottom-toolbar audio-toolbar" onPointerDown={(event) => event.stopPropagation()}>
      <div className="node-prompt-wrap">
        <textarea
          className="node-prompt-input"
          value={node.prompt || ''}
          onChange={(event) => onUpdateNode(node.id, { prompt: event.target.value, status: 'idle' })}
          placeholder="输入要合成的文本"
        />
      </div>
      <div className="image-options-row audio-voice-row">
        <OptionSegment
          title="音色"
          value={node.audioVoice || 'alloy'}
          options={AUDIO_VOICE_OPTIONS}
          onChange={(value) => onUpdateNode(node.id, { audioVoice: value, status: 'idle' })}
        />
      </div>
      <OptionSegment
        title="语速"
        value={Number(node.audioSpeed) || 1}
        options={AUDIO_SPEED_OPTIONS}
        onChange={(value) => onUpdateNode(node.id, { audioSpeed: Number(value), status: 'idle' })}
      />
      <CustomSelect
        title="模型"
        icon={<Headphones size={14} />}
        value={node.audioModel || DEFAULT_AUDIO_MODEL}
        options={[{ value: DEFAULT_AUDIO_MODEL, label: DEFAULT_AUDIO_MODEL }]}
        onChange={() => {}}
      />
      {hasTextInput ? (
        <div className="image-reference-row">
          <div className="image-reference-list">
            {textInputLinks.map(({ linkId, node: textNode }, index) => (
              <TextReferenceChip
                key={linkId}
                index={index}
                textNode={textNode}
                onRemove={() => onRemoveTextReference(linkId)}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="node-bottom-actions image-bottom-actions">
        <button
          className="icon-button"
          onClick={() => onRunAudioGeneration(node, 'translate')}
          title="翻译文本"
          disabled={isTranslating || isRunning || isPromptEmpty}
        >
          {isTranslating ? <LoaderCircle size={14} className="spin-icon" /> : <Languages size={14} />}
          翻译
        </button>
        <RunActionButton
          label="合成"
          title="运行语音合成"
          isRunning={isRunning}
          disabled={isRunning || isTranslating || isPromptEmpty}
          cost={pricingList ? calculateEstimatedCost(pricingList, node, userProfile) : null}
          onClick={() => onRunAudioGeneration(node)}
        />
      </div>
    </div>
  );
}

function NoteToolbar({
  node,
  isRunning,
  isTranslating,
  imageInputLinks = [],
  videoInputLinks = [],
  onRunTextGeneration,
  onUpdateNode,
  onOpenTextEdit,
  onRemoveTextReference,
}) {
  const videoToPromptMode = isVideoToPromptNode(node, videoInputLinks);
  const imageToPromptMode = !videoToPromptMode && isImageToPromptNode(node, imageInputLinks);
  const reversePromptMode = videoToPromptMode || imageToPromptMode;
  const connectedVideos = resolveNoteVideoInputUrls(videoInputLinks);
  const connectedImages = resolveNoteImageInputUrls(imageInputLinks);
  const isPromptEmpty = !String(node.prompt || '').trim();
  const canRunReversePrompt =
    (videoToPromptMode && connectedVideos.length > 0) ||
    (imageToPromptMode && connectedImages.length > 0);
  const canRunText = !reversePromptMode && !isPromptEmpty;
  const hasReverseResult = Boolean(String(node.content || '').trim()) && node.status !== 'error';
  const canTranslateReverse = reversePromptMode && hasReverseResult;
  const textMode = reversePromptMode
    ? 'ai'
    : node.textMode === 'ai'
      ? 'ai'
      : DEFAULT_TEXT_MODE;
  const showAiPanel = textMode === 'ai' || reversePromptMode;

  return (
    <div className="node-bottom-toolbar note-toolbar" onPointerDown={(event) => event.stopPropagation()}>
      {!reversePromptMode ? (
        <div className="note-mode-switch" role="tablist" aria-label="文本来源">
          {TEXT_MODE_OPTIONS.map((option) => {
            const isActive = textMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`note-mode-switch-btn${isActive ? ' is-active' : ''}`}
                onClick={() => onUpdateNode(node.id, { textMode: option.value })}
              >
                {option.value === 'ai' ? <Bot size={14} aria-hidden="true" /> : <FileText size={14} aria-hidden="true" />}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {showAiPanel ? (
        <>
          {videoToPromptMode && videoInputLinks.length > 0 ? (
            <div className="image-reference-row">
              <span className="image-reference-label">视频引用</span>
              <div className="image-reference-list">
                {videoInputLinks.map(({ linkId, node: videoNode }) => {
                  const previewUrl = getVideoNodeOutputUrl(videoNode);
                  return (
                    <div className="image-reference-chip connection-image-chip" key={linkId}>
                      {previewUrl ? (
                        <video
                          className="connection-video-thumb"
                          src={normalizeVideoUrl(previewUrl)}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="connection-image-placeholder">
                          <Film size={16} />
                        </div>
                      )}
                      <span className="connection-image-label" title={formatVideoInputLabel(videoNode)}>
                        {formatVideoInputLabel(videoNode)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveTextReference(linkId)}
                        title="移除视频引用并断开连线"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {imageToPromptMode && imageInputLinks.length > 0 ? (
            <div className="image-reference-row">
              <span className="image-reference-label">图片引用</span>
              <div className="image-reference-list">
                {imageInputLinks.map(({ linkId, node: imageNode }) => {
                  const previewUrl = getImageNodeOutputUrl(imageNode);
                  return (
                    <div className="image-reference-chip connection-image-chip" key={linkId}>
                      {previewUrl ? (
                        <img src={normalizeImageUrl(previewUrl)} alt={formatImageInputLabel(imageNode)} />
                      ) : (
                        <div className="connection-image-placeholder">
                          <ImageIcon size={16} />
                        </div>
                      )}
                      <span className="connection-image-label" title={formatImageInputLabel(imageNode)}>
                        {formatImageInputLabel(imageNode)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveTextReference(linkId)}
                        title="移除图片引用并断开连线"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="node-field-wrap node-prompt-wrap">
            <textarea
              className="node-prompt-input"
              value={node.prompt || ''}
              onChange={(event) => onUpdateNode(node.id, { prompt: event.target.value, status: 'idle' })}
              placeholder={
                reversePromptMode ? '可选：补充反推指令（留空则输出中文结构化 JSON）' : '输入文字，运行后生成结果'
              }
            />
            <NodeEnlargeButton
              title="放大编辑输入"
              onClick={() => onOpenTextEdit(node.id, 'prompt')}
            />
          </div>
          <div className="node-bottom-actions">
            {reversePromptMode ? (
              <CustomSelect
                title="能力"
                icon={videoToPromptMode ? <Film size={14} /> : <ImageIcon size={14} />}
                value={videoToPromptMode ? 'video-understand' : 'image-understand'}
                options={[
                  {
                    value: videoToPromptMode ? 'video-understand' : 'image-understand',
                    label: videoToPromptMode ? '视频理解' : '图片理解',
                  },
                ]}
                onChange={() => {}}
              />
            ) : (
              <CustomSelect
                title="模型"
                icon={<Bot size={14} />}
                value={normalizeTextModel(node.textModel || DEFAULT_TEXT_MODEL)}
                options={TEXT_MODEL_OPTIONS}
                onChange={(value) => {
                  const next = persistPreferredTextModel(value);
                  onUpdateNode(node.id, { textModel: next });
                }}
              />
            )}
            <div className="node-run-actions">
              {reversePromptMode ? (
                <button
                  className="icon-button"
                  onClick={() => onRunTextGeneration(node, 'translate-structured-en')}
                  title="一键翻译反推结果为英文"
                  disabled={isTranslating || isRunning || !canTranslateReverse}
                >
                  {isTranslating ? <LoaderCircle size={14} className="spin-icon" /> : <Languages size={14} />}
                  翻译
                </button>
              ) : (
                <button
                  className="icon-button"
                  onClick={() => onRunTextGeneration(node, 'translate-en')}
                  title="一键翻译英文"
                  disabled={isTranslating || isRunning || isPromptEmpty}
                >
                  {isTranslating ? <LoaderCircle size={14} className="spin-icon" /> : <Languages size={14} />}
                  翻译
                </button>
              )}
              <button
                className="icon-button primary"
                onClick={() => onRunTextGeneration(node)}
                title={
                  videoToPromptMode
                    ? '运行视频理解反推提示词'
                    : imageToPromptMode
                      ? '运行图片理解反推提示词'
                      : '运行文本生成'
                }
                disabled={isRunning || isTranslating || (!canRunReversePrompt && !canRunText)}
              >
                {isRunning ? <LoaderCircle size={14} className="spin-icon" /> : <Play size={14} />}
                {reversePromptMode ? '反推' : '运行'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="note-mode-hint">双击节点可直接编辑文本内容</p>
      )}
    </div>
  );
}

export function CanvasNode({
  node,
  isSelected,
  showToolbar = false,
  isRunning,
  isTranslating,
  isUploading = false,
  uploadProgress = null,
  textInputLinks = [],
  imageInputLinks = [],
  videoInputLinks = [],
  isInputsHighlighted = false,
  linkFromNodeId,
  pricingList,
  userProfile,
  onSelectNode,
  onClearConnectionSelection,
  onBeginDrag,
  onBeginResize,
  onOpenTextEdit,
  onOpenEnlargedSettings,
  onCopyNode,
  onUpdateNode,
  onRemoveNode,
  onRunTextGeneration,
  onRunImageGeneration,
  onRunVideoGeneration,
  onRunAudioGeneration,
  onOpenAssetLibrary,
  onUploadImageOutput,
  onUploadVideoOutput,
  onUploadAudioOutput,
  onRemoveImageReference,
  onRemoveTextReference,
  onHighlightInputs,
  onPreviewImage,
  onPreviewVideo,
  onDownloadVideo,
  onDownloadImage,
  onSyncImageOutputLayout,
  onSplitImageNode,
  onExplodeImageOutputs,
  onSyncVideoOutputLayout,
  onSyncAudioOutputLayout,
  onRemoveVeoFrame,
  onRemoveSeedanceMedia,
  onVideoGenerationTypeChange,
  onPortPointerDown,
  onFinishLink,
  onExtractVideoFrame,
  onExtractVideoClip,
  onExtractVideoAudio,
  onTranslateVideo,
}) {
  const imageDisplayImages = node.type === 'image' ? getImageDisplayImages(node) : [];
  const canExplodeImageOutputs =
    node.type === 'image' && hasRealImageNodeOutput(node) && imageDisplayImages.length > 1;
  const videoDisplayUrl = node.type === 'video' ? getVideoDisplayUrl(node) : '';
  const audioDisplayUrl = node.type === 'audio' ? getAudioDisplayUrl(node) : '';

  const [openSplitMenu, setOpenSplitMenu] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isExploding, setIsExploding] = useState(false);

  useEffect(() => {
    if (!openSplitMenu) return;
    const handleClose = () => setOpenSplitMenu(false);
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, [openSplitMenu]);

  async function handleSplitHeaderTrigger(cols, rows) {
    const imageUrl = imageDisplayImages[0];
    if (!imageUrl) return;
    setOpenSplitMenu(false);
    setIsSplitting(true);
    try {
      await onSplitImageNode(node.id, imageUrl, cols, rows);
    } catch (err) {
      alert(err.message || '图片切分失败');
    } finally {
      setIsSplitting(false);
    }
  }

  async function handleExplodeHeaderTrigger() {
    if (!canExplodeImageOutputs) return;
    setOpenSplitMenu(false);
    setIsExploding(true);
    try {
      await onExplodeImageOutputs?.(node.id);
    } catch (err) {
      alert(err.message || '拆分图片节点失败');
    } finally {
      setIsExploding(false);
    }
  }

  return (
    <article
      className={`node ${isSelected ? 'selected' : ''} ${isRunning ? 'is-running' : ''} ${node.type} ${node.isEntrance ? 'node-split-entrance' : ''}`}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
        width: node.width ?? DEFAULT_NODE_WIDTH,
        height: node.height ?? DEFAULT_NODE_HEIGHT,
      }}
      onPointerDown={(event) => {
        onSelectNode(node.id, { additive: event.shiftKey });
        onClearConnectionSelection();
        if (node.type === 'note') {
          onBeginDrag(event, node);
        }
      }}
      onDoubleClick={() => {
        if (node.type === 'note') {
          onOpenTextEdit(node.id, 'content');
        }
      }}
    >
      <div
        className="node-floating-header"
        onPointerDown={(event) => {
          if (node.type !== 'note') {
            onBeginDrag(event, node);
          }
        }}
      >
        <div className="node-title">
          <NodeIcon type={node.type} />
          <input
            value={node.title || ''}
            placeholder="节点名称"
            title={node.title || '节点名称'}
            aria-label="节点名称"
            onChange={(event) => onUpdateNode(node.id, { title: event.target.value })}
            onPointerDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => {
              event.stopPropagation();
              event.currentTarget.select();
            }}
          />
        </div>
        <div
          className="node-header-actions"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          {node.type === 'image' && imageDisplayImages.length > 0 ? (
            <>
              <button
                className="icon-mini"
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onPreviewImage?.(imageDisplayImages, 0);
                }}
                title="预览图片"
              >
                <Maximize2 size={14} />
              </button>
              <button
                className="icon-mini"
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDownloadImage?.(imageDisplayImages, node.title || 'image');
                }}
                title="下载图片"
              >
                <Download size={14} />
              </button>
            </>
          ) : null}
          {node.type === 'video' && videoDisplayUrl ? (
            <>
              <button
                className="icon-mini"
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onPreviewVideo?.(videoDisplayUrl, node.title || '视频预览');
                }}
                title="预览视频"
              >
                <Maximize2 size={14} />
              </button>
              <button
                className="icon-mini"
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDownloadVideo?.(videoDisplayUrl, node.title || 'video');
                }}
                title="下载视频"
              >
                <Download size={14} />
              </button>
            </>
          ) : null}
          {node.type === 'audio' && audioDisplayUrl ? (
            <a
              className="icon-mini"
              href={normalizeAudioUrl(audioDisplayUrl)}
              download
              title="下载音频"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <Download size={14} />
            </a>
          ) : null}
          {node.type === 'image' && imageDisplayImages.length > 0 ? (
            <div className="node-header-split-wrapper" style={{ position: 'relative', display: 'inline-block' }} onPointerDown={(e) => e.stopPropagation()}>
              <button
                className={`icon-mini ${openSplitMenu ? 'active' : ''}`}
                type="button"
                disabled={isSplitting || isExploding}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpenSplitMenu(!openSplitMenu);
                }}
                title={canExplodeImageOutputs ? '拆分输出 / 宫格切分' : '宫格切分'}
              >
                <Scissors size={14} />
              </button>
              {openSplitMenu && (
                <div className="image-split-dropdown header-split-dropdown" onClick={(e) => e.stopPropagation()}>
                  {canExplodeImageOutputs ? (
                    <>
                      <button
                        type="button"
                        className="image-split-dropdown-item"
                        onClick={handleExplodeHeaderTrigger}
                      >
                        拆分为 {imageDisplayImages.length} 个独立节点
                      </button>
                      <div className="image-split-dropdown-divider" />
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="image-split-dropdown-item"
                    onClick={() => handleSplitHeaderTrigger(2, 2)}
                  >
                    2x2 (四宫格)
                  </button>
                  <button
                    type="button"
                    className="image-split-dropdown-item"
                    onClick={() => handleSplitHeaderTrigger(3, 3)}
                  >
                    3x3 (九宫格)
                  </button>
                  <button
                    type="button"
                    className="image-split-dropdown-item"
                    onClick={() => handleSplitHeaderTrigger(2, 1)}
                  >
                    2x1 (左右双格)
                  </button>
                  <button
                    type="button"
                    className="image-split-dropdown-item"
                    onClick={() => handleSplitHeaderTrigger(1, 2)}
                  >
                    1x2 (上下双格)
                  </button>
                </div>
              )}
            </div>
          ) : null}
          <button
            className="icon-mini"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCopyNode(node.id);
            }}
            title="复制节点"
          >
            <Copy size={14} />
          </button>
          <button
            className="icon-mini danger"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRemoveNode(node.id);
            }}
            title="删除节点"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="node-body">
        <MediaUploadOverlay
          active={isUploading}
          variant="inline"
          label={uploadProgress?.label || '正在上传'}
          detail={uploadProgress?.detail || ''}
          current={uploadProgress?.current || 0}
          total={uploadProgress?.total || 0}
        />
        {node.type === 'note' ? (
          <NoteBody
            node={node}
            isSelected={isSelected}
            isRunning={isRunning}
            onBeginDrag={onBeginDrag}
            onOpenTextEdit={onOpenTextEdit}
          />
        ) : node.type === 'image' ? (
          <ImageBody
            node={node}
            isRunning={isRunning}
            showOutputActions={showToolbar}
            isInputsHighlighted={isInputsHighlighted}
            onBeginDrag={onBeginDrag}
            onHighlightInputs={onHighlightInputs}
            onOpenAssetLibrary={onOpenAssetLibrary}
            onUploadImageOutput={onUploadImageOutput}
            onSyncOutputLayout={onSyncImageOutputLayout}
          />
        ) : node.type === 'audio' ? (
          <AudioBody
            node={node}
            isRunning={isRunning}
            showOutputActions={showToolbar}
            isInputsHighlighted={isInputsHighlighted}
            onBeginDrag={onBeginDrag}
            onHighlightInputs={onHighlightInputs}
            onOpenAssetLibrary={onOpenAssetLibrary}
            onUploadAudioOutput={onUploadAudioOutput}
            onSyncAudioLayout={onSyncAudioOutputLayout}
          />
        ) : (
          <VideoBody
            node={node}
            isRunning={isRunning}
            showOutputActions={showToolbar}
            isInputsHighlighted={isInputsHighlighted}
            onBeginDrag={onBeginDrag}
            onHighlightInputs={onHighlightInputs}
            onOpenAssetLibrary={onOpenAssetLibrary}
            onUploadVideoOutput={onUploadVideoOutput}
            onSyncOutputLayout={onSyncVideoOutputLayout}
            onExtractVideoFrame={onExtractVideoFrame}
            onExtractVideoClip={onExtractVideoClip}
            onExtractVideoAudio={onExtractVideoAudio}
            onTranslateVideo={onTranslateVideo}
          />
        )}
      </div>

      {node.type === 'note' && showToolbar ? (
        <NoteToolbar
          node={node}
          isRunning={isRunning}
          isTranslating={isTranslating}
          imageInputLinks={imageInputLinks}
          videoInputLinks={videoInputLinks}
          onRunTextGeneration={onRunTextGeneration}
          onUpdateNode={onUpdateNode}
          onOpenTextEdit={onOpenTextEdit}
          onRemoveTextReference={onRemoveTextReference}
        />
      ) : node.type === 'image' && showToolbar ? (
        <ImageToolbar
          node={node}
          isRunning={isRunning}
          isTranslating={isTranslating}
          textInputLinks={textInputLinks}
          imageInputLinks={imageInputLinks}
          onRunImageGeneration={onRunImageGeneration}
          onOpenAssetLibrary={onOpenAssetLibrary}
          onRemoveImageReference={onRemoveImageReference}
          onRemoveTextReference={onRemoveTextReference}
          onUpdateNode={onUpdateNode}
          onOpenEnlargedSettings={onOpenEnlargedSettings}
          onPreviewImage={onPreviewImage}
          pricingList={pricingList}
          userProfile={userProfile}
        />
      ) : node.type === 'video' && showToolbar ? (
        <VideoToolbar
          node={node}
          isRunning={isRunning}
          isTranslating={isTranslating}
          textInputLinks={textInputLinks}
          imageInputLinks={imageInputLinks}
          videoInputLinks={videoInputLinks}
          onRunVideoGeneration={onRunVideoGeneration}
          onOpenAssetLibrary={onOpenAssetLibrary}
          onRemoveImageReference={onRemoveImageReference}
          onRemoveTextReference={onRemoveTextReference}
          onRemoveVeoFrame={onRemoveVeoFrame}
          onRemoveSeedanceMedia={onRemoveSeedanceMedia}
          onVideoGenerationTypeChange={onVideoGenerationTypeChange}
          onUpdateNode={onUpdateNode}
          onOpenEnlargedSettings={onOpenEnlargedSettings}
          onPreviewImage={onPreviewImage}
          onPreviewVideo={onPreviewVideo}
          pricingList={pricingList}
          userProfile={userProfile}
        />
      ) : node.type === 'audio' && showToolbar ? (
        <AudioToolbar
          node={node}
          isRunning={isRunning}
          isTranslating={isTranslating}
          textInputLinks={textInputLinks}
          onRunAudioGeneration={onRunAudioGeneration}
          onRemoveTextReference={onRemoveTextReference}
          onUpdateNode={onUpdateNode}
          pricingList={pricingList}
          userProfile={userProfile}
        />
      ) : null}

      {node.type === 'note' && showToolbar ? (
        <button
          type="button"
          className="node-resize-handle"
          title="拖拽调整输出框大小"
          aria-label="调整节点大小"
          onPointerDown={(event) => {
            event.stopPropagation();
            onBeginResize(event, node);
          }}
        />
      ) : null}

      <button
        className={`port output ${linkFromNodeId === node.id ? 'active' : ''}`}
        onPointerDown={(event) => {
          onPortPointerDown(event, node.id);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          if (linkFromNodeId && linkFromNodeId !== node.id) onFinishLink(node.id);
        }}
        title="连线端口"
      />

      <button
        className={`port input ${linkFromNodeId === node.id ? 'active' : ''}`}
        onPointerDown={(event) => {
          onPortPointerDown(event, node.id);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          if (linkFromNodeId && linkFromNodeId !== node.id) onFinishLink(node.id);
        }}
        title="连线端口"
      />
      {isSplitting && (
        <div className="image-split-loading-overlay">
          <div className="split-scan-grid">
            <div className="split-scan-line horizontal"></div>
            <div className="split-scan-line vertical"></div>
            <div className="split-grid-helper-line-h"></div>
            <div className="split-grid-helper-line-v"></div>
          </div>
          <LoaderCircle size={20} className="spin-icon" style={{ zIndex: 5 }} />
          <span style={{ zIndex: 5 }}>正在智能切分...</span>
        </div>
      )}
    </article>
  );
}
