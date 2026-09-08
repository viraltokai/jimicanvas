import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, FileVideo, ImagePlus, Loader2, Send, Square, Trash2, X } from 'lucide-react';
import { TEXT_MODEL_OPTIONS } from '../lib/constants';
import {
  chatCompletionsStream,
  getOrRequestToken,
  getStoredChatToken,
} from '../lib/chatApi';
import { understandImage, uploadAsset } from '../lib/imageApi';
import { understandVideoByUrl, uploadVideoFile } from '../lib/videoApi';
import {
  persistPreferredTextModel,
  resolvePreferredTextModel,
} from '../lib/textModel';
import { AnimeAssistantAvatar } from './AnimeAssistantAvatar';
import './global-chat-widget.css';

const ASSISTANT_NAME = '小咪';
const STORAGE_KEY = 'global_chat_messages_v1';
const STORAGE_POS_KEY = 'global_chat_launcher_position_v1';
const MAX_IMAGES = 5;
/** 媒体理解结果以隐藏文本注入对话，前缀用于在界面上过滤掉 */
const VIDEO_CONTEXT_MARKER = '[视频理解]';
const IMAGE_CONTEXT_MARKER = '[图片理解]';
const CONTEXT_MARKERS = [VIDEO_CONTEXT_MARKER, IMAGE_CONTEXT_MARKER];
const DEFAULT_VIDEO_QUESTION = '帮我看看这个视频';
const DEFAULT_IMAGE_QUESTION = '帮我看看这张图片';
/** 聊天模型拿不到 image_url，图片先走后端理解接口转成文字 */
const IMAGE_CHAT_INSTRUCTION =
  '请客观、详细地描述这张图片：主体与细节、构图与画面结构、色彩与光影、风格质感、画面中可见的文字。';

const VIDEO_TEMPLATES = [
  { id: 'chat', type: 'chat', label: '内容总结' },
  { id: 'prompt', type: 'prompt', label: '反推提示词' },
  { id: 'subtitle-script', type: 'subtitle-script', label: '逐字稿' },
  { id: 'custom', type: 'chat', label: '自定义提问' },
];

function findVideoTemplate(id) {
  return VIDEO_TEMPLATES.find((item) => item.id === id) || VIDEO_TEMPLATES[0];
}

function isVideoFile(file) {
  if (!file) return false;
  return file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name || '');
}

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && (item.role === 'user' || item.role === 'assistant'));
  } catch {
    return [];
  }
}

function persistMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-80)));
  } catch {
    /* ignore */
  }
}

function messageText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part?.type !== 'text') return '';
      const text = part.text || '';
      // 图片/视频理解结果只给模型看，不在气泡里展示
      return CONTEXT_MARKERS.some((marker) => text.startsWith(marker)) ? '' : text;
    })
    .join('');
}

function messageImages(content) {
  if (!Array.isArray(content)) return [];
  return content
    .map((part) => (part?.type === 'image_url' ? part.image_url?.url : ''))
    .filter(Boolean);
}

function messageVideos(content) {
  if (!Array.isArray(content)) return [];
  return content
    .map((part) => (part?.type === 'video_url' ? part.video_url?.url : ''))
    .filter(Boolean);
}

function revokePreview(preview) {
  if (!preview?.startsWith('blob:')) return;
  try {
    URL.revokeObjectURL(preview);
  } catch {
    /* ignore */
  }
}

/** 合并多段 text，并丢掉 blob: 这类模型访问不到的地址 */
function toApiContent(content) {
  if (!Array.isArray(content)) return content;

  const texts = [];
  const extras = [];
  content.forEach((part) => {
    if (!part) return;
    if (part.type === 'text' && part.text) {
      texts.push(part.text);
      return;
    }
    const url = part.type === 'image_url' ? part.image_url?.url : part.video_url?.url;
    if (!url || url.startsWith('blob:')) return;
    if (part.type === 'image_url' || part.type === 'video_url') extras.push(part);
  });

  const text = texts.join('\n\n').trim();
  if (extras.length === 0) return text;
  return text ? [{ type: 'text', text }, ...extras] : extras;
}

function isEmptyAssistantContent(content) {
  if (typeof content === 'string') return !content.trim();
  if (!Array.isArray(content)) return true;
  return !content.some((part) => part?.type === 'text' && part.text?.trim());
}

