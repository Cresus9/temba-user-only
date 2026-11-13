/**
 * Meta Conversions API Purchase for pixel 1646664936924509.
 * Token: Supabase secret META_CAPI_ACCESS_TOKEN. Never log it.
 * event_id is the order id, matching the browser Purchase eventID.
 * A failure here must not fail payment finalization.
 */

const PIXEL_ID = "1646664936924509";
const GRAPH_VERSION = "v27.0";
const PLACEHOLDER_EMAIL = "@temba.temp";

type SupabaseLike = {
  from: (table: string) => any;
};

function realEmail(email?: string | null): string | undefined {
  const trimmed = (email || "").trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@") || trimmed.endsWith(PLACEHOLDER_EMAIL)) return undefined;
  return trimmed;
}

function phoneDigits(phone?: string | null): string {
  return (phone || "").replace(/\D/g, "");
}

function cookieValue(raw?: string | null): string | undefined {
  const value = (raw || "").trim();
  if (!value || value.length > 200 || !/^fb\.1\.\d+\.[\w.-]+$/i.test(value)) return undefined;
  return value;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim();
  return first || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "";
}

/** Fields saved on payments.metadata at checkout. Hashed only when the webhook sends. */
export function metaAttribution(
  req: Request,
  body: { fbp?: string | null; fbc?: string | null; phone?: string | null; email?: string | null },
): Record<string, string> {
  const out: Record<string, string> = {};
  const fbp = cookieValue(body.fbp);
  const fbc = cookieValue(body.fbc);
  const ip = clientIp(req);
  const ua = (req.headers.get("user-agent") || "").trim();
  const email = realEmail(body.email);
  const phone = phoneDigits(body.phone);
  if (fbp) out.fbp = fbp;
  if (fbc) out.fbc = fbc;
  if (ip) out.client_ip = ip;
  if (ua) out.client_user_agent = ua.slice(0, 512);
  if (email) out.email = email;
  if (phone) out.phone = phone;
  return out;
}

function money(value: number, currency: string): number {
  if (!Number.isFinite(value)) return 0;
  return currency === "XOF" ? Math.round(value) : Math.round(value * 100) / 100;
}

function currencyCode(currency?: string | null): string {
  const code = (currency || "XOF").trim().toUpperCase();
  return code === "FCFA" || code === "CFA" ? "XOF" : code;
}

function itemCount(quantities: unknown): number {
  if (!quantities || typeof quantities !== "object") return 1;
  const total = Object.values(quantities as Record<string, unknown>).reduce<number>(
    (sum, qty) => sum + (Number(qty) || 0),
    0,
  );
  return total > 0 ? Math.round(total) : 1;
}

export async function sendMetaPurchase(supabase: SupabaseLike, paymentId: string): Promise<void> {
  const token = Deno.env.get("META_CAPI_ACCESS_TOKEN") ?? "";
  if (!token || !paymentId) return;

  try {
    const { data: payment, error } = await supabase
      .from("payments")
      .select("id, order_id, event_id, amount, currency, metadata, created_at")
      .eq("id", paymentId)
      .maybeSingle();

    if (error || !payment?.order_id) {
      if (error) console.warn("[meta-capi] payment lookup", error.message);
      return;
    }

    const meta = (payment.metadata && typeof payment.metadata === "object")
      ? payment.metadata as Record<string, unknown>
      : {};
    if (meta.meta_capi_sent === true) return;
    if (payment.created_at) {
      const age = Date.now() - new Date(payment.created_at).getTime();
      if (Number.isFinite(age) && age > 6 * 24 * 60 * 60 * 1000) return;
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, event_id, total, guest_email, user_id, ticket_quantities, status")
      .eq("id", payment.order_id)
      .maybeSingle();

    if (!order?.id) return;
    if (order.status === "CANCELLED" || order.status === "FAILED" || order.status === "REFUNDED") return;

    const eventId = String(order.event_id || payment.event_id || "");
    let slug = eventId;
    if (eventId) {
      const { data: event } = await supabase
        .from("events")
        .select("slug")
        .eq("id", eventId)
        .maybeSingle();
      if (event?.slug) slug = String(event.slug);
    }

    let email = realEmail(order.guest_email) || realEmail(typeof meta.email === "string" ? meta.email : null);
    let phone = phoneDigits(typeof meta.phone === "string" ? meta.phone : null);
    if (order.user_id && (!email || !phone)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, phone")
        .eq("user_id", order.user_id)
        .maybeSingle();
      if (!email) email = realEmail(profile?.email);
      if (!phone) phone = phoneDigits(profile?.phone);
    }

    const userData: Record<string, unknown> = {};
    if (email) userData.em = [await sha256(email)];
    if (phone) userData.ph = [await sha256(phone)];
    if (typeof meta.client_ip === "string" && meta.client_ip) userData.client_ip_address = meta.client_ip;
    if (typeof meta.client_user_agent === "string" && meta.client_user_agent) {
      userData.client_user_agent = meta.client_user_agent;
    }
    if (typeof meta.fbp === "string" && meta.fbp) userData.fbp = meta.fbp;
    if (typeof meta.fbc === "string" && meta.fbc) userData.fbc = meta.fbc;

    if (!userData.client_user_agent && !userData.em && !userData.ph && !userData.fbp) {
      console.warn("[meta-capi] no match keys for", paymentId);
      return;
    }

    const currency = currencyCode(payment.currency);
    const rawValue = Number(order.total ?? payment.amount ?? 0);
    const payload = {
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: String(order.id),
        action_source: "website",
        event_source_url: `https://tembas.com/e/${slug || eventId}`,
        user_data: userData,
        custom_data: {
          currency,
          value: money(rawValue, currency),
          content_ids: eventId ? [eventId] : [],
          content_type: "product",
          num_items: itemCount(order.ticket_quantities),
        },
      }],
    };

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.warn("[meta-capi] HTTP", res.status, detail);
      return;
    }

    await supabase
      .from("payments")
      .update({ metadata: { ...meta, meta_capi_sent: true } })
      .eq("id", payment.id);

    console.log("[meta-capi] Purchase sent", order.id);
  } catch (err) {
    console.warn("[meta-capi]", err);
  }
}
