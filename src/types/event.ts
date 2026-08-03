export interface EventCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  subcategories?: string[]; // Array of subcategory names
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image_url: string;
  price: number;
  currency: string;
  capacity: number;
  tickets_sold: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  featured: boolean;
  categories?: string[]; // Array of category IDs (legacy support)
  category_relations?: EventCategory[]; // New normalized categories
  ticket_types?: TicketType[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  // ── Geo & timezone (added for diaspora expansion) ──────────────────────
  /** ISO 3166-1 alpha-2 country code (e.g. 'BF', 'FR', 'US'). Defaults to 'BF'. */
  country_code?: string;
  /** Display city name (e.g. 'Ouagadougou', 'Paris', 'New York'). */
  city?: string;
  /** IANA timezone identifier (e.g. 'Africa/Ouagadougou', 'Europe/Paris'). */
  timezone?: string;
  /** Full street / venue address for geocoding and display. */
  address?: string;
  /** State, département or province (optional free-text). */
  region?: string;
  // ── Permanent attraction fields ─────────────────────────────────────────
  /** TRUE for zoos, parks, museums — no fixed end date, always-on sales. */
  is_permanent?: boolean;
  /** Category of permanent attraction. */
  attraction_type?: 'zoo' | 'park' | 'museum' | 'theme_park' | 'aquarium' | 'water_park' | 'cultural_site' | 'adventure_park' | 'other';
  /** When ticket sales begin for a permanent attraction. */
  sales_start_date?: string;
  // ───────────────────────────────────────────────────────────────────────
  created_at?: string;
  updated_at?: string;
}

// ── Permanent venue types ──────────────────────────────────────────────────

export interface VisitDate {
  date: string;               // "YYYY-MM-DD"
  event_date_id: string;
  day_type: 'weekday' | 'weekend' | 'holiday';
  open_time: string | null;
  close_time: string | null;
  capacity: number | null;
  tickets_sold: number;
  remaining: number;
  status: string;
  time_slots: TimeSlot[];
  ticket_types: PermanentTicketType[];
}

export interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string | null;
  capacity: number;
  tickets_sold: number;
  remaining: number;
}

export interface PermanentTicketType {
  id: string;
  name: string;
  description: string;
  base_price: number;
  effective_price: number;   // day-type adjusted price
  color: string;
  max_per_order: number;
  available: number;
}

export interface VisitDateAvailability {
  available: boolean;
  event_date_id?: string;
  day_type?: string;
  open_time?: string;
  close_time?: string;
  remaining_capacity?: number;
  time_slots?: TimeSlot[];
  ticket_types?: PermanentTicketType[];
  message?: string;
}

export interface PermanentPurchaseResult {
  success: boolean;
  order_id?: string;
  total?: number;
  payment_token?: string;
  ticket_ids?: string[];
  visit_date?: string;
  day_type?: string;
  currency?: string;
  error?: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  available: number;
  max_per_order: number;
  // Optional flags managed by admin portal to control sales
  is_active?: boolean; // when false, stop selling
  on_sale?: boolean;   // when false, stop selling
  is_paused?: boolean; // temporary pause
  sales_enabled?: boolean; // authoritative flag from DB/view
  status?: 'AVAILABLE' | 'SOLD_OUT' | 'PAUSED' | string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEventInput {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image_url: string;
  price: number;
  currency: string;
  capacity: number;
  categories: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  // Geo & timezone
  country_code?: string;
  city?: string;
  timezone?: string;
  address?: string;
  region?: string;
  ticket_types: Omit<TicketType, 'id' | 'event_id' | 'created_at' | 'updated_at'>[];
}

export interface CategoryId {
  id: string;
}

export type CategoryIdType = typeof CATEGORIES[number]['id'];