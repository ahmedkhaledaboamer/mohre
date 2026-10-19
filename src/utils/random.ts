/** Deterministic PRNG so the seed dataset is identical on every load. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = a + 0x6d2b79f5 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p
  };
}

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Idempotency key for a single user intent (one open form). Sent with create requests so a
 * double click, retry or re-submit after reload returns the existing record instead of a duplicate.
 */
export const requestKey = () =>
typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : uid('req');