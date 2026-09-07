import {
  AlertCircle,
  Check,
  Circle,
  Cloud,
  CloudOff,
  CloudUpload,
  Ellipsis,
  Keyboard,
  Loader2,
  Mail,
  MessageCircle,
  Moon,
  Sun,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getNextThemeLabel } from '../lib/theme';
import { BrandProjectMenu } from './BrandProjectMenu';
import { AnimatedJimicoinBalance } from './AnimatedJimicoinBalance';
import { UserAvatarMenu } from './UserAvatarMenu';
import JimicoinIcon from './JimicoinIcon';
import { formatJimicoinNumber } from '../lib/userApi';
const CLOUD_SYNC_META = {
  offline: {
    label: '云端未登录',
    hint: '配置 Token 后可跨设备同步',
    className: 'sync-chip-offline',
    Icon: CloudOff,
    spin: false,
  },
  loading: {
    label: '云端加载中',
    hint: '正在拉取云端画布…',
    className: 'sync-chip-loading',
    Icon: Loader2,
    spin: true,
  },
  pending: {
    label: '待同步云端',
    hint: '编辑停止后将自动上传',
    className: 'sync-chip-pending',
    Icon: CloudUpload,
    spin: false,
  },
  saving: {
    label: '正在上传',
    hint: '正在保存到云端…',
    className: 'sync-chip-saving',
    Icon: Loader2,
    spin: true,
  },
  synced: {
    label: '云端已同步',
    hint: '',
    className: 'sync-chip-synced',
    Icon: Check,
    spin: false,
  },
  error: {
    label: '云端同步失败',
    hint: '请检查网络后刷新重试',
    className: 'sync-chip-error',
    Icon: AlertCircle,
    spin: false,
  },
};

