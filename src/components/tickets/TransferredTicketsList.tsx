import React, { useState, useEffect } from 'react';
import { Gift, Loader, Eye, Calendar, MapPin, Clock, User, X } from 'lucide-react';
import { transferredTicketsService, type TransferredTicket } from '../../services/transferredTicketsService';
import { useTranslation } from '../../context/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import EnhancedFestivalTicket from './EnhancedFestivalTicket';
import { formatCurrency } from '../../utils/formatters';

interface TransferredTicketsListProps {
  onTicketClick?: (ticket: TransferredTicket) => void;
}

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleTicketClick = (ticket: TransferredTicket) => {
    setSelectedTicket(ticket);
    onTicketClick?.(ticket);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-gray-600">Chargement des billets transférés...</p>
        </div>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="text-center py-12">
        <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Aucun billet transféré
        </h3>
        <p className="text-gray-600 mb-6">
          Vous n'avez reçu aucun billet transféré pour le moment.
        </p>
        <div className="text-sm text-gray-500">
          Les billets que vous recevez apparaîtront ici.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="h-6 w-6 text-purple-600" />
            Billets reçus
          </h2>
          <p className="text-gray-600 mt-1">
            {tickets.length} billet{tickets.length > 1 ? 's' : ''} transféré{tickets.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            onClick={() => handleTicketClick(ticket)}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Event Image */}
              {ticket.ticket.event.image_url && (
                <div className="w-full lg:w-32 h-32 lg:h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={ticket.ticket.event.image_url}
                    alt={ticket.ticket.event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              )}

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors mb-2">
                  {ticket.ticket.event.title}
                </h3>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(ticket.ticket.event.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{ticket.ticket.event.time}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-1">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{ticket.ticket.event.location}</span>
                  </div>
                </div>

                {/* Transfer Info */}
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-purple-600">
                    <User className="h-4 w-4" />
                    <span>
                      {ticket.sender ? `Transféré par ${ticket.sender.name}` : 'Billet transféré'}
                    </span>
                  </div>
                  <div className="text-gray-500">
                    {formatDate(ticket.created_at)}
                  </div>
                </div>

                {/* Message */}
                {ticket.message && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-800">
                      <span className="font-medium">Message: </span>
                      {ticket.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Ticket Type & Actions */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Type de billet</div>
                  <div className="font-semibold text-gray-900">{ticket.ticket.ticket_type.name}</div>
                  <div className="text-sm text-gray-600">
                    {formatCurrency(ticket.ticket.ticket_type.price, 'XOF')}
                  </div>
                  {/* Transfer Status */}
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ticket.status === 'USED' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {ticket.status === 'USED' ? 'Utilisé' : 'Reçu'}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTicketClick(ticket);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  <Eye className="h-4 w-4" />
                  Voir le billet
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Gift className="h-6 w-6 text-purple-600" />
                Billet reçu
              </h3>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Transfer Information Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Gift className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-purple-900">Billet transféré</h4>
                  <div className="text-sm text-purple-700">
                    {selectedTicket.sender && (
                      <span>Transféré par <strong>{selectedTicket.sender.name}</strong> le {formatDate(selectedTicket.created_at)}</span>
                    )}
                    {selectedTicket.message && (
                      <div className="mt-2 p-2 bg-white rounded border border-purple-200">
                        <span className="text-purple-600 font-medium">Message: </span>
                        <span className="text-purple-800">{selectedTicket.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Display */}
            <div className="relative">
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
                ticketStatus={selectedTicket.ticket.status} // NEW: Pass ticket status
                scannedAt={selectedTicket.ticket.scanned_at} // NEW: Pass scan timestamp
                scannedBy={selectedTicket.ticket.scanned_by_name} // NEW: Pass scanner name
                scanLocation={selectedTicket.ticket.scan_location} // NEW: Pass scan location
                onTransferComplete={() => {
                  setSelectedTicket(null);
                  // Refresh the transferred tickets list
                  fetchTransferredTickets();
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
