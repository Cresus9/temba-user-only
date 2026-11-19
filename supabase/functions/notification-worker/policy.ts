// Pure delivery policy for the notification worker (no I/O, unit-tested in policy_test.ts).

export type Prefs = {
  email: boolean; push: boolean; in_app: boolean; sms: boolean;
  event_reminders: boolean; order_updates: boolean;
  quiet_hours_start: number; quiet_hours_end: number; timezone: string;
  max_push_per_day: number; max_email_per_day: number;
};

export type Job = {
  delivery_method: string;
  metadata: Record<string, unknown>;
  email: string | null;
  prefs: Prefs;
  push_sent_24h: number;
  email_sent_24h: number;
  retry_count: number;
  max_retries: number;
};

export type Decision =
  | { action: "send" }
  | { action: "complete"; status: "sent" | "cancelled"; reason: string }
  | { action: "defer"; until: Date; reason: string };

// User-triggered messages (they just paid) skip quiet hours and caps.
export const TRANSACTIONAL_KINDS = new Set(["order_confirmed"]);

export function realEmail(email?: string | null): string | undefined {
  const t = (email || "").trim().toLowerCase();
  if (!t || t.endsWith("@temba.temp") || !t.includes("@")) return undefined;
  return t;
}

/** Local wall-clock hour/minute in an IANA zone. */
export function localTime(now: Date, tz: string): { h: number; m: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return { h, m };
  } catch {
    return { h: now.getUTCHours(), m: now.getUTCMinutes() };
  }
}

export function inQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** Next moment the local clock reads `end`:00 (minutes until then, added to now). */
export function quietHoursEnd(now: Date, tz: string, end: number): Date {
  const { h, m } = localTime(now, tz);
  let minutes = (end - h) * 60 - m;
  if (minutes <= 0) minutes += 24 * 60;
  return new Date(now.getTime() + minutes * 60_000);
}

export function decide(job: Job, now: Date): Decision {
  const kind = String(job.metadata?.kind ?? "");
  const transactional = TRANSACTIONAL_KINDS.has(kind);
  const p = job.prefs;
  const expiresAt = job.metadata?.expires_at ? new Date(String(job.metadata.expires_at)) : null;

  if (job.delivery_method === "in_app") return { action: "complete", status: "sent", reason: "in_app_is_inbox_row" };
  if (job.delivery_method === "sms") return { action: "complete", status: "cancelled", reason: "sms_not_in_phase1" };
  if (job.delivery_method !== "push" && job.delivery_method !== "email") {
    return { action: "complete", status: "cancelled", reason: "unknown_channel" };
  }
  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    return { action: "complete", status: "cancelled", reason: "expired" };
  }
  if (job.delivery_method === "push" && !p.push) return { action: "complete", status: "cancelled", reason: "pref_push_off" };
  if (job.delivery_method === "email") {
    if (!p.email) return { action: "complete", status: "cancelled", reason: "pref_email_off" };
    if (!realEmail(job.email)) return { action: "complete", status: "cancelled", reason: "no_real_email" };
  }
  if (!transactional) {
    const cap = job.delivery_method === "push" ? p.max_push_per_day : p.max_email_per_day;
    const sent = job.delivery_method === "push" ? job.push_sent_24h : job.email_sent_24h;
    if (sent >= cap) return { action: "complete", status: "cancelled", reason: "daily_cap_reached" };
    const { h } = localTime(now, p.timezone);
    if (inQuietHours(h, p.quiet_hours_start, p.quiet_hours_end)) {
      const until = quietHoursEnd(now, p.timezone, p.quiet_hours_end);
      if (expiresAt && until.getTime() >= expiresAt.getTime()) {
        return { action: "complete", status: "cancelled", reason: "quiet_hours_until_expiry" };
      }
      return { action: "defer", until, reason: "quiet_hours" };
    }
  }
  return { action: "send" };
}

/** Exponential backoff for provider errors: 2, 4, 8 … minutes, capped at 1h. */
export function backoff(now: Date, retry: number): Date {
  const min = Math.min(60, 2 ** (retry + 1));
  return new Date(now.getTime() + min * 60_000);
}
