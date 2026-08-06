import { supabase } from '../lib/supabase-client';

// ─────────────────────────────────────────────────────────────────────────────
// foodMenuService
//
// Read-only access to the event food menu (public — anon + authenticated).
// Use `getMenuForEvent` in all UI components — it calls the
// `get_event_food_menu` RPC which returns the full nested structure in one
// round-trip, sorted by featured → sort_order → name.
// ─────────────────────────────────────────────────────────────────────────────

export interface FoodMenuItem {
  id:           string;
  category_id:  string;
  name:         string;
  description:  string | null;
  price:        number;
  image_url:    string | null;
  is_available: boolean;
  is_vegetarian: boolean;
  is_featured:  boolean;
  sort_order:   number;
}

export interface FoodMenuCategory {
  id:         string;
  event_id:   string;
  name:       string;
  sort_order: number;
  items:      FoodMenuItem[];
}

/** Map of menu_item_id → quantity chosen by the user */
export type FoodSelection = Record<string, number>;

// ── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Returns the full menu for an event (available items only).
 * Calls `get_event_food_menu` RPC — one call, full nested data.
 */
export async function getMenuForEvent(eventId: string): Promise<FoodMenuCategory[]> {
  const { data, error } = await supabase.rpc('get_event_food_menu', {
    p_event_id: eventId,
  });

  if (error) {
    console.error('[foodMenuService] getMenuForEvent:', error);
    return [];
  }

  return (data ?? []) as FoodMenuCategory[];
}

// ── Math helpers ──────────────────────────────────────────────────────────────

export function computeFoodTotal(
  selections: FoodSelection,
  categories: FoodMenuCategory[],
): number {
  return categories.reduce((catSum, cat) =>
    catSum + cat.items.reduce((itemSum, item) =>
      itemSum + item.price * (selections[item.id] ?? 0), 0), 0);
}

export interface FoodLineItem {
  item:       FoodMenuItem;
  category:   string;
  quantity:   number;
  line_total: number;
}

export function computeFoodLineItems(
  selections: FoodSelection,
  categories: FoodMenuCategory[],
): FoodLineItem[] {
  const lines: FoodLineItem[] = [];
  for (const cat of categories) {
    for (const item of cat.items) {
      const qty = selections[item.id] ?? 0;
      if (qty > 0) {
        lines.push({ item, category: cat.name, quantity: qty, line_total: item.price * qty });
      }
    }
  }
  return lines;
}

/** Total number of individual items selected */
export function countFoodSelections(selections: FoodSelection): number {
  return Object.values(selections).reduce((s, q) => s + q, 0);
}
