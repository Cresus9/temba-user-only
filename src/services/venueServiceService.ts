import { supabase } from '../lib/supabase-client';

// ─────────────────────────────────────────────────────────────────────────────
// venueServiceService
//
// Thin wrappers around the RPCs that manage venue services (add-ons).
// UI components should always call these helpers — never query
// venue_services directly (the RPCs handle venue-wide vs event-specific
// merging, category joins, and active-only filtering).
// ─────────────────────────────────────────────────────────────────────────────

export interface VenueService {
  id: string;
  venue_id: string;
  event_id: string | null;          // null = venue-wide
  category_id: string | null;
  category_name: string | null;     // e.g. "Food & Beverage"
  category_slug: string | null;     // e.g. "food-beverage"
  category_icon: string | null;     // Lucide icon name
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  max_per_order: number | null;
}

/** Human-readable label per category slug */
export const CATEGORY_LABELS: Record<string, string> = {
  'food-beverage':  'Restauration',
  'activities':     'Activités',
  'pool-wellness':  'Piscine & Bien-être',
  'parking':        'Parking',
  'merchandise':    'Boutique',
  'guided-tours':   'Visites guidées',
  'photography':    'Photo souvenir',
  'other':          'Autres',
};

/** Lucide icon name per category slug (used in AddonSelector) */
export const CATEGORY_ICONS: Record<string, string> = {
  'food-beverage':  'UtensilsCrossed',
  'activities':     'Zap',
  'pool-wellness':  'Waves',
  'parking':        'Car',
  'merchandise':    'ShoppingBag',
  'guided-tours':   'Map',
  'photography':    'Camera',
  'other':          'Package',
};

// ── Public queries ────────────────────────────────────────────────────────────

/**
 * All services for a venue (for the venue profile page).
 * Uses `get_venue_services` RPC — returns active only by default.
 */
export async function getServicesForVenue(venueId: string): Promise<VenueService[]> {
  const { data, error } = await supabase.rpc('get_venue_services', {
    p_venue_id:           venueId,
    p_include_inactive:   false,
  });
  if (error) {
    console.error('[venueServiceService] getServicesForVenue:', error);
    return [];
  }
  return (data ?? []) as VenueService[];
}

/**
 * All add-ons available for a specific event.
 * Uses `get_event_addons` RPC — merges venue-wide + event-specific, active only.
 * This is the function checkout and event landing pages should call.
 */
export async function getServicesForEvent(eventId: string): Promise<VenueService[]> {
  const { data, error } = await supabase.rpc('get_event_addons', {
    p_event_id: eventId,
  });
  if (error) {
    console.error('[venueServiceService] getServicesForEvent:', error);
    return [];
  }
  return (data ?? []) as VenueService[];
}

/**
 * Group services by category slug for display.
 * Returns a sorted array of { slug, label, icon, services[] }.
 */
export function groupByCategory(services: VenueService[]) {
  const map = new Map<string, { slug: string; label: string; icon: string; services: VenueService[] }>();

  for (const svc of services) {
    const slug  = svc.category_slug ?? 'other';
    const label = svc.category_name ?? CATEGORY_LABELS[slug] ?? 'Autres';
    const icon  = svc.category_icon ?? CATEGORY_ICONS[slug] ?? 'Package';

    if (!map.has(slug)) map.set(slug, { slug, label, icon, services: [] });
    map.get(slug)!.services.push(svc);
  }

  // Sort each group by sort_order
  for (const group of map.values()) {
    group.services.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  return Array.from(map.values());
}
