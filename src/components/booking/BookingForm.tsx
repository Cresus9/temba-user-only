import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, AlertCircle } from 'lucide-react';
import { TicketType } from '../../types/event';
import TicketTypeCard from './TicketTypeCard';
import BookingSummary from './BookingSummary';
import TicketReviewModal from './TicketReviewModal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface BookingFormProps {
  eventId: string;
  ticketTypes: TicketType[];
  currency: string;
  onReviewOpen?: () => void;
  onReviewClose?: () => void;
}

export default function BookingForm({ 
  eventId, 
  ticketTypes, 
  currency,
  onReviewOpen,
  onReviewClose
}: BookingFormProps) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<{ [key: string]: number }>(
    ticketTypes.reduce((acc, ticket) => ({ ...acc, [ticket.id]: 0 }), {})
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleQuantityChange = (ticketId: string, quantity: number) => {
    const ticket = ticketTypes.find(t => t.id === ticketId);
    if (!ticket) return;

    if (quantity > ticket.max_per_order) {
      toast.error(`Maximum ${ticket.max_per_order} billets autorisés par commande`);
      return;
    }

    if (quantity > ticket.available) {
      toast.error(`Seulement ${ticket.available} billets disponibles`);
      return;
    }

    setSelectedTickets(prev => ({
      ...prev,
      [ticketId]: quantity
    }));
    setError('');
  };

  const calculateTotals = () => {
    const subtotal = ticketTypes.reduce((total, ticket) => {
      return total + (ticket.price * (selectedTickets[ticket.id] || 0));
    }, 0);
    const processingFee = subtotal * 0.02; // 2% processing fee
    return {
      subtotal,
      processingFee,
      total: subtotal + processingFee
    };
  };

  const handleReviewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    // Validate at least one ticket is selected
    const hasTickets = Object.values(selectedTickets).some(qty => qty > 0);
    if (!hasTickets) {
      toast.error('Veuillez sélectionner au moins un billet');
      return;
    }

    if (onReviewOpen) {
      onReviewOpen();
    }
    setIsReviewModalOpen(true);
  };

  const handleConfirmOrder = () => {
    const totals = calculateTotals();
    
    // Navigate to checkout with order details
    navigate('/checkout', {
      state: {
        tickets: selectedTickets,
        totals,
        currency,
        eventId
      }
    });

    setIsReviewModalOpen(false);
    if (onReviewClose) {
      onReviewClose();
    }
  };

  const availableTickets = ticketTypes.filter(ticket => 
    ticket.available > 0
  );

  if (availableTickets.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">Aucun billet disponible</h3>
        <p className="text-[var(--gray-600)]">
          Les billets ne sont actuellement pas disponibles pour cet événement.
          Revenez plus tard ou contactez l'organisateur pour plus d'informations.
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleReviewOrder} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {ticketTypes.map((ticket) => (
            <TicketTypeCard
              key={ticket.id}
              ticket={ticket}
              quantity={selectedTickets[ticket.id] || 0}
              currency={currency}
              onQuantityChange={(quantity) => handleQuantityChange(ticket.id, quantity)}
            />
          ))}
        </div>

        {Object.values(selectedTickets).some(qty => qty > 0) && (
          <BookingSummary
            selectedTickets={selectedTickets}
            ticketTypes={ticketTypes}
            currency={currency}
          />
        )}

        <button
          type="submit"
          disabled={loading || !Object.values(selectedTickets).some(qty => qty > 0)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Ticket className="h-5 w-5" />
          Vérifier la commande
        </button>
      </form>

      {/* Review Order Modal */}
      <TicketReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          if (onReviewClose) {
            onReviewClose();
          }
        }}
        onConfirm={handleConfirmOrder}
        selectedTickets={selectedTickets}
        ticketTypes={ticketTypes}
        currency={currency}
      />
    </>
  );
}
