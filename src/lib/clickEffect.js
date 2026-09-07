const MAX_ACTIVE = 24;

let container = null;

function shouldSkip(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-no-click-effect], input, textarea, [contenteditable="true"]'));
}

function spawnEffect(x, y) {
  if (!container) return;

  while (container.childElementCount >= MAX_ACTIVE) {
    container.firstElementChild?.remove();
  }

  const flash = document.createElement('span');
  flash.className = 'jimi-click-flash';
  flash.style.left = `${x}px`;
  flash.style.top = `${y}px`;

  const ripple = document.createElement('span');
  ripple.className = 'jimi-click-ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  const rippleOuter = document.createElement('span');
  rippleOuter.className = 'jimi-click-ripple jimi-click-ripple-outer';
  rippleOuter.style.left = `${x}px`;
  rippleOuter.style.top = `${y}px`;

  container.append(flash, ripple, rippleOuter);

  const particleCount = 6;
  for (let i = 0; i < particleCount; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'jimi-click-particle';
    const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const distance = 16 + Math.random() * 12;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty('--jimi-particle-x', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--jimi-particle-y', `${Math.sin(angle) * distance}px`);
    container.appendChild(particle);
    particle.addEventListener('animationend', () => particle.remove(), { once: true });
  }

  const cleanup = (el) => {
    el.addEventListener('animationend', () => el.remove(), { once: true });
    window.setTimeout(() => el.remove(), 1200);
  };
  cleanup(flash);
  cleanup(ripple);
  cleanup(rippleOuter);
}

function onPointerDown(event) {
  if (event.button !== 0 || shouldSkip(event.target)) return;
  spawnEffect(event.clientX, event.clientY);
}

function onTouchStart(event) {
  if (shouldSkip(event.target)) return;
  const touch = event.touches[0];
  if (!touch) return;
  spawnEffect(touch.clientX, touch.clientY);
}

export function initClickEffect() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (container) return;

  container = document.createElement('div');
  container.id = 'jimi-click-effects';
  container.setAttribute('aria-hidden', 'true');
  document.body.appendChild(container);

  document.addEventListener('mousedown', onPointerDown, { passive: true });
  document.addEventListener('touchstart', onTouchStart, { passive: true });
}
