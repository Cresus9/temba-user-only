import type { CategoryId } from '../constants/categories';

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

export interface EventOrganizer {
  user_id: string;
  name: string;
  email: string;
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
  categories?: CategoryId[] | null; // Array of category IDs (legacy support)
  category_relations?: EventCategory[]; // New normalized categories
  ticket_types?: TicketType[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  organizer_id?: string | null;
  organizer?: EventOrganizer | null;
  avg_rating?: number | null;
  review_count?: number | null;
  venue_layout_id?: string | null;
  created_at?: string;
  updated_at?: string;
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
  categories: CategoryId[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  ticket_types: Omit<TicketType, 'id' | 'event_id' | 'created_at' | 'updated_at'>[];
}

export type CategoryIdType = CategoryId;