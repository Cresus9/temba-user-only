/**
 * invalidateEventsCache
 *
 * Tells the Upstash Redis cache (via the invalidate-events-cache Edge Function)
 * that event data has changed so the next request fetches fresh data.
 *
 * Also clears the browser-level in-memory queryCache so the current tab
 * immediately picks up the new data on next render.
 *
 * Safe to call even if Upstash is not configured — the Edge Function returns
 * a no-op 200 in that case.
 */

import { queryCache } from './queryCache';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const INVALIDATE_URL = `${SUPABASE_URL}/functions/v1/invalidate-events-cache`;

export async function invalidateEventsCache(): Promise<void> {
  // 1. Clear browser in-memory cache immediately (affects current tab)
  queryCache.invalidate('events:all');

  // 2. Bust Redis cache server-side (affects all users)
  if (!SUPABASE_URL) return;

  try {
    const res = await fetch(INVALIDATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
    });

    if (!res.ok) {
      console.warn('[invalidateEventsCache] Edge Function returned', res.status);
    } else {
      const data = await res.json();
      console.debug('[invalidateEventsCache] invalidated keys:', data.invalidated);
    }
  } catch (err) {
    // Non-fatal — the TTL will expire the cache naturally
    console.warn('[invalidateEventsCache] failed (cache will expire via TTL):', err);
  }
}
