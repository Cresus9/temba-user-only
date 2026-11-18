// deno-lint-ignore-file no-explicit-any
/**
 * Multi-date orders: one ticket line per (ticket type, date).
 * Mirrors the SQL in guest_order_processor / admin_finalize_payment.
 *
 * orders.line_allocations = [{ticket_type_id, event_date_id, quantity}] (the
 * shape the mobile app and the web write). It is used only when every line is
 * well-formed, every date belongs to the order's event and the per-type sums
 * equal ticket_quantities (what was billed). Anything else falls back to
 * exactly the old per-order behaviour: ticket_quantities + orders.event_date_id.
 */
export interface TicketLine {
  ticket_type_id: string;
  event_date_id: string | null;
  quantity: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function legacyLines(order: any): TicketLine[] {
  return Object.entries(order?.ticket_quantities || {})
    .map(([ticket_type_id, q]) => ({
      ticket_type_id,
      event_date_id: order?.event_date_id || null,
      quantity: Math.floor(Number(q) || 0),
    }))
    .filter((l) => l.quantity > 0);
}

/**
 * Checks line allocations against an event and the billed quantities.
 * ok=false with reason when they cannot be trusted. `single` is set when all
 * lines share one date (store it as orders.event_date_id, no lines).
 */
export async function checkLineAllocations(
  supabase: any,
  eventId: string,
  ticketQuantities: Record<string, unknown> | null | undefined,
  raw: unknown,
): Promise<{ ok: true; lines: TicketLine[]; single: string | null } | { ok: false; reason: string }> {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, reason: "no lines" };

  const lines: TicketLine[] = [];
  for (const row of raw as any[]) {
    const tt = String(row?.ticket_type_id ?? "");
    const ed = String(row?.event_date_id ?? "");
    const qs = String(row?.quantity ?? "");
    if (!UUID.test(tt) || !UUID.test(ed) || !/^[0-9]{1,4}$/.test(qs) || Number(qs) <= 0) {
      return { ok: false, reason: "malformed line" };
    }
    lines.push({ ticket_type_id: tt, event_date_id: ed, quantity: Number(qs) });
  }

  // per-type sums must equal ticket_quantities (both directions)
  const sums: Record<string, number> = {};
  for (const l of lines) sums[l.ticket_type_id] = (sums[l.ticket_type_id] || 0) + l.quantity;
  const billed: Record<string, number> = {};
  for (const [k, v] of Object.entries(ticketQuantities || {})) {
    const n = Math.floor(Number(v) || 0);
    if (n > 0) billed[k] = n;
  }
  for (const k of new Set([...Object.keys(sums), ...Object.keys(billed)])) {
    if ((sums[k] || 0) !== (billed[k] || 0)) return { ok: false, reason: "lines do not match ticket_quantities" };
  }

  // every date must belong to this event
  const dateIds = [...new Set(lines.map((l) => l.event_date_id as string))];
  try {
    const { data, error } = await supabase
      .from("event_dates")
      .select("id")
      .eq("event_id", eventId)
      .in("id", dateIds);
    if (error) return { ok: false, reason: `date check failed: ${error.message}` };
    if (!data || data.length !== dateIds.length) return { ok: false, reason: "date not on this event" };
  } catch (err) {
    return { ok: false, reason: `date check failed: ${String(err)}` };
  }
  return { ok: true, lines, single: dateIds.length === 1 ? dateIds[0] : null };
}

/** Tickets an order should get. Old orders / no lines: ticket_quantities + order date, as before. */
export async function ticketLinesForOrder(supabase: any, order: any): Promise<TicketLine[]> {
  const raw = order?.line_allocations;
  if (!Array.isArray(raw) || raw.length === 0) return legacyLines(order);
  const res = await checkLineAllocations(supabase, order.event_id, order.ticket_quantities, raw);
  if (!res.ok) {
    console.warn("[ticketLines] line_allocations not used:", order?.id, res.reason);
    return legacyLines(order);
  }
  return res.lines;
}
