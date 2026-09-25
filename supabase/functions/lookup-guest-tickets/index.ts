import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendResendEmail, recoveryCodeEmailHtml } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
};

/** Set false before production. Open lookup by phone/email with no SMS/email code. */
const SKIP_OTP = true;

function digits(phone?: string | null): string {
  return (phone || "").replace(/\D/g, "");
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  cleaned = cleaned.replace(/^0+/, "");
  if (cleaned.startsWith("226") && cleaned.length === 11) return "+" + cleaned;
  if (cleaned.length === 8) return "+226" + cleaned;
  return "+" + cleaned;
}

function phonesMatch(a?: string | null, b?: string | null): boolean {
  const da = digits(a);
  const db = digits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const tailA = da.slice(-8);
  const tailB = db.slice(-8);
  return tailA.length === 8 && tailA === tailB;
}

function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const PLACEHOLDER_GUEST_EMAIL_DOMAIN = "@temba.temp";

function isPlaceholderGuestEmail(email?: string | null): boolean {
  const trimmed = (email || "").trim().toLowerCase();
  return !trimmed || trimmed.endsWith(PLACEHOLDER_GUEST_EMAIL_DOMAIN);
}

function realGuestEmail(email?: string | null): string | undefined {
  const trimmed = (email || "").trim().toLowerCase();
  if (!trimmed || trimmed.endsWith(PLACEHOLDER_GUEST_EMAIL_DOMAIN)) return undefined;
  return trimmed;
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function upsertOtp(supabase: SupabaseClient, key: string, code: string) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  const { error } = await supabase.from("otp_codes").upsert(
    {
      phone: key,
      code,
      expires_at: expiresAt.toISOString(),
      verified: false,
      attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone", ignoreDuplicates: false },
  );
  if (error) throw new Error(error.message);
}

async function verifyOtp(supabase: SupabaseClient, key: string, code: string) {
  const { data: otpRecord, error: otpError } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("phone", key)
    .maybeSingle();

  if (otpError || !otpRecord) {
    return { ok: false as const, error: "Code introuvable. Renvoyez un code.", status: 400 };
  }
  if (new Date() > new Date(otpRecord.expires_at)) {
    return { ok: false as const, error: "Code expiré. Renvoyez un code.", status: 400 };
  }
  if (otpRecord.verified === true) {
    return { ok: false as const, error: "Code déjà utilisé. Renvoyez un code.", status: 400 };
  }
  if ((otpRecord.attempts ?? 0) >= 5) {
    return { ok: false as const, error: "Trop de tentatives. Renvoyez un code.", status: 400 };
  }

  await supabase
    .from("otp_codes")
    .update({ attempts: (otpRecord.attempts ?? 0) + 1, updated_at: new Date().toISOString() })
    .eq("phone", key);

  if (otpRecord.code !== String(code).trim()) {
    return { ok: false as const, error: "Code incorrect.", status: 400 };
  }

  await supabase
    .from("otp_codes")
    .update({ verified: true, updated_at: new Date().toISOString() })
    .eq("phone", key);

  return { ok: true as const };
}

async function ensureGuestToken(
  supabase: SupabaseClient,
  orderId: string,
  email?: string | null,
  phone?: string | null,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("guest_orders")
    .select("token")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing?.token) return existing.token;

  const token = crypto.randomUUID();
  const row: Record<string, string> = { order_id: orderId, token };
  if (email) row.email = email;
  if (phone) row.phone = phone;
  const { error } = await supabase.from("guest_orders").insert(row);
  if (!error) return token;

  const { data: again } = await supabase
    .from("guest_orders")
    .select("token")
    .eq("order_id", orderId)
    .maybeSingle();
  return again?.token ?? null;
}

