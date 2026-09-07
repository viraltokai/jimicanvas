/** @typedef {{ id: string, x: number, y: number, width?: number, height?: number, groupId?: string }} ArrangeNode */

export function getNodeWidth(node) {
  return Math.max(1, Number(node?.width) || 0);
}

export function getNodeHeight(node) {
  return Math.max(1, Number(node?.height) || 0);
}

export function getNodesBounds(nodes = []) {
  if (!nodes.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const right = node.x + getNodeWidth(node);
    const bottom = node.y + getNodeHeight(node);
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * @param {ArrangeNode[]} nodes
 * @param {string} mode
 * @param {{ gap?: number, columns?: number }} [options]
 * @returns {Record<string, { x: number, y: number }>}
 */
export function computeNodeArrangement(nodes = [], mode, options = {}) {
  const gap = Math.max(0, Number(options.gap) || 24);
  const list = [...nodes];
  if (list.length === 0) return {};

  const bounds = getNodesBounds(list);
  const patches = {};

  const setPatch = (node, x, y) => {
    patches[node.id] = { x, y };
  };

  if (mode === 'align-left') {
    list.forEach((node) => setPatch(node, bounds.minX, node.y));
    return patches;
  }

  if (mode === 'align-center-x') {
    const centerX = bounds.minX + bounds.width / 2;
    list.forEach((node) => setPatch(node, centerX - getNodeWidth(node) / 2, node.y));
    return patches;
  }

  if (mode === 'align-right') {
    list.forEach((node) => setPatch(node, bounds.maxX - getNodeWidth(node), node.y));
    return patches;
  }

  if (mode === 'align-top') {
    list.forEach((node) => setPatch(node, node.x, bounds.minY));
    return patches;
  }

  if (mode === 'align-center-y') {
    const centerY = bounds.minY + bounds.height / 2;
    list.forEach((node) => setPatch(node, node.x, centerY - getNodeHeight(node) / 2));
    return patches;
  }

  if (mode === 'align-bottom') {
    list.forEach((node) => setPatch(node, node.x, bounds.maxY - getNodeHeight(node)));
    return patches;
  }

  if (mode === 'distribute-x' && list.length >= 3) {
    const ordered = [...list].sort((a, b) => a.x - b.x);
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const firstCenter = first.x + getNodeWidth(first) / 2;
    const lastCenter = last.x + getNodeWidth(last) / 2;
    const step = (lastCenter - firstCenter) / (ordered.length - 1);
    ordered.forEach((node, index) => {
      if (index === 0 || index === ordered.length - 1) {
        setPatch(node, node.x, node.y);
        return;
      }
      const center = firstCenter + step * index;
      setPatch(node, center - getNodeWidth(node) / 2, node.y);
    });
    return patches;
  }

  if (mode === 'distribute-y' && list.length >= 3) {
    const ordered = [...list].sort((a, b) => a.y - b.y);
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const firstCenter = first.y + getNodeHeight(first) / 2;
    const lastCenter = last.y + getNodeHeight(last) / 2;
    const step = (lastCenter - firstCenter) / (ordered.length - 1);
    ordered.forEach((node, index) => {
      if (index === 0 || index === ordered.length - 1) {
        setPatch(node, node.x, node.y);
        return;
      }
      const center = firstCenter + step * index;
      setPatch(node, node.x, center - getNodeHeight(node) / 2);
    });
    return patches;
  }

  if (mode === 'layout-row') {
    const ordered = [...list].sort((a, b) => a.x - b.x || a.y - b.y);
    let cursorX = bounds.minX;
    const top = Math.min(...ordered.map((node) => node.y));
    ordered.forEach((node) => {
      setPatch(node, cursorX, top);
      cursorX += getNodeWidth(node) + gap;
    });
    return patches;
  }

  if (mode === 'layout-column') {
    const ordered = [...list].sort((a, b) => a.y - b.y || a.x - b.x);
    let cursorY = bounds.minY;
    const left = Math.min(...ordered.map((node) => node.x));
    ordered.forEach((node) => {
      setPatch(node, left, cursorY);
      cursorY += getNodeHeight(node) + gap;
    });
    return patches;
  }

  if (mode === 'layout-grid') {
    const ordered = [...list].sort((a, b) => a.y - b.y || a.x - b.x);
    const columns = Math.max(
      1,
      Number(options.columns) || Math.ceil(Math.sqrt(ordered.length))
    );
    const cellWidth = Math.max(...ordered.map((node) => getNodeWidth(node)));
    const cellHeight = Math.max(...ordered.map((node) => getNodeHeight(node)));
    ordered.forEach((node, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      setPatch(
        node,
        bounds.minX + col * (cellWidth + gap),
        bounds.minY + row * (cellHeight + gap)
      );
    });
    return patches;
  }

  return patches;
}

export function collectGroupMemberIds(nodes = [], nodeIds = []) {
  const idSet = new Set(nodeIds);
  const groupIds = new Set();

  nodes.forEach((node) => {
    if (idSet.has(node.id) && node.groupId) {
      groupIds.add(node.groupId);
    }
  });

  if (groupIds.size === 0) return [...idSet];

  nodes.forEach((node) => {
    if (node.groupId && groupIds.has(node.groupId)) {
      idSet.add(node.id);
    }
  });

  return [...idSet];
}

export function selectionHasGroupedNodes(nodes = [], nodeIds = []) {
  const idSet = new Set(nodeIds);
  return nodes.some((node) => idSet.has(node.id) && Boolean(node.groupId));
}

/**
 * 生成画布上全部打组包围框；selectedIds 用于标记当前聚焦组。
 * 顶部额外留白，避免遮住节点浮动标题栏。
 * @returns {Array<{ groupId: string, minX: number, minY: number, width: number, height: number, count: number, active: boolean }>}
 */
export function getAllGroupFrames(nodes = [], selectedIds = [], padding = null) {
  const selectedSet = new Set(selectedIds);
  const groupMap = new Map();
  const pad =
    typeof padding === 'number'
      ? { top: padding, right: padding, bottom: padding, left: padding }
      : {
          top: 56,
          right: 18,
          bottom: 18,
          left: 18,
          ...(padding && typeof padding === 'object' ? padding : null),
        };

  nodes.forEach((node) => {
    if (!node?.groupId) return;
    if (!groupMap.has(node.groupId)) groupMap.set(node.groupId, []);
    groupMap.get(node.groupId).push(node);
  });

  const frames = [];
  groupMap.forEach((members, groupId) => {
    if (members.length < 2) return;
    const bounds = getNodesBounds(members);
    const active = members.some((node) => selectedSet.has(node.id));
    const background =
      members.find((node) => String(node.groupBackground || '').trim())?.groupBackground || '';
    frames.push({
      groupId,
      minX: bounds.minX - pad.left,
      minY: bounds.minY - pad.top,
      width: bounds.width + pad.left + pad.right,
      height: bounds.height + pad.top + pad.bottom,
      count: members.length,
      active,
      background: String(background || '').trim(),
    });
  });

  return frames;
}

/** @deprecated 使用 getAllGroupFrames */
export function getSelectedGroupFrames(nodes = [], selectedIds = [], padding = 10) {
  return getAllGroupFrames(nodes, selectedIds, padding).filter((frame) => frame.active);
}
