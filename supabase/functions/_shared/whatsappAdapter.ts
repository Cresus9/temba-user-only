/**
 * Optional notify to the WhatsApp adapter after tickets exist (or payment failed).
 * Set Supabase secrets WHATSAPP_ADAPTER_URL + WHATSAPP_ADAPTER_SECRET.
 * Never throws — payment finalization must not depend on Meta.
 */
export async function notifyWhatsAppAdapter(payload: {
  payment_id: string;
  order_id?: string | null;
  status: "completed" | "failed";
}): Promise<void> {
  const url = (Deno.env.get("WHATSAPP_ADAPTER_URL") ?? "").replace(/\/$/, "");
  if (!url) return;
  const secret = Deno.env.get("WHATSAPP_ADAPTER_SECRET") ?? "";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${url}/paid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-adapter-secret": secret } : {}),
      },
      body: JSON.stringify({
        payment_id: payload.payment_id,
        order_id: payload.order_id ?? undefined,
        status: payload.status,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      console.warn("[whatsapp-adapter] HTTP", res.status, await res.text());
    }
  } catch (err) {
    console.warn("[whatsapp-adapter]", err);
  }
}
