import React, { useState } from 'react';
import { Mail, Send, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useTranslation } from '../../context/TranslationContext';
import toast from 'react-hot-toast';

interface TransferTicketModalProps {
  ticketId: string;
  eventTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferTicketModal({
  ticketId,
  eventTitle,
  onClose,
  onSuccess
}: TransferTicketModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First check if recipient exists
      const { data: recipient } = await supabase
        .from('profiles')
        .select('user_id, email')
        .eq('email', email)
        .single();

      if (!recipient) {
        throw new Error('Recipient not found. Please check the email address.');
      }

      // Create transfer record
      const { error: transferError } = await supabase
        .from('ticket_transfers')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id, // Set the sender_id to current user's ID
          recipient_id: recipient.user_id,
          status: 'PENDING'
        });

      if (transferError) throw transferError;

      toast.success(t('transfers.success.initiated', { default: 'Transfer initiated successfully' }));
      onSuccess();
    } catch (error: any) {
      console.error('Transfer error:', error);
      setError(error.message || t('transfers.error.generic', { default: 'Failed to initiate transfer' }));
      toast.error(error.message || t('transfers.error.generic', { default: 'Failed to initiate transfer' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-semibold leading-6 text-[var(--gray-900)] mb-4">
                  {t('transfers.title', { default: 'Transfer Ticket' })}
                </h3>

                <p className="text-sm text-[var(--gray-600)] mb-4">
                  {t('transfers.description', { 
                    event: eventTitle,
                    default: `Transfer your ticket for "${eventTitle}" to another user`
                  })}
                </p>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('transfers.recipient_email', { default: "Recipient's Email" })}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--gray-400)]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                        placeholder={t('transfers.email_placeholder', { default: "Enter recipient's email" })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          <span>{t('transfers.transferring', { default: 'Transferring...' })}</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          <span>{t('transfers.transfer', { default: 'Transfer Ticket' })}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-3 sm:mt-0 w-full sm:w-auto px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-[var(--gray-50)] border border-gray-300"
                    >
                      {t('common.cancel', { default: 'Cancel' })}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
