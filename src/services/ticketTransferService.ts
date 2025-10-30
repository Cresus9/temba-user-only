import { supabase } from '../lib/supabase-client';

export interface TransferTicketRequest {
  ticketId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  message?: string;
}

export interface TransferTicketResponse {
  success: boolean;
  transferId?: string;
  error?: string;
  message?: string;
  instantTransfer?: boolean;
}

export interface TransferHistory {
  id: string;
  ticket_id: string;
  sender_id: string;
  recipient_id: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  message: string | null;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  sender: {
    name: string;
    email: string;
  };
  recipient: {
    name: string;
    email: string;
  };
}

class TicketTransferService {
  /**
   * Transfer a ticket to another user instantly
   */
  async transferTicket(request: TransferTicketRequest): Promise<TransferTicketResponse> {
    try {
      // Validate input
        if (!request.recipientEmail && !request.recipientPhone) {
          return {
            success: false,
            error: 'L\'email ou le téléphone du destinataire est requis'
          };
        }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return {
          success: false,
          error: 'Utilisateur non authentifié'
        };
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('transfer-ticket', {
        body: request,
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        console.error('Transfer ticket function error:', error);
        return {
          success: false,
          error: 'Échec du transfert du billet'
        };
      }

      return data;

    } catch (error) {
      console.error('Transfer ticket error:', error);
      return {
        success: false,
        error: 'Une erreur inattendue s\'est produite'
      };
    }
  }

  /**
   * Get transfer history for a user
   */
  async getTransferHistory(userId?: string): Promise<TransferHistory[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        throw new Error('Utilisateur non authentifié');
      }

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
          sender:profiles!ticket_transfers_sender_id_fkey (
            name,
            email
          ),
          recipient:profiles!ticket_transfers_recipient_id_fkey (
            name,
            email
          )
        `)
        .or(`sender_id.eq.${targetUserId},recipient_id.eq.${targetUserId}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return transfers || [];
    } catch (error) {
      console.error('Get transfer history error:', error);
      return [];
    }
  }

  /**
   * Send transfer notifications
   */
  private async sendTransferNotifications(params: {
    ticketId: string;
    fromUserId: string;
    toUserId: string | null;
    toEmail: string | undefined;
    toPhone: string | undefined;
    toName: string | undefined;
    eventTitle: string;
    message?: string;
  }) {
    try {
      // Get sender info
      const { data: sender } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', params.fromUserId)
        .single();

      // Create notification for recipient
      if (params.toUserId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: params.toUserId,
            type: 'ticket_received',
            title: 'Ticket Transferred to You',
            message: `${sender?.name || 'Someone'} transferred a ticket for "${params.eventTitle}" to you`,
            data: {
              ticket_id: params.ticketId,
              from_user: sender?.name,
              event_title: params.eventTitle,
              message: params.message
            }
          });
      }

      // Send email notification if email provided
      if (params.toEmail) {
        // TODO: Implement email notification
        console.log('Email notification would be sent to:', params.toEmail);
      }

      // Send SMS notification if phone provided
      if (params.toPhone) {
        // TODO: Implement SMS notification
        console.log('SMS notification would be sent to:', params.toPhone);
      }

    } catch (error) {
      console.error('Send transfer notifications error:', error);
    }
  }
}

export const ticketTransferService = new TicketTransferService();
