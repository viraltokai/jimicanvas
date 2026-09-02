import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeGlobalLoading } from '../lib/global-loading.js';
import '../styles/global-loading.css';

const LOADING_TEXT = 'viralwave';

export default function GlobalLoadingOverlay() {
  const [state, setState] = useState({ visible: false, message: '加载中' });
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => subscribeGlobalLoading(setState), []);

  useEffect(() => {
    if (state.visible) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setActive(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setActive(false);
    const timer = window.setTimeout(() => setMounted(false), 420);
    return () => window.clearTimeout(timer);
  }, [state.visible]);

  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`jimi-global-loading${active ? ' jimi-global-loading--active' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={active}
      aria-label={state.message}
    >
      <div className="jimi-global-loading__vignette" aria-hidden />

      <h1 className="jimi-reveal-loader" data-content={LOADING_TEXT} aria-hidden>
        {LOADING_TEXT}
      </h1>

      <p className="jimi-global-loading__message">{state.message}</p>
    </div>,
    document.body,
  );
}
