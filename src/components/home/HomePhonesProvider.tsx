'use client';
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { HOME_PHONES, sessionHomePhones } from '@/lib/home-phones';
const fallback: string[] = [...HOME_PHONES];
const HomePhones = createContext<string[]>(fallback);
let cachedOrder: string[] | null = null;
const subscribe = () => () => {};
const serverSnapshot = () => fallback;
const sessionSnapshot = () => {
  if (!cachedOrder) {
    try { cachedOrder = sessionHomePhones(window.sessionStorage); }
    catch { cachedOrder = fallback; }
  }
  return cachedOrder;
};
export default function HomePhonesProvider({ children }: { children: ReactNode }) {
  const phones = useSyncExternalStore(subscribe, sessionSnapshot, serverSnapshot);
  return <HomePhones.Provider value={phones}>{children}</HomePhones.Provider>;
}
export const useHomePhones = () => useContext(HomePhones);
