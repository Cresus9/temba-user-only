import React, { useState } from 'react';
import { Send, Check, X, Loader, Ticket } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useTranslation } from '../../context/TranslationContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface TransferRequest {
  id: string;
  ticket_id: string;
  sender: {
    name: string;
    email: string;
  };
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
  };
  ticket_type: {
    name: string;
    price: number;
  };
  created_at: string;
}

interface TransferRequestCardProps {
  request: TransferRequest;
  onUpdate: () => void;
}

export default function TransferRequestCard({ request, onUpdate }: TransferRequestCardProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleResponse = async (accept: boolean) => {
    try {
      setLoading(true);

      if (accept) {
        // Accept transfer
        const { error: transferError } = await supabase
          .from('ticket_transfers')
          .update({ status: 'COMPLETED' })
          .eq('id', request.id);

        if (transferError) throw transferError;

        toast.success(t('transfers.success.accept', { default: 'Transfer accepted successfully' }));
      } else {
        // Reject transfer
        const { error } = await supabase
          .from('ticket_transfers')
          .update({ status: 'REJECTED' })
          .eq('id', request.id);

        if (error) throw error;
        toast.success(t('transfers.success.reject', { default: 'Transfer rejected successfully' }));
      }

      onUpdate();
    } catch (error: any) {
      console.error('Transfer response error:', error);
      toast.error(
        accept 
          ? t('transfers.error.accept', { default: 'Failed to accept transfer' })
          : t('transfers.error.reject', { default: 'Failed to reject transfer' })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOrderTickets = () => {
    navigate(`/events/${request.event.id}`);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">{request.event.title}</div>
          <div className="text-sm text-gray-500">
            {t('transfers.from', { 
              name: request.sender.name, 
              email: request.sender.email,
              default: `From: ${request.sender.name} (${request.sender.email})`
            })}
          </div>
          <div className="text-sm text-gray-500">
            {t('transfers.created', {
              date: new Date(request.created_at).toLocaleDateString(),
              default: `Created: ${new Date(request.created_at).toLocaleDateString()}`
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => handleResponse(true)}
              disabled={loading}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
              title={t('transfers.accept', { default: 'Accept Transfer' })}
            >
              {loading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => handleResponse(false)}
              disabled={loading}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
              title={t('transfers.reject', { default: 'Reject Transfer' })}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={handleOrderTickets}
            className="flex items-center justify-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Ticket className="h-5 w-5" />
            {t('transfers.order_tickets', { default: 'Order Tickets' })}
          </button>
        </div>
      </div>
    </div>
  );
}