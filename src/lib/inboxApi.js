import { requestJimiaigo } from './jimiaigoApi';

export function getInboxList({ page = 1, pageSize = 20 } = {}) {
  return requestJimiaigo('/api/user/inbox/list', {
    method: 'GET',
    query: { page, page_size: pageSize },
    requireToken: true,
    fallback: '获取站内信失败',
  });
}

export function getInboxUnreadCount() {
  return requestJimiaigo('/api/user/inbox/unread-count', {
    method: 'GET',
    requireToken: true,
    fallback: '获取未读数失败',
  });
}

export function markInboxRead(id) {
  return requestJimiaigo(`/api/user/inbox/${id}/read`, {
    method: 'POST',
    requireToken: true,
    fallback: '标记已读失败',
  });
}

export function markInboxAllRead() {
  return requestJimiaigo('/api/user/inbox/read-all', {
    method: 'POST',
    requireToken: true,
    fallback: '全部已读失败',
  });
}

export function inboxMessageId(item) {
  return Number(item?.ID || item?.id || 0);
}

export function inboxMessageTime(item) {
  return item?.CreatedAt || item?.created_at || '';
}
