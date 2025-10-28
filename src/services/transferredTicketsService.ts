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

      // First, let's check what transfers exist for this user
      const { data: allTransfers, error: allTransfersError } = await supabase
        .from('ticket_transfers')
        .select('id, recipient_id, status, created_at')
        .eq('recipient_id', user.id);

      console.log('All transfers for user:', { allTransfers, allTransfersError });

      // Also check if there are any transfers at all
      const { data: anyTransfers, error: anyTransfersError } = await supabase
        .from('ticket_transfers')
        .select('id, recipient_id, status, created_at')
        .limit(10);

      console.log('Any transfers in database:', { anyTransfers, anyTransfersError });

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
          updated_at,
              ticket:tickets!ticket_transfers_ticket_id_fkey (
                id,
                qr_code,
                status,
                scanned_at,
                scan_location,
                scanned_by,
                event:events!inner (
                  title,
                  date,
                  time,
                  location,
                  image_url
                ),
                ticket_type:ticket_types!inner (
                  name,
                  price
                )
              )
        `)
            .eq('recipient_id', user.id)
            .in('status', ['COMPLETED', 'USED'])
            .order('created_at', { ascending: false });


      if (error) throw error;

          // If we have transfers, try to get sender information separately
          if (transfers && transfers.length > 0) {
            const senderIds = [...new Set(transfers.map(t => t.sender_id))];
            const { data: senders } = await supabase
              .from('profiles')
              .select('id, name, email')
              .in('id', senderIds);

            // Get scanner names for scanned tickets
            const scannerIds = transfers
              .filter(t => t.ticket.scanned_by)
              .map(t => t.ticket.scanned_by);
            
            let scannerNames: Record<string, string> = {};
            if (scannerIds.length > 0) {
              const { data: scanners } = await supabase
                .from('profiles')
                .select('user_id, name')
                .in('user_id', scannerIds);
              
              scannerNames = scanners?.reduce((acc, scanner) => ({
                ...acc,
                [scanner.user_id]: scanner.name
              }), {}) || {};
            }

            // Add sender info and scanner names to transfers
            const transfersWithSenders = transfers.map(transfer => ({
              ...transfer,
              sender: senders?.find(s => s.id === transfer.sender_id) || { name: 'Utilisateur', email: '' },
              ticket: {
                ...transfer.ticket,
                scanned_by_name: transfer.ticket.scanned_by ? scannerNames[transfer.ticket.scanned_by] : undefined
              }
            }));

            return transfersWithSenders;
          }

      return transfers || [];
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

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error fetching transferred tickets count:', error);
      return 0;
    }
  }
}

export const transferredTicketsService = new TransferredTicketsService();
