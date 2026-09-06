import gsap from 'gsap';
import { useEffect, useRef } from 'react';

export function useHomeEntranceAnimation() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return undefined;

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      timeline
        .from('.canvas-home-hero-brand', { opacity: 0, y: 10, duration: 0.4 })
        .from('.canvas-home-hero h1', { opacity: 0, y: 22, duration: 0.65 }, '-=0.22')
        .from('.canvas-home-hero-subtitle', { opacity: 0, y: 16, duration: 0.5 }, '-=0.38')
        .from('.canvas-home-hero-actions', { opacity: 0, y: 14, duration: 0.45 }, '-=0.3')
        .from('.canvas-home-hero-visual', { opacity: 0, x: 28, duration: 0.7 }, '-=0.55')
        .from(
          '.canvas-home-capability-item',
          { opacity: 0, y: 12, duration: 0.4, stagger: 0.06 },
          '-=0.35'
        );
    }, root);

    return () => ctx.revert();
  }, []);

  return rootRef;
}
