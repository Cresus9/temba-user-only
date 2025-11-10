import React, { useState, useEffect } from 'react';
import { Send, Loader, Eye, Calendar, MapPin, Clock, User, X } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useTranslation } from '../../context/TranslationContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import EnhancedFestivalTicket from './EnhancedFestivalTicket';
import { formatCurrency } from '../../utils/formatters';

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Fetching sent tickets for user:', user.id);

      const { data: transfers, error } = await supabase
        .from('ticket_transfers')
        .select(`
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
            event:events!inner (
              title,
              date,
              time,
              location,
              image_url
            ),
            ticket_type:ticket_types!inner (
              name,
              price
            )
          )
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Sent tickets query result:', { transfers, error });

      if (error) throw error;

      // If we have transfers, try to get recipient information separately
      if (transfers && transfers.length > 0) {
        const recipientIds = [...new Set(transfers.map(t => t.recipient_id).filter(Boolean))];
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

        // Add recipient info to transfers
        const transfersWithRecipients = transfers.map(transfer => ({
          ...transfer,
          recipient: transfer.recipient_id ? recipientsMap[transfer.recipient_id] : undefined
        }));

        setTickets(transfersWithRecipients);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Transféré';
      case 'PENDING':
        return 'En attente';
      case 'REJECTED':
        return 'Rejeté';
      case 'CANCELLED':
        return 'Annulé';
      default:
        return status;
    }
  };

  const handleTicketClick = (ticket: SentTicket) => {
    setSelectedTicket(ticket);
    onTicketClick?.(ticket);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-gray-600">Chargement des billets envoyés...</p>
        </div>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="text-center py-12">
        <Send className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Aucun billet envoyé
        </h3>
        <p className="text-gray-600 mb-6">
          Vous n'avez transféré aucun billet pour le moment.
        </p>
        <div className="text-sm text-gray-500">
          Les billets que vous transférez apparaîtront ici.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Send className="h-6 w-6 text-indigo-600" />
            Billets envoyés
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
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-200 hover:shadow-lg transition-all duration-200 cursor-pointer group"
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
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {ticket.ticket.event.title}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                    {getStatusText(ticket.status)}
                  </span>
                </div>
                
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
                  <div className="flex items-center gap-1 text-indigo-600">
                    <User className="h-4 w-4" />
                    <span>
                      {ticket.recipient 
                        ? `Envoyé à ${ticket.recipient.name}` 
                        : `Envoyé à ${ticket.recipient_email || ticket.recipient_phone || 'Utilisateur non inscrit'}`
                      }
                    </span>
                  </div>
                  <div className="text-gray-500">
                    {formatDate(ticket.created_at)}
                  </div>
                </div>

                {/* Message */}
                {ticket.message && (
                  <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-sm text-indigo-800">
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
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTicketClick(ticket);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
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
                <Send className="h-6 w-6 text-indigo-600" />
                Billet envoyé
              </h3>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Transfer Information Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Send className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-indigo-900">Billet transféré</h4>
                  <div className="text-sm text-indigo-700">
                    <div className="flex items-center gap-4">
                      <span>
                        {selectedTicket.recipient 
                          ? `Envoyé à ${selectedTicket.recipient.name}` 
                          : `Envoyé à ${selectedTicket.recipient_email || selectedTicket.recipient_phone || 'Utilisateur non inscrit'}`
                        }
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                        {getStatusText(selectedTicket.status)}
                      </span>
                    </div>
                    <div className="text-xs text-indigo-600 mt-1">
                      Transféré le {formatDate(selectedTicket.created_at)}
                    </div>
                    {selectedTicket.message && (
                      <div className="mt-2 p-2 bg-white rounded border border-indigo-200">
                        <span className="text-indigo-600 font-medium">Message: </span>
                        <span className="text-indigo-800">{selectedTicket.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Display - Read Only for Transferred Tickets */}
            <div className="relative">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="h-8 w-8 text-gray-500" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Billet transféré
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Ce billet a été transféré et n'est plus accessible. Seul le destinataire peut maintenant l'utiliser.
                  </p>
                </div>

                {/* Event Info */}
                <div className="bg-white rounded-lg p-6 mb-6 text-left">
                  <h5 className="font-semibold text-gray-900 mb-3">{selectedTicket.ticket.event.title}</h5>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(selectedTicket.ticket.event.date)} à {selectedTicket.ticket.event.time}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{selectedTicket.ticket.event.location}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="font-medium">{selectedTicket.ticket.ticket_type.name}</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(selectedTicket.ticket.ticket_type.price, 'XOF')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  Billet transféré - Plus accessible
                </div>
              </div>
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
