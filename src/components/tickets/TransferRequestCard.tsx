import React, { useState } from 'react';
import { Send, Check, X, Loader, Ticket, User, Calendar, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useTranslation } from '../../context/TranslationContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

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

const monoFamily = 'ui-monospace, SFMono-Regular, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

export default function TransferRequestCard({ request, onUpdate }: TransferRequestCardProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'accept' | 'reject' | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleResponse = async (accept: boolean) => {
    try {
      setLoading(true);
      setAction(accept ? 'accept' : 'reject');

      const { error } = await supabase
        .from('ticket_transfers')
        .update({ status: accept ? 'COMPLETED' : 'REJECTED' })
        .eq('id', request.id);

      if (error) throw error;

      toast.success(
        accept
          ? t('transfers.success.accept', { default: 'Transfert accepté' })
          : t('transfers.success.reject', { default: 'Transfert refusé' })
      );

      onUpdate();
    } catch (error: any) {
      console.error('Transfer response error:', error);
      toast.error(
        accept
          ? t('transfers.error.accept', { default: "Échec de l'acceptation" })
          : t('transfers.error.reject', { default: 'Échec du refus' })
      );
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleOrderTickets = () => {
    navigate(`/events/${request.event.id}`);
  };

  const reqCode = request.id.slice(0, 8).toUpperCase();
  const senderInitial = (request.sender.name || request.sender.email || '?')[0]?.toUpperCase() || '?';

  return (
    <article className="bg-paper rounded-xl2 border border-line shadow-card hover:border-accent/60 transition-all overflow-hidden">
      {/* Header band */}
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 bg-accent/15 border-b border-accent/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid place-items-center w-6 h-6 rounded-full bg-accent text-ink flex-shrink-0">
            <Send className="h-3 w-3" />
          </div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink tabular-nums"
            style={{ fontFamily: monoFamily }}
          >
            REQ · {reqCode}
            <span className="mx-1.5 text-ink-mute">·</span>
            <span className="text-ink-mute">En attente</span>
          </p>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute tabular-nums hidden sm:inline"
          style={{ fontFamily: monoFamily }}
        >
          {new Date(request.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          })}
        </span>
      </header>

      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Sender avatar */}
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-cream-deep ring-1 ring-line text-ink font-bold text-[15px] flex-shrink-0 self-start">
            {senderInitial}
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute mb-0.5"
              style={{ fontFamily: monoFamily }}
            >
              De la part de
            </p>
            <p className="text-[13px] text-ink leading-tight mb-0.5">
              <span className="font-bold">{request.sender.name || 'Un utilisateur'}</span>
              {request.sender.email && (
                <span
                  className="block text-[11px] text-ink-mute mt-0.5 truncate"
                  style={{ fontFamily: monoFamily }}
                >
                  {request.sender.email}
                </span>
              )}
            </p>

            <div className="mt-3 p-3 rounded-xl2 bg-cream border border-line">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute mb-1"
                style={{ fontFamily: monoFamily }}
              >
                Billet proposé
              </p>
              <h3
                className="text-[14px] font-bold text-ink leading-tight mb-2 line-clamp-1"
                style={{ fontFamily: displayFamily }}
              >
                {request.event.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-mute">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-brand" />
                  {request.event.date
                    ? new Date(request.event.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
                {request.event.time && (
                  <>
                    <span aria-hidden className="text-line">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Clock className="h-3 w-3" />
                      {request.event.time}
                    </span>
                  </>
                )}
              </div>
              {(request.ticket_type?.name || request.ticket_type?.price) && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-line">
                  <span className="text-[11px] font-bold text-ink">
                    {request.ticket_type?.name || 'Billet'}
                  </span>
                  {request.ticket_type?.price != null && (
                    <span
                      className="text-[12px] font-bold text-ink tabular-nums"
                      style={{ fontFamily: displayFamily }}
                    >
                      {formatCurrency(request.ticket_type.price, 'XOF')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-3 border-t border-line flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => handleResponse(false)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 border border-line bg-paper text-ink rounded-lg text-[12px] font-bold hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex-1 sm:flex-none"
          >
            {loading && action === 'reject' ? (
              <>
                <Loader className="h-3.5 w-3.5 animate-spin" />
                Refus...
              </>
            ) : (
              <>
                <X className="h-3.5 w-3.5" />
                Refuser
              </>
            )}
          </button>
          <button
            onClick={handleOrderTickets}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 border border-line bg-paper text-ink rounded-lg text-[12px] font-bold hover:border-brand hover:text-brand transition-colors disabled:opacity-50 flex-1 sm:flex-none"
            title={t('transfers.order_tickets', { default: 'Commander des billets' })}
          >
            <Ticket className="h-3.5 w-3.5" />
            Voir l'événement
          </button>
          <button
            onClick={() => handleResponse(true)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[12px] font-bold transition-colors shadow-card disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {loading && action === 'accept' ? (
              <>
                <Loader className="h-3.5 w-3.5 animate-spin" />
                Acceptation...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Accepter
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
