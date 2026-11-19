// notification-worker: drains public.notification_queue (push + email) with idempotency,
// per-user preferences, quiet hours and daily caps. Invoked every minute by pg_cron
// (job "notification-worker-every-minute") with the x-worker-secret header.
// Mode lives in public.notification_settings: worker_mode (off | test_only | live), dry_run, cutover_at.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { ctaButton, EMAIL_FROM, escapeHtml, TICKET_EMAIL_LOGO, tembaEmailLayout } from "../_shared/email.ts";
import { backoff, decide, Job, Prefs, realEmail } from "./policy.ts";

const SITE = "https://tembas.com";

type Row = Job & {
  queue_id: string; notification_id: string; user_id: string;
  title: string | null; message: string | null; action_url: string | null; priority: string | null;
};

function absUrl(path?: string | null) {
  if (!path) return SITE;
  return path.startsWith("http") ? path : SITE + (path.startsWith("/") ? path : "/" + path);
}

function timingSafeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function sendPush(row: Row): Promise<{ ok: boolean; id?: string; skip?: string; error?: string; retryable?: boolean }> {
  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const key = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!appId || !key) return { ok: false, error: "onesignal_not_configured", retryable: false };
  const payload = JSON.stringify({
    app_id: appId,
    target_channel: "push",
    include_aliases: { external_id: [row.user_id] },
    headings: { fr: row.title ?? "Temba", en: row.title ?? "Temba" },
    contents: { fr: row.message ?? "", en: row.message ?? "" },
    url: absUrl(row.action_url),
    idempotency_key: row.queue_id, // provider-side dedupe (30 days)
    data: { notification_id: row.notification_id, kind: row.metadata?.kind ?? null },
  });
  // Current keys (os_v2_…) use "Key"; legacy REST keys use "Basic". Try the likely one first.
  const schemes = key.startsWith("os_v2_") ? ["Key", "Basic"] : ["Basic", "Key"];
  let res!: Response;
  for (const [i, scheme] of schemes.entries()) {
    res = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `${scheme} ${key}` },
      body: payload,
    });
    if ((res.status !== 401 && res.status !== 403) || i === schemes.length - 1) break;
    await res.body?.cancel();
  }
  const body = await res.json().catch(() => ({} as Record<string, unknown>));
  if (res.ok && body?.id) return { ok: true, id: String(body.id) };
  const errText = JSON.stringify(body?.errors ?? body).slice(0, 300);
  if (res.ok || /not subscribed|invalid_aliases|invalid_external_user_ids/i.test(errText)) {
    return { ok: false, skip: "no_push_subscription" };
  }
  const keyShape = res.status === 401 || res.status === 403 ? ` [key_kind=${key.startsWith("os_v2_") ? "v2" : "legacy"} len=${key.length}]` : "";
  return { ok: false, error: `onesignal_${res.status}:${errText}${keyShape}`, retryable: res.status >= 500 || res.status === 429 };
}

