/**
 * invalidate-events-cache Edge Function
 *
 * Busts the Upstash Redis cache for events and related data.
 * Call this after any admin action that changes event visibility:
 *   - Publish / unpublish an event
 *   - Update event date, title, image, featured flag
 *   - Delete an event
 *
 * Auth: requires the Supabase service-role key OR a shared
 *       CACHE_INVALIDATION_SECRET in the Authorization header.
 *
 * Body (optional):
 *   { keys: ["events:published", "events:featured"] }
 *   Omit keys to invalidate ALL event-related cache entries.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { redisDel, upstashEnabled, CACHE_KEYS } from "../_shared/upstash.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// All keys that should be busted when event data changes
const ALL_EVENT_KEYS = [
  CACHE_KEYS.EVENTS_PUBLISHED,
  CACHE_KEYS.EVENTS_FEATURED,
  CACHE_KEYS.CATEGORIES_ALL,  // category counts change when events change
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // ── Auth check ─────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const secret     = Deno.env.get("CACHE_INVALIDATION_SECRET") ?? "";

  const isServiceRole = serviceKey && authHeader === `Bearer ${serviceKey}`;
  const isSecret      = secret && authHeader === `Bearer ${secret}`;

  if (!isServiceRole && !isSecret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: cors }
    );
  }

  // ── Parse optional key list ────────────────────────────────────────────────
  let keysToInvalidate = ALL_EVENT_KEYS;

  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body?.keys) && body.keys.length > 0) {
      keysToInvalidate = body.keys;
    }
  } catch { /* malformed body — use defaults */ }

  // ── If Upstash not configured, return early (no-op, not an error) ──────────
  if (!upstashEnabled()) {
    return new Response(
      JSON.stringify({
        invalidated: [],
        message: "Upstash not configured — cache invalidation skipped",
      }),
      { headers: cors }
    );
  }

  // ── Delete keys ────────────────────────────────────────────────────────────
  const deleted = await redisDel(...keysToInvalidate);

  console.log(`[invalidate-events-cache] deleted ${deleted} key(s):`, keysToInvalidate);

  return new Response(
    JSON.stringify({
      invalidated: keysToInvalidate,
      deleted,
      timestamp: new Date().toISOString(),
    }),
    { headers: cors }
  );
});
