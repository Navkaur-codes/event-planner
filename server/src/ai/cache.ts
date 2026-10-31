/**
 * Small in-memory LRU cache with a time-to-live, so identical requests don't
 * spend Groq quota twice. Map insertion order doubles as recency order.
 */
import { createHash } from 'node:crypto';

export interface LruCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  readonly size: number;
}

interface CacheOptions {
  maxEntries: number;
  ttlMs: number;
  /** Injectable clock (ms) for deterministic tests. */
  now?: () => number;
}

/** Creates an LRU cache; the least recently used entry is evicted when full. */
export function createLruCache<V>({
  maxEntries,
  ttlMs,
  now = Date.now,
}: CacheOptions): LruCache<V> {
  const entries = new Map<string, { value: V; expiresAt: number }>();
  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      entries.delete(key);
      if (entry.expiresAt <= now()) return undefined;
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
      if (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
    },
    get size() {
      return entries.size;
    },
  };
}

/** Stable sha256 key for any list of strings (e.g. model + prompts). */
export function cacheKey(...parts: readonly string[]): string {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(part).update('\u0000');
  return hash.digest('hex');
}
