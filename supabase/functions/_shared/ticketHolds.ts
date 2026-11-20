// Stock holds while the buyer pays (see migration 20261120090000_order_ticket_holds_oversell_guard).
//
// holdOrderTickets() is called once the AWAITING_PAYMENT order exists and before the
// payment provider is contacted. Sold out -> the caller refuses before anyone is charged.
// Any other database problem (including the RPC not being deployed yet) fails open:
// the sale continues exactly as it did before this change.

// deno-lint-ignore no-explicit-any
type Db = any;

export const SOLD_OUT_MESSAGE = "Plus assez de billets disponibles pour ce tarif.";

export type HoldResult =
  | { ok: true; heldHere: boolean; skipped?: string }
  | { ok: false; soldOut: true; message: string; detail: Record<string, unknown> | null };

export async function holdOrderTickets(supabase: Db, orderId: string | null | undefined): Promise<HoldResult> {
  if (!orderId) return { ok: true, heldHere: false, skipped: "no_order" };

  const { data, error } = await supabase.rpc("reserve_order_tickets", { p_order_id: orderId });

  if (!error) {
    const already = Boolean(data?.already_held) || Boolean(data?.skipped);
    return { ok: true, heldHere: !already };
  }

  if (String(error.message || "").includes("TEMBA_SOLD_OUT")) {
    let detail: Record<string, unknown> | null = null;
    try {
      detail = error.details ? JSON.parse(error.details) : null;
    } catch {
      detail = null;
    }
    console.warn("[ticketHolds] sold out", { orderId, detail });
    return { ok: false, soldOut: true, message: SOLD_OUT_MESSAGE, detail };
  }

  console.error("[ticketHolds] hold skipped (fail-open):", error.code, error.message);
  return { ok: true, heldHere: false, skipped: error.code || "rpc_error" };
}

/** Give the stock back when this request held it and then could not start the payment. */
export async function releaseOrderTickets(supabase: Db, orderId: string | null | undefined): Promise<void> {
  if (!orderId) return;
  const { error } = await supabase.rpc("release_order_ticket_holds", { p_order_id: orderId });
  if (error) console.error("[ticketHolds] release failed (cron frees it at expiry):", error.code, error.message);
}

/** The order was created by this request only to be refused: close it so it is not left dangling. */
export async function cancelRefusedOrder(supabase: Db, orderId: string | null | undefined): Promise<void> {
  if (!orderId) return;
  const { error } = await supabase
    .from("orders")
    .update({ status: "CANCELLED", visible_in_history: false, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "AWAITING_PAYMENT");
  if (error) console.error("[ticketHolds] could not cancel refused order:", error.message);
}