function emailHtml(row: Row) {
  const title = escapeHtml(row.title ?? "Temba");
  const message = escapeHtml(row.message ?? "");
  const cta = (row.metadata?.cta_label as string) || "Voir mes billets";
  return tembaEmailLayout({
    preheader: row.message ?? undefined,
    bodyHtml: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background:#3D3FE2;border-radius:14px;padding:18px 20px;text-align:left;">
          <img src="${TICKET_EMAIL_LOGO}" height="26" alt="Temba" style="display:block;height:26px;width:auto;border:0;">
        </td></tr></table>
      <h1 style="margin:24px 0 10px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;letter-spacing:-0.02em;font-weight:700;color:#14172A;">${title}</h1>
      <p style="margin:0 0 24px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A4F63;">${message}</p>
      ${ctaButton(absUrl(row.action_url), cta)}
      <p style="margin:20px 0 0;font-family:Inter,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.55;color:#6B7288;">
        Vous pouvez gérer vos notifications depuis votre profil Temba.
      </p>`,
  });
}

async function sendEmail(row: Row): Promise<{ ok: boolean; id?: string; skip?: string; error?: string; retryable?: boolean }> {
  const to = realEmail(row.email);
  if (!to) return { ok: false, skip: "no_real_email" };
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, error: "resend_not_configured", retryable: false };
  const subject = (row.metadata?.email_subject as string) || row.title || "Temba";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "Idempotency-Key": row.queue_id },
    body: JSON.stringify({
      from: EMAIL_FROM, to: [to], subject, html: emailHtml(row),
      text: `${row.title ?? ""}\n\n${row.message ?? ""}\n\n${absUrl(row.action_url)}`,
      tags: [{ name: "kind", value: String(row.metadata?.kind ?? "notification").replace(/[^a-zA-Z0-9_-]/g, "_") }],
    }),
  });
  const body = await res.json().catch(() => ({} as Record<string, unknown>));
  if (res.ok && body?.id) return { ok: true, id: String(body.id) };
  return { ok: false, error: `resend_${res.status}:${JSON.stringify(body).slice(0, 300)}`, retryable: res.status >= 500 || res.status === 429 };
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("NOTIF_WORKER_SECRET") ?? "";
  if (!timingSafeEqual(req.headers.get("x-worker-secret") ?? "", secret)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: settings } = await supabase.from("notification_settings").select("key,value");
  const cfg = Object.fromEntries((settings ?? []).map((s: { key: string; value: unknown }) => [s.key, s.value]));
  const mode = String(cfg.worker_mode ?? "off");
  const dryRun = cfg.dry_run !== false;
  const pushEnabled = cfg.push_enabled === true; // off until the OneSignal App API key is valid
  const emailEnabled = cfg.email_enabled !== false;
  if (mode === "off") return Response.json({ mode, processed: 0 });

  const { data: rows, error } = await supabase.rpc("notif_claim_batch", { p_limit: Number(cfg.batch_size ?? 50) });
  if (error) {
    console.error("claim failed", error.message);
    return Response.json({ error: "claim_failed" }, { status: 500 });
  }

  const now = new Date();
  const sentThisRun = new Map<string, number>(); // user:channel -> count (cap accuracy inside one batch)
  const summary: Record<string, number> = {};
  const bump = (k: string) => (summary[k] = (summary[k] ?? 0) + 1);

  for (const raw of (rows ?? []) as Row[]) {
    const row = { ...raw, metadata: raw.metadata ?? {}, prefs: raw.prefs as Prefs };
    const ck = `${row.user_id}:${row.delivery_method}`;
    const extra = sentThisRun.get(ck) ?? 0;
    const channelOff = (row.delivery_method === "push" && !pushEnabled) || (row.delivery_method === "email" && !emailEnabled);
    const d: ReturnType<typeof decide> = channelOff
      ? { action: "complete", status: "cancelled", reason: `${row.delivery_method}_channel_disabled` }
      : decide({ ...row, push_sent_24h: row.push_sent_24h + (row.delivery_method === "push" ? extra : 0),
      email_sent_24h: row.email_sent_24h + (row.delivery_method === "email" ? extra : 0) }, now);
    try {
      if (d.action === "complete") {
        await supabase.rpc("notif_complete", { p_queue_id: row.queue_id, p_status: d.status, p_error: d.status === "sent" ? null : d.reason, p_meta: { decision: d.reason } });
        bump(`${row.delivery_method}:${d.reason}`);
        continue;
      }
      if (d.action === "defer") {
        await supabase.rpc("notif_complete", { p_queue_id: row.queue_id, p_status: "defer", p_error: d.reason, p_next_at: d.until.toISOString() });
        bump(`${row.delivery_method}:deferred_${d.reason}`);
        continue;
      }
      if (dryRun) {
        await supabase.rpc("notif_complete", { p_queue_id: row.queue_id, p_status: "cancelled", p_error: "dry_run", p_meta: { dry_run: true, would_send: row.delivery_method } });
        bump(`${row.delivery_method}:dry_run`);
        continue;
      }
      const r = row.delivery_method === "push" ? await sendPush(row) : await sendEmail(row);
      if (r.ok) {
        await supabase.rpc("notif_complete", { p_queue_id: row.queue_id, p_status: "sent", p_provider_id: r.id ?? null });
        sentThisRun.set(ck, extra + 1);
        bump(`${row.delivery_method}:sent`);
      } else if (r.skip) {
        await supabase.rpc("notif_complete", { p_queue_id: row.queue_id, p_status: "cancelled", p_error: r.skip });
        bump(`${row.delivery_method}:${r.skip}`);
      } else if (r.retryable && row.retry_count + 1 < row.max_retries) {
        await supabase.rpc("notif_complete", { p_queue_id: row.queue_id, p_status: "retry", p_error: r.error, p_next_at: backoff(now, row.retry_count).toISOString() });
        bump(`${row.delivery_method}:retry`);
      } else {
        await supabase.rpc("notif_complete", { p_queue_id: row.queue_id, p_status: "failed", p_error: r.error });
        bump(`${row.delivery_method}:failed`);
      }
    } catch (e) {
      // Leave the row locked; it becomes claimable again after 10 minutes. Provider idempotency keys
      // (queue id) stop a second real send if the first one actually went out.
      console.error("delivery error", row.queue_id, (e as Error).message);
      bump("error");
    }
  }
  return Response.json({ mode, dry_run: dryRun, push_enabled: pushEnabled, processed: rows?.length ?? 0, summary });
});
