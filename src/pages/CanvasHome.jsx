import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CloudUpload,
  Image,
  Loader2,
  Maximize2,
  Moon,
  MoreHorizontal,
  Plus,
  Sun,
  Video,
  Wallet,
  Mail,
  Workflow,
} from 'lucide-react';
import { AnimatedCharacters } from '../components/AnimatedCharacters';
import { AuthModal } from '../components/AuthModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RechargeModal } from '../components/RechargeModal';
import { InboxModal } from '../components/InboxModal';
import { WorkflowTemplateModal } from '../components/WorkflowTemplateModal';
import { WorkflowPreviewModal } from '../components/WorkflowPreviewModal';
import { SiteLogo } from '../components/SiteLogo';
import { CanvasHomeBackground } from '../components/CanvasHomeBackground';
import { UserAvatarMenu } from '../components/UserAvatarMenu';
import { useHomeEntranceAnimation } from '../hooks/useHomeEntranceAnimation';
import { useTheme } from '../hooks/useTheme';
import { openCanvasEditor, getJimiaiAppBaseUrl } from '../lib/appNavigation';
import {
  readCustomWorkflows,
  removeCustomWorkflow,
  syncCustomWorkflowsWithCloud,
  normalizeCustomWorkflow,
} from '../lib/customWorkflows';
import { isCanvasAdmin } from '../lib/canvasAdmin';
import {
  deleteCanvasDocument,
  deleteSystemWorkflowCloud,
  fetchCanvasDocument,
  fetchCanvasList,
  fetchSystemWorkflows,
  saveCanvasDocument,
} from '../lib/canvasApi';
import {
  documentsToProjects,
  duplicateDocument,
  parseRawDocuments,
  renameDocument,
} from '../lib/canvasDocuments';
import { CANVAS_TUTORIAL_URL, TOAST_AUTO_DISMISS_MS } from '../lib/constants';
import { getInboxUnreadCount } from '../lib/inboxApi';
import { getStoredChatToken, isBackendInCooldown } from '../lib/jimiaigoApi';
import { usePageLoading } from '../lib/global-loading.js';
import { fetchSiteConfig, getDefaultSiteSettings } from '../lib/siteApi';
import {
  clearAuthToken,
  fetchUserInfo,
} from '../lib/userApi';

const RECENT_PROJECT_LIMIT = 6;

const COPY = {
  pageTitle: '无限画布',
  heroBrand: 'JimiCanvas',
  heroTitle: '无限画布上的 AI 创作台',
  heroSubtitle: '节点编排图片与视频，一键生成并自动同步云端。',
  startCreateButton: '开始创作',
  tutorialLink: '使用教程',
  workflowTemplatesButton: '工作流模版',
  workflowTemplatesDesc: '预设、系统与自定义工作流，预览后一键复用',
  createCardDesc: '新建空白画布，开启新的创作',
  createCardAction: '立即创建',
  templateCardDesc: '从常用流程一键起步',
  templateCardAction: '选择模版',
  recentProjectsTitle: '最近项目',
  viewAllProjects: '查看全部项目',
  allProjectsTitle: '全部画布项目',
  emptyProjects: '还没有画布项目',
  emptyProjectsHint: '从空白画布或工作流模版开始。',
  projectsLoadingLabel: '加载项目',
  openProject: '打开',
  actionOpen: '打开',
  actionRename: '重命名',
  actionDuplicate: '复制',
  actionDelete: '删除',
  renameTitle: '重命名项目',
  renamePrompt: '请输入新的项目名称',
  renameRequired: '名称不能为空',
  renameSuccess: '重命名成功',
  duplicateSuccess: '复制成功',
  deleteSuccess: '删除成功',
  deleteConfirmTitle: '删除项目',
  deleteConfirmMessage: '确定删除「{name}」吗？此操作不可恢复。',
  projectNotFound: '项目不存在，请刷新后重试',
  confirm: '确定',
  cancel: '取消',
  closeDialog: '关闭',
  featuresTitle: '能在画布上完成',
  login: '登录',
  logout: '退出登录',
  features: {
    infinite: {
      title: '无限画布',
      desc: '自由缩放平移，适合分镜与多方案对比。',
    },
    aiImage: {
      title: 'AI 生图',
      desc: '节点内直接出图，结果落在画布上。',
    },
    aiVideo: {
      title: 'AI 生视频',
      desc: 'Seedance、VEO、Omni 等线路协同编排。',
    },
    cloud: {
      title: '云端同步',
      desc: '自动保存，换设备继续创作。',
    },
  },
};

