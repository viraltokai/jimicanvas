import { useEffect, useState } from 'react';
import { CheckCheck, Mail, X } from 'lucide-react';
import {
  getInboxList,
  inboxMessageId,
  inboxMessageTime,
  markInboxAllRead,
  markInboxRead,
} from '../lib/inboxApi';

function typeLabel(type) {
  if (type === 'monthly_vip_expiry') return '会员到期';
  return '系统通知';
}

function formatTime(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).replace('T', ' ').slice(0, 16);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InboxModal({ onClose, onOpenLink }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInboxList({ page: 1, pageSize: 50 });
      setRows(data?.list || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleOpen = async (item) => {
    const id = inboxMessageId(item);
    if (id && !item.read_at) {
      try {
        await markInboxRead(id);
        setRows((prev) =>
          prev.map((row) => (inboxMessageId(row) === id ? { ...row, read_at: new Date().toISOString() } : row)),
        );
      } catch {
        /* ignore */
      }
    }
    if (item.link) onOpenLink?.(item.link);
  };

  const handleReadAll = async () => {
    try {
      await markInboxAllRead();
      await load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="asset-modal-backdrop" onPointerDown={onClose}>
      <div
        className="inbox-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inbox-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="asset-modal-header">
          <div className="asset-modal-title">
            <Mail size={18} aria-hidden="true" />
            <div>
              <strong id="inbox-title">站内信</strong>
              <span>会员到期与系统通知</span>
            </div>
          </div>
          <div className="inbox-modal-actions">
            <button type="button" className="topbar-shortcuts-button" onClick={() => void handleReadAll()}>
              <CheckCheck size={14} />
              <span>全部已读</span>
            </button>
            <button type="button" className="icon-mini" onClick={onClose} aria-label="关闭">
              <X size={16} />
            </button>
          </div>
        </header>
        <div className="inbox-modal-body">
          {loading ? (
            <p className="inbox-modal-empty">加载中…</p>
          ) : !rows.length ? (
            <p className="inbox-modal-empty">暂无站内信</p>
          ) : (
            rows.map((item) => {
              const unread = !item.read_at;
              return (
                <button
                  key={inboxMessageId(item) || inboxMessageTime(item)}
                  type="button"
                  className={`inbox-modal-item${unread ? ' is-unread' : ''}`}
                  onClick={() => void handleOpen(item)}
                >
                  <div className="inbox-modal-item-meta">
                    <span className="inbox-modal-type">{typeLabel(item.type)}</span>
                    <span className="inbox-modal-time">{formatTime(inboxMessageTime(item))}</span>
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.content}</p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
