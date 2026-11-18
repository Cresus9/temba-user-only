const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

// The Supabase client. Kept loose so this file can be imported by functions
// that pin different supabase-js builds.
// deno-lint-ignore no-explicit-any
type OrderWriter = any;

/** Same shape the database accepts. Invalid codes are dropped, never stored. */
export function normalizeAttributionCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return null;
  return code;
}

/**
 * Store the candidate code on an order that is still waiting for payment.
 * The BEFORE trigger resolves it. A missing column or a failed update must
 * not stop the payment: with no code, checkout behaves as it does today.
 */
export async function attachAttributionCode(
  supabase: OrderWriter,
  orderId: string | null | undefined,
  raw: unknown,
): Promise<void> {
  const code = normalizeAttributionCode(raw);
  if (!orderId || !code) return;
  try {
    const { error } = await supabase
      .from("orders")
      .update({ attribution_code: code })
      .eq("id", orderId)
      .eq("status", "AWAITING_PAYMENT");
    if (error) {
      console.warn("[attribution] code not stored:", error.message);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "skipped";
    console.warn("[attribution] code not stored:", message);
  }
}
