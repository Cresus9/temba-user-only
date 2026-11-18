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
    if (decision !== "allow") return;

    const { error } = await supabase
      .from("orders")
      .update({ attribution_code: code })
      .eq("id", orderId)
      .eq("status", "AWAITING_PAYMENT")
      .is("attribution_code", null);
    if (error) console.warn("[attribution] code not stored:", error.message);
  } catch (err) {
    const message = err instanceof Error ? err.message : "skipped";
    console.warn("[attribution] code not stored:", message);
  }
}
