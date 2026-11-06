export const HOME_PHONES = ['1661-3088', '1661-5863', '1661-6878'] as const;
export const HOME_PHONE_KEY = 'jnd.home-phone-order.v4';
export function validHomeOrder(value: unknown): value is string[] {
  return Array.isArray(value) && value.length === HOME_PHONES.length && new Set(value).size === HOME_PHONES.length && HOME_PHONES.every(n => value.includes(n));
}
export function shuffleHomePhones(random: () => number = Math.random): string[] {
  const order: string[] = [...HOME_PHONES];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
export function sessionHomePhones(storage: Pick<Storage, 'getItem' | 'setItem'>): string[] {
  try {
    const raw = storage.getItem(HOME_PHONE_KEY);
    let saved: unknown;
    try { saved = raw ? JSON.parse(raw) : null; } catch { saved = null; }
    if (validHomeOrder(saved)) return saved;
    const order = shuffleHomePhones();
    storage.setItem(HOME_PHONE_KEY, JSON.stringify(order));
    return order;
  } catch { return [...HOME_PHONES]; }
}
