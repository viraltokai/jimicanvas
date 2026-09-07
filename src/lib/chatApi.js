import {
  DEFAULT_TEXT_MODEL,
  JIMIAIGO_TOKEN_STORAGE_KEY,
} from './constants';
import { assertJimiaigoSuccess, fetchJimiaigo, getApiUrl, getStoredChatToken } from './jimiaigoApi';

export {
  API_SUCCESS_CODE,
  LOGIN_AGAIN_CODE,
  clearStoredChatToken,
  createApiError,
  getChatApiBaseUrl,
  getStoredChatToken,
} from './jimiaigoApi';

let tokenPromptOpen = false;

export function promptForChatToken(message = '请输入 Jimiaigo 的 Token (AT)', { onSaved } = {}) {
  if (typeof window === 'undefined') return '';
  if (tokenPromptOpen) return '';
  tokenPromptOpen = true;
  try {
    const input = window.prompt(message);
    if (!input) return '';
    const token = String(input).trim();
    if (!token) return '';
    window.localStorage.setItem(JIMIAIGO_TOKEN_STORAGE_KEY, token);
    onSaved?.();
    return token;
  } finally {
    tokenPromptOpen = false;
  }
}

export function getOrRequestToken({ expired = false, onSaved } = {}) {
  const existing = getStoredChatToken();
  if (existing) return existing;
  const message = expired
    ? 'Token 已过期，请重新输入 Jimiaigo 的 Token (AT)'
    : '请输入 Jimiaigo 的 Token (AT)';
  return promptForChatToken(message, { onSaved });
}

export async function runChatCompletion({ token, content, model = DEFAULT_TEXT_MODEL }) {
  const { response, rawText, parsed } = await fetchJimiaigo('/api/chat/completions', {
    token,
    method: 'POST',
    body: {
      model,
      stream: false,
      messages: [{ role: 'user', content }],
    },
    networkErrorMessage: '生成失败，无法连接到服务',
  });

  assertJimiaigoSuccess(response, parsed, { fallback: '生成失败', rawText });

  const generated = parsed?.choices?.[0]?.message?.content;
  if (typeof generated !== 'string' || !generated.trim()) {
    throw new Error('返回内容为空');
  }

  return generated.trim();
}

function extractDeltaContent(parsed) {
  const delta = parsed?.choices?.[0]?.delta;
  if (!delta) return '';
  if (typeof delta.text === 'string' && delta.text) return delta.text;
  const content = delta.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object') return part.text || part.content || '';
      return '';
    })
    .join('');
}

function messageFromBusinessBody(text) {
  const raw = String(text || '').trim();
  if (!raw.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.code === 'number' && parsed.code !== 20000) {
      return parsed.msg || parsed.message || `请求失败（code ${parsed.code}）`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** SSE 流式聊天，与 jimiadmin GlobalChatWidget 同源 */
export async function chatCompletionsStream({
  token,
  messages,
  model = DEFAULT_TEXT_MODEL,
  conversationId,
  title,
  temperature,
  maxTokens,
  onDelta,
  onMessage,
  onError,
  signal,
}) {
  const authToken = token || getStoredChatToken();
  if (!authToken) throw new Error('缺少 token，请先登录');

  const body = {
    model,
    stream: true,
    messages: messages || [],
  };
  if (conversationId) body.conversation_id = conversationId;
  if (title) body.title = title;
  if (typeof temperature === 'number') body.temperature = temperature;
  if (typeof maxTokens === 'number') body.max_tokens = maxTokens;

  const res = await fetch(getApiUrl('/api/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authToken,
    },
    body: JSON.stringify(body),
    signal,
  });

  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    const bizMsg = messageFromBusinessBody(text);
    if (bizMsg) {
      const err = new Error(bizMsg);
      err.status = res.status;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(text || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    throw new Error('聊天接口返回了非流式 JSON，请稍后重试');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const bizMsg = messageFromBusinessBody(text);
    const err = new Error(bizMsg || text || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  if (!res.body) {
    throw new Error('ReadableStream not supported in this environment');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let sawSseData = false;
  let gotDelta = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      if (!sawSseData && buffer.trimStart().startsWith('{') && !buffer.includes('data:')) {
        const bizMsg = messageFromBusinessBody(buffer);
        if (bizMsg) throw new Error(bizMsg);
      }

      let lineBreakIdx = buffer.indexOf('\n');
      while (lineBreakIdx !== -1) {
        const rawLine = buffer.slice(0, lineBreakIdx);
        buffer = buffer.slice(lineBreakIdx + 1);
        const line = rawLine.trim();
        lineBreakIdx = buffer.indexOf('\n');

        if (!line || !line.startsWith('data:')) continue;
        sawSseData = true;
        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          if (!gotDelta) throw new Error('模型没有返回内容，请换个模型或稍后重试');
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        if (typeof parsed.code === 'number' && parsed.code !== 20000 && !parsed.choices) {
          throw new Error(String(parsed.msg || parsed.message || `请求失败（code ${parsed.code}）`));
        }

        onMessage?.(parsed);
        const delta = extractDeltaContent(parsed);
        if (delta && onDelta) {
          gotDelta = true;
          onDelta(delta, parsed);
        }
      }
    }

    if (!sawSseData) {
      const bizMsg = messageFromBusinessBody(buffer);
      if (bizMsg) throw new Error(bizMsg);
      if (buffer.trim()) throw new Error(buffer.trim().slice(0, 200));
      throw new Error('聊天无响应，请稍后重试');
    }
    if (!gotDelta) {
      throw new Error('模型没有返回内容，请换个模型或稍后重试');
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    if (onError && error instanceof Error) onError(error);
    throw error;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}

