import React, { useState, useEffect } from 'react';
import {
  Send,
  Loader,
  Eye,
  Calendar,
  MapPin,
  Clock,
  User,
  X,
  Inbox,
  CheckCircle2,
  XCircle,
  CircleSlash,
} from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useTranslation } from '../../context/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';
import Image from '../common/Image';

interface SentTicket {
  id: string;
  ticket_id: string;
  recipient_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  message: string | null;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  ticket: {
    id: string;
    qr_code: string;
    status: string;
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
  recipient?: {
    name: string;
    email: string;
  };
}

interface SentTicketsListProps {
  onTicketClick?: (ticket: SentTicket) => void;
}

const monoFamily = 'ui-monospace, SFMono-Regular, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

export default function SentTicketsList({ onTicketClick }: SentTicketsListProps) {
  const [tickets, setTickets] = useState<SentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SentTicket | null>(null);
  const { t } = useTranslation();
  const { profile } = useAuth();

  useEffect(() => {
    fetchSentTickets();
  }, []);

  const fetchSentTickets = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: transfers, error } = await supabase
        .from('ticket_transfers')
        .select(
          `
          id,
          ticket_id,
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
            event:events (
              title,
              date,
              time,
              location,
              image_url
            ),
            ticket_type:ticket_types (
              name,
              price
            )
          )
        `
        )
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (transfers && transfers.length > 0) {
        const recipientIds = [...new Set(transfers.map((t) => t.recipient_id).filter(Boolean))];
        let recipientsMap: Record<string, { name: string; email: string }> = {};

        if (recipientIds.length > 0) {
          const { data: recipients } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', recipientIds);

          recipientsMap = (recipients || []).reduce((acc, recipient) => {
            acc[recipient.id] = { name: recipient.name, email: recipient.email };
            return acc;
          }, {} as Record<string, { name: string; email: string }>);
        }

        const transfersWithRecipients = transfers.map((transfer) => ({
          ...transfer,
          recipient: transfer.recipient_id ? recipientsMap[transfer.recipient_id] : undefined,
        }));

        setTickets(transfersWithRecipients as unknown as SentTicket[]);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('Error fetching sent tickets:', error);
      toast.error('Erreur lors du chargement des billets envoyés');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const statusInfo = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          label: 'Transféré',
          cls: 'bg-green-50 text-green-700 ring-green-200',
          Icon: CheckCircle2,
        };
      case 'PENDING':
        return {
          label: 'En attente',
          cls: 'bg-amber-50 text-amber-800 ring-amber-200',
          Icon: Clock,
        };
      case 'REJECTED':
        return {
          label: 'Rejeté',
          cls: 'bg-red-50 text-red-700 ring-red-200',
          Icon: XCircle,
        };
      case 'CANCELLED':
        return {
          label: 'Annulé',
          cls: 'bg-cream text-ink-mute ring-line',
          Icon: CircleSlash,
        };
      default:
        return {
          label: status,
          cls: 'bg-cream text-ink-mute ring-line',
          Icon: Clock,
        };
    }
  };

  const recipientLabel = (ticket: SentTicket) =>
    ticket.recipient
      ? ticket.recipient.name
      : ticket.recipient_email || ticket.recipient_phone || 'Destinataire non inscrit';

  const handleTicketClick = (ticket: SentTicket) => {
    setSelectedTicket(ticket);
    onTicketClick?.(ticket);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="flex flex-col items-center gap-3">
          <div className="grid place-items-center w-12 h-12 rounded-full bg-brand-50">
            <Loader className="h-5 w-5 animate-spin text-brand" />
          </div>
          <p className="text-[12px] text-ink-mute">Chargement des billets envoyés...</p>
        </div>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="text-center py-14 px-4">
        <div className="grid place-items-center w-16 h-16 rounded-full bg-cream-deep mx-auto mb-4">
          <Send className="h-7 w-7 text-ink-mute" />
        </div>
        <p className="eyebrow !mb-1">Aucun envoi</p>
        <h3 className="text-ink mb-2">Vous n'avez transféré aucun billet</h3>
        <p className="text-[13px] text-ink-mute max-w-sm mx-auto leading-relaxed">
          Les billets que vous transférez à vos proches apparaîtront ici avec leur statut en temps réel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-line">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-brand-50 ring-1 ring-brand-100 flex-shrink-0">
            <Send className="h-5 w-5 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="eyebrow !mb-1">Envoyés</p>
            <h2
              className="!text-[20px] md:!text-[22px] !leading-[1.15] text-ink font-bold tracking-tight !mb-0"
              style={{ fontFamily: displayFamily }}
            >
              Billets envoyés
            </h2>
            <p className="text-[12px] text-ink-mute mt-1">
              Suivez le statut des billets que vous avez transférés.
            </p>
          </div>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute tabular-nums hidden sm:inline-flex flex-shrink-0 mt-2"
          style={{ fontFamily: monoFamily }}
        >
          {String(tickets.length).padStart(2, '0')} TRANSFERT{tickets.length > 1 ? 'S' : ''}
        </span>
      </div>

      {/* Tickets */}
      <div className="space-y-3">
        {tickets.map((ticket) => {
          const tktCode = ticket.ticket?.id?.slice(0, 8).toUpperCase() ?? '—';
          const status = statusInfo(ticket.status);
          const StatusIcon = status.Icon;

          return (
            <article
              key={ticket.id}
              onClick={() => handleTicketClick(ticket)}
              className="bg-paper rounded-xl2 border border-line shadow-card hover:border-brand/40 hover:shadow-card-hover transition-all cursor-pointer group overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row gap-4 p-4">
                {/* Poster */}
                {ticket.ticket?.event?.image_url && (
                  <div className="relative w-full sm:w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-cream-deep ring-1 ring-line">
                    <Image
                      src={ticket.ticket.event.image_url}
                      alt={ticket.ticket.event.title || 'Événement'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* "SENT" stamp */}
                    <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.08em] bg-brand text-paper shadow-card">
                      <Send className="h-2.5 w-2.5" />
                      Envoyé
                    </div>
                  </div>
                )}

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute tabular-nums mb-1"
                    style={{ fontFamily: monoFamily }}
                  >
                    TKT · {tktCode}
                    <span className="mx-2 text-line">·</span>
                    <span className="text-ink-mute/85">Envoyé {formatDate(ticket.created_at)}</span>
                  </p>

                  <h3
                    className="text-[15px] font-bold text-ink group-hover:text-brand transition-colors leading-tight line-clamp-1 mb-2"
                    style={{ fontFamily: displayFamily }}
                  >
                    {ticket.ticket?.event?.title || 'Événement introuvable'}
                  </h3>

                  {ticket.ticket?.event && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-mute mb-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-brand" />
                        {formatDate(ticket.ticket.event.date)}
                      </span>
                      <span aria-hidden className="text-line">·</span>
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Clock className="h-3 w-3" />
                        {ticket.ticket.event.time}
                      </span>
                      <span aria-hidden className="text-line">·</span>
                      <span className="inline-flex items-center gap-1.5 truncate min-w-0">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{ticket.ticket.event.location}</span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-line">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="grid place-items-center w-6 h-6 rounded-full bg-cream-deep ring-1 ring-line flex-shrink-0">
                        <User className="h-3 w-3 text-ink-mute" />
                      </div>
                      <p className="text-[12px] text-ink min-w-0 truncate">
                        <span className="text-ink-mute">À </span>
                        <span className="font-bold">{recipientLabel(ticket)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ${status.cls}`}
                      >
                        <StatusIcon className="h-2.5 w-2.5" />
                        {status.label}
                      </span>
                      {ticket.ticket?.ticket_type && (
                        <span
                          className="text-[12px] font-bold text-ink tabular-nums"
                          style={{ fontFamily: displayFamily }}
                        >
                          {formatCurrency(ticket.ticket.ticket_type.price, 'XOF')}
                        </span>
                      )}
                    </div>
                  </div>

                  {ticket.message && (
                    <div className="mt-2.5 p-2.5 bg-cream rounded-lg border-l-2 border-brand">
                      <p className="text-[11px] text-ink leading-relaxed">
                        <span
                          className="font-bold text-ink-mute mr-1"
                          style={{ fontFamily: monoFamily }}
                        >
                          MSG ·
                        </span>
                        {ticket.message}
                      </p>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="flex sm:flex-col items-stretch sm:items-end gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTicketClick(ticket);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 border border-line bg-paper text-ink rounded-lg text-[12px] font-bold hover:border-brand hover:text-brand transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Détails
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-ink/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="bg-paper rounded-xl2 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-card-hover my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-cream border-b border-line">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid place-items-center w-8 h-8 rounded-lg bg-brand-50 text-brand ring-1 ring-brand-100 flex-shrink-0">
                  <Send className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute tabular-nums"
                    style={{ fontFamily: monoFamily }}
                  >
                    TKT · {selectedTicket.ticket?.id.slice(0, 8).toUpperCase()}
                  </p>
                  <h3
                    className="text-[14px] font-bold text-ink !mb-0 leading-tight"
                    style={{ fontFamily: displayFamily }}
                  >
                    Billet envoyé
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="grid place-items-center w-9 h-9 rounded-lg border border-line bg-paper text-ink-mute hover:text-ink hover:border-ink transition-colors flex-shrink-0"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Recipient + status callout */}
              <div className="bg-brand-50/40 border border-brand-100 rounded-xl2 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid place-items-center w-10 h-10 rounded-lg bg-brand text-paper flex-shrink-0">
                    <Send className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                      <p
                        className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                        style={{ fontFamily: monoFamily }}
                      >
                        Destinataire
                      </p>
                      {(() => {
                        const s = statusInfo(selectedTicket.status);
                        const SIcon = s.Icon;
                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ${s.cls}`}
                          >
                            <SIcon className="h-2.5 w-2.5" />
                            {s.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p
                      className="text-[15px] font-bold text-ink leading-tight"
                      style={{ fontFamily: displayFamily }}
                    >
                      {recipientLabel(selectedTicket)}
                    </p>
                    <p
                      className="text-[11px] text-ink-mute tabular-nums mt-0.5"
                      style={{ fontFamily: monoFamily }}
                    >
                      Transféré le {formatDate(selectedTicket.created_at)}
                    </p>
                    {selectedTicket.message && (
                      <p className="mt-2.5 p-2.5 bg-paper rounded-lg border border-line text-[12px] text-ink leading-relaxed">
                        <span
                          className="font-bold text-ink-mute mr-1"
                          style={{ fontFamily: monoFamily }}
                        >
                          MSG ·
                        </span>
                        {selectedTicket.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Read-only ticket preview */}
              <div className="rounded-xl2 border border-line overflow-hidden bg-cream/40">
                {selectedTicket.ticket?.event?.image_url && (
                  <div className="relative aspect-[16/9] sm:aspect-[2/1] overflow-hidden">
                    <Image
                      src={selectedTicket.ticket.event.image_url}
                      alt={selectedTicket.ticket.event.title}
                      className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-50"
                    />
                    <div className="absolute inset-0 bg-ink/60" />
                    <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
                      <div className="grid place-items-center w-12 h-12 rounded-full bg-paper/10 ring-2 ring-paper/15 backdrop-blur-sm mb-3">
                        <Send className="h-5 w-5 text-paper" />
                      </div>
                      <p className="eyebrow !text-paper/70 mb-1">Plus accessible</p>
                      <p
                        className="text-paper text-[15px] font-bold tracking-tight"
                        style={{ fontFamily: displayFamily }}
                      >
                        Ce billet a été remis au destinataire
                      </p>
                    </div>
                  </div>
                )}

                {selectedTicket.ticket?.event && selectedTicket.ticket?.ticket_type && (
                  <div className="p-4">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute mb-2"
                      style={{ fontFamily: monoFamily }}
                    >
                      Détails de l'événement
                    </p>
                    <h4
                      className="text-[15px] font-bold text-ink leading-tight mb-3"
                      style={{ fontFamily: displayFamily }}
                    >
                      {selectedTicket.ticket.event.title}
                    </h4>
                    <ul className="space-y-2 text-[12px] text-ink-mute">
                      <li className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-brand flex-shrink-0" />
                        <span className="tabular-nums">
                          {formatDate(selectedTicket.ticket.event.date)} · {selectedTicket.ticket.event.time}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-brand flex-shrink-0 mt-0.5" />
                        <span>{selectedTicket.ticket.event.location}</span>
                      </li>
                    </ul>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                      <span className="text-[12px] font-bold text-ink">
                        {selectedTicket.ticket.ticket_type.name}
                      </span>
                      <span
                        className="text-[14px] font-bold text-ink tabular-nums"
                        style={{ fontFamily: displayFamily }}
                      >
                        {formatCurrency(selectedTicket.ticket.ticket_type.price, 'XOF')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky footer */}
            <footer className="sticky bottom-0 px-5 py-3 bg-cream border-t border-line flex items-center justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="inline-flex items-center justify-center h-10 px-5 border border-line bg-paper text-ink rounded-lg text-[13px] font-bold hover:border-ink hover:bg-cream/50 transition-colors"
              >
                Fermer
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
