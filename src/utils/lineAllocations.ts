/**
 * Multi-date purchases: one order, one ticket line per (ticket type, date).
 *
 * Same shape the mobile app already writes to `orders.line_allocations`:
 *   [{ ticket_type_id, event_date_id, quantity }]
 * `ticket_quantities` stays the per-type total so prices, stock checks and
 * order totals are unchanged. `orders.event_date_id` is only set when the
 * order has exactly one date; with several dates it stays null and every
 * ticket takes its date from its line.
 */
export interface LineAllocation {
  ticket_type_id: string;
  event_date_id: string;
  quantity: number;
}

/** Kill switch: set VITE_MULTI_DATE_CART=off to go back to one date per order. */
export const MULTI_DATE_CART = String(import.meta.env.VITE_MULTI_DATE_CART || '').toLowerCase() !== 'off';

/** Same quantities for every chosen date. */
export function buildLineAllocations(perDate: Record<string, number>, dateIds: string[]): LineAllocation[] {
  const lines: LineAllocation[] = [];
  for (const event_date_id of dateIds) {
    for (const [ticket_type_id, quantity] of Object.entries(perDate)) {
      const qty = Math.floor(Number(quantity) || 0);
      if (qty > 0) lines.push({ ticket_type_id, event_date_id, quantity: qty });
    }
  }
  return lines;
}

/** Per-type totals, the `ticket_quantities` the order stores. */
export function sumAllocations(lines: LineAllocation[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of lines) {
    out[line.ticket_type_id] = (out[line.ticket_type_id] || 0) + line.quantity;
  }
  return out;
}

export function distinctDateIds(lines?: LineAllocation[] | null): string[] {
  return [...new Set((lines || []).map((line) => line.event_date_id).filter(Boolean))];
}

/** Cleans what came from navigation state / sessionStorage. */
export function sanitizeAllocations(raw: unknown): LineAllocation[] | null {
  if (!Array.isArray(raw)) return null;
  const lines = raw
    .map((row: any) => ({
      ticket_type_id: String(row?.ticket_type_id || ''),
      event_date_id: String(row?.event_date_id || ''),
      quantity: Math.floor(Number(row?.quantity) || 0),
    }))
    .filter((row) => row.ticket_type_id && row.event_date_id && row.quantity > 0);
  return lines.length ? lines : null;
}

/**
 * What the order rows get. Single date (or none): exactly today's behaviour,
 * event_date_id set and no line_allocations. Several dates: line_allocations
 * set and event_date_id null.
 */
export function orderDateFields(
  eventDateId: string | null | undefined,
  lines?: LineAllocation[] | null,
): { event_date_id: string | null; line_allocations: LineAllocation[] | null } {
  const clean = sanitizeAllocations(lines);
  if (clean && distinctDateIds(clean).length > 1) {
    return { event_date_id: null, line_allocations: clean };
  }
  return { event_date_id: eventDateId || distinctDateIds(clean)[0] || null, line_allocations: null };
}
