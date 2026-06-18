// deno-lint-ignore-file no-explicit-any
/**
 * payment-status
 *
 * Redis-first polling endpoint for the mobile app.
 * Cache hit: ~2 ms (no DB round-trip).
 * Cache miss: single DB query, result NOT written back (webhook owns the key).
 *
 * Auth: standard Supabase JWT (Authorization: Bearer <session token>).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { redisGet, paymentStatusKey } from "../_shared/upstash.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors, status: 204 });

  const url       = new URL(req.url);
  const paymentId = url.searchParams.get("payment_id");
  const orderId   = url.searchParams.get("order_id"); // optional secondary lookup

  if (!paymentId) {
    return json({ error: "payment_id query param is required" }, 400);
  }

  // Auth: require a valid Supabase session token
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase   = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    return json({ error: "Unauthorized" }, 401);
  }

  // ── 1. Redis fast path ────────────────────────────────────────────────────
  const cached = await redisGet(paymentStatusKey(paymentId));
  if (cached) {
    console.log("[payment-status] cache HIT:", paymentId, cached);
    return json({ payment_id: paymentId, status: cached, source: "cache" });
  }

  // ── 2. DB fallback ────────────────────────────────────────────────────────
  console.log("[payment-status] cache MISS, querying DB:", paymentId);

  // Use service role for the DB query so it's not filtered by RLS
  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: payment, error: dbErr } = await serviceSupabase
    .from("payments")
    .select("id, status, order_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (dbErr || !payment) {
    // Try by order_id if provided
    if (orderId) {
      const { data: orderPayment } = await serviceSupabase
        .from("payments")
        .select("id, status, order_id")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (orderPayment) {
        return json({
          payment_id: orderPayment.id,
          status: orderPayment.status,
          source: "db",
        });
      }
    }
    return json({ error: "Payment not found" }, 404);
  }

  return json({ payment_id: payment.id, status: payment.status, source: "db" });
});
