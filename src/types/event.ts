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
  ticket_types: Omit<TicketType, 'id' | 'event_id' | 'created_at' | 'updated_at'>[];
}

export interface CategoryId {
  id: string;
}

export type CategoryIdType = typeof CATEGORIES[number]['id'];