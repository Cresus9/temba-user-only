import { supabase } from '../lib/supabase-client';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  role: string;
  status: string;
}

class UserService {
  async getProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDashboardData(): Promise<DashboardStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const now = new Date().toISOString();

    // Get upcoming events count
    const { data: upcomingTickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        event:events!inner(
          date,
          status
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'VALID')
      .gte('event.date', now)
      .eq('event.status', 'PUBLISHED');

    if (ticketsError) throw ticketsError;

    // Get total tickets
    const { count: totalTickets } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'VALID');

    // Get total spent from completed orders
    const { data: completedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('total')
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED');

    if (ordersError) throw ordersError;

    const totalSpent = completedOrders?.reduce((sum, order) => sum + order.total, 0) || 0;

    // Get recent orders with event details
    const { data: recentOrders, error: recentError } = await supabase
      .from('order_details')
      .select(`
        id,
        total,
        status,
        event_title,
        event_date,
        event_time,
        event_location,
        event_currency
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    return {
      stats: {
        upcomingEvents: upcomingTickets?.length || 0,
        totalTickets: totalTickets || 0,
        totalSpent
      },
      recentOrders: recentOrders?.map(order => ({
        id: order.id,
        eventName: order.event_title,
        total: order.total,
        status: order.status,
        date: order.event_date,
        time: order.event_time,
        location: order.event_location,
        currency: order.event_currency
      })) || []
    };
  }
}

export interface DashboardStats {
  stats: {
    upcomingEvents: number;
    totalTickets: number;
    totalSpent: number;
  };
  recentOrders: Array<{
    id: string;
    eventName: string;
    total: number;
    status: string;
    date: string;
    time: string;
    location: string;
    currency: string;
  }>;
}

export const userService = new UserService();