async function tokensForPhone(supabase: SupabaseClient, normalized: string): Promise<string[]> {
  const last8 = digits(normalized).slice(-8);
  const allDigits = digits(normalized);
  const variants = [...new Set([normalized, allDigits, last8].filter(Boolean))];
  const { data: rows, error } = await supabase
    .from("guest_orders")
    .select("token, phone, email, order_id")
    .or(variants.map((v) => `phone.eq.${v}`).join(","));
  if (error) throw new Error(error.message);

  const tokens = new Set<string>();
  for (const row of rows || []) {
    if (
      row.token &&
      (phonesMatch(row.phone, normalized) || digits(row.phone).endsWith(last8))
    ) {
      tokens.add(row.token);
    }
  }

  // Fallback: phone-only guests store `{digits}@temba.temp` when email was skipped.
  const placeholderEmails = [...new Set([
    `${allDigits}${PLACEHOLDER_GUEST_EMAIL_DOMAIN}`,
    `${last8}${PLACEHOLDER_GUEST_EMAIL_DOMAIN}`,
    last8.length === 8 ? `226${last8}${PLACEHOLDER_GUEST_EMAIL_DOMAIN}` : "",
  ].filter(Boolean))];
  if (placeholderEmails.length) {
    const { data: byEmail, error: emailErr } = await supabase
      .from("guest_orders")
      .select("token, email")
      .in("email", placeholderEmails);
    if (emailErr) throw new Error(emailErr.message);
    for (const row of byEmail || []) {
      if (row.token) tokens.add(row.token);
    }
  }

  return [...tokens];
}

async function tokensForEmail(supabase: SupabaseClient, email: string): Promise<string[]> {
  if (isPlaceholderGuestEmail(email)) return [];

  const tokens = new Set<string>();

  const { data: guestRows, error: guestErr } = await supabase
    .from("guest_orders")
    .select("token, order_id, email")
    .ilike("email", email);
  if (guestErr) throw new Error(guestErr.message);
  for (const row of guestRows || []) {
    if (row.token && !isPlaceholderGuestEmail(row.email)) tokens.add(row.token);
  }

  const { data: orphanOrders, error: orderErr } = await supabase
    .from("orders")
    .select("id, guest_email")
    .is("user_id", null)
    .ilike("guest_email", email);
  if (orderErr) throw new Error(orderErr.message);

  for (const order of orphanOrders || []) {
    if (isPlaceholderGuestEmail(order.guest_email)) continue;
    const token = await ensureGuestToken(
      supabase,
      order.id,
      normalizeEmail(order.guest_email) || email,
    );
    if (token) tokens.add(token);
  }

  return [...tokens];
}

type TicketPayload = {
  found: boolean;
  token: string;
  orderId?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  eventImage?: string;
  guestEmail?: string;
  guestPhone?: string;
  tickets: Record<string, unknown>[];
};

async function payloadForToken(supabase: SupabaseClient, token: string): Promise<TicketPayload> {
  const trimmed = token.trim();
  const { data: guest } = await supabase
    .from("guest_orders")
    .select("token, order_id, email, phone")
    .eq("token", trimmed)
    .maybeSingle();

  if (!guest?.order_id) {
    return { found: false, token: trimmed, tickets: [] };
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, event_id, guest_email, status")
    .eq("id", guest.order_id)
    .maybeSingle();

  const { data: ticketRows } = await supabase
    .from("tickets")
    .select("id, qr_code, status, event_id, ticket_type_id, order_id")
    .eq("order_id", guest.order_id);

  const typeIds = [...new Set((ticketRows || []).map((t) => t.ticket_type_id).filter(Boolean))];
  const eventIds = [
    ...new Set(
      [
        order?.event_id,
        ...(ticketRows || []).map((t) => t.event_id),
      ].filter(Boolean),
    ),
  ];

  const typeMap = new Map<string, { name?: string; price?: number }>();
  if (typeIds.length) {
    const { data: types } = await supabase
      .from("ticket_types")
      .select("id, name, price")
      .in("id", typeIds);
    for (const row of types || []) typeMap.set(row.id, row);
  }

  const eventMap = new Map<string, {
    title?: string;
    date?: string;
    time?: string;
    location?: string;
    image_url?: string;
  }>();
  if (eventIds.length) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title, date, time, location, image_url")
      .in("id", eventIds);
    for (const row of events || []) eventMap.set(row.id, row);
  }

  const fallbackEvent = order?.event_id ? eventMap.get(order.event_id) : undefined;
  const tickets = (ticketRows || []).map((row) => {
    const event = (row.event_id && eventMap.get(row.event_id)) || fallbackEvent;
    const type = row.ticket_type_id ? typeMap.get(row.ticket_type_id) : undefined;
    return {
      id: row.id,
      order_id: row.order_id || guest.order_id,
      qr_code: row.qr_code,
      status: row.status,
      ticket_type_name: type?.name,
      ticket_type_price: type?.price,
      event_title: event?.title,
      event_date: event?.date,
      event_time: event?.time,
      event_location: event?.location,
      event_image: event?.image_url,
      guest_email: realGuestEmail(guest.email || order?.guest_email),
      guest_phone: guest.phone,
      token: trimmed,
    };
  });

  return {
    found: true,
    token: trimmed,
    orderId: guest.order_id,
    eventTitle: fallbackEvent?.title || tickets[0]?.event_title as string | undefined,
    eventDate: fallbackEvent?.date || tickets[0]?.event_date as string | undefined,
    eventTime: fallbackEvent?.time,
    eventLocation: fallbackEvent?.location,
    eventImage: fallbackEvent?.image_url,
    guestEmail: realGuestEmail(guest.email || order?.guest_email),
    guestPhone: guest.phone || undefined,
    tickets,
  };
}

