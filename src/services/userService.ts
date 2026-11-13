import { supabase } from '../lib/supabase-client';
import { fetchUserCreditBalanceFromSupabase } from './creditService';
import { calendarDayInZone } from '../utils/formatters';

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

    const today = calendarDayInZone();

    const { data: allTickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        status,
        scanned_at,
        event:events!inner(
          id,
          title,
          date,
          time,
          location,
          city,
          image_url,
          status,
          slug
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'VALID')
      .is('scanned_at', null);

    if (ticketsError) throw ticketsError;

    // Get transferred ticket IDs
    const ticketIds = allTickets?.map(ticket => ticket.id) || [];
    let transferredTicketIds: string[] = [];
    
    if (ticketIds.length > 0) {
      const { data: transfers } = await supabase
        .from('ticket_transfers')
        .select('ticket_id')
        .in('ticket_id', ticketIds)
        .eq('status', 'COMPLETED');
      
      transferredTicketIds = transfers?.map(t => t.ticket_id) || [];
    }

    // Filter out transferred tickets
    const userTickets = (allTickets || []).filter((ticket) => !transferredTicketIds.includes(ticket.id));
    const eventOf = (ticket: { event: unknown }) => {
      const event = ticket.event as { date?: string; title?: string; time?: string; location?: string; city?: string; image_url?: string; id?: string; slug?: string } | { date?: string }[] | null;
      return Array.isArray(event) ? event[0] : event;
    };
    const dayOf = (ticket: { event: unknown }) => String(eventOf(ticket)?.date || '').split('T')[0];
    const upcomingTickets = userTickets.filter((ticket) => dayOf(ticket) >= today);
    const pastTickets = userTickets.filter((ticket) => dayOf(ticket) && dayOf(ticket) < today);
    const totalTickets = userTickets.length;
    const soonest = [...upcomingTickets].sort((a, b) => dayOf(a).localeCompare(dayOf(b)))[0];
    const soonestEvent = soonest ? eventOf(soonest) : null;

    // Spent = completed orders only. Cancelled and refunded orders are excluded.
    const { data: userOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total, status')
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED');

    if (ordersError) throw ordersError;

    const completedIds = (userOrders || []).map((order) => order.id).filter(Boolean);
    let refundedIds = new Set<string>();
    if (completedIds.length > 0) {
      const { data: refunds, error: refundError } = await supabase
        .from('refunds')
        .select('order_id')
        .in('order_id', completedIds);
      if (!refundError) {
        refundedIds = new Set((refunds || []).map((row) => String(row.order_id)));
      }
    }

    const totalSpent = (userOrders || [])
      .filter((order) => String(order.status || '').toUpperCase() === 'COMPLETED' && !refundedIds.has(String(order.id)))
      .reduce((sum, order) => sum + (order.total || 0), 0);

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

    const visibleRecentOrders = (recentOrders || []).filter(order => ['COMPLETED', 'CANCELLED'].includes(order.status || ''));

    const credits = await fetchUserCreditBalanceFromSupabase();

    return {
      stats: {
        upcomingEvents: upcomingTickets.length,
        pastTickets: pastTickets.length,
        totalTickets,
        totalSpent,
        credits,
        nextEvent: soonestEvent?.title
          ? {
              id: soonestEvent.id || '',
              title: soonestEvent.title || '',
              date: soonestEvent.date || '',
              time: soonestEvent.time || '',
              location: soonestEvent.location || '',
              city: soonestEvent.city || '',
              image_url: soonestEvent.image_url || '',
              slug: soonestEvent.slug || '',
            }
          : null,
      },
      recentOrders: visibleRecentOrders.map(order => ({
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
    pastTickets: number;
    totalTickets: number;
    totalSpent: number;
    nextEvent: {
      id: string;
      title: string;
      date: string;
      time: string;
      location: string;
      city: string;
      image_url: string;
      slug: string;
    } | null;
    /** From `user_credits` via Supabase; null if table/RLS unavailable */
    credits: { balance: number; currency: string } | null;
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