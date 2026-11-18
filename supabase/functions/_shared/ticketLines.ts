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

/**
 * admin_finalize_payment creates tickets from ticket_quantities and leaves
 * event_date_id null. Fill those nulls from the checked lines. Existing dates
 * are left alone, and a line that does not match the billed quantities is ignored.
 */
export async function stampTicketVisitDates(supabase: any, orderId: string): Promise<number> {
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, event_id, event_date_id, line_allocations, ticket_quantities")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr || !order) return 0;

  const wanted = new Map<string, { ticket_type_id: string; event_date_id: string; left: number }>();
  for (const line of await ticketLinesForOrder(supabase, order)) {
    if (!line.event_date_id || line.quantity <= 0) continue;
    const key = `${line.ticket_type_id}|${line.event_date_id}`;
    const row = wanted.get(key) || {
      ticket_type_id: line.ticket_type_id,
      event_date_id: line.event_date_id,
      left: 0,
    };
    row.left += line.quantity;
    wanted.set(key, row);
  }
  if (!wanted.size) return 0;

  const { data: tickets, error: ticketErr } = await supabase
    .from("tickets")
    .select("id, ticket_type_id, event_date_id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (ticketErr || !tickets?.length) return 0;

  for (const ticket of tickets) {
    if (!ticket.event_date_id) continue;
    const row = wanted.get(`${ticket.ticket_type_id}|${ticket.event_date_id}`);
    if (row) row.left = Math.max(0, row.left - 1);
  }

  let stamped = 0;
  for (const ticket of tickets) {
    if (ticket.event_date_id) continue;
    for (const row of wanted.values()) {
      if (row.ticket_type_id !== ticket.ticket_type_id || row.left <= 0) continue;
      const { error } = await supabase
        .from("tickets")
        .update({ event_date_id: row.event_date_id })
        .eq("id", ticket.id)
        .is("event_date_id", null);
      if (!error) {
        row.left -= 1;
        stamped += 1;
      }
      break;
    }
  }
  if (stamped) console.log(`[ticketLines] stamped visit date on ${stamped} ticket(s) for order ${orderId}`);
  return stamped;
}
