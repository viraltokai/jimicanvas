import { useEffect, useState } from 'react';
import { resolveLogoUrl } from '../lib/siteBrand';

export function SiteLogo({ url, alt = '', className = '', fallback = null }) {
  const hasRequestedLogo = Boolean(String(url || '').trim());
  const [src, setSrc] = useState('');
  const fallbackSrc = resolveLogoUrl('');

  useEffect(() => {
    let cancelled = false;
    const candidates = hasRequestedLogo
      ? [...new Set([resolveLogoUrl(url), fallbackSrc].filter(Boolean))]
      : [];

    const loadCandidate = (index) => {
      const candidate = candidates[index];
      if (!candidate) {
        if (!cancelled) setSrc('');
        return;
      }

      const image = new Image();
      image.onload = () => {
        if (!cancelled) setSrc(candidate);
      };
      image.onerror = () => loadCandidate(index + 1);
      image.src = candidate;
    };

    setSrc('');
    loadCandidate(0);
    return () => {
      cancelled = true;
    };
  }, [fallbackSrc, hasRequestedLogo, url]);

  if (!src && fallback) return fallback;
  if (!src) return null;

  return (
    <img
      src={src || fallbackSrc}
      alt={alt}
      className={className}
      onError={() => setSrc('')}
    />
  );
}