/** 统一为毫秒：云端列表为 Unix 秒，画布 JSON 内 updatedAt 为毫秒 */
function toTimestampMillis(timestamp) {
  const n = Number(timestamp);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 1e12 ? n * 1000 : n;
}

function formatProjectTime(timestamp) {
  const ms = toTimestampMillis(timestamp);
  if (!ms) return '未知时间';
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '未知时间';

  const now = Date.now();
  const diff = now - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < day * 7) return `${Math.floor(diff / day)} 天前`;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ProjectMenu({ project, onAction }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [open]);

  const run = (command, event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setOpen(false);
    onAction(command, project);
  };

  const stopMenuEvent = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className="canvas-home-project-menu"
      ref={menuRef}
      onPointerDown={stopMenuEvent}
      onClick={stopMenuEvent}
    >
      <button
        type="button"
        className="canvas-home-project-menu-trigger"
        aria-label="更多操作"
        aria-expanded={open}
        onPointerDown={stopMenuEvent}
        onClick={(event) => {
          stopMenuEvent(event);
          setOpen((prev) => !prev);
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open ? (
        <div
          className="canvas-home-project-menu-dropdown"
          role="menu"
          onPointerDown={stopMenuEvent}
          onClick={stopMenuEvent}
        >
          <button type="button" role="menuitem" onClick={(event) => run('open', event)}>
            {COPY.actionOpen}
          </button>
          <button type="button" role="menuitem" onClick={(event) => run('rename', event)}>
            {COPY.actionRename}
          </button>
          <button type="button" role="menuitem" onClick={(event) => run('duplicate', event)}>
            {COPY.actionDuplicate}
          </button>
          <button type="button" role="menuitem" className="danger" onClick={(event) => run('delete', event)}>
            {COPY.actionDelete}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function hashSeed(value) {
  const text = String(value || 'canvas');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function ProjectCover({ projectId, name }) {
  const seed = hashSeed(`${projectId}:${name}`);
  const nodes = Array.from({ length: 4 + (seed % 3) }, (_, index) => {
    const shift = seed >> (index * 4);
    return {
      left: 8 + (shift % 62),
      top: 12 + ((shift >> 3) % 48),
      width: 16 + ((shift >> 6) % 24),
      height: 12 + ((shift >> 9) % 18),
      tone: index % 3,
    };
  });

  return (
    <div className="canvas-home-project-cover" aria-hidden="true">
      <div className="canvas-home-project-cover-grid" />
      <div className="canvas-home-project-cover-stage">
        {nodes.map((node, index) => (
          <span
            key={index}
            className={`canvas-home-project-cover-node tone-${node.tone}`}
            style={{
              left: `${node.left}%`,
              top: `${node.top}%`,
              width: `${node.width}%`,
              height: `${node.height}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectSkeletonCard() {
  return (
    <div className="canvas-home-project-card is-skeleton" aria-hidden="true">
      <div className="canvas-home-project-cover is-skeleton" />
      <div className="canvas-home-project-body">
        <span className="canvas-home-skeleton-line is-title" />
        <span className="canvas-home-skeleton-line is-meta" />
      </div>
      <div className="canvas-home-project-action">
        <span className="canvas-home-skeleton-line is-action" />
      </div>
    </div>
  );
}

function openProjectFromCard(event, project, onOpen) {
  if (event.target.closest('.canvas-home-project-menu')) return;
  onOpen(project);
}

export function CanvasHome() {
  const { theme, toggleTheme } = useTheme();
  const homeRef = useHomeEntranceAnimation();
  const [siteSettings, setSiteSettings] = useState(getDefaultSiteSettings);
  const [token, setToken] = useState(() => getStoredChatToken());
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(() => !getStoredChatToken());
  const [authMode, setAuthMode] = useState('login');
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsSaving, setProjectsSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [rawDocuments, setRawDocuments] = useState([]);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const [canvasVersions, setCanvasVersions] = useState({});
  const [activeCanvasId, setActiveCanvasId] = useState('');
  const [allProjectsVisible, setAllProjectsVisible] = useState(false);
  const [notice, setNotice] = useState('');
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [workflowTemplateOpen, setWorkflowTemplateOpen] = useState(false);
  const [customWorkflows, setCustomWorkflows] = useState(() => readCustomWorkflows());
  const [systemWorkflows, setSystemWorkflows] = useState([]);
  const [systemWorkflowTotal, setSystemWorkflowTotal] = useState(0);
  const [systemWorkflowPage, setSystemWorkflowPage] = useState(1);
  const [systemWorkflowKeyword, setSystemWorkflowKeyword] = useState('');
  const [systemWorkflowLoading, setSystemWorkflowLoading] = useState(false);
  const [systemPreview, setSystemPreview] = useState(null);
  const [userRolesProfile, setUserRolesProfile] = useState(null);

  const recentProjects = useMemo(
    () => projects.slice(0, RECENT_PROJECT_LIMIT),
    [projects]
  );

  usePageLoading(projectsLoading && projects.length === 0, '加载项目…');

  const features = useMemo(
    () => [
      { key: 'infinite', icon: Maximize2, iconClass: 'icon-infinite', ...COPY.features.infinite },
      { key: 'ai-image', icon: Image, iconClass: 'icon-image', ...COPY.features.aiImage },
      { key: 'ai-video', icon: Video, iconClass: 'icon-video', ...COPY.features.aiVideo },
      { key: 'cloud', icon: CloudUpload, iconClass: 'icon-cloud', ...COPY.features.cloud },
    ],
    []
  );

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), TOAST_AUTO_DISMISS_MS);
  }, []);

  const applyListPayload = useCallback((data) => {
    setCanvasVersion(Number(data?.version) || 0);
    setActiveCanvasId((data && data.active_canvas_id) || '');
    const summaries = Array.isArray(data?.canvases) ? data.canvases : [];
    const docs = summaries.map((item) => ({
      id: item.id,
      name: item.name,
      nodes: [],
      connections: [],
      nodeCount: Number(item.node_count) || 0,
      updatedAt: toTimestampMillis(item.updated_at) || Date.now(),
    }));
    setRawDocuments(docs);
    setProjects(documentsToProjects(docs));
    const versions = {};
    summaries.forEach((item) => {
      if (item.id) versions[item.id] = Number(item.version) || 0;
    });
    setCanvasVersions(versions);
  }, []);

  const applyFullPayload = useCallback((data) => {
    setCanvasVersion(Number(data?.version) || 0);
    setActiveCanvasId((data && data.active_canvas_id) || '');
    const docs = parseRawDocuments(data?.documents);
    setRawDocuments(docs);
    setProjects(documentsToProjects(docs));
    if (data?.canvas_versions) {
      setCanvasVersions((prev) => ({ ...prev, ...data.canvas_versions }));
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    const authToken = getStoredChatToken();
    if (!authToken) {
      setProjects([]);
      setRawDocuments([]);
      return;
    }
    if (isBackendInCooldown()) return;

    setProjectsLoading(true);
    try {
      const data = await fetchCanvasList(authToken);
      applyListPayload(data);
    } catch {
      setRawDocuments([]);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [applyListPayload]);

  const refreshAuth = useCallback(async () => {
    const authToken = getStoredChatToken();
    setToken(authToken);
    if (!authToken) {
      setUser(null);
      return;
    }
    try {
      const info = await fetchUserInfo(authToken);
      setUser(info);
    } catch (error) {
      if (error?.isTokenExpired) {
        clearAuthToken();
        setToken('');
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchSiteConfig().then(setSiteSettings);
  }, []);

  useEffect(() => {
    let cancelled = false;
    refreshAuth().then(() => {
      if (!cancelled && getStoredChatToken() && !isBackendInCooldown()) fetchProjects();
    });
    return () => {
      cancelled = true;
    };
  }, [fetchProjects, refreshAuth]);

  useEffect(() => {
    const onTokenChange = () => {
      if (isBackendInCooldown()) return;
      refreshAuth().then(() => {
        if (getStoredChatToken() && !isBackendInCooldown()) fetchProjects();
      });
    };
    window.addEventListener('auth:token-saved', onTokenChange);
    window.addEventListener('auth:token-cleared', onTokenChange);
    return () => {
      window.removeEventListener('auth:token-saved', onTokenChange);
      window.removeEventListener('auth:token-cleared', onTokenChange);
    };
  }, [fetchProjects, refreshAuth]);

  const requireAuth = useCallback(
    (action) => {
      if (getStoredChatToken()) {
        action();
        return;
      }
      setAuthMode('login');
      setAuthOpen(true);
    },
    []
  );

  const openRechargeModal = useCallback(() => {
    const authToken = getStoredChatToken();
    if (!authToken) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    setShowRechargeModal(true);
  }, []);

  useEffect(() => {
    if (!token) {
      setInboxUnread(0);
      return undefined;
    }
    let cancelled = false;
    const loadUnread = async () => {
      try {
        const data = await getInboxUnreadCount();
        if (!cancelled) setInboxUnread(Number(data?.count || 0));
      } catch {
        if (!cancelled) setInboxUnread(0);
      }
    };
    void loadUnread();
    const timer = window.setInterval(() => void loadUnread(), 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, showInbox]);

  const handleRechargeSuccess = useCallback(() => {
    refreshAuth();
  }, [refreshAuth]);

  const handleStartCreate = () => {
    requireAuth(() => openCanvasEditor({ createNew: true }));
  };

  const handleOpenWorkflowTemplates = () => {
    requireAuth(() => {
      const authToken = getStoredChatToken();
      if (!authToken) {
        setCustomWorkflows(readCustomWorkflows());
        setWorkflowTemplateOpen(true);
        return;
      }
      setSystemWorkflowLoading(true);
      Promise.all([
        syncCustomWorkflowsWithCloud(authToken)
          .then((list) => setCustomWorkflows(list))
          .catch(() => setCustomWorkflows(readCustomWorkflows())),
        fetchSystemWorkflows(authToken, { page: 1, pageSize: 6, keyword: '' })
          .then((result) => {
            const list = (result.list || []).map(normalizeCustomWorkflow).filter(Boolean);
            setSystemWorkflows(list);
            setSystemWorkflowTotal(result.total || list.length);
            setSystemWorkflowPage(result.page || 1);
            setSystemWorkflowKeyword('');
          })
          .catch(() => {
            setSystemWorkflows([]);
            setSystemWorkflowTotal(0);
          }),
        fetchUserInfo(authToken)
          .then((info) => setUserRolesProfile(info))
          .catch(() => setUserRolesProfile(null)),
      ]).finally(() => {
        setSystemWorkflowLoading(false);
        setWorkflowTemplateOpen(true);
      });
    });
  };

  const handleSelectWorkflowTemplate = (templateId, options = {}) => {
    setWorkflowTemplateOpen(false);
    requireAuth(() => {
      if (options.source === 'system') {
        openCanvasEditor({ createNew: true, systemWorkflowId: templateId });
        return;
      }
      openCanvasEditor({ createNew: true, templateId });
    });
  };

  const loadHomeSystemWorkflows = async ({ page = 1, keyword = '' } = {}) => {
    const authToken = getStoredChatToken();
    if (!authToken) return;
    setSystemWorkflowLoading(true);
    try {
      const result = await fetchSystemWorkflows(authToken, { page, pageSize: 6, keyword });
      const list = (result.list || []).map(normalizeCustomWorkflow).filter(Boolean);
      setSystemWorkflows(list);
      setSystemWorkflowTotal(result.total || list.length);
      setSystemWorkflowPage(result.page || page);
      setSystemWorkflowKeyword(keyword);
    } catch {
      setSystemWorkflows([]);
      setSystemWorkflowTotal(0);
    } finally {
      setSystemWorkflowLoading(false);
    }
  };

  const handleDeleteCustomWorkflow = async (workflowId) => {
    const target = customWorkflows.find((item) => item.id === workflowId);
    if (!target) return;
    if (!window.confirm(`确定删除自定义工作流「${target.name}」？`)) return;
    try {
      const authToken = getStoredChatToken();
      if (!authToken) return;
      const next = await removeCustomWorkflow(workflowId, authToken);
      setCustomWorkflows(next);
    } catch (error) {
      setCustomWorkflows(readCustomWorkflows());
      window.alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleDeleteSystemWorkflow = async (workflowId) => {
    const target = systemWorkflows.find((item) => item.id === workflowId);
    if (!target) return;
    if (!window.confirm(`确定删除系统工作流「${target.name}」？`)) return;
    try {
      const authToken = getStoredChatToken();
      if (!authToken || !isCanvasAdmin(userRolesProfile)) return;
      await deleteSystemWorkflowCloud(authToken, workflowId);
      await loadHomeSystemWorkflows({ page: systemWorkflowPage, keyword: systemWorkflowKeyword });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleOpenProject = (project) => {
    if (!project?.id) return;
    setAllProjectsVisible(false);
    requireAuth(() => openCanvasEditor({ canvasId: project.id }));
  };

  const handleProjectAction = (command, project) => {
    if (!project) return;
    switch (command) {
      case 'open':
        handleOpenProject(project);
        break;
      case 'rename':
        requireAuth(() => handleRenameProject(project));
        break;
      case 'duplicate':
        requireAuth(() => handleDuplicateProject(project));
        break;
      case 'delete':
        requireAuth(() => handleDeleteProject(project));
        break;
      default:
        break;
    }
  };

  const handleRenameProject = async (project) => {
    const value = window.prompt(COPY.renamePrompt, project.name);
    if (value == null) return;
    const trimmed = value.trim();
    if (!trimmed) {
      showNotice(COPY.renameRequired);
      return;
    }
    const authToken = getStoredChatToken();
    if (!authToken) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    setProjectsSaving(true);
    try {
      const cloud = await fetchCanvasDocument(authToken, project.id);
      const docs = parseRawDocuments(cloud?.documents);
      const source = docs.find((doc) => doc.id === project.id);
      if (!source) {
        showNotice(COPY.projectNotFound);
        return;
      }
      const renamed = renameDocument([source], project.id, trimmed)[0];
      const data = await saveCanvasDocument(authToken, project.id, {
        document: renamed,
        version: canvasVersions[project.id] || 0,
        activeCanvasId,
      });
      applyFullPayload(data);
      showNotice(COPY.renameSuccess);
    } catch (error) {
      if (error?.isConflict) await fetchProjects();
      showNotice(error.message || '保存失败');
    } finally {
      setProjectsSaving(false);
    }
  };

  const handleDuplicateProject = async (project) => {
    const authToken = getStoredChatToken();
    if (!authToken) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    setProjectsSaving(true);
    try {
      const cloud = await fetchCanvasDocument(authToken, project.id);
      const docs = parseRawDocuments(cloud?.documents);
      const source = docs.find((doc) => doc.id === project.id);
      if (!source) {
        showNotice(COPY.projectNotFound);
        return;
      }
      const duplicated = duplicateDocument(source);
      const data = await saveCanvasDocument(authToken, duplicated.id, {
        document: duplicated,
        version: 0,
        activeCanvasId: duplicated.id,
      });
      applyFullPayload(data);
      showNotice(COPY.duplicateSuccess);
    } catch (error) {
      if (error?.isConflict) await fetchProjects();
      showNotice(error.message || '保存失败');
    } finally {
      setProjectsSaving(false);
    }
  };

  const handleDeleteProject = (project) => {
    if (!project?.id) return;
    setDeleteTarget(project);
  };

  const handleConfirmDeleteProject = async () => {
    if (!deleteTarget?.id || deleteLoading) return;
    const authToken = getStoredChatToken();
    if (!authToken) {
      setDeleteTarget(null);
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    setDeleteLoading(true);
    try {
      const data = await deleteCanvasDocument(authToken, deleteTarget.id);
      applyFullPayload(data);
      setDeleteTarget(null);
      showNotice(COPY.deleteSuccess);
    } catch (error) {
      showNotice(error.message || '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    refreshAuth().then(() => fetchProjects());
  };

  const handleLogout = () => {
    clearAuthToken();
    setToken('');
    setUser(null);
    setProjects([]);
    setRawDocuments([]);
    setAuthMode('login');
    setAuthOpen(true);
  };

  return (
    <div className="canvas-home" ref={homeRef}>
      <CanvasHomeBackground />
      {notice ? <div className="canvas-home-notice">{notice}</div> : null}

      <header className="canvas-home-topbar">
        <a
          href={getJimiaiAppBaseUrl() || '/'}
          className="canvas-home-brand"
          aria-label="返回主站"
        >
          <SiteLogo
            url={siteSettings.logoUrl}
            className="canvas-home-logo"
            fallback={
              <span className="canvas-home-brand-mark" aria-hidden="true">
                <Maximize2 size={18} />
              </span>
            }
          />
          <div>
            <strong>{siteSettings.title || COPY.pageTitle}</strong>
            <span>{siteSettings.slogan}</span>
          </div>
        </a>
        <div className="canvas-home-topbar-actions">
          <a
            href={CANVAS_TUTORIAL_URL}
            className="canvas-home-text-btn canvas-home-tutorial-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOpen size={16} />
            <span>{COPY.tutorialLink}</span>
          </a>
          <button
            type="button"
            className="canvas-home-icon-btn"
            onClick={() => {
              if (!token) {
                setAuthMode('login');
                setAuthOpen(true);
                return;
              }
              setShowInbox(true);
            }}
            aria-label="站内信"
            title="站内信"
          >
            <span className="inbox-button-icon">
              <Mail size={18} />
              {inboxUnread > 0 ? (
                <span className="inbox-unread-badge">{inboxUnread > 99 ? '99+' : inboxUnread}</span>
              ) : null}
            </span>
          </button>
          <button type="button" className="canvas-home-icon-btn" onClick={toggleTheme} aria-label="切换主题">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            type="button"
            className="canvas-home-recharge-btn"
            onClick={openRechargeModal}
            title="充值"
            aria-label="充值"
          >
            <span className="canvas-home-recharge-btn-icon" aria-hidden="true">
              <Wallet size={15} strokeWidth={2.25} />
            </span>
            <span className="canvas-home-recharge-btn-label">充值</span>
          </button>
          <span className="canvas-home-topbar-divider" aria-hidden="true" />
          {token ? (
            <UserAvatarMenu
              user={user}
              onRecharge={openRechargeModal}
              onInbox={() => setShowInbox(true)}
              inboxUnread={inboxUnread}
              onLogout={handleLogout}
            />
          ) : (
            <button
              type="button"
              className="canvas-home-primary-btn"
              onClick={() => {
                setAuthMode('login');
                setAuthOpen(true);
              }}
            >
              {COPY.login}
            </button>
          )}
        </div>
      </header>

      <main className="canvas-home-main">
        <section className="canvas-home-hero">
          <div className="canvas-home-hero-glow" aria-hidden="true" />
          <div className="canvas-home-hero-inner">
            <div className="canvas-home-hero-content">
              <strong className="canvas-home-hero-brand">{COPY.heroBrand}</strong>
              <h1>{COPY.heroTitle}</h1>
              <p className="canvas-home-hero-subtitle">{COPY.heroSubtitle}</p>
              <div className="canvas-home-hero-actions">
                <button type="button" className="canvas-home-hero-cta" onClick={handleStartCreate}>
                  <Plus size={16} />
                  {COPY.startCreateButton}
                </button>
              </div>
            </div>
            <div className="canvas-home-hero-visual">
              <AnimatedCharacters />
            </div>
          </div>
        </section>

        <section className="canvas-home-projects">
          <div className="canvas-home-section-header">
            <h2>{COPY.recentProjectsTitle}</h2>
            {projects.length > 0 ? (
              <button type="button" className="canvas-home-link-btn" onClick={() => setAllProjectsVisible(true)}>
                {COPY.viewAllProjects}
              </button>
            ) : null}
          </div>

          <div className={`canvas-home-projects-body${projectsSaving ? ' is-saving' : ''}`}>
            {projectsSaving ? (
              <div className="canvas-home-saving-chip" role="status">
                <Loader2 size={14} className="spin" />
                <span>保存中</span>
              </div>
            ) : null}

            <div className="canvas-home-projects-grid">
              <button type="button" className="canvas-home-project-card create-card" onClick={handleStartCreate}>
                <div className="canvas-home-project-cover create-cover">
                  <span className="canvas-home-project-cover-action">
                    <Plus size={28} />
                  </span>
                </div>
                <div className="canvas-home-project-body">
                  <h3>{COPY.startCreateButton}</h3>
                  <p>{COPY.createCardDesc}</p>
                </div>
                <div className="canvas-home-project-action">
                  <span>{COPY.createCardAction}</span>
                </div>
              </button>

              <button
                type="button"
                className="canvas-home-project-card template-card"
                onClick={handleOpenWorkflowTemplates}
              >
                <div className="canvas-home-project-cover template-cover">
                  <span className="canvas-home-project-cover-action">
                    <Workflow size={26} />
                  </span>
                </div>
                <div className="canvas-home-project-body">
                  <h3>{COPY.workflowTemplatesButton}</h3>
                  <p>{COPY.templateCardDesc}</p>
                </div>
                <div className="canvas-home-project-action">
                  <span>{COPY.templateCardAction}</span>
                </div>
              </button>

              {projectsLoading && projects.length === 0
                ? Array.from({ length: 3 }, (_, index) => <ProjectSkeletonCard key={`skeleton-${index}`} />)
                : null}

              {!projectsLoading
                ? recentProjects.map((project) => (
                    <div
                      key={project.id}
                      role="button"
                      tabIndex={0}
                      className="canvas-home-project-card"
                      onClick={(event) => openProjectFromCard(event, project, handleOpenProject)}
                      onKeyDown={(event) => {
                        if (event.target.closest('.canvas-home-project-menu')) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleOpenProject(project);
                        }
                      }}
                    >
                      <ProjectMenu project={project} onAction={handleProjectAction} />
                      <ProjectCover projectId={project.id} name={project.name} />
                      <div className="canvas-home-project-body">
                        <h3 title={project.name}>{project.name}</h3>
                        <p>
                          {project.nodeCount} 个节点 · {formatProjectTime(project.updatedAt)}
                        </p>
                      </div>
                      <div className="canvas-home-project-action">
                        <span>{COPY.openProject}</span>
                      </div>
                    </div>
                  ))
                : null}
            </div>

            {!projectsLoading && token && recentProjects.length === 0 ? (
              <div className="canvas-home-empty">
                <strong>{COPY.emptyProjects}</strong>
                <p>{COPY.emptyProjectsHint}</p>
              </div>
            ) : null}

            {projectsLoading && projects.length === 0 ? (
              <span className="sr-only">{COPY.projectsLoadingLabel}</span>
            ) : null}
          </div>
        </section>

        <section className="canvas-home-capabilities">
          <h2>{COPY.featuresTitle}</h2>
          <ul className="canvas-home-capability-rail">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.key} className="canvas-home-capability-item">
                  <span className={`canvas-home-capability-icon ${feature.iconClass}`} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div className="canvas-home-capability-copy">
                    <strong>{feature.title}</strong>
                    <span>{feature.desc}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      {allProjectsVisible ? (
        <div className="asset-modal-backdrop" onPointerDown={() => setAllProjectsVisible(false)}>
          <div
            className="canvas-home-all-projects-dialog"
            role="dialog"
            aria-modal="true"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <header className="canvas-home-dialog-header">
              <h3>{COPY.allProjectsTitle}</h3>
              <button
                type="button"
                className="icon-mini"
                onClick={() => setAllProjectsVisible(false)}
                aria-label={COPY.closeDialog}
              >
                ×
              </button>
            </header>
            <div className={`canvas-home-all-projects-list${projectsLoading || projectsSaving ? ' is-loading' : ''}`}>
              {!projectsLoading && projects.length === 0 ? (
                <p className="canvas-home-empty-hint">{COPY.emptyProjects}</p>
              ) : null}
              {projects.map((project) => (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  className="canvas-home-all-project-row"
                  onClick={(event) => openProjectFromCard(event, project, handleOpenProject)}
                  onKeyDown={(event) => {
                    if (event.target.closest('.canvas-home-project-menu')) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleOpenProject(project);
                    }
                  }}
                >
                  <div className="canvas-home-all-project-icon">
                    <ProjectCover projectId={project.id} name={project.name} />
                  </div>
                  <div className="canvas-home-all-project-info">
                    <div>{project.name}</div>
                    <span>
                      {project.nodeCount} 个节点 · {formatProjectTime(project.updatedAt)}
                    </span>
                  </div>
                  <ProjectMenu project={project} onAction={handleProjectAction} />
                </div>
              ))}
            </div>
            <footer className="canvas-home-dialog-footer">
              <button type="button" onClick={() => setAllProjectsVisible(false)}>
                {COPY.closeDialog}
              </button>
              <button type="button" className="primary" onClick={() => {
                setAllProjectsVisible(false);
                handleStartCreate();
              }}>
                {COPY.startCreateButton}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      <AuthModal
        isOpen={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        siteTitle={siteSettings.title || COPY.pageTitle}
        siteSlogan={siteSettings.slogan}
        logoUrl={siteSettings.logoUrl}
      />

      {showInbox ? (
        <InboxModal
          onClose={() => setShowInbox(false)}
          onOpenLink={(link) => {
            setShowInbox(false);
            if (link === '/pricing' || link === '/recharge-center' || link === '/recharge') {
              openRechargeModal();
            }
          }}
        />
      ) : null}

      {showRechargeModal ? (
        <RechargeModal
          isOpen={showRechargeModal}
          user={user?.profile || user}
          onClose={() => setShowRechargeModal(false)}
          onSuccess={handleRechargeSuccess}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={COPY.deleteConfirmTitle}
        message={
          deleteTarget
            ? COPY.deleteConfirmMessage.replace('{name}', deleteTarget.name)
            : ''
        }
        confirmLabel={COPY.actionDelete}
        cancelLabel={COPY.cancel}
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDeleteProject}
        onCancel={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
      />

      <WorkflowTemplateModal
        isOpen={workflowTemplateOpen}
        onClose={() => setWorkflowTemplateOpen(false)}
        onSelect={handleSelectWorkflowTemplate}
        onPreviewSystem={(workflow) => {
          setSystemPreview(workflow);
          setWorkflowTemplateOpen(false);
        }}
        onDeleteCustom={handleDeleteCustomWorkflow}
        onDeleteSystem={handleDeleteSystemWorkflow}
        customTemplates={customWorkflows}
        systemTemplates={systemWorkflows}
        systemTotal={systemWorkflowTotal}
        systemPage={systemWorkflowPage}
        systemLoading={systemWorkflowLoading}
        onSystemSearch={(keyword) => loadHomeSystemWorkflows({ page: 1, keyword })}
        onSystemPageChange={(page) =>
          loadHomeSystemWorkflows({ page, keyword: systemWorkflowKeyword })
        }
        canManageSystem={isCanvasAdmin(userRolesProfile)}
      />

      <WorkflowPreviewModal
        isOpen={Boolean(systemPreview)}
        workflow={systemPreview}
        canDelete={isCanvasAdmin(userRolesProfile)}
        addLabel="用此创建画布"
        onClose={() => setSystemPreview(null)}
        onAdd={(workflow) => {
          setSystemPreview(null);
          requireAuth(() => openCanvasEditor({ createNew: true, systemWorkflowId: workflow.id }));
        }}
        onDelete={async (workflowId) => {
          await handleDeleteSystemWorkflow(workflowId);
          setSystemPreview(null);
        }}
      />
    </div>
  );
}
