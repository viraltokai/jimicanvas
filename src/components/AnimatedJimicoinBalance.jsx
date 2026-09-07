import { useEffect, useRef, useState } from 'react';
import { formatJimicoinNumber } from '../lib/userApi';
import JimicoinIcon from './JimicoinIcon';

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/**
 * 吉米币余额展示：小鸡币图标 + 数字滚动刷新动效
 */
export function AnimatedJimicoinBalance({
  value = 0,
  loading = false,
  size = 14,
  decimals = 4,
  duration = 720,
  className = '',
}) {
  const target = Math.max(Number(value) || 0, 0);
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const frameRef = useRef(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (loading) return undefined;

    const from = hasAnimatedRef.current ? displayRef.current : 0;
    const to = target;
    hasAnimatedRef.current = true;

    if (Math.abs(to - from) < 0.00005) {
      setDisplay(to);
      return undefined;
    }

    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (to - from) * easeOutCubic(progress);
      setDisplay(next);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, loading, duration]);

  return (
    <span className={`jimicoin-balance${className ? ` ${className}` : ''}`}>
      <JimicoinIcon size={size} className="jimicoin-balance-icon" />
      <span className="jimicoin-balance-value" aria-live="polite">
        {loading ? '…' : formatJimicoinNumber(display, decimals)}
      </span>
      <span className="jimicoin-balance-unit">吉米币</span>
    </span>
  );
}
