/**
 * queryCache.ts
 *
 * Lightweight, zero-dependency in-memory cache with TTL.
 * Drop-in replacement for "fetch every time" patterns.
 *
 * Usage:
 *   const data = await queryCache.get('events', 5 * 60_000, () => fetchFromSupabase());
 *   queryCache.invalidate('events');
 *   queryCache.invalidatePrefix('events'); // clears 'events', 'events:fr', 'events:BF', …
 */

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  ttl: number;
}

class QueryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /** Returns cached data if fresh, otherwise calls `fetcher` and caches the result. */
  async get<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (entry && Date.now() - entry.fetchedAt < entry.ttl) {
      return entry.data;
    }

    const data = await fetcher();
    this.store.set(key, { data, fetchedAt: Date.now(), ttl: ttlMs });
    return data;
  }

  /** Returns the cached value without fetching (null if missing or stale). */
  peek<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry || Date.now() - entry.fetchedAt >= entry.ttl) return null;
    return entry.data;
  }

  /** Force the next `get()` call to re-fetch by expiring a specific key. */
  invalidate(key: string) {
    this.store.delete(key);
  }

  /** Invalidate all keys that start with `prefix`. */
  invalidatePrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  /** Set (or overwrite) a cache entry with fresh data — useful after mutations. */
  set<T>(key: string, data: T, ttlMs: number) {
    this.store.set(key, { data, fetchedAt: Date.now(), ttl: ttlMs });
  }

  /** Remove all cached data. */
  clear() {
    this.store.clear();
  }

  /** How many entries are currently cached. */
  get size() {
    return this.store.size;
  }
}

// Singleton shared across the entire app
export const queryCache = new QueryCache();

// Common TTL constants (ms)
export const TTL = {
  EVENTS: 5 * 60_000,        // 5 min  — published events list
  EVENT_DETAIL: 3 * 60_000,  // 3 min  — single event page
  CATEGORIES: 30 * 60_000,   // 30 min — categories rarely change
  BANNERS: 10 * 60_000,      // 10 min
  TRANSLATIONS: 24 * 60 * 60_000, // 24 h  — locale strings never change mid-session
  LOCATIONS: 10 * 60_000,    // 10 min — distinct event cities
  VENUES: 10 * 60_000,       // 10 min
  BLOG_LIST: 5 * 60_000,     // 5 min
  SHORT: 60_000,             // 1 min  — frequently changing data
} as const;
