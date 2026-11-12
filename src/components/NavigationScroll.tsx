'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** Explicit navigation intents only; browser history keeps Next's position restoration. */
export default function NavigationScroll() {
  const pathname = usePathname();
  const pending = useRef<URL | null>(null);
  const frame = useRef(0);
  const restore = useRef<number | null>(null);
  const userScrolling = useRef(false);
  const go = (url: URL) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const id = decodeURIComponent(url.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (target instanceof HTMLDetailsElement) target.open = true;
      if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
      else if (!id) window.scrollTo({ top: 0, behavior: 'instant' });
      history.replaceState({ ...history.state, jndScrollY: window.scrollY }, '', location.href);
    });
  };
  useEffect(() => {
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const resize = () => document.documentElement.style.setProperty('--nav-offset', `${(document.querySelector('.site-header')?.getBoundingClientRect().height ?? 80) + 16}px`);
    resize();
    if (location.hash) go(new URL(location.href));
    const observer = new ResizeObserver(resize);
    observer.observe(document.body);
    const click = (event: MouseEvent) => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element)?.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href);
      if (url.origin !== location.origin) return;
      userScrolling.current = false;
      restore.current = null;
      history.replaceState({ ...history.state, jndScrollY: window.scrollY }, '', location.href);
      pending.current = url;
      cancelAnimationFrame(frame.current);
      if (url.pathname === location.pathname && url.search === location.search) {
        event.preventDefault();
        if (url.href !== location.href) history.pushState(null, '', url);
        pending.current = null;
        go(url);
      }
    };
    const pop = (event: PopStateEvent) => {
      userScrolling.current = false;
      pending.current = null;
      restore.current = typeof event.state?.jndScrollY === 'number' ? event.state.jndScrollY : null;
      cancelAnimationFrame(frame.current);
      if (restore.current !== null) frame.current = requestAnimationFrame(() => { frame.current = requestAnimationFrame(() => window.scrollTo({ top: restore.current ?? 0, behavior: 'instant' })); });
    };
    const record = () => {
      if (userScrolling.current && !pending.current && restore.current === null) history.replaceState({ ...history.state, jndScrollY: window.scrollY }, '', location.href);
    };
    const userScroll = () => { restore.current = null; userScrolling.current = true; };
    window.addEventListener('scroll', record, { passive: true });
    window.addEventListener('wheel', userScroll, { passive: true });
    window.addEventListener('touchstart', userScroll, { passive: true });
    window.addEventListener('keydown', userScroll);
    document.addEventListener('click', click, true);
    window.addEventListener('popstate', pop);
    return () => { history.scrollRestoration = previousRestoration; observer.disconnect(); window.removeEventListener('scroll', record); window.removeEventListener('wheel', userScroll); window.removeEventListener('touchstart', userScroll); window.removeEventListener('keydown', userScroll); document.removeEventListener('click', click, true); window.removeEventListener('popstate', pop); cancelAnimationFrame(frame.current); };
  }, []);
  useLayoutEffect(() => {
    if (restore.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => { frame.current = requestAnimationFrame(() => window.scrollTo({ top: restore.current ?? 0, behavior: 'instant' })); });
      return;
    }
    const url = pending.current;
    if (url?.pathname === pathname) { pending.current = null; go(url); }
  }, [pathname]);
  return null;
}
