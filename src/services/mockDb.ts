import type { DbShape } from '../types/db';
import { buildSeed, SCHEMA_VERSION } from '../data/seed';

/** The only localStorage keys the demo database owns. Reset never touches anything else. */
export const STORAGE_KEY = 'wifaq-demo-db-v2';
const LEGACY_KEYS = ['wifaq-demo-db-v1'];

let db: DbShape | null = null;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** In-browser demo database. Persisted to localStorage so demo edits survive reloads. */
export function getDb(): DbShape {
  if (!db) {
    const ls = storage();
    try {
      LEGACY_KEYS.forEach((k) => ls?.removeItem(k));
      const raw = ls?.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as DbShape : null;
      db = parsed && parsed.schemaVersion === SCHEMA_VERSION ? parsed : buildSeed();
      if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) persistDb();
    } catch {
      db = buildSeed();
    }
  }
  return db;
}

export function persistDb() {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(getDb()));
  } catch {

    // storage full or unavailable — demo continues in memory
  }}

/** Restores the original demo dataset. Only the demo database key is rewritten. */
export function resetDb() {
  db = buildSeed();
  persistDb();
}

/** Test helper: drop the in-memory copy so the next getDb() re-reads storage / seed. */
export function _unloadDb() {
  db = null;
}
