import { supabase } from '../lib/supabase-client';

export interface TransferredTicket {
  id: string;
  ticket_id: string;
  sender_id: string;
  recipient_id: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  message: string | null;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'USED';
  created_at: string;
  updated_at: string;
  sender?: {
    name: string;
    email: string;
  };
      ticket: {
        id: string;
        qr_code: string;
        status: string;
        scanned_at?: string;
        scan_location?: string;
        scanned_by?: string;
        scanned_by_name?: string;
        event: {
          title: string;
          date: string;
          time: string;
          location: string;
          image_url: string;
        };
        ticket_type: {
          name: string;
          price: number;
        };
      };
}

class TransferredTicketsService {
  async getTransferredTickets(): Promise<TransferredTicket[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Fetching transferred tickets for user:', user.id);

      // Step 1: Get transfers (simple query that works)
      const { data: transfers, error } = await supabase
        .from('ticket_transfers')
        .select(`
          id,
          ticket_id,
          sender_id,
          recipient_id,
          recipient_email,
          recipient_phone,
          recipient_name,
          message,
          status,
          created_at,
          updated_at
        `)
        .eq('recipient_id', user.id)
        .in('status', ['COMPLETED', 'USED'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transfers:', error);
        throw error;
      }

      console.log('Transfers found:', transfers?.length || 0);

      if (!transfers || transfers.length === 0) {
        return [];
      }

      // Step 2: Get ticket details separately
      const ticketIds = transfers.map(t => t.ticket_id);
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          qr_code,
          status,
          scanned_at,
          scan_location,
          scanned_by,
          event_id,
          ticket_type_id
        `)
        .in('id', ticketIds);

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        throw ticketsError;
      }

      // Step 3: Get event details
      const eventIds = [...new Set(tickets?.map(t => t.event_id).filter(Boolean) || [])];
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          date,
          time,
          location,
          image_url
        `)
        .in('id', eventIds);

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        throw eventsError;
      }

      // Step 4: Get ticket type details
      const ticketTypeIds = [...new Set(tickets?.map(t => t.ticket_type_id).filter(Boolean) || [])];
      const { data: ticketTypes, error: ticketTypesError } = await supabase
        .from('ticket_types')
        .select(`
          id,
          name,
          price
        `)
        .in('id', ticketTypeIds);

      if (ticketTypesError) {
        console.error('Error fetching ticket types:', ticketTypesError);
        throw ticketTypesError;
      }

      // Step 5: Get sender information
      const senderIds = [...new Set(transfers.map(t => t.sender_id))];
      const { data: senders, error: sendersError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', senderIds);

      if (sendersError) {
        console.error('Error fetching senders:', sendersError);
        throw sendersError;
      }

      // Step 6: Get scanner names for scanned tickets
      const scannerIds = tickets
        ?.filter(t => t.scanned_by)
        .map(t => t.scanned_by) || [];
      
      let scannerNames: Record<string, string> = {};
      if (scannerIds.length > 0) {
        const { data: scanners, error: scannersError } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', scannerIds);
        
        if (!scannersError && scanners) {
          scannerNames = scanners.reduce((acc, scanner) => ({
            ...acc,
            [scanner.user_id]: scanner.name
          }), {});
        }
      }

      // Step 7: Combine all data
      const enrichedTransfers = transfers.map(transfer => {
        const ticket = tickets?.find(t => t.id === transfer.ticket_id);
        const event = events?.find(e => e.id === ticket?.event_id);
        const ticketType = ticketTypes?.find(tt => tt.id === ticket?.ticket_type_id);
        const sender = senders?.find(s => s.user_id === transfer.sender_id);

        return {
          ...transfer,
          sender: sender || { name: 'Utilisateur', email: '' },
          ticket: ticket ? {
            ...ticket,
            event: event || { title: 'Unknown Event', date: '', time: '', location: '', image_url: '' },
            ticket_type: ticketType || { name: 'Unknown Type', price: 0 },
            scanned_by_name: ticket.scanned_by ? scannerNames[ticket.scanned_by] : undefined
          } : null
        };
      }).filter(transfer => transfer.ticket !== null);

      console.log('Enriched transfers:', enrichedTransfers.length);
      return enrichedTransfers as TransferredTicket[];

    } catch (error) {
      console.error('Error fetching transferred tickets:', error);
      return [];
    }
  }

  async getTransferredTicketsCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('ticket_transfers')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .in('status', ['COMPLETED', 'USED']);

      if (error) {
        console.error('Error fetching transferred tickets count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching transferred tickets count:', error);
      return 0;
    }
  }
}

export const transferredTicketsService = new TransferredTicketsService();
