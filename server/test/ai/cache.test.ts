import { describe, expect, it } from 'vitest';
import { cacheKey, createLruCache } from '../../src/ai/cache.js';

describe('createLruCache', () => {
  it('expires entries after the TTL', () => {
    let clock = 0;
    const cache = createLruCache<string>({ maxEntries: 5, ttlMs: 100, now: () => clock });
    cache.set('a', 'A');
    clock = 99;
    expect(cache.get('a')).toBe('A');
    clock = 200;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the least recently used entry when full', () => {
    const cache = createLruCache<number>({ maxEntries: 2, ttlMs: 1_000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });
});

describe('cacheKey', () => {
  it('is stable and separates parts unambiguously', () => {
    expect(cacheKey('a', 'b')).toBe(cacheKey('a', 'b'));
    expect(cacheKey('ab', 'c')).not.toBe(cacheKey('a', 'bc'));
    expect(cacheKey('x')).toMatch(/^[0-9a-f]{64}$/);
  });
});