async function previewsForTokenList(supabase: SupabaseClient, tokens: string[]) {
  const previews = [];
  for (const token of tokens) {
    const payload = await payloadForToken(supabase, token);
    previews.push({
      token,
      orderId: payload.orderId,
      eventTitle: payload.eventTitle,
      eventDate: payload.eventDate,
      ticketCount: payload.tickets.length,
    });
  }
  return previews;
}

async function sendRecoveryEmail(to: string, code: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("Email service configuration missing");

  try {
    await sendResendEmail({
      to,
      subject: `${code} — votre code Temba`,
      html: recoveryCodeEmailHtml(code),
    });
  } catch (err) {
    console.error("Resend API error:", err);
    throw new Error("Impossible d'envoyer l'e-mail. Réessayez ou utilisez le téléphone.");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const action = String(
      body.action || (SKIP_OTP || code ? "verify" : "send"),
    ).toLowerCase();

    if (action === "tickets") {
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (!token) return json({ found: false, tickets: [], error: "Jeton requis" }, 400);
      const payload = await payloadForToken(supabase, token);
      return json({ success: true, ...payload });
    }

    if (action === "send") {
      if (email) {
        if (!isEmail(email) || isPlaceholderGuestEmail(email)) {
          return json({ success: false, error: "Format d'email invalide" }, 400);
        }
        const otp = generateOTP();
        await upsertOtp(supabase, email, otp);
        await sendRecoveryEmail(email, otp);
        return json({ success: true, channel: "email" });
      }

      return json({ success: false, error: "Email requis" }, 400);
    }

    if (!SKIP_OTP && !code) {
      return json({ tokens: [], error: "Code requis" }, 400);
    }

    if (email) {
      if (!isEmail(email) || isPlaceholderGuestEmail(email)) {
        return json({ tokens: [], error: "Format d'email invalide" }, 400);
      }
      if (!SKIP_OTP) {
        const otp = await verifyOtp(supabase, email, code);
        if (!otp.ok) return json({ tokens: [], error: otp.error }, otp.status);
      }
      const tokens = await tokensForEmail(supabase, email);
      const previews = await previewsForTokenList(supabase, tokens);
      return json({ tokens, previews, success: true, channel: "email", skip_otp: SKIP_OTP });
    }

    if (!phoneRaw) {
      return json({ tokens: [], error: "Téléphone ou email requis" }, 400);
    }

    const normalized = normalizePhone(phoneRaw);
    if (!SKIP_OTP) {
      const otp = await verifyOtp(supabase, normalized, code);
      if (!otp.ok) return json({ tokens: [], error: otp.error }, otp.status);
    }
    const tokens = await tokensForPhone(supabase, normalized);
    const previews = await previewsForTokenList(supabase, tokens);
    return json({ tokens, previews, success: true, channel: "phone", skip_otp: SKIP_OTP });
  } catch (error) {
    console.error("lookup-guest-tickets:", error);
    return json({ tokens: [], error: (error as Error).message }, 500);
  }
});
