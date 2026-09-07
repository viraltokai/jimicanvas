import { uid } from './canvas';
import {
  deleteCustomWorkflowCloud,
  fetchCustomWorkflows,
  saveCustomWorkflowCloud,
} from './canvasApi';
import { CUSTOM_WORKFLOWS_STORAGE_KEY } from './constants';
import { getStoredChatToken } from './jimiaigoApi';

const TRANSIENT_NODE_KEYS = [
  'imageTaskId',
  'videoTaskId',
  'pendingTasks',
  'generationJob',
  'generationBatch',
];

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeTemplateNode(source) {
  const node = cloneJson(source);
  delete node.groupId;
  delete node.groupBackground;
  TRANSIENT_NODE_KEYS.forEach((key) => {
    delete node[key];
  });
  if (node.status === 'running') {
    node.status = 'idle';
  }
  return node;
}

function summarizeNodes(nodes = []) {
  const counts = { note: 0, image: 0, video: 0, audio: 0 };
  nodes.forEach((node) => {
    if (counts[node.type] != null) counts[node.type] += 1;
  });
  const parts = [];
  if (counts.note) parts.push(`${counts.note} 文本`);
  if (counts.image) parts.push(`${counts.image} 图片`);
  if (counts.video) parts.push(`${counts.video} 视频`);
  if (counts.audio) parts.push(`${counts.audio} 音频`);
  return parts.length ? parts.join(' · ') : `${nodes.length} 个节点`;
}

function pickWorkflowIcon(nodes = []) {
  const hasVideo = nodes.some((node) => node.type === 'video');
  const hasImage = nodes.some((node) => node.type === 'image');
  const hasAudio = nodes.some((node) => node.type === 'audio');
  if (hasVideo && hasImage) return 'layers';
  if (hasVideo) return 'video';
  if (hasImage) return 'image';
  if (hasAudio) return 'note';
  return 'layers';
}

export function normalizeCustomWorkflow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const nodes = Array.isArray(raw.nodes) ? raw.nodes.filter((node) => node && node.id && node.type) : [];
  if (!id || !name || nodes.length < 2) return null;

  const nodeIds = new Set(nodes.map((node) => node.id));
  const connections = Array.isArray(raw.connections)
    ? raw.connections.filter(
        (link) =>
          link &&
          nodeIds.has(link.fromNodeId) &&
          nodeIds.has(link.toNodeId) &&
          link.fromNodeId !== link.toNodeId
      )
    : [];

  return {
    id,
    name,
    description:
      typeof raw.description === 'string' && raw.description.trim()
        ? raw.description.trim()
        : summarizeNodes(nodes),
    icon: typeof raw.icon === 'string' && raw.icon.trim() ? raw.icon.trim() : pickWorkflowIcon(nodes),
    groupBackground:
      typeof raw.groupBackground === 'string' ? String(raw.groupBackground).trim() : '',
    nodes,
    connections,
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}

export function readCustomWorkflows() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_WORKFLOWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCustomWorkflow).filter(Boolean);
  } catch {
    return [];
  }
}

