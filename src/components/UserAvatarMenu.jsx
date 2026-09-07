import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Circle,
  Crown,
  Keyboard,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  Sun,
  Wallet,
} from 'lucide-react';
import { getNextThemeLabel } from '../lib/theme';
import {
  formatJimicoinNumber,
  getUserDisplayInitial,
  resolveUserAvatarUrl,
} from '../lib/userApi';
import JimicoinIcon from './JimicoinIcon';
function resolveMenuUser(user) {
  if (!user) return null;
  const raw = user.profile && typeof user.profile === 'object' ? user.profile : null;
  return {
    nickname: user.nickname || raw?.nickname || raw?.email || '已登录',
    avatarUrl:
      user.avatarUrl ||
      resolveUserAvatarUrl(raw?.avatar_url || raw?.avatar || user.avatar_url || user.avatar || ''),
    remaining:
      user.remaining ??
      raw?.payment?.available_coin ??
      raw?.payment?.availableCoin ??
      user.available_coin ??
      0,
    isVip: Boolean(user.isVip ?? raw?.vip_info?.is_vip),
  };
}

function UserAvatar({ user, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = user?.avatarUrl;
  const initial = getUserDisplayInitial(user?.nickname);
  const classNames = ['canvas-home-user-avatar', className].filter(Boolean).join(' ');

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  if (avatarUrl && !imageFailed) {
    return (
      <span className={classNames} aria-hidden="true">
        <img
          src={avatarUrl}
          alt=""
          className="canvas-home-user-avatar-img"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={classNames} aria-hidden="true">
      <span className="canvas-home-user-avatar-fallback">{initial}</span>
    </span>
  );
}

function ThemeMenuIcon({ theme }) {
  if (theme === 'dark') return <Circle size={16} aria-hidden="true" />;
  if (theme === 'black') return <Sun size={16} aria-hidden="true" />;
  return <Moon size={16} aria-hidden="true" />;
}

/** 右上角头像下拉：余额 / 站内信 / 充值 / 更多 / 退出 */
export function UserAvatarMenu({
  user,
  compact = false,
  onRecharge,
  onInbox,
  inboxUnread = 0,
  onLogout,
  onOpenCustomerService,
  onOpenKeyboardShortcuts,
  theme,
  onToggleTheme,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const menuUser = resolveMenuUser(user);
  const nickname = menuUser?.nickname || '已登录';
  const balanceLabel = formatJimicoinNumber(menuUser?.remaining);
  const isVip = Boolean(menuUser?.isVip);
  const memberLabel = isVip ? 'VIP 会员' : '普通用户';
  const avatarUser = menuUser || user;
  const hasMoreItems = Boolean(onOpenCustomerService || onOpenKeyboardShortcuts || onToggleTheme);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const run = (action) => {
    setOpen(false);
    action?.();
  };

  return (
    <div
      className={`canvas-home-user-menu${compact ? ' is-compact' : ''}${open ? ' is-open' : ''}`}
      ref={menuRef}
    >
      <button
        type="button"
        className="canvas-home-user-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={nickname}
        title={nickname}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={`canvas-home-user-avatar-wrap${isVip ? ' is-vip' : ''}`}>
          <UserAvatar user={avatarUser} />
          {isVip ? (
            <span className="canvas-home-vip-badge" title="VIP 会员">
              <Crown size={10} strokeWidth={2.5} aria-hidden="true" />
            </span>
          ) : null}
        </span>
        {!compact ? (
          <>
            <span className="canvas-home-user-name">{nickname}</span>
            <ChevronDown size={16} className="canvas-home-user-chevron" aria-hidden="true" />
          </>
        ) : null}
      </button>
      {open ? (
        <div className="canvas-home-user-dropdown" role="menu">
          <div className="canvas-home-user-dropdown-head">
            <span className={`canvas-home-user-avatar-wrap is-dropdown${isVip ? ' is-vip' : ''}`}>
              <UserAvatar user={avatarUser} className="is-dropdown" />
              {isVip ? (
                <span className="canvas-home-vip-badge is-dropdown" title="VIP 会员">
                  <Crown size={11} strokeWidth={2.5} aria-hidden="true" />
                </span>
              ) : null}
            </span>
            <div className="canvas-home-user-dropdown-meta">
              <div className="canvas-home-user-dropdown-title-row">
                <strong>{nickname}</strong>
                <span className={`canvas-home-member-badge${isVip ? ' is-vip' : ''}`}>{memberLabel}</span>
              </div>
              <span className="canvas-home-user-balance">
                <JimicoinIcon size={14} className="jimicoin-balance-icon" />
                {balanceLabel} 吉米币
              </span>
            </div>
          </div>
          {onInbox ? (
            <button type="button" role="menuitem" className="canvas-home-user-dropdown-item" onClick={() => run(onInbox)}>
              <Mail size={16} aria-hidden="true" />
              <span>站内信</span>
              {inboxUnread > 0 ? (
                <span className="inbox-unread-badge is-menu">{inboxUnread > 99 ? '99+' : inboxUnread}</span>
              ) : null}
            </button>
          ) : null}
          {onRecharge ? (
            <button
              type="button"
              role="menuitem"
              className="canvas-home-user-dropdown-item"
              onClick={() => run(onRecharge)}
            >
              <Wallet size={16} aria-hidden="true" />
              <span>充值</span>
            </button>
          ) : null}
          {hasMoreItems ? (
            <>
              <div className="canvas-home-user-dropdown-divider" role="separator" />
              {onOpenCustomerService ? (
                <button
                  type="button"
                  role="menuitem"
                  className="canvas-home-user-dropdown-item"
                  onClick={() => run(onOpenCustomerService)}
                >
                  <MessageCircle size={16} aria-hidden="true" />
                  <span>联系客服</span>
                </button>
              ) : null}
              {onOpenKeyboardShortcuts ? (
                <button
                  type="button"
                  role="menuitem"
                  className="canvas-home-user-dropdown-item"
                  onClick={() => run(onOpenKeyboardShortcuts)}
                >
                  <Keyboard size={16} aria-hidden="true" />
                  <span>快捷键</span>
                  <kbd className="canvas-home-user-dropdown-kbd">?</kbd>
                </button>
              ) : null}
              {onToggleTheme ? (
                <button
                  type="button"
                  role="menuitem"
                  className="canvas-home-user-dropdown-item"
                  onClick={() => run(onToggleTheme)}
                >
                  <ThemeMenuIcon theme={theme} />
                  <span>切换{getNextThemeLabel(theme)}主题</span>
                </button>
              ) : null}
            </>
          ) : null}
          {onLogout ? (
            <>
              <div className="canvas-home-user-dropdown-divider" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="canvas-home-user-dropdown-item is-danger"
                onClick={() => run(onLogout)}
              >
                <LogOut size={16} aria-hidden="true" />
                <span>退出登录</span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