function formatSyncedAt(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  if (diff < 10_000) return '刚刚';
  if (diff < 60_000) return `${Math.floor(diff / 1000)} 秒前`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

export function Topbar({
  activeCanvas,
  projectLoading = false,
  siteTitle,
  siteLogoUrl,
  nodesCount,
  connectionsCount,
  onRenameCanvas,
  onGoHome,
  onViewAllProjects,
  onCreateProject,
  onDeleteProject,
  onOpenKeyboardShortcuts,
  onOpenCustomerService,
  theme = 'dark',
  onToggleTheme,
  cloudSyncStatus = 'offline',
  cloudLastSyncedAt = null,
  quotaVisible = false,
  quotaLoading = false,
  quotaRemaining = null,
  quotaPercentage = null,
  onRecharge,
  inboxUnread = 0,
  onOpenInbox,
  userProfile = null,
  onLogout,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const cloudMeta = CLOUD_SYNC_META[cloudSyncStatus] || CLOUD_SYNC_META.offline;
  const CloudIcon = cloudMeta.Icon;
  const syncedHint =
    cloudSyncStatus === 'synced' && cloudLastSyncedAt
      ? `${formatSyncedAt(cloudLastSyncedAt)}同步`
      : cloudMeta.hint;
  const showStandaloneMore = !userProfile;

  useEffect(() => {
    if (!moreOpen || !showStandaloneMore) return undefined;
    const onPointerDown = (event) => {
      if (moreRef.current?.contains(event.target)) return;
      setMoreOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen, showStandaloneMore]);

  const runMore = (action) => {
    setMoreOpen(false);
    action?.();
  };

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <BrandProjectMenu
          siteTitle={siteTitle}
          siteLogoUrl={siteLogoUrl}
          activeCanvasName={projectLoading ? '同步中…' : activeCanvas?.name || ''}
          projectLoading={projectLoading}
          onRenameCanvas={onRenameCanvas}
          onGoHome={onGoHome}
          onViewAllProjects={onViewAllProjects}
          onCreateProject={onCreateProject}
          onDeleteProject={onDeleteProject}
        />

        <span className="meta-pill" title={`${nodesCount} 节点 · ${connectionsCount} 连线`}>
          {nodesCount} · {connectionsCount}
        </span>
      </div>

      <div className="topbar-meta">
        <div className="toolbar-row">
          {quotaVisible ? (
            <button
              type="button"
              className={`quota-chip quota-chip-action ${
                quotaPercentage != null && quotaPercentage <= 5
                  ? 'quota-chip-critical'
                  : quotaPercentage != null && quotaPercentage <= 20
                    ? 'quota-chip-low'
                    : ''
              }`}
              onClick={onRecharge}
              title={
                quotaLoading
                  ? '正在加载吉米币余额'
                  : `剩余 ${formatJimicoinNumber(quotaRemaining ?? 0)} 吉米币 · 点击充值`
              }
              aria-label="吉米币余额与充值"
            >
              {quotaLoading ? (
                <>
                  <Loader2 size={14} aria-hidden="true" className="sync-chip-spin" />
                  <span className="quota-chip-label">加载中</span>
                </>
              ) : (
                <AnimatedJimicoinBalance value={quotaRemaining ?? 0} size={14} />
              )}
              <span className="quota-chip-cta">充值</span>
            </button>
          ) : onRecharge ? (
            <button
              type="button"
              className="topbar-icon-button"
              onClick={onRecharge}
              title="充值吉米币"
              aria-label="充值吉米币"
            >
              <JimicoinIcon size={15} />
            </button>
          ) : null}

          {!userProfile && onOpenInbox ? (
            <button
              type="button"
              className="topbar-icon-button"
              onClick={onOpenInbox}
              title="站内信"
              aria-label="站内信"
            >
              <span className="inbox-button-icon">
                <Mail size={15} aria-hidden="true" />
                {inboxUnread > 0 ? (
                  <span className="inbox-unread-badge">{inboxUnread > 99 ? '99+' : inboxUnread}</span>
                ) : null}
              </span>
            </button>
          ) : null}

          {showStandaloneMore ? (
            <div className={`topbar-more${moreOpen ? ' is-open' : ''}`} ref={moreRef}>
              <button
                type="button"
                className={`topbar-icon-button${moreOpen ? ' is-active' : ''}`}
                onClick={() => setMoreOpen((prev) => !prev)}
                title="更多"
                aria-label="更多"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
              >
                <Ellipsis size={15} aria-hidden="true" />
              </button>
              {moreOpen ? (
                <div className="topbar-more-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="topbar-more-item"
                    onClick={() => runMore(onOpenCustomerService)}
                  >
                    <MessageCircle size={15} aria-hidden="true" />
                    <span>联系客服</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="topbar-more-item"
                    onClick={() => runMore(onOpenKeyboardShortcuts)}
                  >
                    <Keyboard size={15} aria-hidden="true" />
                    <span>快捷键</span>
                    <kbd>?</kbd>
                  </button>
                  {onToggleTheme ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="topbar-more-item"
                      onClick={() => runMore(onToggleTheme)}
                    >
                      {theme === 'dark' ? (
                        <Circle size={15} aria-hidden="true" />
                      ) : theme === 'black' ? (
                        <Sun size={15} aria-hidden="true" />
                      ) : (
                        <Moon size={15} aria-hidden="true" />
                      )}
                      <span>切换{getNextThemeLabel(theme)}主题</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <span
            className={`sync-chip sync-chip-compact ${cloudMeta.className}`}
            title={syncedHint || cloudMeta.label}
          >
            <CloudIcon size={14} aria-hidden="true" className={cloudMeta.spin ? 'sync-chip-spin' : ''} />
          </span>

          {userProfile ? (
            <UserAvatarMenu
              user={userProfile}
              compact
              onRecharge={onRecharge}
              onInbox={onOpenInbox}
              inboxUnread={inboxUnread}
              onLogout={onLogout}
              onOpenCustomerService={onOpenCustomerService}
              onOpenKeyboardShortcuts={onOpenKeyboardShortcuts}
              theme={theme}
              onToggleTheme={onToggleTheme}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
