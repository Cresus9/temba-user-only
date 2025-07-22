import React, { useState, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useTranslation } from '../../context/TranslationContext';
import TransferRequestCard from './TransferRequestCard';
import toast from 'react-hot-toast';

export default function TransferRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    fetchTransferRequests();
  }, []);

  const fetchTransferRequests = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Log the user ID for debugging
      console.log('Fetching transfers for user:', user.id);

      // First try to get pending requests where user is recipient
      const { data: recipientRequests, error: recipientError } = await supabase
        .from('ticket_transfers')
        .select(`
          id,
          ticket_id,
          sender_id,
          status,
          created_at,
          sender:auth_users!sender_id (
            id,
            email,
            raw_user_meta_data->name
          ),
          ticket:tickets!ticket_id (
            event_id,
            ticket_type_id,
            event:events!event_id (
              title,
              date,
              time
            ),
            ticket_type:ticket_types!ticket_type_id (
              name,
              price
            )
          )
        `)
        .eq('recipient_id', user.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (recipientError) throw recipientError;

      // Log the fetched data for debugging
      console.log('Fetched recipient requests:', recipientRequests);

      // Transform the data to match the expected format
      const formattedRequests = recipientRequests?.map(request => ({
        id: request.id,
        ticket_id: request.ticket_id,
        sender_name: request.sender?.raw_user_meta_data?.name || request.sender?.email?.split('@')[0],
        sender_email: request.sender?.email,
        event_id: request.ticket?.event_id,
        event_title: request.ticket?.event?.title,
        event_date: request.ticket?.event?.date,
        event_time: request.ticket?.event?.time,
        ticket_type_name: request.ticket?.ticket_type?.name,
        ticket_type_price: request.ticket?.ticket_type?.price,
        created_at: request.created_at
      })) || [];

      // Log the formatted requests for debugging
      console.log('Formatted requests:', formattedRequests);
      
      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
      toast.error(t('error.load_transfers', { default: 'Failed to load transfer requests' }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader className="h-8 w-8 animate-spin text-[var(--primary-600)]" />
      </div>
    );
  }

  if (!requests.length) {
    return (
      <div className="text-center py-8">
        <Send className="h-12 w-12 text-[var(--gray-400)] mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">
          {t('transfers.empty.title', { default: 'No Transfer Requests' })}
        </h3>
        <p className="text-[var(--gray-600)]">
          {t('transfers.empty.description', { default: 'You have no pending ticket transfer requests' })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <TransferRequestCard
          key={request.id}
          request={{
            id: request.id,
            ticket_id: request.ticket_id,
            sender: {
              name: request.sender_name,
              email: request.sender_email
            },
            event: {
              id: request.event_id,
              title: request.event_title,
              date: request.event_date,
              time: request.event_time
            },
            ticket_type: {
              name: request.ticket_type_name,
              price: request.ticket_type_price
            },
            created_at: request.created_at
          }}
          onUpdate={fetchTransferRequests}
        />
      ))}
    </div>
  );
}
