/**
 * get-events Edge Function
 *
 * Redis-first events endpoint.  Flow:
 *   1. Check Upstash Redis for "events:published"
 *   2. Cache HIT  → return immediately (< 5 ms, no DB query)
 *   3. Cache MISS → query Supabase, store in Redis with 5-min TTL, return
 *   4. Upstash not configured → fall through to Supabase (same as before)
 *
 * Query params:
 *   ?featured=true  → return only featured upcoming events
 *   ?country=BF     → filter events by country_code after fetching
 *
 * Called by EventContext in the frontend instead of direct Supabase queries.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { redisGet, redisSet, CACHE_KEYS, CACHE_TTL } from "../_shared/upstash.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

function json(data: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    headers: { ...cors, ...extra },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const url    = new URL(req.url);
  const featured = url.searchParams.get("featured") === "true";
  const country  = url.searchParams.get("country") ?? "";

  const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // ── 1. Try Redis cache ──────────────────────────────────────────────────
    const cacheKey = featured
      ? CACHE_KEYS.EVENTS_FEATURED
      : CACHE_KEYS.EVENTS_PUBLISHED;

    const cached = await redisGet<unknown[]>(cacheKey);

    if (cached) {
      // Cache HIT — apply any client-side filters and return immediately
      const today = new Date().toISOString().split("T")[0];
      let result = cached;

      if (featured) {
        result = result.filter(
          (e: any) => e.featured === true && e.date >= today
        );
      }
      if (country) {
        // Sort: selected country first, rest after — never hide any
        result = [
          ...result.filter((e: any) => (e.country_code ?? "BF") === country),
          ...result.filter((e: any) => (e.country_code ?? "BF") !== country),
        ];
      }

      return json(result, { "X-Cache": "HIT", "X-Cache-Key": cacheKey });
    }

    // ── 2. Cache MISS — query Supabase ─────────────────────────────────────
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: events, error } = await supabase
      .from("events")
      .select(`*, ticket_types (id, name, description, price, quantity, available, sales_enabled)`)
      .eq("status", "PUBLISHED")
      .order("date", { ascending: true });

    if (error) throw error;

    const eventsData = events ?? [];

    // ── 3. Store in Redis (full list — not filtered) ────────────────────────
    await redisSet(cacheKey, eventsData, CACHE_TTL.EVENTS);

    // ── 4. Apply request-level filters and return ───────────────────────────
    const today = new Date().toISOString().split("T")[0];
    let result = eventsData as any[];

    if (featured) {
      result = result.filter(
        (e) => e.featured === true && e.date >= today
      );
    }
    if (country) {
      result = [
        ...result.filter((e) => (e.country_code ?? "BF") === country),
        ...result.filter((e) => (e.country_code ?? "BF") !== country),
      ];
    }

    return json(result, { "X-Cache": "MISS", "X-Cache-Key": cacheKey });

  } catch (err: any) {
    console.error("[get-events] error:", err);

    // Never return an empty 500 — fall back to direct Supabase query
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data, error } = await supabase
        .from("events")
        .select(`*, ticket_types (id, name, description, price, quantity, available, sales_enabled)`)
        .eq("status", "PUBLISHED")
        .order("date", { ascending: true });

      if (error) throw error;
      return json(data ?? [], { "X-Cache": "FALLBACK" });
    } catch (fallbackErr: any) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch events" }),
        { status: 500, headers: cors }
      );
    }
  }
});
