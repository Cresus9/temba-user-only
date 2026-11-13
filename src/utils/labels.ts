import { formatCurrency } from './formatters';

/** Known English category names stored in the database, shown in French. */
const CATEGORY_FR: Record<string, string> = {
  cinema: 'Cinéma',
  'music concerts': 'Concerts',
  'music concert': 'Concerts',
  concerts: 'Concerts',
  'concerts de musique': 'Concerts',
  sports: 'Sport',
  sport: 'Sport',
  festivals: 'Festivals',
  festival: 'Festivals',
  theatre: 'Théâtre',
  theater: 'Théâtre',
  nightlife: 'Soirées',
  conference: 'Conférences',
  conferences: 'Conférences',
  comedy: 'Humour',
  family: 'Famille',
  attractions: 'Attractions',
};

export function categoryLabelFr(name?: string | null): string {
  if (!name) return '';
  const key = name.trim().toLowerCase();
  return CATEGORY_FR[key] ?? name;
}

/** Known English ticket names shown on public cards. */
const TICKET_NAME_FR: Record<string, string> = {
  'general admission': 'Entrée simple',
  'general admission ticket': 'Billet entrée générale',
  'standard admission ticket': 'Billet d’entrée',
  'standard admission': 'Entrée',
  'vip admission ticket': 'Entrée VIP',
  adult: 'Adulte',
  child: 'Enfant',
  'family pack': 'Pack famille',
  free: 'Gratuit',
  'free entry': 'Entrée gratuite',
};

export function ticketNameFr(name?: string | null): string {
  if (!name) return '';
  const mapped = TICKET_NAME_FR[name.trim().toLowerCase()];
  return mapped ?? name;
}

export interface SellableTicket {
  price?: number | null;
  available?: number | null;
  sales_enabled?: boolean | null;
  is_paused?: boolean | null;
  on_sale?: boolean | null;
  is_active?: boolean | null;
  status?: string | null;
}

export function isTicketSellable(ticket: SellableTicket): boolean {
  if (ticket.sales_enabled === false) return false;
  if (ticket.is_paused === true) return false;
  if (ticket.on_sale === false) return false;
  if (ticket.is_active === false) return false;
  const status = (ticket.status ?? '').toUpperCase();
  if (status === 'PAUSED' || status === 'SOLD_OUT' || status === 'DISABLED') return false;
  if (typeof ticket.available === 'number' && ticket.available <= 0) return false;
  return true;
}

export type PriceTone = 'free' | 'paid' | 'soon' | 'soldout';

export function eventPricePresentation(event: {
  price?: number | null;
  currency?: string | null;
  ticket_types?: SellableTicket[] | null;
}): { tone: PriceTone; label: string } {
  const types = event.ticket_types ?? [];
  const sellable = types.filter(isTicketSellable);

  if (types.length > 0 && sellable.length === 0) {
    const allGone = types.every(
      (ticket) =>
        (typeof ticket.available === 'number' && ticket.available <= 0) ||
        (ticket.status ?? '').toUpperCase() === 'SOLD_OUT',
    );
    return allGone
      ? { tone: 'soldout', label: 'Complet' }
      : { tone: 'soon', label: 'Bientôt en vente' };
  }

  const prices = sellable.length
    ? sellable.map((ticket) => Number(ticket.price ?? 0))
    : [Number(event.price ?? 0)];
  const min = prices.length ? Math.min(...prices) : 0;
  if (!Number.isFinite(min) || min <= 0) return { tone: 'free', label: 'Gratuit' };
  return {
    tone: 'paid',
    label: `Dès ${formatCurrency(min, event.currency ?? 'XOF')}`,
  };
}

export type TicketVisualState =
  | 'valid'
  | 'scanned'
  | 'transferred'
  | 'cancelled'
  | 'postponed'
  | 'offline';

export function ticketStateFromRecord(ticket: {
  status?: string | null;
  scanned_at?: string | null;
}): TicketVisualState {
  const status = (ticket.status ?? '').toUpperCase();
  if (ticket.scanned_at || status === 'SCANNED' || status === 'USED') return 'scanned';
  if (status === 'TRANSFERRED') return 'transferred';
  if (status === 'CANCELLED' || status === 'REFUNDED' || status === 'VOID') return 'cancelled';
  if (status === 'POSTPONED') return 'postponed';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  return 'valid';
}

/** Visual tier from the ticket name and price. No extra DB column. */
export type TicketTier = 'pass' | 'vip' | 'guest' | 'free' | 'multi';

export function inferTicketTier(name?: string | null, price?: number | null): TicketTier {
  const n = (name ?? '').toLowerCase();
  if (/invit[eé]|honneur|guest of honour|guest of honor/.test(n)) return 'guest';
  if (/multi|jours|jour\b|pass\s*\d/.test(n) && /jour|day|pass/.test(n)) return 'multi';
  if (/\bvip\b/.test(n)) return 'vip';
  if (price === 0 || /gratuit|free/.test(n)) return 'free';
  return 'pass';
}

export function tierLabel(tier: TicketTier, name?: string | null): string {
  if (tier === 'vip') return 'VIP';
  if (tier === 'guest') return 'Invité d’honneur';
  if (tier === 'free') return 'Gratuit';
  if (tier === 'multi') return ticketNameFr(name) || 'Pass multi-jours';
  return 'Pass';
}