export function writeCustomWorkflows(workflows) {
  if (typeof window === 'undefined') return [];
  const list = (Array.isArray(workflows) ? workflows : [])
    .map(normalizeCustomWorkflow)
    .filter(Boolean)
    .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
  window.localStorage.setItem(CUSTOM_WORKFLOWS_STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function getCustomWorkflow(workflowId) {
  const id = String(workflowId || '').trim();
  if (!id) return null;
  return readCustomWorkflows().find((item) => item.id === id) || null;
}

export function upsertCustomWorkflow(workflow) {
  const normalized = normalizeCustomWorkflow(workflow);
  if (!normalized) return null;
  const list = readCustomWorkflows();
  const index = list.findIndex((item) => item.id === normalized.id);
  const next =
    index >= 0
      ? list.map((item, i) =>
          i === index
            ? { ...normalized, createdAt: item.createdAt, updatedAt: Date.now() }
            : item
        )
      : [{ ...normalized, updatedAt: Date.now() }, ...list];
  writeCustomWorkflows(next);
  return next.find((item) => item.id === normalized.id) || normalized;
}

export function deleteCustomWorkflow(workflowId) {
  const id = String(workflowId || '').trim();
  if (!id) return readCustomWorkflows();
  const next = readCustomWorkflows().filter((item) => item.id !== id);
  return writeCustomWorkflows(next);
}

export function mergeCustomWorkflowLists(localList = [], cloudList = []) {
  const map = new Map();
  [...cloudList, ...localList].forEach((item) => {
    const normalized = normalizeCustomWorkflow(item);
    if (!normalized) return;
    const prev = map.get(normalized.id);
    if (!prev || (Number(normalized.updatedAt) || 0) >= (Number(prev.updatedAt) || 0)) {
      map.set(normalized.id, normalized);
    }
  });
  return [...map.values()].sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
}

/**
 * 拉取云端工作流，与本地合并，并把仅本地的条目补传到云端。
 */
export async function syncCustomWorkflowsWithCloud(token) {
  const authToken = token || getStoredChatToken();
  if (!authToken) {
    return readCustomWorkflows();
  }

  const cloudRaw = await fetchCustomWorkflows(authToken);
  const cloudList = (Array.isArray(cloudRaw) ? cloudRaw : [])
    .map(normalizeCustomWorkflow)
    .filter(Boolean);
  const localList = readCustomWorkflows();
  const merged = mergeCustomWorkflowLists(localList, cloudList);
  writeCustomWorkflows(merged);

  const cloudIds = new Set(cloudList.map((item) => item.id));
  const cloudById = new Map(cloudList.map((item) => [item.id, item]));

  for (const workflow of merged) {
    const remote = cloudById.get(workflow.id);
    const needsUpload =
      !cloudIds.has(workflow.id) ||
      (Number(workflow.updatedAt) || 0) > (Number(remote?.updatedAt) || 0);
    if (!needsUpload) continue;
    try {
      await saveCustomWorkflowCloud(authToken, workflow);
    } catch (error) {
      console.warn('upload custom workflow failed', workflow.id, error);
    }
  }

  return readCustomWorkflows();
}

export async function persistCustomWorkflow(workflow, token) {
  const saved = upsertCustomWorkflow(workflow);
  if (!saved) return null;

  const authToken = token || getStoredChatToken();
  if (!authToken) {
    throw new Error('请先登录后再保存到云端');
  }

  try {
    const cloudList = await saveCustomWorkflowCloud(authToken, saved);
    const normalizedCloud = (Array.isArray(cloudList) ? cloudList : [])
      .map(normalizeCustomWorkflow)
      .filter(Boolean);
    if (normalizedCloud.length > 0) {
      writeCustomWorkflows(mergeCustomWorkflowLists(readCustomWorkflows(), normalizedCloud));
    }
  } catch (error) {
    console.warn('persist custom workflow to cloud failed', error);
    throw error;
  }

  return getCustomWorkflow(saved.id) || saved;
}

export async function removeCustomWorkflow(workflowId, token) {
  const next = deleteCustomWorkflow(workflowId);
  const authToken = token || getStoredChatToken();
  if (!authToken) {
    throw new Error('请先登录后再删除云端工作流');
  }

  try {
    const cloudList = await deleteCustomWorkflowCloud(authToken, workflowId);
    const normalizedCloud = (Array.isArray(cloudList) ? cloudList : [])
      .map(normalizeCustomWorkflow)
      .filter(Boolean);
    writeCustomWorkflows(normalizedCloud);
    return normalizedCloud;
  } catch (error) {
    console.warn('delete custom workflow from cloud failed', error);
    throw error;
  }
}

/**
 * 从当前画布选中/组内节点提取可复用工作流片段（相对坐标）。
 */
export function extractCustomWorkflowFromSelection({
  nodes = [],
  connections = [],
  selectedIds = [],
  name,
  description,
} = {}) {
  const idSet = new Set(selectedIds);
  const members = nodes.filter((node) => idSet.has(node.id));
  if (members.length < 2) {
    throw new Error('至少需要 2 个节点才能保存为工作流');
  }

  let minX = Infinity;
  let minY = Infinity;
  members.forEach((node) => {
    minX = Math.min(minX, Number(node.x) || 0);
    minY = Math.min(minY, Number(node.y) || 0);
  });

  const templateNodes = members.map((node) => {
    const cloned = sanitizeTemplateNode(node);
    cloned.x = (Number(node.x) || 0) - minX;
    cloned.y = (Number(node.y) || 0) - minY;
    return cloned;
  });

  const templateConnections = connections
    .filter((link) => idSet.has(link.fromNodeId) && idSet.has(link.toNodeId))
    .map((link) => ({
      id: link.id || uid('link'),
      fromNodeId: link.fromNodeId,
      toNodeId: link.toNodeId,
    }));

  const groupBackground =
    members.find((node) => String(node.groupBackground || '').trim())?.groupBackground || '';

  const now = Date.now();
  const workflowName =
    typeof name === 'string' && name.trim()
      ? name.trim()
      : `自定义工作流 · ${templateNodes.length} 节点`;

  return normalizeCustomWorkflow({
    id: uid('workflow'),
    name: workflowName,
    description:
      typeof description === 'string' && description.trim()
        ? description.trim()
        : summarizeNodes(templateNodes),
    icon: pickWorkflowIcon(templateNodes),
    groupBackground: String(groupBackground || '').trim(),
    nodes: templateNodes,
    connections: templateConnections,
    createdAt: now,
    updatedAt: now,
  });
}

export async function saveCustomWorkflowFromSelection(params, token) {
  const workflow = extractCustomWorkflowFromSelection(params);
  if (!workflow) return null;
  return persistCustomWorkflow(workflow, token);
}

/**
 * 实例化自定义工作流到画布坐标，返回新节点 / 连线（已打成新组）。
 */
export function buildCustomWorkflowFragment(workflowOrId, originX = 80, originY = 160) {
  const workflow =
    typeof workflowOrId === 'string' ? getCustomWorkflow(workflowOrId) : normalizeCustomWorkflow(workflowOrId);
  if (!workflow?.nodes?.length) {
    return { nodes: [], connections: [] };
  }

  const idMap = new Map();
  const groupId = uid('group');
  const groupBackground = String(workflow.groupBackground || '').trim();

  const nodes = workflow.nodes.map((source) => {
    const cloned = sanitizeTemplateNode(source);
    const nextId = uid('node');
    idMap.set(source.id, nextId);
    cloned.id = nextId;
    cloned.x = (Number(source.x) || 0) + originX;
    cloned.y = (Number(source.y) || 0) + originY;
    cloned.groupId = groupId;
    if (groupBackground) {
      cloned.groupBackground = groupBackground;
    } else {
      delete cloned.groupBackground;
    }
    return cloned;
  });

  const connections = (workflow.connections || [])
    .map((link) => {
      const fromNodeId = idMap.get(link.fromNodeId);
      const toNodeId = idMap.get(link.toNodeId);
      if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return null;
      return {
        id: uid('link'),
        fromNodeId,
        toNodeId,
      };
    })
    .filter(Boolean);

  return { nodes, connections };
}
