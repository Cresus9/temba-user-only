import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decide, inQuietHours, Job, quietHoursEnd } from "./policy.ts";

const prefs = { email: true, push: true, in_app: true, sms: false, event_reminders: true, order_updates: true,
  quiet_hours_start: 22, quiet_hours_end: 7, timezone: "Africa/Ouagadougou", max_push_per_day: 4, max_email_per_day: 3 };
const base: Job = { delivery_method: "push", metadata: { kind: "event_reminder_24h" }, email: "a@b.com", prefs,
  push_sent_24h: 0, email_sent_24h: 0, retry_count: 0, max_retries: 3 };
const noon = new Date("2026-11-19T12:00:00Z"); // Ouagadougou = UTC
const night = new Date("2026-11-19T23:30:00Z");

Deno.test("sends in daytime", () => assertEquals(decide(base, noon).action, "send"));
Deno.test("push pref off", () => assertEquals(decide({ ...base, prefs: { ...prefs, push: false } }, noon), { action: "complete", status: "cancelled", reason: "pref_push_off" }));
Deno.test("temp email never emailed", () => assertEquals(decide({ ...base, delivery_method: "email", email: "x@temba.temp" }, noon), { action: "complete", status: "cancelled", reason: "no_real_email" }));
Deno.test("email pref off", () => assertEquals((decide({ ...base, delivery_method: "email", prefs: { ...prefs, email: false } }, noon) as any).reason, "pref_email_off"));
Deno.test("cap reached", () => assertEquals((decide({ ...base, push_sent_24h: 4 }, noon) as any).reason, "daily_cap_reached"));
Deno.test("transactional ignores cap + quiet hours", () => {
  const j = { ...base, metadata: { kind: "order_confirmed" }, push_sent_24h: 10 };
  assertEquals(decide(j, night).action, "send");
});
Deno.test("quiet hours defer to 07:00 local", () => {
  const d = decide(base, night);
  assertEquals(d.action, "defer");
  if (d.action === "defer") assertEquals(d.until.toISOString(), "2026-11-20T07:00:00.000Z");
});
Deno.test("quiet hours past expiry cancels", () => {
  const d = decide({ ...base, metadata: { kind: "event_reminder_2h", expires_at: "2026-11-20T01:00:00Z" } }, night);
  assertEquals((d as any).reason, "quiet_hours_until_expiry");
});
Deno.test("expired", () => assertEquals((decide({ ...base, metadata: { kind: "x", expires_at: "2026-11-19T11:00:00Z" } }, noon) as any).reason, "expired"));
Deno.test("sms cancelled, in_app sent", () => {
  assertEquals((decide({ ...base, delivery_method: "sms" }, noon) as any).reason, "sms_not_in_phase1");
  assertEquals((decide({ ...base, delivery_method: "in_app" }, noon) as any).status, "sent");
});
Deno.test("quiet hours math", () => {
  assertEquals(inQuietHours(23, 22, 7), true); assertEquals(inQuietHours(6, 22, 7), true);
  assertEquals(inQuietHours(7, 22, 7), false); assertEquals(inQuietHours(12, 22, 7), false);
  assertEquals(quietHoursEnd(new Date("2026-11-20T03:15:00Z"), "UTC", 7).toISOString(), "2026-11-20T07:00:00.000Z");
});
