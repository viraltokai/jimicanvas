import { getApiUrl, getStoredChatToken, requestJimiaigo } from './jimiaigoApi';
import { normalizeDocuments } from './storage';

async function requestCanvas(path, { token, method = 'GET', body } = {}) {
  const authToken = token || getStoredChatToken();
  if (!authToken) {
    throw new Error('未登录，无法同步画布');
  }

  return requestJimiaigo(path, {
    token: authToken,
    method,
    body,
    fallback: '画布同步失败',
    networkErrorMessage: '请求失败，无法连接到画布服务',
    enrichError(err, parsed) {
      if (parsed?.data) {
        err.latest = parsed.data;
        err.isConflict = /其他端|刷新/.test(String(parsed?.msg || ''));
      }
    },
  });
}

export function parseCloudDocuments(documentsField) {
  if (!documentsField) return null;
  if (Array.isArray(documentsField)) {
    return normalizeDocuments(documentsField);
  }
  if (typeof documentsField === 'string') {
    try {
      return normalizeDocuments(JSON.parse(documentsField));
    } catch {
      return null;
    }
  }
  return null;
}

/** @param {import('react').MutableRefObject<Record<string, number>>} versionsRef */
export function applyCanvasVersions(versionsRef, payload) {
  if (!versionsRef?.current || !payload) return;
  if (payload.canvas_versions && typeof payload.canvas_versions === 'object') {
    versionsRef.current = { ...versionsRef.current, ...payload.canvas_versions };
  }
}

/** 全部画布（组装列表，兼容旧逻辑） */
export async function fetchCanvasDocuments(token) {
  return requestCanvas('/api/canvas/documents', { token, method: 'GET' });
}

/** 画布元数据列表（不含节点详情） */
export async function fetchCanvasList(token) {
  return requestCanvas('/api/canvas/documents/list', { token, method: 'GET' });
}

/** 单个画布完整数据 */
export async function fetchCanvasDocument(token, canvasId) {
  return requestCanvas(`/api/canvas/documents/${encodeURIComponent(canvasId)}`, {
    token,
    method: 'GET',
  });
}

/** 保存单个画布 */
export async function saveCanvasDocument(
  token,
  canvasId,
  { document, version = 0, activeCanvasId }
) {
  return requestCanvas(`/api/canvas/documents/${encodeURIComponent(canvasId)}`, {
    token,
    method: 'PUT',
    body: {
      document,
      version: Number(version) || 0,
      ...(activeCanvasId ? { active_canvas_id: activeCanvasId } : {}),
    },
  });
}

/** 批量保存（首页重命名/复制/删除） */
export async function saveCanvasDocuments(token, { documents, activeCanvasId, version = 0 }) {
  return requestCanvas('/api/canvas/documents', {
    token,
    method: 'PUT',
    body: {
      documents,
      active_canvas_id: activeCanvasId || '',
      version: Number(version) || 0,
    },
  });
}

export async function deleteCanvasDocument(token, canvasId) {
  return requestCanvas(`/api/canvas/documents/${encodeURIComponent(canvasId)}`, {
    token,
    method: 'DELETE',
  });
}

/** 页面关闭时用 keepalive 尽力上传当前画布 */
export function saveCanvasDocumentKeepalive(
  token,
  canvasId,
  { document, version = 0, activeCanvasId }
) {
  const authToken = token || getStoredChatToken();
  if (!authToken || !canvasId || typeof fetch === 'undefined') return;

  try {
    fetch(getApiUrl(`/api/canvas/documents/${encodeURIComponent(canvasId)}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
      },
      body: JSON.stringify({
        document,
        version: Number(version) || 0,
        ...(activeCanvasId ? { active_canvas_id: activeCanvasId } : {}),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/** @deprecated 使用 saveCanvasDocumentKeepalive */
export function saveCanvasDocumentsKeepalive(token, payload) {
  const docs = payload?.documents;
  const activeId = payload?.activeCanvasId || payload?.active_canvas_id;
  if (!Array.isArray(docs) || !activeId) return;
  const activeDoc = docs.find((doc) => doc?.id === activeId) || docs[0];
  if (!activeDoc) return;
  saveCanvasDocumentKeepalive(token, activeDoc.id, {
    document: activeDoc,
    version: payload?.canvasVersions?.[activeDoc.id] ?? payload?.version ?? 0,
    activeCanvasId: activeId,
  });
}

function parseWorkflowList(payload) {
  const raw = payload?.workflows;
  if (!Array.isArray(raw)) return [];
  return raw;
}

/** 获取当前用户自定义工作流列表 */
export async function fetchCustomWorkflows(token) {
  const data = await requestCanvas('/api/canvas/workflows', { token, method: 'GET' });
  return parseWorkflowList(data);
}

/** 保存单个自定义工作流到云端 */
export async function saveCustomWorkflowCloud(token, workflow) {
  if (!workflow?.id) {
    throw new Error('工作流 ID 无效');
  }
  const data = await requestCanvas(`/api/canvas/workflows/${encodeURIComponent(workflow.id)}`, {
    token,
    method: 'PUT',
    body: { workflow },
  });
  return parseWorkflowList(data);
}

/** 删除云端自定义工作流 */
export async function deleteCustomWorkflowCloud(token, workflowId) {
  const data = await requestCanvas(`/api/canvas/workflows/${encodeURIComponent(workflowId)}`, {
    token,
    method: 'DELETE',
  });
  return parseWorkflowList(data);
}

function parseSystemWorkflowList(payload) {
  return {
    list: Array.isArray(payload?.list) ? payload.list : [],
    total: Number(payload?.total) || 0,
    page: Number(payload?.page) || 1,
    pageSize: Number(payload?.page_size) || Number(payload?.pageSize) || 20,
  };
}

/** 系统工作流列表（已上架） */
export async function fetchSystemWorkflows(token, { keyword = '', page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (keyword) params.set('keyword', keyword);
  const data = await requestCanvas(`/api/canvas/system-workflows?${params.toString()}`, {
    token,
    method: 'GET',
  });
  return parseSystemWorkflowList(data);
}

/** 系统工作流详情 */
export async function fetchSystemWorkflow(token, workflowId) {
  const data = await requestCanvas(`/api/canvas/system-workflows/${encodeURIComponent(workflowId)}`, {
    token,
    method: 'GET',
  });
  return data?.workflow || null;
}

/** 记录一次「应用到画布」，失败不影响主流程 */
export async function reportSystemWorkflowApplied(token, workflowId) {
  if (!workflowId) return;
  try {
    await requestCanvas(
      `/api/canvas/system-workflows/${encodeURIComponent(workflowId)}/apply`,
      { token, method: 'POST' }
    );
  } catch (error) {
    console.warn('report system workflow apply failed', error);
  }
}

/** 管理员保存系统工作流 */
export async function saveSystemWorkflowCloud(token, workflow, { sortOrder = 0, status = 1 } = {}) {
  if (!workflow?.id) {
    throw new Error('工作流 ID 无效');
  }
  const data = await requestCanvas(`/api/canvas/system-workflows/${encodeURIComponent(workflow.id)}`, {
    token,
    method: 'PUT',
    body: {
      workflow,
      sort_order: Number(sortOrder) || 0,
      status: Number(status) === 0 ? 0 : 1,
    },
  });
  return data?.workflow || workflow;
}

/** 管理员删除系统工作流 */
export async function deleteSystemWorkflowCloud(token, workflowId) {
  return requestCanvas(`/api/canvas/system-workflows/${encodeURIComponent(workflowId)}`, {
    token,
    method: 'DELETE',
  });
}
