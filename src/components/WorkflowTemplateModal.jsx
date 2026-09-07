import { useEffect, useMemo, useState } from 'react';
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  ScanSearch,
  Search,
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
};

const CUSTOM_PAGE_SIZE = 6;

function matchesWorkflowSearch(template, query) {
  if (!query) return true;
  const haystack = `${template.name || ''} ${template.description || ''}`.toLowerCase();
  return haystack.includes(query);
}

export function WorkflowTemplateModal({
  isOpen,
  onClose,
  onSelect,
  onDeleteCustom,
  customTemplates = [],
  mode = 'create',
}) {
  const [activeTab, setActiveTab] = useState('preset');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isOpen) return undefined;
    setActiveTab(customTemplates.length > 0 ? 'custom' : 'preset');
    setSearch('');
    setPage(1);
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

  if (!isOpen) return null;

  const title = mode === 'insert' ? '插入工作流模版' : '工作流模版';
  const subtitle =
    mode === 'insert'
      ? '选择预设或自定义工作流，一键插入当前画布'
      : '选择预设或自定义工作流，快速搭建创作流程';

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
            aria-selected={activeTab === 'custom'}
            className={`workflow-template-tab${activeTab === 'custom' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            自定义工作流
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
                      onClick={() => onSelect(template.id)}
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
          ) : (
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
                            onClick={() => onSelect(template.id)}
                          >
                            <span
                              className={`workflow-template-icon icon-${template.icon || 'layers'}`}
                            >
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
          )}
        </div>
      </div>
    </div>
  );
}
