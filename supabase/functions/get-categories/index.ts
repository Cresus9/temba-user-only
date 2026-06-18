/**
 * get-categories Edge Function
 *
 * Redis-first categories endpoint. Categories almost never change so
 * the TTL is 30 minutes — in practice Redis will serve every request
 * after the first one in that window.
 *
 * Includes the upcoming event count per category from the
 * category_event_counts materialized view when available,
 * falling back to the plain categories table.
 *
 * Cache is invalidated automatically by invalidate-events-cache
 * whenever an admin publishes, edits, or deletes an event.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // ── 1. Try Redis cache ──────────────────────────────────────────────────
    const cached = await redisGet<unknown[]>(CACHE_KEYS.CATEGORIES_ALL);

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...cors, "X-Cache": "HIT" },
      });
    }

    // ── 2. Cache MISS — query Supabase ─────────────────────────────────────
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Try materialized view first (has event counts pre-computed)
    const { data: viewData, error: viewError } = await supabase
      .from("category_event_counts")
      .select("category_id, category_name, icon, color, upcoming_event_count, next_event_date")
      .order("category_name");

    let categories: unknown[];

    if (!viewError && viewData && viewData.length > 0) {
      // Merge counts into a shape compatible with EventCategory
      categories = viewData.map((row) => ({
        id:           row.category_id,
        name:         row.category_name,
        icon:         row.icon,
        color:        row.color,
        event_count:  row.upcoming_event_count ?? 0,
        next_event_date: row.next_event_date ?? null,
      }));
    } else {
      // Fallback: plain categories table (no counts)
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      categories = data ?? [];
    }

    // ── 3. Store in Redis with 30-min TTL ───────────────────────────────────
    await redisSet(CACHE_KEYS.CATEGORIES_ALL, categories, CACHE_TTL.CATEGORIES);

    return new Response(JSON.stringify(categories), {
      headers: { ...cors, "X-Cache": "MISS" },
    });

  } catch (err: any) {
    console.error("[get-categories] error:", err);

    // Fallback: direct query, never fail silently
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return new Response(JSON.stringify(data ?? []), {
        headers: { ...cors, "X-Cache": "FALLBACK" },
      });
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to fetch categories" }),
        { status: 500, headers: cors }
      );
    }
  }
});
