import { useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../lib/jimiaigoApi';

export const idleTurnstile = {
  ready: false,
  required: false,
  token: '',
  error: false,
};

export function turnstileBlocks(state) {
  if (!state?.ready || state?.error) return true;
  return Boolean(state?.required && !state?.token);
}

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const finish = () => resolve();
    const fail = () => {
      scriptPromise = null;
      reject(new Error('turnstile script failed'));
    };
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', fail, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = finish;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

async function loadSiteKey() {
  const envKey = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
  try {
    const response = await fetch(getApiUrl('/api/turnstile'));
    const data = await response.json();
    const siteKey = String(data?.data?.site_key || '').trim();
    if (data?.code === 20000 && data?.data?.enabled && siteKey) return siteKey;
  } catch {
    /* 配置接口不可用时回退到构建期站点密钥 */
  }
  return envKey;
}

function widgetTheme() {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'light' ? 'light' : 'dark';
}

export default function TurnstileField({ action, resetSignal = 0, onChange }) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const containerRef = useRef(null);
  const widgetIdRef = useRef('');
  const [siteKey, setSiteKey] = useState('');
  const [error, setError] = useState(false);

  const publish = (next) => {
    onChangeRef.current(next);
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const envKey = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
      setSiteKey((current) => current || envKey);
      if (!envKey) publish({ ready: true, required: false, token: '', error: false });
    }, 4000);
    loadSiteKey().then((key) => {
      if (cancelled) return;
      window.clearTimeout(timer);
      setSiteKey(key);
      if (!key) publish({ ready: true, required: false, token: '', error: false });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;
    let widgetId = '';
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: widgetTheme(),
          appearance: 'always',
          callback: (token) => {
            setError(false);
            publish({ ready: true, required: true, token, error: false });
          },
          'expired-callback': () => {
            publish({ ready: true, required: true, token: '', error: false });
          },
          'error-callback': () => {
            setError(true);
            publish({ ready: true, required: true, token: '', error: true });
          },
        });
        widgetIdRef.current = widgetId;
        publish({ ready: true, required: true, token: '', error: false });
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        publish({ ready: true, required: true, token: '', error: true });
      });
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      widgetIdRef.current = '';
    };
  }, [siteKey, action]);

  useEffect(() => {
    if (!resetSignal || !siteKey) return;
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    publish({ ready: true, required: true, token: '', error: false });
  }, [resetSignal, siteKey]);

  if (!siteKey) return null;

  return (
    <div className="auth-turnstile">
      <p className="auth-field-label">安全验证</p>
      <div ref={containerRef} className="auth-turnstile-widget" />
      {error ? <p className="auth-turnstile-error">安全验证加载失败，请刷新页面</p> : null}
    </div>
  );
}
