import React, { useState, useEffect } from 'react';
import { Download, Calendar, MapPin, Clock, Loader, Ticket, CheckCircle, Eye, Sparkles, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/AuthContext';
import EnhancedFestivalTicket from '../tickets/EnhancedFestivalTicket';
import TransferTicketModal from '../tickets/TransferTicketModal';
import { generateTicketPNG } from '../../utils/ticketService';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import Image from '../common/Image';

interface MyTicket {
  id: string;
  qr_code: string;
  status: string;
  scanned_at?: string;
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    currency: string;
    image_url: string;
  };
  ticket_type: {
    id: string;
    name: string;
    price: number;
  };
  order?: {
    id: string;
    created_at: string;
    payment_method?: string;
    total?: number;
  };
}

export default function MyTickets() {
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<MyTicket | null>(null);
  const [downloadingTicket, setDownloadingTicket] = useState<string | null>(null);
  const [transferTicket, setTransferTicket] = useState<{ticketId: string, ticketTitle: string, eventDate: string, eventTime: string, eventLocation: string} | null>(null);
  const [ticketOwnership, setTicketOwnership] = useState<Map<string, boolean>>(new Map());
  const [currentPage, setCurrentPage] = useState(0); // Current page index (0-based)
  const ticketsPerPage = 5;
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchMyTickets();
    }
  }, [user?.id]);

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Step 1: Get all valid tickets owned by the user
      // First, let's get all tickets without the event status filter to debug
      const { data: allTicketsRaw, error: rawError } = await supabase
        .from('tickets')
        .select(`
          id,
          qr_code,
          status,
          scanned_at,
          event_id,
          ticket_type_id,
          order_id,
          created_at,
          event:events (
            id,
            title,
            date,
            time,
            location,
            currency,
            image_url,
            status
          ),
          ticket_type:ticket_types (
            id,
            name,
            price
          ),
          order:orders (
            id,
            created_at,
            status,
            payment_method,
            total
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'VALID')  // All tickets should use VALID status for consistency
        .is('scanned_at', null)
        .order('created_at', { ascending: false });

      if (rawError) {
        console.error('Error fetching tickets (raw):', rawError);
        throw rawError;
      }

      // Debug: Log all tickets to see what we're getting
      console.log('All tickets for user:', {
        total: allTicketsRaw?.length || 0,
        tickets: allTicketsRaw?.map(t => ({
          id: t.id,
          event_id: t.event_id,
          event_status: t.event?.status,
          order_id: t.order_id,
          order_status: t.order?.status,
          payment_method: t.order?.payment_method
        }))
      });

      // Filter out tickets where event is missing or not published
      // But keep tickets even if event status is not PUBLISHED for free tickets
      const allTickets = (allTicketsRaw || []).filter(ticket => {
        // Must have event and ticket_type
        if (!ticket.event || !ticket.ticket_type) {
          console.warn('Ticket missing event or ticket_type:', ticket.id);
          return false;
        }
        // Check if this is a free ticket (payment_method = 'FREE_TICKET' or total = 0)
        const isFreeTicket = ticket.order?.payment_method === 'FREE_TICKET' || 
                            ticket.order?.payment_method?.toUpperCase().includes('FREE') ||
                            (ticket.order && !ticket.order.total); // total is 0 or null
        
        // For free tickets, show them regardless of event status
        // For other tickets, only show if event is PUBLISHED
        if (isFreeTicket) {
          console.log('Free ticket found:', { ticket_id: ticket.id, payment_method: ticket.order?.payment_method });
          return true; // Show free tickets regardless of event status
        }
        return ticket.event.status === 'PUBLISHED';
      });

      console.log('Filtered tickets:', {
        total: allTickets.length,
        free_tickets: allTickets.filter(t => t.order?.payment_method === 'FREE_TICKET').length,
        published_tickets: allTickets.filter(t => t.event?.status === 'PUBLISHED').length
      });

      if (!allTickets || allTickets.length === 0) {
        console.log('No tickets found after filtering');
        setTickets([]);
        setLoading(false);
        return;
      }

      // Step 2: Get all transferred ticket IDs (COMPLETED transfers only)
      const ticketIds = allTickets.map(t => t.id);
      const { data: transfers, error: transfersError } = await supabase
        .from('ticket_transfers')
        .select('ticket_id')
        .in('ticket_id', ticketIds)
        .eq('status', 'COMPLETED');

      if (transfersError) {
        console.error('Error fetching transfers:', transfersError);
        // Continue even if transfers query fails
      }

      // Step 3: Filter out transferred tickets
      const transferredTicketIds = new Set(transfers?.map(t => t.ticket_id) || []);
      const validTickets = allTickets.filter(ticket => !transferredTicketIds.has(ticket.id));

      setTickets(validTickets as MyTicket[]);

      // Step 4: Check ticket ownership (if ticket was purchased by user)
      const ownershipMap = new Map<string, boolean>();
      const validTicketIds = validTickets.map(t => t.id);
      
      if (validTicketIds.length > 0) {
        // Check if tickets belong to orders created by this user
        // Query tickets with their order_id, then check if order belongs to user
        const { data: ticketsWithOrders } = await supabase
          .from('tickets')
          .select('id, order_id, order:orders!inner(user_id)')
          .in('id', validTicketIds);
        
        if (ticketsWithOrders) {
          ticketsWithOrders.forEach((ticket: any) => {
            // Check if the order belongs to this user
            const isOwned = ticket.order?.user_id === user.id;
            ownershipMap.set(ticket.id, isOwned || false);
          });
        }
      }
      
      setTicketOwnership(ownershipMap);
    } catch (error) {
      console.error('Error fetching my tickets:', error);
      toast.error('Erreur lors du chargement de vos billets');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTicket = async (ticket: MyTicket) => {
    try {
      setDownloadingTicket(ticket.id);
      
      // Find the ticket element by ID (it should be in the modal)
      const ticketElement = document.getElementById(`ticket-${ticket.id}`);
      if (!ticketElement) {
        // If modal is not open, open it first
        setSelectedTicket(ticket);
        // Wait a bit for the modal to render
        await new Promise(resolve => setTimeout(resolve, 500));
        // Try again
        const retryElement = document.getElementById(`ticket-${ticket.id}`);
        if (!retryElement) {
          throw new Error('Élément de billet non trouvé. Veuillez ouvrir les détails du billet d\'abord.');
        }
        const pngBlob = await generateTicketPNG(retryElement);
        const url = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `billet-${ticket.event.title.replace(/\s+/g, '-')}-${ticket.id.slice(-8)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const pngBlob = await generateTicketPNG(ticketElement);
        const url = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `billet-${ticket.event.title.replace(/\s+/g, '-')}-${ticket.id.slice(-8)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      toast.success('Billet téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading ticket:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors du téléchargement du billet');
    } finally {
      setDownloadingTicket(null);
    }
  };


  /**
   * Tier badge styling for ticket types — uses brand tokens, no rainbow gradients.
   * VIP/Premium → accent (yellow stamp). Everything else → ink.
   */
  const getTicketTypeStyle = (typeName: string) => {
    const lower = typeName?.toLowerCase() || '';
    if (lower.includes('vip') || lower.includes('premium')) {
      return 'bg-accent text-ink ring-1 ring-accent';
    }
    return 'bg-ink text-paper';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="grid place-items-center w-12 h-12 rounded-full bg-brand-50">
          <Loader className="h-5 w-5 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-14 px-4">
        <div className="grid place-items-center w-16 h-16 rounded-full bg-cream-deep mx-auto mb-4">
          <Ticket className="h-7 w-7 text-ink-mute" />
        </div>
        <p className="eyebrow !mb-1">Aucun billet</p>
        <h3 className="text-ink mb-2">Pas encore de billets actifs</h3>
        <p className="text-[13px] text-ink-mute max-w-sm mx-auto leading-relaxed">
          Vous n'avez actuellement aucun billet valide, non scanné et non transféré.
        </p>
      </div>
    );
  }

  const visibleTickets = tickets.slice(currentPage * ticketsPerPage, (currentPage + 1) * ticketsPerPage);
  const totalPages = Math.ceil(tickets.length / ticketsPerPage);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-line">
        <div className="min-w-0">
          <p className="eyebrow !mb-1 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent" />
            Mes billets
          </p>
          <h2
            className="!text-[20px] md:!text-[22px] !leading-[1.15] text-ink font-bold tracking-tight !mb-0"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            {tickets.length} {tickets.length === 1 ? 'billet prêt' : 'billets prêts'} à scanner
          </h2>
        </div>
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 ring-1 ring-green-200 flex-shrink-0">
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="text-[11px] font-bold uppercase tracking-[0.08em]">Tous valides</span>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {visibleTickets.map((ticket) => {
          const isFreeTicket =
            ticket.order?.payment_method === 'FREE_TICKET' ||
            ticket.order?.payment_method?.toUpperCase().includes('FREE') ||
            (ticket.order && (!ticket.order.total || ticket.order.total === 0));

          const tktCode = ticket.id.slice(0, 8).toUpperCase();

          return (
            <article
              key={ticket.id}
              className="bg-paper rounded-xl2 border border-line shadow-card hover:border-brand/40 hover:shadow-card-hover transition-all overflow-hidden group"
            >
              {/* Body */}
              <div
                className="p-4 cursor-pointer transition-colors hover:bg-cream/60"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-start gap-3.5">
                  {/* Poster */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-ink">
                    <Image
                      src={ticket.event.image_url}
                      alt={ticket.event.title}
                      className="w-full h-full object-cover"
                      fallbackSrc="https://images.unsplash.com/photo-1459749411175-04bf5292ceea"
                      width={96}
                      height={96}
                    />
                    {/* Tier corner badge */}
                    <span
                      className={`absolute top-1.5 left-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-[0.08em] ${getTicketTypeStyle(
                        ticket.ticket_type.name
                      )}`}
                    >
                      {ticket.ticket_type.name}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    {/* TKT code (mono) */}
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute tabular-nums mb-1"
                      style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                    >
                      TKT · {tktCode}
                    </p>

                    {/* Title row */}
                    <div className="flex items-start gap-2 mb-1.5">
                      <h3 className="text-[14px] sm:text-[15px] font-bold text-ink group-hover:text-brand transition-colors line-clamp-2 leading-tight flex-1">
                        {ticket.event.title}
                      </h3>
                      {isFreeTicket && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-[0.08em] bg-green-50 text-green-700 ring-1 ring-green-200 flex-shrink-0">
                          Gratuit
                        </span>
                      )}
                    </div>

                    {/* Event meta */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-mute">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-brand" />
                        {(() => { const [y,m,d] = ticket.event.date.split('T')[0].split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); })()}
                      </span>
                      <span aria-hidden className="text-line">·</span>
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Clock className="h-3 w-3" />
                        {ticket.event.time}
                      </span>
                      <span aria-hidden className="text-line">·</span>
                      <span className="inline-flex items-center gap-1.5 truncate min-w-0">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{ticket.event.location}</span>
                      </span>
                    </div>

                    {/* Price + Status row (mobile + desktop) */}
                    <div className="flex items-baseline justify-between gap-3 mt-2.5 pt-2 border-t border-line">
                      <div className="flex items-baseline gap-2">
                        <p
                          className="text-[15px] font-bold text-ink tabular-nums tracking-tight"
                          style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
                        >
                          {formatCurrency(ticket.ticket_type.price, ticket.event.currency)}
                        </p>
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute">
                          {ticket.event.currency}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-[0.08em] bg-green-50 text-green-700 ring-1 ring-green-200">
                        <CheckCircle className="h-3 w-3" />
                        Valide
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-4 pb-4 border-t border-line bg-cream/40">
                <div className="flex flex-col sm:flex-row gap-2 pt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTicket(ticket);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 border border-line bg-paper text-ink rounded-lg text-[12px] font-semibold hover:border-brand/40 hover:text-brand transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Voir les détails
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadTicket(ticket);
                    }}
                    disabled={downloadingTicket === ticket.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[12px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-card"
                  >
                    {downloadingTicket === ticket.id ? (
                      <>
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                        Téléchargement…
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        Télécharger
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Pagination — only when > 5 tickets */}
      {tickets.length > ticketsPerPage && (
        <div className="flex items-center justify-between gap-3 pt-3">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="grid place-items-center w-10 h-10 rounded-lg border border-line bg-paper text-ink hover:border-brand/40 hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            className="text-[12px] tabular-nums text-ink-mute"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          >
            Page <span className="font-bold text-ink">{currentPage + 1}</span> /{' '}
            <span className="font-bold text-ink">{totalPages}</span>
            <span className="hidden sm:inline">
              {' '}
              · <span className="text-ink-mute/85">{visibleTickets.length} sur {tickets.length}</span>
            </span>
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
            className="grid place-items-center w-10 h-10 rounded-lg border border-line bg-paper text-ink hover:border-brand/40 hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Page suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (() => {
        const isFreeTicket =
          selectedTicket.order?.payment_method === 'FREE_TICKET' ||
          selectedTicket.order?.payment_method?.toUpperCase().includes('FREE') ||
          (selectedTicket.order && (!selectedTicket.order.total || selectedTicket.order.total === 0));

        const canTransfer =
          ticketOwnership.get(selectedTicket.id) &&
          selectedTicket.status === 'VALID' &&
          !selectedTicket.scanned_at &&
          !isFreeTicket;

        const tktCode = selectedTicket.id.slice(0, 8).toUpperCase();

        return (
          <div
            className="fixed inset-0 bg-ink/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <div
              className="bg-paper rounded-xl2 border border-line shadow-pop max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-cream border-b border-line">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="eyebrow !mb-0">Détails du billet</p>
                  <span aria-hidden className="w-px h-3 bg-line" />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute tabular-nums"
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                  >
                    TKT · {tktCode}
                  </span>
                  {isFreeTicket && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-[0.08em] bg-green-50 text-green-700 ring-1 ring-green-200">
                      Gratuit
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="grid place-items-center w-8 h-8 rounded-lg hover:bg-paper border border-transparent hover:border-line text-ink-mute hover:text-ink transition-colors flex-shrink-0"
                  aria-label="Fermer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 md:p-6">
                {/* Ticket Display */}
                <div className="bg-cream rounded-xl2 border border-line p-4 md:p-5">
                  <div id={`ticket-${selectedTicket.id}`} data-ticket>
                    <EnhancedFestivalTicket
                      ticketHolder={profile?.name || user?.email?.split('@')[0] || 'Utilisateur'}
                      ticketType={selectedTicket.ticket_type.name}
                      ticketId={selectedTicket.id}
                      eventTitle={selectedTicket.event.title}
                      eventDate={selectedTicket.event.date}
                      eventTime={selectedTicket.event.time}
                      eventLocation={selectedTicket.event.location}
                      qrCode={selectedTicket.qr_code}
                      eventImage={selectedTicket.event.image_url}
                      price={selectedTicket.ticket_type.price}
                      currency={selectedTicket.event.currency}
                      orderNumber={selectedTicket.order?.id}
                      purchaseDate={selectedTicket.order?.created_at}
                      ticketStatus={selectedTicket.status}
                      scannedAt={selectedTicket.scanned_at}
                      onTransferComplete={() => {
                        fetchMyTickets();
                        setSelectedTicket(null);
                      }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 mt-5 pt-4 border-t border-line">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="inline-flex items-center justify-center h-10 px-5 border border-line bg-paper text-ink rounded-lg text-[13px] font-medium hover:border-brand/40 hover:bg-cream transition-colors"
                  >
                    Fermer
                  </button>

                  {canTransfer && (
                    <button
                      onClick={() => {
                        setTransferTicket({
                          ticketId: selectedTicket.id,
                          ticketTitle: selectedTicket.event.title,
                          eventDate: selectedTicket.event.date,
                          eventTime: selectedTicket.event.time,
                          eventLocation: selectedTicket.event.location,
                        });
                      }}
                      className="inline-flex items-center justify-center gap-1.5 h-10 px-5 border border-line bg-paper text-ink rounded-lg text-[13px] font-bold hover:border-accent hover:bg-accent/10 transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Transférer
                    </button>
                  )}

                  {isFreeTicket && (
                    <span className="inline-flex items-center gap-1.5 h-10 px-3 text-[11px] text-ink-mute italic">
                      <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Transfert non autorisé pour les billets gratuits
                    </span>
                  )}

                  <button
                    onClick={() => handleDownloadTicket(selectedTicket)}
                    disabled={downloadingTicket === selectedTicket.id}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-5 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[13px] font-bold disabled:opacity-50 transition-colors shadow-card"
                  >
                    {downloadingTicket === selectedTicket.id ? (
                      <>
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                        Téléchargement…
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        Télécharger le billet
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Transfer Ticket Modal */}
      {transferTicket && (
        <TransferTicketModal
          isOpen={!!transferTicket}
          onClose={() => setTransferTicket(null)}
          ticketId={transferTicket.ticketId}
          ticketTitle={transferTicket.ticketTitle}
          onTransferComplete={() => {
            fetchMyTickets();
            setTransferTicket(null);
            setSelectedTicket(null);
            toast.success('Billet transféré avec succès!');
          }}
        />
      )}
    </div>
  );
}
