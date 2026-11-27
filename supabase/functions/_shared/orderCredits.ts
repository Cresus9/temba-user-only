// Wallet credits on a paid order (see migration 20261127120000_order_credit_reservations).
//
// The app sends credits_major with the payment request. The server, never the app, holds the credits
// against the AWAITING_PAYMENT order before the operator / Stripe is contacted. They are deducted once
// when the order completes (orders trigger) and given back when it is cancelled, refused or abandoned.
// Fails closed: if credits cannot be held, the payment is not started (the buyer would underpay).

import { buyerIdFromAuthHeader } from "./attribution.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export type CreditReservation =
  | { ok: true; reserved: number }
  | { ok: false; status: number; code: string; message: string };

export function creditsFromPayload(value: unknown): number {
  const n = Math.round(Number(value) || 0);
  return n > 0 ? n : 0;
}

export async function reserveOrderCredits(
  supabase: Db,
  req: Request,
  opts: { orderId: string | null | undefined; userId: string | null | undefined; credits: number; paymentAmountMajor: number },
): Promise<CreditReservation> {
  if (opts.credits <= 0) return { ok: true, reserved: 0 };

  // Credits belong to the signed-in buyer only: the JWT must match the order's user.
  const jwtUser = await buyerIdFromAuthHeader(supabase, req);
  if (!jwtUser || !opts.orderId || (opts.userId && jwtUser !== opts.userId)) {
    return { ok: false, status: 401, code: "CREDITS_AUTH", message: "Connectez-vous pour utiliser vos crédits." };
  }

  const { data, error } = await supabase.rpc("reserve_order_credits", {
    p_order_id: opts.orderId,
    p_user_id: jwtUser,
    p_amount: opts.credits,
    p_payment_amount: Math.round(Number(opts.paymentAmountMajor) || 0),
  });

  if (error) {
    console.error("[orderCredits] reserve failed:", error.code, error.message);
    return {
      ok: false,
      status: 503,
      code: "CREDITS_UNAVAILABLE",
      message: "Impossible d'utiliser vos crédits pour le moment. Réessayez sans crédits ou plus tard.",
    };
  }
  if (!data?.success) {
    return {
      ok: false,
      status: data?.code === "INSUFFICIENT_CREDITS" ? 402 : 400,
      code: String(data?.code ?? "CREDITS_REFUSED"),
      message: String(data?.error ?? "Vos crédits n'ont pas pu être appliqués."),
    };
  }
  return { ok: true, reserved: Number(data.reserved) || 0 };
}

/** Operator / Stripe refused the request: give the held credits back (the order stays retryable). */
export async function releaseOrderCredits(supabase: Db, orderId: string | null | undefined): Promise<void> {
  if (!orderId) return;
  const { error } = await supabase.rpc("_release_order_credits", { p_order_id: orderId, p_reason: "paiement refusé" });
  if (error) console.error("[orderCredits] release failed:", error.code, error.message);
}
