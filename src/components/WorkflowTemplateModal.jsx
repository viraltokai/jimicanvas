import { useEffect, useMemo, useState } from 'react';
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Eye,
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  ScanSearch,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { WORKFLOW_TEMPLATES } from '../lib/workflowTemplates';

const TEMPLATE_ICONS = {
  image: ImageIcon,
  video: Film,
  scan: ScanSearch,
  'video-scan': Clapperboard,
  layers: Layers,
  note: FileText,
  system: Sparkles,
};

const CUSTOM_PAGE_SIZE = 6;
const SYSTEM_PAGE_SIZE = 6;

function matchesWorkflowSearch(template, query) {
  if (!query) return true;
  const haystack = `${template.name || ''} ${template.description || ''}`.toLowerCase();
  return haystack.includes(query);
}

export function WorkflowTemplateModal({
  isOpen,
  onClose,
  onSelect,
  onPreviewSystem,
  onDeleteCustom,
  onDeleteSystem,
  customTemplates = [],
  systemTemplates = [],
  systemTotal = 0,
  systemPage = 1,
  systemLoading = false,
  onSystemSearch,
  onSystemPageChange,
  canManageSystem = false,
  mode = 'create',
}) {
  const [activeTab, setActiveTab] = useState('preset');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [systemKeyword, setSystemKeyword] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    setActiveTab(systemTemplates.length > 0 ? 'system' : customTemplates.length > 0 ? 'custom' : 'preset');
    setSearch('');
    setPage(1);
    setSystemKeyword('');
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    setPage(1);
  }, [search, customTemplates]);

  const filteredCustom = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customTemplates.filter((template) => matchesWorkflowSearch(template, query));
  }, [customTemplates, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCustom.length / CUSTOM_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCustom = useMemo(() => {
    const start = (currentPage - 1) * CUSTOM_PAGE_SIZE;
    return filteredCustom.slice(start, start + CUSTOM_PAGE_SIZE);
  }, [filteredCustom, currentPage]);

  const systemTotalPages = Math.max(1, Math.ceil((systemTotal || systemTemplates.length) / SYSTEM_PAGE_SIZE));

  if (!isOpen) return null;

  const title = mode === 'insert' ? '插入工作流模版' : '工作流模版';
  const subtitle =
    mode === 'insert'
      ? '选择预设、系统或自定义工作流，一键插入当前画布'
      : '选择预设、系统或自定义工作流，快速搭建创作流程';

  return (
    <div className="asset-modal-backdrop" onPointerDown={onClose}>
      <div
        className="workflow-template-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-template-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="workflow-template-header">
          <div>
            <h3 id="workflow-template-title">{title}</h3>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="icon-mini" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="workflow-template-tabs" role="tablist" aria-label="工作流分类">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preset'}
            className={`workflow-template-tab${activeTab === 'preset' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('preset')}
          >
            预设模版
            <span className="workflow-template-tab-count">{WORKFLOW_TEMPLATES.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'system'}
            className={`workflow-template-tab${activeTab === 'system' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            系统工作流
            <span className="workflow-template-tab-count">{systemTotal || systemTemplates.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'custom'}
            className={`workflow-template-tab${activeTab === 'custom' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            自定义
            <span className="workflow-template-tab-count">{customTemplates.length}</span>
          </button>
        </div>

        <div className="workflow-template-body">
          {activeTab === 'preset' ? (
            <section className="workflow-template-section" aria-label="预设模版" role="tabpanel">
              <div className="workflow-template-grid">
                {WORKFLOW_TEMPLATES.map((template) => {
                  const Icon = TEMPLATE_ICONS[template.icon] || ImageIcon;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      className="workflow-template-card"
                      onClick={() => onSelect(template.id, { source: 'preset' })}
                    >
                      <span className={`workflow-template-icon icon-${template.icon}`}>
                        <Icon size={22} aria-hidden="true" />
                      </span>
                      <span className="workflow-template-card-body">
                        <strong>{template.name}</strong>
                        <span>{template.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {activeTab === 'system' ? (
            <section className="workflow-template-section" aria-label="系统工作流" role="tabpanel">
              <div className="workflow-template-toolbar">
                <label className="workflow-template-search">
                  <Search size={15} aria-hidden="true" />
                  <input
                    type="search"
                    value={systemKeyword}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSystemKeyword(value);
                      onSystemSearch?.(value);
                    }}
                    placeholder="搜索系统工作流"
                    aria-label="搜索系统工作流"
                  />
                </label>
                <span className="workflow-template-result-count">
                  {systemTotal || systemTemplates.length}
                </span>
              </div>

              {systemLoading ? (
                <p className="workflow-template-empty">加载系统工作流中…</p>
              ) : systemTemplates.length === 0 ? (
                <p className="workflow-template-empty">
                  暂无系统工作流。管理员可在画布中选中一组节点后「存为系统工作流」。
                </p>
              ) : (
                <>
                  <div className="workflow-template-grid">
                    {systemTemplates.map((template) => {
                      const Icon = TEMPLATE_ICONS[template.icon] || Sparkles;
                      return (
                        <div key={template.id} className="workflow-template-card-wrap">
                          <button
                            type="button"
                            className={`workflow-template-card is-custom${
                              template.coverUrl ? ' has-cover' : ''
                            }`}
                            onClick={() =>
                              onPreviewSystem
                                ? onPreviewSystem(template)
                                : onSelect(template.id, { source: 'system', workflow: template })
                            }
                          >
                            {template.coverUrl ? (
                              <span className="workflow-template-cover">
                                <img src={template.coverUrl} alt="" />
                              </span>
                            ) : (
                              <span className={`workflow-template-icon icon-${template.icon || 'layers'}`}>
                                <Icon size={22} aria-hidden="true" />
                              </span>
                            )}
                            <span className="workflow-template-card-body">
                              <strong>{template.name}</strong>
                              <span>{template.description}</span>
                            </span>
                            <span className="workflow-template-card-action">
                              <Eye size={14} />
                              预览
                            </span>
                          </button>
                          {canManageSystem && onDeleteSystem ? (
                            <button
                              type="button"
                              className="workflow-template-delete"
                              title="删除系统工作流"
                              aria-label={`删除 ${template.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteSystem(template.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {systemTotalPages > 1 ? (
                    <div className="workflow-template-pagination">
                      <button
                        type="button"
                        className="workflow-template-page-btn"
                        disabled={systemPage <= 1 || systemLoading}
                        onClick={() => onSystemPageChange?.(Math.max(1, systemPage - 1))}
                        aria-label="上一页"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="workflow-template-page-info">
                        {systemPage} / {systemTotalPages}
                      </span>
                      <button
                        type="button"
                        className="workflow-template-page-btn"
                        disabled={systemPage >= systemTotalPages || systemLoading}
                        onClick={() => onSystemPageChange?.(Math.min(systemTotalPages, systemPage + 1))}
                        aria-label="下一页"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          ) : null}

          {activeTab === 'custom' ? (
            <section className="workflow-template-section" aria-label="自定义工作流" role="tabpanel">
              <div className="workflow-template-toolbar">
                <label className="workflow-template-search">
                  <Search size={15} aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="搜索名称或描述"
                    aria-label="搜索自定义工作流"
                  />
                </label>
                <span className="workflow-template-result-count">
                  {filteredCustom.length}/{customTemplates.length}
                </span>
              </div>

              {customTemplates.length === 0 ? (
                <p className="workflow-template-empty">
                  在画布中选中一组节点，点击「存为工作流」后会出现在这里，可一键复用。
                </p>
              ) : filteredCustom.length === 0 ? (
                <p className="workflow-template-empty">没有匹配「{search.trim()}」的工作流</p>
              ) : (
                <>
                  <div className="workflow-template-grid">
                    {pagedCustom.map((template) => {
                      const Icon = TEMPLATE_ICONS[template.icon] || BookmarkPlus;
                      return (
                        <div key={template.id} className="workflow-template-card-wrap">
                          <button
                            type="button"
                            className="workflow-template-card is-custom"
                            onClick={() => onSelect(template.id, { source: 'custom', workflow: template })}
                          >
                            <span className={`workflow-template-icon icon-${template.icon || 'layers'}`}>
                              <Icon size={22} aria-hidden="true" />
                            </span>
                            <span className="workflow-template-card-body">
                              <strong>{template.name}</strong>
                              <span>{template.description}</span>
                            </span>
                          </button>
                          {onDeleteCustom ? (
                            <button
                              type="button"
                              className="workflow-template-delete"
                              title="删除自定义工作流"
                              aria-label={`删除 ${template.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteCustom(template.id);
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {filteredCustom.length > CUSTOM_PAGE_SIZE ? (
                    <div className="workflow-template-pagination">
                      <button
                        type="button"
                        className="workflow-template-page-btn"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        aria-label="上一页"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="workflow-template-page-info">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        className="workflow-template-page-btn"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        aria-label="下一页"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