function toApiMessages(messages) {
  const list = messages.filter((item) => item.role === 'user' || item.role === 'assistant');
  return list
    .filter((item, index) => {
      // 末尾那条还没开始流的 assistant 占位不能发给上游，否则模型会把它当成待续写的回复
      if (item.role !== 'assistant') return true;
      if (!isEmptyAssistantContent(item.content)) return true;
      return index !== list.length - 1;
    })
    .map((item) => ({
      role: item.role,
      content: toApiContent(item.content),
    }));
}

function ChatLauncher({ isOpen, isStreaming, onClick }) {
  const buttonRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const positionRef = useRef(null);
  const dragStartRef = useRef(null);
  positionRef.current = position;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        setPosition({
          x: Math.max(0, Math.min(parsed.x, window.innerWidth - 128)),
          y: Math.max(0, Math.min(parsed.y, window.innerHeight - 128)),
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (!positionRef.current || !buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const next = {
        x: Math.max(0, Math.min(positionRef.current.x, window.innerWidth - rect.width)),
        y: Math.max(0, Math.min(positionRef.current.y, window.innerHeight - rect.height)),
      };
      if (next.x !== positionRef.current.x || next.y !== positionRef.current.y) {
        setPosition(next);
        try {
          localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const moveDrag = (clientX, clientY) => {
    const dragStart = dragStartRef.current;
    if (!dragStart || !buttonRef.current) return;
    const dx = clientX - dragStart.startX;
    const dy = clientY - dragStart.startY;
    if (!isDraggingRef.current && Math.hypot(dx, dy) > 5) {
      isDraggingRef.current = true;
      setIsDragging(true);
    }
    if (!isDraggingRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({
      x: Math.max(0, Math.min(dragStart.startLeft + dx, window.innerWidth - rect.width)),
      y: Math.max(0, Math.min(dragStart.startTop + dy, window.innerHeight - rect.height)),
    });
  };

  const endDrag = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    if (isDraggingRef.current) {
      if (positionRef.current) {
        try {
          localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(positionRef.current));
        } catch {
          /* ignore */
        }
      }
      window.setTimeout(() => {
        isDraggingRef.current = false;
        setIsDragging(false);
      }, 50);
    } else {
      dragStartRef.current = null;
    }
  };

  const onMouseMove = (event) => moveDrag(event.clientX, event.clientY);
  const onMouseUp = () => endDrag();
  const onTouchMove = (event) => {
    if (event.cancelable) event.preventDefault();
    const touch = event.touches[0];
    if (touch) moveDrag(touch.clientX, touch.clientY);
  };
  const onTouchEnd = () => endDrag();

  const startDrag = (clientX, clientY) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      startLeft: rect.left,
      startTop: rect.top,
    };
    isDraggingRef.current = false;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  };

  useEffect(
    () => () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    },
    []
  );

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`xiaomi-launcher${isOpen ? ' is-open' : ''}${isDragging ? ' is-dragging' : ''}${
        isStreaming ? ' is-streaming' : ''
      }`}
      style={
        position
          ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
          : undefined
      }
      title={isOpen ? '收起小咪' : '打开小咪助手'}
      aria-label={isOpen ? '收起小咪' : '打开小咪助手'}
      onMouseDown={(event) => {
        if (event.button === 0) startDrag(event.clientX, event.clientY);
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (touch) startDrag(touch.clientX, touch.clientY);
      }}
      onClick={(event) => {
        if (isDraggingRef.current) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick();
      }}
    >
      <span className="xiaomi-launcher-float">
        <AnimeAssistantAvatar size="xl" isStreaming={isStreaming} isOpen={isOpen} model />
      </span>
    </button>
  );
}

