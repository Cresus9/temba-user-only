import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Calendar, MapPin, Clock, Loader, ChevronDown, ChevronUp, CheckCircle, XCircle, ChevronRight, Send, Ticket } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { generateTicketPNG } from '../../utils/ticketService';
import { useAuth } from '../../context/AuthContext';
import EnhancedFestivalTicket from '../tickets/EnhancedFestivalTicket';
import TransferTicketModal from '../tickets/TransferTicketModal';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  total: number;
  status: string;
  created_at: string;
  event: {
    title: string;
    date: string;
    time: string;
    location: string;
    currency: string;
    image_url: string;
  };
  tickets: Array<{
    id: string;
    qr_code: string;
    ticket_type: {
      name: string;
      price: number;
    };
    status: string;
    scanned_at?: string;
    scan_location?: string;
    scanned_by?: string;
    scanned_by_name?: string;
    isTransferred?: boolean;
    transferStatus?: string | null;
  }>;
}

export default function BookingHistory() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [downloadingTicket, setDownloadingTicket] = useState<string | null>(null);
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [transferTicket, setTransferTicket] = useState<{ticketId: string, ticketTitle: string, eventDate: string, eventTime: string, eventLocation: string} | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchBookings();
    }
  }, [user?.id]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // Get all orders for the user
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          status,
          created_at,
          event:events!inner (
            title,
            date,
            time,
            location,
            currency,
            image_url
          ),
          tickets (
            id,
            user_id,
            qr_code,
            status,
            scanned_at,
            scan_location,
            scanned_by,
            ticket_type:ticket_types (
              name,
              price
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('visible_in_history', true)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get all transferred ticket IDs for this user
      const { data: transfers } = await supabase
        .from('ticket_transfers')
        .select('ticket_id, status')
        .eq('sender_id', user.id);

      const transferredTicketIds = new Set(transfers?.map(t => t.ticket_id) || []);

      // Process orders and mark transferred tickets
      const processedOrders = orders?.map(order => ({
        ...order,
        tickets: order.tickets.map(ticket => ({
          ...ticket,
          isTransferred: transferredTicketIds.has(ticket.id),
          transferStatus: transfers?.find(t => t.ticket_id === ticket.id)?.status || null
        }))
      })) || [];

      console.log('Booking History Debug:', {
        totalOrders: orders?.length || 0,
        transferredTickets: transferredTicketIds.size,
        processedOrders: processedOrders.length
      });

      // Get scanner names in a separate query
      const scannerIds = processedOrders?.flatMap(order => 
        order.tickets
          .filter(ticket => ticket.scanned_by)
          .map(ticket => ticket.scanned_by)
      ).filter(Boolean) || [];

      let scannerNames: Record<string, string> = {};
      if (scannerIds.length > 0) {
        const { data: scanners } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', scannerIds);
        
        scannerNames = (scanners || []).reduce((acc, scanner) => ({
          ...acc,
          [scanner.user_id]: scanner.name
        }), {});
      }

      const formattedBookings = processedOrders?.map(order => ({
        ...order,
        tickets: order.tickets.map(ticket => ({
          ...ticket,
          scanned_by_name: ticket.scanned_by ? scannerNames[ticket.scanned_by] : undefined
        }))
      })) || [];

      setBookings(formattedBookings);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
      toast.error('Échec du chargement de l\'historique des réservations');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTicket = async (ticket: Booking['tickets'][0], booking: Booking) => {
    try {
      setDownloadingTicket(ticket.id);
      
      // Trouver l'élément du billet spécifique
      const ticketElement = document.getElementById(`ticket-${ticket.id}`);
      if (!ticketElement) {
        throw new Error('Élément de billet non trouvé');
      }

      const pngBlob = await generateTicketPNG(ticketElement);
      const url = URL.createObjectURL(pngBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `billet-${booking.event.title.replace(/\s+/g, '-')}-${ticket.id.slice(-8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Billet téléchargé avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement du billet:', error);
      toast.error('Échec du téléchargement du billet');
    } finally {
      setDownloadingTicket(null);
    }
  };

  const toggleBookingDetails = (bookingId: string) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId);
  };

  const handleBookingClick = (bookingId: string) => {
    navigate(`/booking/confirmation/${bookingId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="grid place-items-center w-12 h-12 rounded-full bg-brand-50">
          <Loader className="h-5 w-5 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="text-center py-14 px-4">
        <div className="grid place-items-center w-16 h-16 rounded-full bg-cream-deep mx-auto mb-4">
          <Ticket className="h-7 w-7 text-ink-mute" />
        </div>
        <p className="eyebrow !mb-1">Historique vide</p>
        <h3 className="text-ink mb-2">Aucune réservation pour l'instant</h3>
        <p className="text-[13px] text-ink-mute max-w-sm mx-auto leading-relaxed mb-5">
          Dès que vous achetez votre premier billet, il apparaîtra ici avec toute son histoire.
        </p>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 h-10 px-4 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[13px] font-bold transition-colors shadow-card"
        >
          Parcourir les événements
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    if (status === 'COMPLETED')
      return { label: 'Terminée', cls: 'bg-green-50 text-green-700 ring-green-200' };
    if (status === 'AWAITING_PAYMENT')
      return { label: 'En attente', cls: 'bg-amber-50 text-amber-800 ring-amber-200' };
    if (status === 'CANCELLED')
      return { label: 'Annulée', cls: 'bg-red-50 text-red-700 ring-red-200' };
    return { label: status, cls: 'bg-cream text-ink-mute ring-line' };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-line">
        <div>
          <p className="eyebrow !mb-1">Historique</p>
          <h2
            className="!text-[20px] md:!text-[22px] !leading-[1.15] text-ink font-bold tracking-tight !mb-0"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            Mes réservations
          </h2>
        </div>
        <span
          className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-[0.08em] text-ink-mute tabular-nums flex-shrink-0"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
        >
          {String(bookings.length).padStart(2, '0')} COMMANDE{bookings.length > 1 ? 'S' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {bookings.map((booking) => {
          const isExpanded = expandedBooking === booking.id;
          const badge = statusBadge(booking.status);
          const ordCode = booking.id.slice(0, 8).toUpperCase();

          return (
            <article
              key={booking.id}
              className="bg-paper rounded-xl2 border border-line shadow-card hover:border-brand/40 hover:shadow-card-hover transition-all overflow-hidden"
            >
              {/* Booking Header (clickable → /booking/confirmation/:id) */}
              <div
                className="p-4 cursor-pointer hover:bg-cream/60 transition-colors group"
                onClick={() => handleBookingClick(booking.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute tabular-nums mb-1"
                      style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                    >
                      ORD · {ordCode}
                      <span className="mx-2 text-line">·</span>
                      <span className="text-ink-mute/85">
                        {new Date(booking.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <h3 className="text-[15px] font-bold text-ink group-hover:text-brand transition-colors line-clamp-1">
                        {booking.event.title}
                      </h3>
                      <ChevronRight className="h-3.5 w-3.5 text-ink-mute group-hover:text-brand transition-colors flex-shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-mute">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(booking.event.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span aria-hidden className="text-line">·</span>
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Clock className="h-3 w-3" />
                        {booking.event.time}
                      </span>
                      <span aria-hidden className="text-line">·</span>
                      <span className="inline-flex items-center gap-1.5 truncate min-w-0">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{booking.event.location}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-2 sm:gap-1.5 flex-shrink-0">
                    <p
                      className="text-[16px] font-bold text-ink tabular-nums tracking-tight"
                      style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
                    >
                      {formatCurrency(booking.total, booking.event.currency)}
                    </p>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-[0.08em] ring-1 ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expand toggle */}
              <div className="px-4 pb-3 border-t border-line bg-cream/40 pt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookingDetails(booking.id);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-semibold text-ink-mute hover:text-brand transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Masquer les billets
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Voir {booking.tickets.length} billet{booking.tickets.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-line p-4 space-y-3 bg-cream/40">
                  {booking.tickets.map((ticket) => {
                    const tktCode = ticket.id.slice(0, 8).toUpperCase();
                    return (
                      <div
                        key={ticket.id}
                        className="bg-paper rounded-xl2 border border-line p-4"
                      >
                        {/* Status banner */}
                        {ticket.isTransferred ? (
                          <div className="mb-3 p-3 rounded-lg bg-cream border border-line flex items-start gap-2.5">
                            <div className="grid place-items-center w-7 h-7 rounded-full bg-accent text-ink flex-shrink-0">
                              <Send className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[12px] font-bold text-ink leading-tight">
                                Billet transféré
                              </p>
                              <p className="text-[11px] text-ink-mute mt-0.5 leading-relaxed">
                                Ce billet n'est plus accessible. Seul le destinataire peut l'utiliser.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`mb-3 p-3 rounded-lg border flex items-start justify-between gap-2.5 ${
                              ticket.status === 'USED'
                                ? 'bg-green-50 border-green-200'
                                : 'bg-cream border-line'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`grid place-items-center w-7 h-7 rounded-full flex-shrink-0 ${
                                  ticket.status === 'USED'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-paper text-ink-mute border border-line'
                                }`}
                              >
                                {ticket.status === 'USED' ? (
                                  <CheckCircle className="h-3.5 w-3.5" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5" />
                                )}
                              </div>
                              <div>
                                <p className="text-[12px] font-bold text-ink leading-tight">
                                  {ticket.status === 'USED' ? 'Billet utilisé' : 'Billet non utilisé'}
                                </p>
                                {ticket.status === 'USED' && ticket.scanned_at && (
                                  <p className="text-[11px] text-ink-mute mt-0.5 leading-relaxed">
                                    Scanné{ticket.scan_location ? ` à ${ticket.scan_location}` : ''}
                                    {' · '}
                                    <span className="tabular-nums">
                                      {new Date(ticket.scanned_at).toLocaleString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    {ticket.scanned_by_name && ` · par ${ticket.scanned_by_name}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Mono ticket code header */}
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-line">
                          <span
                            className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute tabular-nums"
                            style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                          >
                            TKT · {tktCode}
                          </span>
                          <span className="text-[12px] font-bold text-ink truncate max-w-[200px]">
                            {ticket.ticket_type.name}
                          </span>
                        </div>

                        {/* Ticket display — full ticket OR transferred placeholder */}
                        {ticket.isTransferred ? (
                          <div className="relative aspect-[16/9] sm:aspect-[2/1] rounded-xl overflow-hidden border border-line bg-ink">
                            <img
                              src={booking.event.image_url}
                              alt={booking.event.title}
                              className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-50"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-ink/60" />
                            <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
                              <div className="grid place-items-center w-12 h-12 rounded-full bg-accent text-ink mb-3 ring-4 ring-paper/10">
                                <Send className="h-5 w-5" />
                              </div>
                              <p className="eyebrow !text-paper/70 mb-1">Transféré</p>
                              <p
                                className="text-paper text-[16px] font-bold tracking-tight"
                                style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
                              >
                                Plus accessible depuis ce compte
                              </p>
                              <p className="text-[11px] text-paper/70 mt-2 max-w-xs">
                                Le destinataire reçoit le billet et le QR code dans son espace.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div id={`ticket-${ticket.id}`} data-ticket>
                            <EnhancedFestivalTicket
                              ticketHolder={user?.name || ''}
                              ticketType={ticket.ticket_type.name}
                              ticketId={ticket.id}
                              eventTitle={booking.event.title}
                              eventDate={booking.event.date}
                              eventTime={booking.event.time}
                              eventLocation={booking.event.location}
                              qrCode={ticket.qr_code}
                              eventImage={booking.event.image_url}
                              price={ticket.ticket_type.price}
                              currency="XOF"
                              orderNumber={booking.id}
                              purchaseDate={booking.created_at}
                              eventCategory="Concert"
                              specialInstructions="Arrivez 30 minutes avant le début. Présentez ce billet à l'entrée."
                              ticketStatus={ticket.status}
                              scannedAt={ticket.scanned_at}
                              scannedBy={ticket.scanned_by_name}
                              scanLocation={ticket.scan_location}
                            />
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="mt-3 pt-3 border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                          {!ticket.isTransferred && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTransferTicket({
                                  ticketId: ticket.id,
                                  ticketTitle: booking.event.title,
                                  eventDate: booking.event.date,
                                  eventTime: booking.event.time,
                                  eventLocation: booking.event.location,
                                });
                              }}
                              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 border border-line bg-paper text-ink rounded-lg text-[12px] font-bold hover:border-accent hover:bg-accent/10 transition-colors"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Transférer
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadTicket(ticket, booking);
                            }}
                            disabled={downloadingTicket === ticket.id || ticket.isTransferred}
                            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[12px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-card"
                          >
                            {downloadingTicket === ticket.id ? (
                              <Loader className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            {ticket.isTransferred ? 'Billet transféré' : 'Télécharger'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Transfer Ticket Modal */}
      {transferTicket && (
        <TransferTicketModal
          isOpen={!!transferTicket}
          onClose={() => setTransferTicket(null)}
          ticketId={transferTicket.ticketId}
          ticketTitle={transferTicket.ticketTitle}
          onTransferComplete={() => {
            setTransferTicket(null);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
}