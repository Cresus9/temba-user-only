const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

/** Same rule as attributionAttachDecision in src/lib/attribution/rules.ts. */
function attributionAttachDecision(input: {
  createdInThisRequest: boolean;
  existingCode: string | null;
  orderUserId: string | null;
  jwtUserId: string | null;
  guestTokenMatches: boolean;
}): "allow" | "skip" {
  if (input.existingCode) return "skip";
  if (input.createdInThisRequest) return "allow";
  if (input.orderUserId) {
    return input.jwtUserId && input.jwtUserId === input.orderUserId ? "allow" : "skip";
  }
  return input.guestTokenMatches ? "allow" : "skip";
}

// deno-lint-ignore no-explicit-any
type ServiceClient = any;

export function normalizeAttributionCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return null;
  return code;
}

/** First valid candidate wins. Mobile may send the ?r= code as reseller_code only. */
export function candidateAttributionCode(...raws: unknown[]): string | null {
  for (const raw of raws) {
    const code = normalizeAttributionCode(raw);
    if (code) return code;
  }
  return null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAttributionEventId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return UUID_RE.test(value) ? value : null;
}

export function parseAttributionCapturedAt(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export type AttributionAttachExtras = {
  eventId?: string | null;
  capturedAt?: string | null;
};

export async function buyerIdFromAuthHeader(supabase: ServiceClient, req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!bearer || bearer === anon) return null;
  try {
    const { data, error } = await supabase.auth.getUser(bearer);
    if (error || !data?.user?.id) return null;
    return data.user.id as string;
  } catch {
    return null;
  }
}

export function readGuestToken(req: Request): string | null {
  const raw = req.headers.get("x-guest-token")?.trim() ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) return null;
  return raw;
}

/**
 * Store the candidate code on an order that is still waiting for payment.
 * A missing column or a refused update does not stop the payment.
 * An existing code is never replaced. A caller-supplied order id is updated
 * only when the buyer session or the guest token matches that order.
 */
export async function attachAttributionCode(
  supabase: ServiceClient,
  orderId: string | null | undefined,
  raw: unknown,
  proof: { createdInThisRequest: boolean; jwtUserId: string | null; guestToken: string | null },
  extras: AttributionAttachExtras = {},
): Promise<void> {
  const code = normalizeAttributionCode(raw);
  if (!orderId || !code) return;
  try {
    const { data: order, error: readError } = await supabase
      .from("orders")
      .select("id, user_id, status, attribution_code")
      .eq("id", orderId)
      .maybeSingle();
    if (readError || !order || order.status !== "AWAITING_PAYMENT") {
      if (readError) console.warn("[attribution] code not stored:", readError.message);
      return;
    }

    let guestTokenMatches = false;
    if (!order.user_id && proof.guestToken) {
      const { data: guest } = await supabase
        .from("guest_orders")
        .select("order_id")
        .eq("order_id", orderId)
        .eq("token", proof.guestToken)
        .maybeSingle();
      guestTokenMatches = Boolean(guest);
    }

    const decision = attributionAttachDecision({
      createdInThisRequest: proof.createdInThisRequest,
      existingCode: order.attribution_code ?? null,
      orderUserId: order.user_id ?? null,
      jwtUserId: proof.jwtUserId,
      guestTokenMatches,
    });
    const sameCode = normalizeAttributionCode(order.attribution_code) === code;
    const canWriteExtras =
      decision === "allow" ||
      (sameCode && (proof.createdInThisRequest || (order.user_id ? proof.jwtUserId === order.user_id : guestTokenMatches)));
    if (decision !== "allow" && !canWriteExtras) return;

    const eventId = parseAttributionEventId(extras.eventId);
    const capturedAt = parseAttributionCapturedAt(extras.capturedAt);
    const patch: Record<string, unknown> = {};
    if (decision === "allow") patch.attribution_code = code;
    if (canWriteExtras && eventId) patch.attribution_event_id = eventId;
    if (canWriteExtras && capturedAt) patch.attribution_captured_at = capturedAt;
    if (Object.keys(patch).length === 0) return;

    const apply = async (row: Record<string, unknown>) => {
      let query = supabase.from("orders").update(row).eq("id", orderId).eq("status", "AWAITING_PAYMENT");
      if (decision === "allow") query = query.is("attribution_code", null);
      return query;
    };

    let { error } = await apply(patch);
    if (error && /attribution_event_id|attribution_captured_at/i.test(error.message || "")) {
      if (patch.attribution_code) {
        ({ error } = await apply({ attribution_code: patch.attribution_code }));
      } else {
        error = null;
      }
    }
    if (error) console.warn("[attribution] code not stored:", error.message);
  } catch (err) {
    const message = err instanceof Error ? err.message : "skipped";
    console.warn("[attribution] code not stored:", message);
  }
}
