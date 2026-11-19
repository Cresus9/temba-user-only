// Shared by create-pawapay-payment and create-stripe-payment.
// The client may send a candidate reseller_code; this helper validates it
// with the same RPC the database trigger uses. Invalid codes are dropped.
// If the RPC cannot be reached, the normalized candidate is returned so the
// BEFORE trigger on orders can accept or strip it.

// deno-lint-ignore-file no-explicit-any

export type ResolvedResellerCode = {
  codeUpper: string | null;
  discountPercent: number;
};

function normalize(raw: string | undefined | null): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) return null;
  return code;
}

export async function resolveResellerCodeForOrder(
  supabase: any,
  rawCode: string | undefined | null,
  eventId: string,
): Promise<ResolvedResellerCode> {
  const codeUpper = normalize(rawCode);
  if (!codeUpper || !eventId) {
    return { codeUpper: null, discountPercent: 0 };
  }

  try {
    const { data, error } = await supabase.rpc("validate_reseller_code_for_event", {
      p_code: codeUpper,
      p_event_id: eventId,
    });
    if (error) {
      console.warn("validate_reseller_code_for_event failed; passing candidate to DB trigger:", error.message);
      return { codeUpper, discountPercent: 0 };
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | { valid?: boolean; normalized_code?: string; discount_percent?: number }
      | null
      | undefined;
    if (!row?.valid) {
      return { codeUpper: null, discountPercent: 0 };
    }
    const out = normalize(row.normalized_code) || codeUpper;
    const discountPercent = Math.min(
      100,
      Math.max(0, Math.round(Number(row.discount_percent) || 0)),
    );
    return { codeUpper: out, discountPercent };
  } catch (err) {
    console.warn("validate_reseller_code_for_event exception; passing candidate to DB trigger:", err);
    return { codeUpper, discountPercent: 0 };
  }
}

/** Stamp a candidate onto an existing order only when it has no reseller_code yet. */
export async function stampResellerCodeOnOrder(
  supabase: any,
  orderId: string | undefined | null,
  rawCode: string | undefined | null,
  eventId: string,
): Promise<string | null> {
  if (!orderId) return null;
  const resolved = await resolveResellerCodeForOrder(supabase, rawCode, eventId);
  if (!resolved.codeUpper) return null;

  const { data: existing, error: readErr } = await supabase
    .from("orders")
    .select("reseller_code")
    .eq("id", orderId)
    .maybeSingle();
  if (readErr) {
    console.warn("Could not read order reseller_code:", readErr.message);
    return null;
  }
  const already = (existing?.reseller_code ?? "").toString().trim();
  if (already) return already.toUpperCase();

  const { error: updErr } = await supabase
    .from("orders")
    .update({ reseller_code: resolved.codeUpper })
    .eq("id", orderId);
  if (updErr) {
    console.warn("Could not stamp reseller_code on order:", updErr.message);
    return null;
  }
  return resolved.codeUpper;
}
