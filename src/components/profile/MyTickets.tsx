import React, { useState, useEffect } from 'react';
import { Download, Calendar, MapPin, Clock, Loader, Ticket, CheckCircle, Eye, Sparkles, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/AuthContext';
import EnhancedFestivalTicket from '../tickets/EnhancedFestivalTicket';
import TransferTicketModal from '../tickets/TransferTicketModal';
import { generatePDF } from '../../utils/ticketService';
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
        const pdfBlob = await generatePDF(retryElement);
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `billet-${ticket.event.title.replace(/\s+/g, '-')}-${ticket.id.slice(-8)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const pdfBlob = await generatePDF(ticketElement);
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `billet-${ticket.event.title.replace(/\s+/g, '-')}-${ticket.id.slice(-8)}.pdf`;
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


  const getTicketTypeColor = (typeName: string) => {
    const lower = typeName?.toLowerCase() || '';
    if (lower.includes('vip') || lower.includes('premium')) {
      return 'from-amber-500 via-orange-500 to-yellow-500';
    }
    if (lower.includes('standard') || lower.includes('général')) {
      return 'from-blue-500 via-indigo-500 to-purple-500';
    }
    return 'from-indigo-500 via-purple-500 to-purple-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-12 text-center border border-gray-100">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ticket className="h-10 w-10 text-indigo-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Aucun billet valide</h3>
        <p className="text-gray-600 text-lg">
          Vous n'avez actuellement aucun billet valide, non scanné et non transféré.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-purple-700 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-6 w-6" />
              <h2 className="text-3xl font-bold">Mes Billets</h2>
            </div>
            <p className="text-indigo-100 text-lg">
              {tickets.length} {tickets.length === 1 ? 'billet valide' : 'billets valides'} prêts à être utilisés
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Tous valides</span>
          </div>
        </div>
      </div>

      {/* Tickets List - Vertical Layout */}
      <div className="space-y-4">
        {tickets.slice(currentPage * ticketsPerPage, (currentPage + 1) * ticketsPerPage).map((ticket) => (
          <div
            key={ticket.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
          >
            {/* Ticket Header */}
            <div 
              className="p-4 sm:p-6 cursor-pointer hover:bg-indigo-50 transition-all duration-200"
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Left Side - Event Info */}
                <div className="flex-1 space-y-3">
                  {/* Event Title and Image */}
                  <div className="flex items-start gap-4">
                    {/* Event Image */}
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={ticket.event.image_url}
                        alt={ticket.event.title}
                        className="w-full h-full object-cover"
                        fallbackSrc="https://images.unsplash.com/photo-1459749411175-04bf5292ceea"
                        width={128}
                        height={128}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t ${getTicketTypeColor(ticket.ticket_type.name)} opacity-60`} />
                    </div>
                    
                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {ticket.event.title}
                        </h3>
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      </div>
                      
                      {/* Ticket Type Badge and Free Ticket Badge */}
                      <div className="mb-3 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getTicketTypeColor(ticket.ticket_type.name)}`}>
                          {ticket.ticket_type.name}
                        </span>
                        {/* Free Ticket Badge */}
                        {(ticket.order?.payment_method === 'FREE_TICKET' || 
                          ticket.order?.payment_method?.toUpperCase().includes('FREE') ||
                          (ticket.order && (!ticket.order.total || ticket.order.total === 0))) && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Billet Gratuit
                          </span>
                        )}
                      </div>

                      {/* Event Info */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 flex-shrink-0 text-blue-600" />
                          {new Date(ticket.event.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 flex-shrink-0 text-purple-600" />
                          {ticket.event.time}
                        </span>
                        <span className="flex items-start gap-1.5">
                          <MapPin className="h-4 w-4 flex-shrink-0 text-indigo-600 mt-0.5" />
                          <span className="line-clamp-2">{ticket.event.location}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Price and Actions */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-4">
                  {/* Price */}
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Prix du billet</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(ticket.ticket_type.price, ticket.event.currency)}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-semibold">Valide</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTicket(ticket);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 text-sm font-medium transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Voir les détails
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTicket(ticket);
                  }}
                  disabled={downloadingTicket === ticket.id}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    downloadingTicket === ticket.id
                      ? 'bg-indigo-400 cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  {downloadingTicket === ticket.id ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Télécharger le billet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows - Only show if more than 5 tickets */}
      {tickets.length > ticketsPerPage && (
        <div className="flex items-center justify-center gap-4 pt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
              currentPage === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
            }`}
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">
              Page {currentPage + 1} sur {Math.ceil(tickets.length / ticketsPerPage)}
            </span>
            <span className="text-xs text-gray-500">
              ({tickets.slice(currentPage * ticketsPerPage, (currentPage + 1) * ticketsPerPage).length} billets)
            </span>
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(tickets.length / ticketsPerPage) - 1, prev + 1))}
            disabled={currentPage >= Math.ceil(tickets.length / ticketsPerPage) - 1}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
              currentPage >= Math.ceil(tickets.length / ticketsPerPage) - 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
            }`}
            aria-label="Page suivante"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Détails du billet</h2>
                  {/* Free Ticket Badge in Modal */}
                  {(selectedTicket.order?.payment_method === 'FREE_TICKET' || 
                    selectedTicket.order?.payment_method?.toUpperCase().includes('FREE') ||
                    (selectedTicket.order && (!selectedTicket.order.total || selectedTicket.order.total === 0))) && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Billet Gratuit
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Ticket Display - Same as BookingHistory */}
              <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
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
                      // Refresh tickets after transfer
                      fetchMyTickets();
                      setSelectedTicket(null);
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Fermer
                </button>
                
                {/* Transfer Button - Only show if ticket was purchased by user AND is not a free ticket */}
                {(() => {
                  const isFreeTicket = selectedTicket.order?.payment_method === 'FREE_TICKET' || 
                                      selectedTicket.order?.payment_method?.toUpperCase().includes('FREE') ||
                                      (selectedTicket.order && (!selectedTicket.order.total || selectedTicket.order.total === 0));
                  
                  const canTransfer = ticketOwnership.get(selectedTicket.id) && 
                                     selectedTicket.status === 'VALID' && 
                                     !selectedTicket.scanned_at &&
                                     !isFreeTicket;
                  
                  return canTransfer ? (
                    <button
                      onClick={() => {
                        setTransferTicket({
                          ticketId: selectedTicket.id,
                          ticketTitle: selectedTicket.event.title,
                          eventDate: selectedTicket.event.date,
                          eventTime: selectedTicket.event.time,
                          eventLocation: selectedTicket.event.location
                        });
                      }}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      <Send className="h-4 w-4" />
                      Transférer le billet
                    </button>
                  ) : isFreeTicket ? (
                    <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Transfert non autorisé pour les billets gratuits
                    </div>
                  ) : null;
                })()}
                
                <button
                  onClick={() => {
                    handleDownloadTicket(selectedTicket);
                  }}
                  disabled={downloadingTicket === selectedTicket.id}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {downloadingTicket === selectedTicket.id ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Télécharger le billet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
