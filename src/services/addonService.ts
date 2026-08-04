import type { VenueService } from './venueServiceService';
import { getServicesForEvent } from './venueServiceService';

// ─────────────────────────────────────────────────────────────────────────────
// addonService
//
// Checkout-side logic for venue service add-ons.
// Keeps all price / quantity math in one place so web and mobile stay in sync.
// ─────────────────────────────────────────────────────────────────────────────

/** Map of serviceId → quantity chosen by the user */
export type AddonSelection = Record<string, number>;

export interface AddonLineItem {
  service:    VenueService;
  quantity:   number;
  unit_price: number;
  line_total: number;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function getAvailableAddons(eventId: string): Promise<VenueService[]> {
  return getServicesForEvent(eventId);
}

// ── Math helpers ──────────────────────────────────────────────────────────────

export function computeLineItems(
  selections: AddonSelection,
  addons: VenueService[],
): AddonLineItem[] {
  return addons
    .filter(a => (selections[a.id] ?? 0) > 0)
    .map(a => {
      const qty = selections[a.id]!;
      return {
        service:    a,
        quantity:   qty,
        unit_price: a.price,
        line_total: a.price * qty,
      };
    });
}

export function computeAddonsTotal(
  selections: AddonSelection,
  addons: VenueService[],
): number {
  return addons.reduce((sum, a) => sum + a.price * (selections[a.id] ?? 0), 0);
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateSelections(
  selections: AddonSelection,
  addons: VenueService[],
): { valid: boolean; error?: string } {
  for (const addon of addons) {
    const qty = selections[addon.id] ?? 0;
    if (qty < 0) return { valid: false, error: `Quantité invalide pour « ${addon.name} »` };
    if (addon.max_per_order !== null && qty > addon.max_per_order) {
      return {
        valid: false,
        error: `Maximum ${addon.max_per_order} pour « ${addon.name} »`,
      };
    }
  }
  return { valid: true };
}

// ── Build ticket_addons payload ───────────────────────────────────────────────
// Call this when creating ticket_addons rows after a successful payment.

export interface TicketAddonInsert {
  ticket_id:         string;
  venue_service_id:  string;
  order_id:          string;
  quantity:          number;
  unit_price:        number;   // snapshot — must be copied, not referenced later
  line_total:        number;
}

export function buildTicketAddonInserts(
  ticketId:   string,
  orderId:    string,
  selections: AddonSelection,
  addons:     VenueService[],
): TicketAddonInsert[] {
  return computeLineItems(selections, addons).map(item => ({
    ticket_id:        ticketId,
    venue_service_id: item.service.id,
    order_id:         orderId,
    quantity:         item.quantity,
    unit_price:       item.unit_price,
    line_total:       item.line_total,
  }));
}
