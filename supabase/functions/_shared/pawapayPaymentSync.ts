// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

export type PawaPaySyncResult =
  | {
      ok: true;
      state: "succeeded";
      payment_id: string;
      order_id: string | null;
      message?: string;
    }
  | {
      ok: true;
      state: "processing";
      payment_id: string;
      order_id: string | null;
      message?: string;
    }
  | {
      ok: false;
      state: "failed" | "processing";
      payment_id: string;
      order_id: string | null;
      message?: string;
      error_code?: string;
    }
  | {
      ok: false;
      state: "succeeded";
      payment_id: string;
      order_id: string | null;
      message: string;
    };

type PaymentRow = {
  id: string;
  order_id?: string | null;
  status?: string | null;
  transaction_id?: string | null;
  provider?: string | null;
};

const MAX_FINALIZE_ATTEMPTS = 8;

async function enqueueFinalizeRetry(
  supabase: SupabaseClient,
  paymentId: string,
  orderId: string,
  reason: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("payment_finalize_jobs")
    .upsert(
      {
        payment_id: paymentId,
        order_id: orderId,
        status: "pending",
        attempts: 0,
        next_run_at: now,
        max_attempts: MAX_FINALIZE_ATTEMPTS,
        last_error: reason,
        updated_at: now,
      },
      { onConflict: "payment_id" },
    );

  if (error) {
    console.error("enqueueFinalizeRetry failed", { paymentId, orderId, error });
  }
}

/**
 * Idempotent: maps pawaPay deposit status → payments row, order cancel on fail,
 * admin_finalize_payment on completed (RPC must be safe to call repeatedly).
 */
export async function applyPawaPayProviderStatus(
  supabase: SupabaseClient,
  payment: PaymentRow,
  providerStatusRaw: string,
  canonicalTransactionId?: string | null,
): Promise<PawaPaySyncResult> {
  const paymentId = payment.id;
  const orderId = payment.order_id ?? null;
  const currentStatus = (payment.status ?? "").toLowerCase();

  const providerStatus = (providerStatusRaw || "").toUpperCase();

  let newStatus: "pending" | "completed" | "failed" = "pending";
  let state: "processing" | "succeeded" | "failed" = "processing";

  if (providerStatus === "COMPLETED") {
    newStatus = "completed";
    state = "succeeded";
  } else if (providerStatus === "FAILED") {
    newStatus = "failed";
    state = "failed";
  } else {
    newStatus = "pending";
    state = "processing";
  }

  const txId =
    canonicalTransactionId ??
    payment.transaction_id ??
    paymentId;

  const isNoopPending =
    newStatus === "pending" &&
    currentStatus === "pending" &&
    (payment.transaction_id ?? null) === (txId ?? null);

  let updateError: { message: string } | null = null;
  if (!isNoopPending) {
    const updateResult = await supabase
      .from("payments")
      .update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
        failed_at: newStatus === "failed" ? new Date().toISOString() : null,
        transaction_id: txId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
    updateError = updateResult.error;
  }

  if (updateError) {
    console.error("applyPawaPayProviderStatus: payment update failed", updateError);
    return {
      ok: false,
      state: "processing",
      payment_id: paymentId,
      order_id: orderId,
      message: `Failed to update payment: ${updateError.message}`,
    };
  }

  if (orderId && newStatus === "failed") {
    const { error: orderFailError } = await supabase
      .from("orders")
      .update({
        status: "CANCELLED",
        visible_in_history: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (orderFailError) {
      console.error("applyPawaPayProviderStatus: order cancel failed", orderFailError);
    }
  }

  if (newStatus === "completed" && orderId) {
    const { error: rpcErr } = await supabase.rpc("admin_finalize_payment", {
      p_payment_id: paymentId,
    });

    if (rpcErr) {
      console.error("applyPawaPayProviderStatus: admin_finalize_payment error", rpcErr);
      await enqueueFinalizeRetry(
        supabase,
        paymentId,
        orderId,
        `Immediate finalize failed: ${rpcErr.message}`,
      );
      return {
        ok: true,
        state: "succeeded",
        payment_id: paymentId,
        order_id: orderId,
        message: "Payment confirmed. Tickets are being prepared and will appear shortly.",
      };
    }

    return {
      ok: true,
      state: "succeeded",
      payment_id: paymentId,
      order_id: orderId,
      message: "Payment verified and tickets created",
    };
  }

  if (newStatus === "completed" && !orderId) {
    return {
      ok: true,
      state: "succeeded",
      payment_id: paymentId,
      order_id: null,
      message: "Payment completed (no order linked)",
    };
  }

  if (newStatus === "failed") {
    return {
      ok: false,
      state: "failed",
      payment_id: paymentId,
      order_id: orderId,
      message: "Payment failed",
    };
  }

  return {
    ok: true,
    state: "processing",
    payment_id: paymentId,
    order_id: orderId,
    message: `Payment still processing (${providerStatus})`,
  };
}

export function pawaPaySyncToVerifyJsonBody(
  r: PawaPaySyncResult,
  provider: string,
): Record<string, unknown> {
  if (r.ok && r.state === "succeeded") {
    return {
      success: true,
      state: "succeeded",
      provider,
      payment_id: r.payment_id,
      order_id: r.order_id,
      message: r.message ?? "Payment verified and tickets created",
    };
  }
  if (!r.ok && r.state === "succeeded") {
    return {
      success: false,
      state: "succeeded",
      message: r.message,
      provider,
      payment_id: r.payment_id,
      order_id: r.order_id,
    };
  }
  if (!r.ok && r.state === "failed") {
    return {
      success: false,
      state: "failed",
      message: r.message,
      error_code: r.error_code,
      provider,
      payment_id: r.payment_id,
      order_id: r.order_id,
    };
  }
  return {
    success: false,
    state: "processing",
    message: r.message,
    provider,
    payment_id: r.payment_id,
    order_id: r.order_id,
  };
}
