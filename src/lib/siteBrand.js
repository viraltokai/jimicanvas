import { getJimiaiAppBaseUrl } from './appNavigation';

export const DEFAULT_LOGO_URL = '/logo.png';

const LEGACY_DOMAIN_REWRITES = [
  ['cdn.viraltok.ai', 'cdn.viralwave.ai'],
  ['console.viraltok.ai', 'console.viralwave.ai'],
  ['canvas.viraltok.ai', 'canvas.viralwave.ai'],
  ['www.viraltok.ai', 'www.viralwave.ai'],
  ['viraltok.ai', 'viralwave.ai'],
];

export function rewriteLegacyDomain(url) {
  let value = String(url || '').trim();
  if (!value) return '';

  for (const [from, to] of LEGACY_DOMAIN_REWRITES) {
    value = value.replaceAll(from, to);
  }

  return value;
}

/** Console/admin host serves /logo.png; canvas host does not. */
export function getConsoleAppBaseUrl() {
  const explicit = import.meta.env.VITE_CONSOLE_URL || import.meta.env.VITE_ADMIN_URL;
  if (explicit) return String(explicit).replace(/\/$/, '');

  const webApp = getJimiaiAppBaseUrl();
  if (webApp) {
    if (webApp.includes('://www.')) return webApp.replace('://www.', '://console.');
    if (/^https?:\/\/viralwave\.ai/i.test(webApp)) {
      return webApp.replace(/^https?:\/\/viralwave\.ai/i, (match) => `${match.split('://')[0]}://console.viralwave.ai`);
    }
    return webApp;
  }

  if (typeof window !== 'undefined') {
    const { origin } = window.location;
    if (origin.includes('://canvas.')) return origin.replace('://canvas.', '://console.');
  }

  return '';
}

export function resolveLogoUrl(url) {
  const rewritten = rewriteLegacyDomain(url);
  if (!rewritten) {
    const base = getConsoleAppBaseUrl();
    return base ? `${base}${DEFAULT_LOGO_URL}` : DEFAULT_LOGO_URL;
  }

  if (
    rewritten.startsWith('http://') ||
    rewritten.startsWith('https://') ||
    rewritten.startsWith('data:') ||
    rewritten.startsWith('blob:')
  ) {
    return rewritten;
  }

  if (rewritten.startsWith('//')) {
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    return `${protocol}${rewritten}`;
  }

  const base = getConsoleAppBaseUrl();
  if (base) {
    return rewritten.startsWith('/') ? `${base}${rewritten}` : `${base}/${rewritten}`;
  }

  return rewritten;
}