export function GlobalChatWidget({ onNeedLogin } = {}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => loadMessages());
  const [model, setModel] = useState(() => resolvePreferredTextModel());
  const [modelOpen, setModelOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [pendingVideo, setPendingVideo] = useState(null);
  const [videoTemplateId, setVideoTemplateId] = useState('chat');
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const videoFileRef = useRef(null);
  const abortRef = useRef(null);
  const needsCustomQuestion = Boolean(pendingVideo) && videoTemplateId === 'custom' && !input.trim();
  const canSend = Boolean(input.trim() || pendingImages.length > 0 || pendingVideo) && !needsCustomQuestion;
  const modelLabel = useMemo(
    () => TEXT_MODEL_OPTIONS.find((item) => item.value === model)?.label || model,
    [model]
  );

  useEffect(() => {
    persistMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages, isStreaming]);

  function clearChat() {
    if (isStreaming) return;
    setMessages([]);
    persistMessages([]);
    setError('');
  }

  async function handlePickImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const room = Math.max(0, MAX_IMAGES - pendingImages.length);
    const nextFiles = files.slice(0, room);
    const next = nextFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingImages((prev) => [...prev, ...next]);
  }

  function removePendingImage(index) {
    setPendingImages((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(index, 1);
      revokePreview(removed?.preview);
      return copy;
    });
  }

  function handlePickVideo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isVideoFile(file)) {
      setError('请选择视频文件');
      return;
    }
    setError('');
    revokePreview(pendingVideo?.preview);
    setPendingVideo({ file, name: file.name, preview: URL.createObjectURL(file) });
    setVideoTemplateId('chat');
  }

  function removePendingVideo() {
    revokePreview(pendingVideo?.preview);
    setPendingVideo(null);
  }

  async function sendMessage() {
    const text = input.trim();
    if (isStreaming || !canSend) return;

    let token = getStoredChatToken();
    if (!token) {
      token = getOrRequestToken({ onSaved: onNeedLogin });
    }
    if (!token) {
      setError('请先登录后再和小咪聊天');
      onNeedLogin?.();
      return;
    }

    setError('');
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let messageAppended = false;

    try {
      if (pendingImages.length > 0 || pendingVideo) setPhase('uploading');

      const uploadedUrls = [];
      for (const item of pendingImages) {
        if (item.url) {
          uploadedUrls.push(item.url);
          continue;
        }
        if (!item.file) continue;
        const uploaded = await uploadAsset({ token, file: item.file });
        if (!uploaded) throw new Error('图片上传失败');
        uploadedUrls.push(uploaded);
      }

      pendingImages.forEach((item) => revokePreview(item.preview));
      setPendingImages([]);

      let imageAnalysis = '';
      if (uploadedUrls.length > 0) {
        setPhase('understanding-image');
        try {
          imageAnalysis = await understandImage({
            token,
            imageUrls: uploadedUrls,
            promptText: [IMAGE_CHAT_INSTRUCTION, text ? `用户想知道：${text}` : '']
              .filter(Boolean)
              .join('\n'),
          });
        } catch (err) {
          // 理解失败不挡住聊天，退化成纯文字对话并提示一下
          setError(err instanceof Error ? `图片理解失败：${err.message}` : '图片理解失败');
        }
      }

      const template = findVideoTemplate(videoTemplateId);
      const isCustomTemplate = template.id === 'custom';
      let videoDisplayUrl = '';
      let videoAnalysis = '';

      if (pendingVideo) {
        setPhase('uploading');
        let understandUrl = pendingVideo.url || '';
        videoDisplayUrl = pendingVideo.url || '';

        if (!understandUrl && pendingVideo.file) {
          const uploaded = await uploadVideoFile({ token, file: pendingVideo.file });
          // 签名地址给服务端下载用，明文地址留在消息里长期可播
          understandUrl = uploaded.signedUrl;
          videoDisplayUrl = uploaded.url;
        }
        if (!understandUrl) throw new Error('视频上传失败');

        setPhase('understanding-video');
        videoAnalysis = await understandVideoByUrl({
          token,
          videoUrl: understandUrl,
          type: template.type,
          promptText: isCustomTemplate ? text : '',
          title: (isCustomTemplate ? text : template.label) || pendingVideo.name || '小咪视频提问',
          signal: controller.signal,
        });
        if (!videoAnalysis) throw new Error('视频理解失败，请换个视频再试');

        revokePreview(pendingVideo.preview);
        setPendingVideo(null);
      }

      setPhase('chatting');

      const visibleText = pendingVideo
        ? isCustomTemplate
          ? text
          : [template.label, text].filter(Boolean).join('\n') || DEFAULT_VIDEO_QUESTION
        : text;

      const parts = [];
      if (visibleText) parts.push({ type: 'text', text: visibleText });
      uploadedUrls.forEach((url) => {
        parts.push({ type: 'image_url', image_url: { url } });
      });
      if (videoDisplayUrl) {
        parts.push({ type: 'video_url', video_url: { url: videoDisplayUrl } });
      }
      if (imageAnalysis) {
        const ask = text || DEFAULT_IMAGE_QUESTION;
        parts.push({
          type: 'text',
          text: `${IMAGE_CONTEXT_MARKER}\n请根据以下图片理解结果直接作答，不要寒暄，也不要让用户重新上传图片。\n\n【用户需求】\n${ask}\n\n【图片理解结果】\n${imageAnalysis}`,
        });
      }
      if (videoAnalysis) {
        const ask = text || visibleText || DEFAULT_VIDEO_QUESTION;
        parts.push({
          type: 'text',
          text: `${VIDEO_CONTEXT_MARKER}\n请根据以下视频理解结果直接作答，不要寒暄或自我介绍。\n\n【用户需求】\n${ask}\n\n【视频理解结果】\n${videoAnalysis}`,
        });
      }
      const userContent = parts.length <= 1 && parts[0]?.type === 'text' ? visibleText : parts;

      const userMsg = { role: 'user', content: userContent, createdAt: Date.now() };
      const assistantMsg = { role: 'assistant', content: '', createdAt: Date.now() };
      const nextMessages = [...messages, userMsg, assistantMsg];
      messageAppended = true;
      setMessages(nextMessages);

      let assistantContent = '';
      const updateAssistant = (delta) => {
        assistantContent += delta;
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = { ...last, content: assistantContent };
          }
          return copy;
        });
      };

      await chatCompletionsStream({
        token,
        model,
        title: text || (videoDisplayUrl ? '视频提问' : '图片提问'),
        messages: toApiMessages(nextMessages),
        signal: controller.signal,
        onDelta: (delta) => updateAssistant(delta),
        onError: (err) => {
          if (err.name === 'AbortError') return;
          updateAssistant(`${assistantContent ? '\n\n' : ''}（请求失败：${err.message || '未知错误'}）`);
        },
      });
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        const tip = err instanceof Error ? err.message : '发送失败';
        setError(tip);
        if (messageAppended) {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === 'assistant' && !String(last.content || '').trim()) {
              copy[copy.length - 1] = { ...last, content: `（请求失败：${tip}）` };
            }
            return copy;
          });
        } else if (text) {
          // 上传/理解阶段就失败了，把输入还回去，别让用户白打一遍
          setInput((current) => current || text);
        }
      }
    } finally {
      setIsStreaming(false);
      setPhase('idle');
      abortRef.current = null;
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }

  return (
    <>
      <ChatLauncher
        isOpen={open}
        isStreaming={isStreaming}
        onClick={() => setOpen((prev) => !prev)}
      />

      {open ? (
        <section className="xiaomi-panel" role="dialog" aria-label="小咪助手">
          <header className="xiaomi-panel-head">
            <div className="xiaomi-panel-brand">
              <AnimeAssistantAvatar size="sm" isStreaming={isStreaming} />
              <div>
                <strong>{ASSISTANT_NAME}</strong>
                <span>画布助手</span>
              </div>
            </div>
            <div className="xiaomi-panel-actions">
              <button type="button" title="清空对话" onClick={clearChat} disabled={isStreaming}>
                <Trash2 size={14} />
              </button>
              <button type="button" title="关闭" onClick={() => setOpen(false)}>
                <X size={14} />
              </button>
            </div>
          </header>

          <div className="xiaomi-panel-messages" ref={listRef}>
            {messages.length === 0 ? (
              <div className="xiaomi-empty">
                <AnimeAssistantAvatar size="lg" isStreaming={isStreaming} />
                <p>你好，我是小咪。可以问我画布、提示词或创作问题。</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const text = messageText(msg.content);
                const images = messageImages(msg.content);
                const videos = messageVideos(msg.content);
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={`${msg.createdAt || index}-${msg.role}`}
                    className={`xiaomi-msg${isUser ? ' is-user' : ' is-assistant'}`}
                  >
                    {!isUser ? (
                      <AnimeAssistantAvatar
                        size="sm"
                        isStreaming={isStreaming && index === messages.length - 1}
                      />
                    ) : null}
                    <div className="xiaomi-msg-bubble">
                      {images.length ? (
                        <div className="xiaomi-msg-images">
                          {images.map((url) => (
                            <img key={url} src={url} alt="" />
                          ))}
                        </div>
                      ) : null}
                      {videos.length ? (
                        <div className="xiaomi-msg-videos">
                          {videos.map((url) => (
                            <video key={url} src={url} controls preload="metadata" />
                          ))}
                        </div>
                      ) : null}
                      {text ? <p>{text}</p> : isStreaming && index === messages.length - 1 ? (
                        <p className="xiaomi-msg-typing">小咪正在思考…</p>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {error ? <div className="xiaomi-error">{error}</div> : null}

          {pendingImages.length > 0 ? (
            <div className="xiaomi-pending-images">
              {pendingImages.map((item, index) => (
                <div key={item.preview} className="xiaomi-pending-image">
                  <img src={item.preview} alt="" />
                  <button type="button" onClick={() => removePendingImage(index)} title="移除">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {pendingVideo ? (
            <div className="xiaomi-pending-video-wrap">
              <div className="xiaomi-pending-video">
                <video src={pendingVideo.preview} muted preload="metadata" />
                <span className="xiaomi-pending-video-name">{pendingVideo.name || '待理解视频'}</span>
                <button
                  type="button"
                  onClick={removePendingVideo}
                  title="移除视频"
                  disabled={isStreaming}
                >
                  <X size={12} />
                </button>
              </div>
              <div className="xiaomi-video-templates">
                {VIDEO_TEMPLATES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === videoTemplateId ? 'is-active' : ''}
                    disabled={isStreaming}
                    onClick={() => setVideoTemplateId(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {needsCustomQuestion ? (
                <p className="xiaomi-video-tip">自定义提问需要先在下面输入你的问题</p>
              ) : null}
            </div>
          ) : null}

          <footer className="xiaomi-panel-footer">
            <div className="xiaomi-composer-toolbar">
              <div className="xiaomi-model-picker">
                <button
                  type="button"
                  className="xiaomi-model-trigger"
                  onClick={() => setModelOpen((prev) => !prev)}
                  disabled={isStreaming}
                >
                  <span>{modelLabel}</span>
                  <ChevronDown size={12} />
                </button>
                {modelOpen ? (
                  <div className="xiaomi-model-menu">
                    {TEXT_MODEL_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={option.value === model ? 'is-active' : ''}
                        onClick={() => {
                          const next = persistPreferredTextModel(option.value);
                          setModel(next);
                          setModelOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="xiaomi-icon-btn"
                title="添加图片"
                disabled={isStreaming || pendingImages.length >= MAX_IMAGES}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus size={15} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handlePickImages}
              />
              <button
                type="button"
                className="xiaomi-icon-btn"
                title="添加视频（理解视频内容）"
                disabled={isStreaming || Boolean(pendingVideo)}
                onClick={() => videoFileRef.current?.click()}
              >
                <FileVideo size={15} />
              </button>
              <input
                ref={videoFileRef}
                type="file"
                accept="video/*"
                hidden
                onChange={handlePickVideo}
              />
            </div>

            <div className="xiaomi-composer">
              <textarea
                value={input}
                rows={2}
                placeholder="跟小咪说点什么…"
                disabled={isStreaming}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />
              {isStreaming ? (
                <button type="button" className="xiaomi-send is-stop" onClick={stopStreaming} title="停止">
                  <Square size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="xiaomi-send"
                  onClick={sendMessage}
                  disabled={!canSend}
                  title={needsCustomQuestion ? '请先输入你的问题' : '发送'}
                >
                  <Send size={14} />
                </button>
              )}
            </div>
            {isStreaming ? (
              <div className="xiaomi-streaming-hint">
                <Loader2 size={12} className="spin-icon" />
                {phase === 'uploading'
                  ? '正在上传素材…'
                  : phase === 'understanding-image'
                    ? '正在识别图片…'
                    : phase === 'understanding-video'
                      ? '正在理解视频，大概需要几十秒…'
                      : '正在回复…'}
              </div>
            ) : null}
          </footer>
        </section>
      ) : null}
    </>
  );
}
