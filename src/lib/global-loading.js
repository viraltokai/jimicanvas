import { useEffect } from 'react';

let pendingCount = 0;
let message = '加载中';
const listeners = new Set();

function getState() {
  return { visible: pendingCount > 0, message };
}

function emit() {
  const state = getState();
  listeners.forEach((listener) => listener(state));
}

export function subscribeGlobalLoading(listener) {
  listeners.add(listener);
  listener(getState());
  return () => {
    listeners.delete(listener);
  };
}

export function showGlobalLoading(nextMessage) {
  pendingCount += 1;
  if (nextMessage) {
    message = nextMessage;
  } else if (pendingCount === 1) {
    message = '加载中';
  }
  emit();
}

export function hideGlobalLoading() {
  pendingCount = Math.max(0, pendingCount - 1);
  if (pendingCount === 0) {
    message = '加载中';
  }
  emit();
}

export function resetGlobalLoading() {
  pendingCount = 0;
  message = '加载中';
  emit();
}

/** 页面级 loading：挂载期间展示全局动效 */
export function usePageLoading(loading, nextMessage) {
  useEffect(() => {
    if (!loading) return undefined;
    showGlobalLoading(nextMessage);
    return () => hideGlobalLoading();
  }, [loading, nextMessage]);
}

export async function withGlobalLoading(promise, nextMessage) {
  showGlobalLoading(nextMessage);
  try {
    return await promise;
  } finally {
    hideGlobalLoading();
  }
}
