import React, { useState, useEffect } from 'react';
import { Gift, Loader, Eye, Calendar, MapPin, Clock, User, X, Inbox, CheckCircle2 } from 'lucide-react';
import { transferredTicketsService, type TransferredTicket } from '../../services/transferredTicketsService';
import { useTranslation } from '../../context/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import EnhancedFestivalTicket from './EnhancedFestivalTicket';
import { formatCurrency } from '../../utils/formatters';
import Image from '../common/Image';

interface TransferredTicketsListProps {
  onTicketClick?: (ticket: TransferredTicket) => void;
}

const monoFamily = 'ui-monospace, SFMono-Regular, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

export default function TransferredTicketsList({ onTicketClick }: TransferredTicketsListProps) {
  const [tickets, setTickets] = useState<TransferredTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TransferredTicket | null>(null);
  const { t } = useTranslation();
  const { profile } = useAuth();

  useEffect(() => {
    fetchTransferredTickets();
  }, []);

  const fetchTransferredTickets = async () => {
    try {
      setLoading(true);
      const data = await transferredTicketsService.getTransferredTickets();
      setTickets(data);
    } catch (error) {
      console.error('Error fetching transferred tickets:', error);
      toast.error('Erreur lors du chargement des billets transférés');
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

  const handleTicketClick = (ticket: TransferredTicket) => {
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
          <p className="text-[12px] text-ink-mute">Chargement des billets reçus...</p>
        </div>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="text-center py-14 px-4">
        <div className="grid place-items-center w-16 h-16 rounded-full bg-cream-deep mx-auto mb-4">
          <Inbox className="h-7 w-7 text-ink-mute" />
        </div>
        <p className="eyebrow !mb-1">Boîte de réception</p>
        <h3 className="text-ink mb-2">Aucun billet reçu</h3>
        <p className="text-[13px] text-ink-mute max-w-sm mx-auto leading-relaxed">
          Quand un proche vous transfère un billet, il atterrira ici prêt à être présenté à l'entrée.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-line">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-accent text-ink ring-1 ring-accent flex-shrink-0">
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="eyebrow !mb-1">Reçus</p>
            <h2
              className="!text-[20px] md:!text-[22px] !leading-[1.15] text-ink font-bold tracking-tight !mb-0"
              style={{ fontFamily: displayFamily }}
            >
              Billets reçus
            </h2>
            <p className="text-[12px] text-ink-mute mt-1">
              Les billets que vos proches vous ont transférés.
            </p>
          </div>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute tabular-nums hidden sm:inline-flex flex-shrink-0 mt-2"
          style={{ fontFamily: monoFamily }}
        >
          {String(tickets.length).padStart(2, '0')} BILLET{tickets.length > 1 ? 'S' : ''}
        </span>
      </div>

      {/* Tickets */}
      <div className="space-y-3">
        {tickets.map((ticket) => {
          const tktCode = ticket.ticket.id.slice(0, 8).toUpperCase();
          const isUsed = ticket.status === 'USED';
          return (
            <article
              key={ticket.id}
              onClick={() => handleTicketClick(ticket)}
              className="bg-paper rounded-xl2 border border-line shadow-card hover:border-accent/60 hover:shadow-card-hover transition-all cursor-pointer group overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row gap-4 p-4">
                {/* Poster */}
                {ticket.ticket.event.image_url && (
                  <div className="relative w-full sm:w-28 h-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-cream-deep ring-1 ring-line">
                    <Image
                      src={ticket.ticket.event.image_url}
                      alt={ticket.ticket.event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* "GIFT" stamp */}
                    <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.08em] bg-accent text-ink shadow-card">
                      <Gift className="h-2.5 w-2.5" />
                      Cadeau
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
                    <span className="text-ink-mute/85">Reçu {formatDate(ticket.created_at)}</span>
                  </p>

                  <h3
                    className="text-[15px] font-bold text-ink group-hover:text-brand transition-colors leading-tight line-clamp-1 mb-2"
                    style={{ fontFamily: displayFamily }}
                  >
                    {ticket.ticket.event.title}
                  </h3>

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

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-line">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="grid place-items-center w-6 h-6 rounded-full bg-cream-deep ring-1 ring-line flex-shrink-0">
                        <User className="h-3 w-3 text-ink-mute" />
                      </div>
                      <p className="text-[12px] text-ink min-w-0 truncate">
                        <span className="text-ink-mute">De </span>
                        <span className="font-bold">
                          {ticket.sender ? ticket.sender.name : 'un ami'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.08em] ring-1 ${
                          isUsed
                            ? 'bg-cream text-ink-mute ring-line'
                            : 'bg-green-50 text-green-700 ring-green-200'
                        }`}
                      >
                        {isUsed ? (
                          <>
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Utilisé
                          </>
                        ) : (
                          'Valide'
                        )}
                      </span>
                      <span
                        className="text-[12px] font-bold text-ink tabular-nums"
                        style={{ fontFamily: displayFamily }}
                      >
                        {formatCurrency(ticket.ticket.ticket_type.price, 'XOF')}
                      </span>
                    </div>
                  </div>

                  {ticket.message && (
                    <div className="mt-2.5 p-2.5 bg-accent/15 rounded-lg border-l-2 border-accent">
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
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[12px] font-bold transition-colors shadow-card"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Voir
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
            className="bg-paper rounded-xl2 max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-card-hover my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-cream border-b border-line">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid place-items-center w-8 h-8 rounded-lg bg-accent text-ink flex-shrink-0">
                  <Gift className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute tabular-nums"
                    style={{ fontFamily: monoFamily }}
                  >
                    TKT · {selectedTicket.ticket.id.slice(0, 8).toUpperCase()}
                  </p>
                  <h3
                    className="text-[14px] font-bold text-ink !mb-0 leading-tight"
                    style={{ fontFamily: displayFamily }}
                  >
                    Billet reçu
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
              {/* Sender callout */}
              <div className="bg-accent/15 border-l-4 border-accent rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="grid place-items-center w-9 h-9 rounded-lg bg-accent text-ink ring-1 ring-accent flex-shrink-0">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute mb-0.5"
                      style={{ fontFamily: monoFamily }}
                    >
                      Cadeau de
                    </p>
                    <p
                      className="text-[14px] font-bold text-ink leading-tight"
                      style={{ fontFamily: displayFamily }}
                    >
                      {selectedTicket.sender ? selectedTicket.sender.name : 'Un ami'}
                    </p>
                    <p
                      className="text-[11px] text-ink-mute tabular-nums mt-0.5"
                      style={{ fontFamily: monoFamily }}
                    >
                      Reçu le {formatDate(selectedTicket.created_at)}
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

              {/* Ticket */}
              <div>
                <EnhancedFestivalTicket
                  ticketHolder={profile?.name || 'Utilisateur'}
                  ticketType={selectedTicket.ticket.ticket_type.name}
                  ticketId={selectedTicket.ticket.id}
                  eventTitle={selectedTicket.ticket.event.title}
                  eventDate={selectedTicket.ticket.event.date}
                  eventTime={selectedTicket.ticket.event.time}
                  eventLocation={selectedTicket.ticket.event.location}
                  qrCode={selectedTicket.ticket.qr_code}
                  eventImage={selectedTicket.ticket.event.image_url}
                  price={selectedTicket.ticket.ticket_type.price}
                  currency="XOF"
                  orderNumber={selectedTicket.id}
                  purchaseDate={selectedTicket.created_at}
                  eventCategory="Concert"
                  specialInstructions="Arrivez 30 minutes avant le début. Présentez ce billet à l'entrée."
                  ticketStatus={selectedTicket.ticket.status}
                  scannedAt={selectedTicket.ticket.scanned_at}
                  scannedBy={selectedTicket.ticket.scanned_by_name}
                  scanLocation={selectedTicket.ticket.scan_location}
                  onTransferComplete={() => {
                    setSelectedTicket(null);
                    fetchTransferredTickets();
                  }}
                />
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
