import { lazy, Suspense } from 'react';
import './anime-assistant-avatar.css';

const AssistantModel = lazy(() => import('./AssistantModel'));

export const ASSISTANT_AVATAR_SRC = '/chat/assistant-black-cat.png?v=4';

const SIZE_MAP = {
  sm: 36,
  md: 56,
  lg: 96,
  xl: 120,
};

/**
 * 小咪头像：PNG 呼吸动效；launcher 可开 WebGL 3D 模型。
 */
export function AnimeAssistantAvatar({
  size = 'md',
  isStreaming = false,
  isOpen = false,
  className = '',
  model = false,
}) {
  const px = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={[
        'ai-assistant-avatar',
        model ? 'ai-assistant-avatar--3d' : '',
        `ai-assistant-avatar--${size}`,
        isStreaming ? 'is-streaming' : '',
        isOpen ? 'is-open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <div className="ai-assistant-avatar__frame" style={{ width: px, height: px }}>
        <img
          className="ai-assistant-avatar__img"
          src={ASSISTANT_AVATAR_SRC}
          alt=""
          width={px}
          height={px}
          draggable={false}
        />
        {model ? (
          <Suspense fallback={null}>
            <AssistantModel />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
