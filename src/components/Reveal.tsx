'use client';
import { useEffect } from 'react';
/** 스크롤 등장 (v4 reveal(): main 직계 section/div/article, 800ms, 28px) */
export default function Reveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      e.target.animate([{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'none' }], { duration: 800, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll('main > section, main > div, main > article').forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.9) return; io.observe(el); });
    return () => io.disconnect();
  }, []);
  return null;
}
