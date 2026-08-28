import { useEffect, useState } from 'react';
import { resolveLogoUrl } from '../lib/siteBrand';

export function SiteLogo({ url, alt = '', className = '', fallback = null }) {
  const [src, setSrc] = useState(() => resolveLogoUrl(url));
  const fallbackSrc = resolveLogoUrl('');

  useEffect(() => {
    setSrc(resolveLogoUrl(url));
  }, [url]);

  if (!src && fallback) return fallback;

  return (
    <img
      src={src || fallbackSrc}
      alt={alt}
      className={className}
      onError={() => {
        setSrc((current) => (current !== fallbackSrc ? fallbackSrc : current));
      }}
    />
  );
}
