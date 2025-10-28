import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Calendar, MapPin, Clock, AlertCircle, Loader, ChevronDown, ChevronUp, CheckCircle, XCircle, ChevronRight, Send, User, Ticket } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { generatePDF } from '../../utils/ticketService';
import { useAuth } from '../../context/AuthContext';
import FestivalTicket from '../tickets/FestivalTicket';
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

      const pdfBlob = await generatePDF(ticketElement);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `billet-${booking.event.title.replace(/\s+/g, '-')}-${ticket.id.slice(-8)}.pdf`;
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
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Aucune réservation trouvée
        </h2>
        <p className="text-gray-600 mb-4">
          Vous n'avez pas encore effectué de réservations.
        </p>
        <Link
          to="/events"
          className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Parcourir les événements
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
        Mes réservations
      </h2>
      
      <div className="space-y-4">
        {bookings.map((booking) => (
          <div 
            key={booking.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all duration-200"
          >
            {/* Booking Header */}
            <div 
              className="p-4 sm:p-6 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-200 group"
              onClick={() => handleBookingClick(booking.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {booking.event.title}
                    </h3>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      {new Date(booking.event.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      {booking.event.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {booking.event.location}
                    </span>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(booking.total, booking.event.currency)}
                  </p>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'COMPLETED' 
                        ? 'bg-green-100 text-green-800'
                      : booking.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {booking.status === 'COMPLETED' ? 'Terminée' : 
                     booking.status === 'PENDING' ? 'En attente' : 'Annulée'}
                    </span>
                    <span className="text-xs text-gray-400 group-hover:text-indigo-500 transition-colors">
                      Cliquer pour voir les détails
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookingDetails(booking.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 text-sm"
                >
                  {expandedBooking === booking.id ? (
                    <>
                      <ChevronUp className="h-5 w-5" />
                      Masquer les détails
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-5 w-5" />
                      Voir les détails
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedBooking === booking.id && (
              <div className="border-t border-gray-100 p-4 sm:p-6 space-y-4 bg-gray-50">
                {booking.tickets.map((ticket) => (
                  <div 
                    key={ticket.id}
                    className={`bg-white rounded-lg p-4 border border-gray-200 ${ticket.isTransferred ? 'relative' : ''}`}
                  >
                    {/* Transfer Status Banner */}
                    {ticket.isTransferred && (
                      <div className="mb-4 p-3 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                        <div className="flex items-center gap-2">
                          <Send className="h-5 w-5" />
                          <span className="font-medium">
                            Billet transféré - Détails non accessibles
                          </span>
                        </div>
                        <p className="text-sm mt-1">
                          Ce billet a été transféré et n'est plus accessible. Seul le destinataire peut l'utiliser.
                        </p>
                      </div>
                    )}

                    {/* Ticket Status Banner - only show if not transferred */}
                    {!ticket.isTransferred && (
                      <div className={`mb-4 p-3 rounded-lg flex items-center justify-between ${
                        ticket.status === 'USED' 
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        <div className="flex items-center gap-2">
                          {ticket.status === 'USED' ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <XCircle className="h-5 w-5" />
                          )}
                          <span className="font-medium">
                            {ticket.status === 'USED' ? 'Billet utilisé' : 'Billet non utilisé'}
                          </span>
                        </div>
                        {ticket.status === 'USED' && (
                          <div className="text-sm">
                            <p>Scanné à {ticket.scan_location}</p>
                            <p>
                              {new Date(ticket.scanned_at!).toLocaleString()} 
                              {ticket.scanned_by_name && ` par ${ticket.scanned_by_name}`}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div id={`ticket-${ticket.id}`} data-ticket className={ticket.isTransferred ? 'blur-sm pointer-events-none' : ''}>
                      {ticket.isTransferred ? (
                        // Show a restricted version for transferred tickets
                        <div className="relative max-w-4xl mx-auto px-2 sm:px-4">
                          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
                            {/* Header */}
                            <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 overflow-hidden">
                              <img
                                src={booking.event.image_url}
                                alt={booking.event.title}
                                className="w-full h-full object-cover object-center scale-90 sm:scale-100"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                              <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
                              
                              <div className="absolute top-4 left-4 right-4">
                                <div className="backdrop-blur-sm bg-black/20 rounded-xl p-3 border border-white/20">
                                  <h1 className="text-white font-bold text-lg sm:text-xl lg:text-2xl line-clamp-2 sm:line-clamp-none leading-tight">
                                    {booking.event.title}
                                  </h1>
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-white/90 text-sm">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                      <span className="leading-tight">{new Date(booking.event.date).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                      <span className="leading-tight">{booking.event.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                      <span className="leading-tight line-clamp-1">{booking.event.location}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 sm:p-6 lg:p-8">
                              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                                <div className="flex-1">
                                  <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 backdrop-blur-sm shadow-xl border border-white/20">
                                      {ticket.ticket_type.name}
                                    </span>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 backdrop-blur-sm shadow-xl border border-white/20">
                                      Transféré
                                    </span>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <User className="h-4 w-4 text-gray-500" />
                                      <span className="text-sm text-gray-600">Détenteur: {user?.name || 'Utilisateur'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Ticket className="h-4 w-4 text-gray-500" />
                                      <span className="text-sm text-gray-600">Type: {ticket.ticket_type.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Calendar className="h-4 w-4 text-gray-500" />
                                      <span className="text-sm text-gray-600">Date: {new Date(booking.event.date).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* QR Code Placeholder */}
                                <div className="flex-shrink-0">
                                  <div className="w-32 h-32 bg-gray-200 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                                    <div className="text-center">
                                      <Send className="h-8 w-8 text-gray-400 mx-auto mb-1" />
                                      <p className="text-xs text-gray-500 font-medium">Transféré</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Send className="h-5 w-5 text-purple-600" />
                                  <span className="font-semibold text-purple-800">Billet transféré</span>
                                </div>
                                <p className="text-sm text-purple-700">
                                  Ce billet a été transféré à un autre utilisateur. Vous ne pouvez plus l'utiliser pour l'entrée à l'événement.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Show full ticket for non-transferred tickets
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
                          ticketStatus={ticket.status} // NEW: Pass ticket status
                          scannedAt={ticket.scanned_at} // NEW: Pass scan timestamp
                          scannedBy={ticket.scanned_by_name} // NEW: Pass scanner name
                          scanLocation={ticket.scan_location} // NEW: Pass scan location
                        />
                      )}
                    </div>

                    {/* Overlay for transferred tickets */}
                    {ticket.isTransferred && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                          <Send className="h-12 w-12 text-purple-400 mx-auto mb-2" />
                          <p className="text-purple-600 font-medium">Billet transféré</p>
                          <p className="text-sm text-purple-500">Plus accessible</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-end gap-3">
                      {!ticket.isTransferred && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTransferTicket({
                              ticketId: ticket.id,
                              ticketTitle: booking.event.title,
                              eventDate: booking.event.date,
                              eventTime: booking.event.time,
                              eventLocation: booking.event.location
                            });
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          <Send className="h-5 w-5" />
                          Transférer le billet
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadTicket(ticket, booking);
                        }}
                        disabled={downloadingTicket === ticket.id || ticket.isTransferred}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                          ticket.isTransferred 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        } disabled:opacity-50`}
                      >
                        {downloadingTicket === ticket.id ? (
                          <Loader className="h-5 w-5 animate-spin" />
                        ) : (
                          <Download className="h-5 w-5" />
                        )}
                        {ticket.isTransferred ? 'Billet transféré' : 'Télécharger le billet'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
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