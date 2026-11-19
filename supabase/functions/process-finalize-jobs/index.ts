// deno-lint-ignore-file no-explicit-any
/**
 * process-finalize-jobs
 *
 * Scheduled safety-net (run every ~5 min via QStash cron or pg_cron).
 * Picks up rows from payment_finalize_jobs where status='pending' and
 * attempts < 5, verifies payment is actually completed, then calls
 * finalize-order.
 *
 * Auth: X-Finalize-Secret, or Authorization: Bearer <service role>.
 * Completed payments are handed to finalize-order so the ticket email stays there.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import {
  verifyFinalizeAuth,
  redisSet,
  paymentStatusKey,
  PAYMENT_STATUS_TTL,
} from "../_shared/upstash.ts";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE   = 20;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  if (!(await verifyFinalizeAuth(req))) {
    console.error("[process-finalize-jobs] unauthorized");
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ── 1. Claim a batch of pending jobs ────────────────────────────────
    const { data: jobs, error: fetchErr } = await supabase
      .from("payment_finalize_jobs")
      .select("id, payment_id, provider, attempts")
      .eq("status", "pending")
      .lt("attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) {
      console.error("[process-finalize-jobs] fetch error:", fetchErr);
      return json({ error: fetchErr.message }, 500);
    }

    if (!jobs || jobs.length === 0) {
      console.log("[process-finalize-jobs] no pending jobs");
      return json({ ok: true, processed: 0 });
    }

    console.log(`[process-finalize-jobs] processing ${jobs.length} job(s)`);

    let succeeded = 0;
    let skipped   = 0;
    let failed    = 0;

    for (const job of jobs) {
      // Mark as processing (optimistic lock)
      await supabase
        .from("payment_finalize_jobs")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", job.id)
        .eq("status", "pending"); // guard against concurrent runners

      // ── FIX 3: Check payment is actually completed before finalizing ──
      const { data: payment, error: pmtErr } = await supabase
        .from("payments")
        .select("id, status, order_id")
        .eq("id", job.payment_id)
        .maybeSingle();

      if (pmtErr || !payment) {
        console.warn(`[process-finalize-jobs] payment not found: ${job.payment_id}`);
        await markJob(supabase, job.id, "failed", "Payment record not found", job.attempts);
        failed++;
        continue;
      }

      // Only finalize payments that are actually completed
      if (payment.status !== "completed") {
        console.log(`[process-finalize-jobs] payment ${job.payment_id} not completed yet (status: ${payment.status}) — skipping`);
        // Reset to pending so it gets retried later
        await supabase
          .from("payment_finalize_jobs")
          .update({
            status: "pending",
            attempts: job.attempts + 1,
            last_attempted_at: new Date().toISOString(),
            last_error: `Payment status is '${payment.status}', not 'completed'`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        skipped++;
        continue;
      }

      // finalize-order creates tickets, sends the ticket email, and accepts
      // either X-Finalize-Secret or the service-role bearer.
      const finalized = await callFinalizeOrder(job.payment_id, job.provider);
      if (!finalized.ok) {
        console.error(`[process-finalize-jobs] finalize-order ${finalized.status} for ${job.payment_id}`);
        const newAttempts = job.attempts + 1;
        const newStatus   = newAttempts >= MAX_ATTEMPTS ? "failed" : "pending";
        await markJob(supabase, job.id, newStatus, finalized.error || `HTTP ${finalized.status}`, newAttempts);
        failed++;
      } else {
        console.log(`[process-finalize-jobs] finalized: ${job.payment_id}`);
        await markJob(supabase, job.id, "done", null, job.attempts + 1);
        await redisSet(paymentStatusKey(job.payment_id), "finalized", PAYMENT_STATUS_TTL);
        succeeded++;
      }
    }

    console.log(`[process-finalize-jobs] done — succeeded:${succeeded} skipped:${skipped} failed:${failed}`);
    return json({ ok: true, processed: jobs.length, succeeded, skipped, failed });

  } catch (err: any) {
    console.error("[process-finalize-jobs] uncaught:", err);
    return json({ error: err?.message ?? "Internal error" }, 500);
  }
});

async function callFinalizeOrder(paymentId: string, provider: string): Promise<{ ok: boolean; status: number; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const secret = Deno.env.get("FINALIZE_ORDER_SECRET") || "";
  const res = await fetch(`${supabaseUrl}/functions/v1/finalize-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(serviceKey ? { Authorization: `Bearer ${serviceKey}` } : {}),
      ...(secret ? { "X-Finalize-Secret": secret } : {}),
    },
    body: JSON.stringify({ payment_id: paymentId, provider }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, error: text.slice(0, 180) };
  }
  return { ok: true, status: res.status };
}

async function markJob(
  supabase: any,
  jobId: string,
  status: "done" | "failed" | "pending",
  error: string | null,
  attempts: number
) {
  await supabase
    .from("payment_finalize_jobs")
    .update({
      status,
      attempts,
      last_attempted_at: new Date().toISOString(),
      last_error: error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
