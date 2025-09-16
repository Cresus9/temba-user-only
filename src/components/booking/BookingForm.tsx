import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { TicketType } from '../../types/event';
import TicketTypeCard from './TicketTypeCard';
import BookingSummary from './BookingSummary';
import TicketReviewModal from './TicketReviewModal';
import { useAuth } from '../../context/AuthContext';
import { useFeeCalculation } from '../../hooks/useFeeCalculation';
import { BookingLineItem } from '../../types/booking';

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
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>(
    ticketTypes.reduce((acc, ticket) => ({ ...acc, [ticket.id]: 0 }), {})
  );
  const [formError, setFormError] = useState<string | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  const isPaused = (ticket: TicketType) =>
    ticket.sales_enabled === false ||
    ticket.is_paused === true ||
    ticket.on_sale === false ||
    ticket.is_active === false ||
    ticket.status === 'PAUSED';

  useEffect(() => {
    setSelectedTickets(prev => {
      const next = { ...prev };
      let mutated = false;
      const validIds = new Set(ticketTypes.map(ticket => ticket.id));

      for (const ticket of ticketTypes) {
        if (isPaused(ticket) && next[ticket.id] > 0) {
          next[ticket.id] = 0;
          mutated = true;
        }
        if (!(ticket.id in next)) {
          next[ticket.id] = 0;
          mutated = true;
        }
      }

      for (const ticketId of Object.keys(next)) {
        if (!validIds.has(ticketId)) {
          delete next[ticketId];
          mutated = true;
        }
      }

      return mutated ? next : prev;
    });
  }, [ticketTypes]);

  const handleQuantityChange = (ticketId: string, quantity: number) => {
    const ticket = ticketTypes.find(t => t.id === ticketId);
    if (!ticket) return;

    if (isPaused(ticket)) {
      toast.error('La vente de ce billet est suspendue.');
      return;
    }

    const maxPerOrder = ticket.max_per_order ?? Infinity;
    if (quantity > maxPerOrder) {
      toast.error(`Maximum ${maxPerOrder} billets autorisés par commande`);
      return;
    }

    const available = ticket.available ?? 0;
    if (quantity > available) {
      toast.error(`Seulement ${available} billets disponibles`);
      return;
    }

    setSelectedTickets(prev => ({
      ...prev,
      [ticketId]: quantity
    }));
    setFormError(null);
  };

  const activeTicketTypes = useMemo(
    () => ticketTypes.filter(ticket => !isPaused(ticket)),
    [ticketTypes]
  );

  const lineItems: BookingLineItem[] = useMemo(() => {
    return activeTicketTypes
      .map(ticket => ({
        id: ticket.id,
        name: ticket.name,
        description: ticket.description,
        price: ticket.price,
        quantity: selectedTickets[ticket.id] || 0
      }))
      .filter(item => item.quantity > 0);
  }, [activeTicketTypes, selectedTickets]);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [lineItems]
  );

  const feeSelections = useMemo(
    () => lineItems.map(item => ({ ticket_type_id: item.id, quantity: item.quantity, price: item.price })),
    [lineItems]
  );

  const { fees, loading: feeLoading, error: feeCalculationError } = useFeeCalculation(eventId, feeSelections);

  const fallbackProcessingFee = useMemo(() => subtotal * 0.02, [subtotal]);
  const numericFee = Number(fees.total_buyer_fees ?? 0);
  const usingFallbackFees = feeCalculationError != null || !Number.isFinite(numericFee) || numericFee < 0;
  const processingFee = usingFallbackFees ? fallbackProcessingFee : numericFee;
  const total = subtotal + processingFee;
  const feeErrorMessage = usingFallbackFees
    ? 'Impossible de calculer les frais de service en temps réel. Un taux standard a été appliqué.'
    : null;

  const activeTicketSelection = useMemo(() => {
    const entries = Object.entries(selectedTickets)
      .filter(([ticketId, quantity]) => {
        if (!quantity || quantity <= 0) return false;
        const ticket = ticketTypes.find(t => t.id === ticketId);
        return ticket ? !isPaused(ticket) : false;
      })
      .map(([ticketId, quantity]) => [ticketId, quantity]);
    return Object.fromEntries(entries);
  }, [selectedTickets, ticketTypes]);

  const handleReviewOrder = (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    let hadPaused = false;
    setSelectedTickets(prev => {
      const next = { ...prev };
      for (const ticket of ticketTypes) {
        if (isPaused(ticket) && next[ticket.id] > 0) {
          next[ticket.id] = 0;
          hadPaused = true;
        }
      }
      return next;
    });

    if (hadPaused) {
      toast.error('Certaines catégories de billets ont été suspendues et ont été retirées du panier.');
    }

    if (lineItems.length === 0) {
      toast.error('Veuillez sélectionner au moins un billet');
      setFormError('Veuillez sélectionner au moins un billet actif');
      return;
    }

    setFormError(null);

    if (feeCalculationError) {
      toast.error('Les frais de service n’ont pas pu être mis à jour. Un taux standard sera appliqué.');
    }

    if (onReviewOpen) {
      onReviewOpen();
    }
    setIsReviewModalOpen(true);
  };

  const handleConfirmOrder = () => {
    const totals = { subtotal, processingFee, total };

    navigate('/checkout', {
      state: {
        tickets: activeTicketSelection,
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

  const availableTickets = ticketTypes.filter(ticket => ticket.available > 0 && !isPaused(ticket));
  const hasSelection = Object.values(selectedTickets).some(quantity => quantity > 0);

  if (availableTickets.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun billet disponible</h3>
        <p className="text-gray-600">
          Les billets ne sont actuellement pas disponibles pour cet événement.
          Revenez plus tard ou contactez l'organisateur pour plus d'informations.
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleReviewOrder} className="space-y-6">
        {(formError || (!formError && feeErrorMessage && hasSelection)) && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{formError || feeErrorMessage}</span>
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

        {lineItems.length > 0 && (
          <BookingSummary
            items={lineItems}
            currency={currency}
            subtotal={subtotal}
            processingFee={processingFee}
            total={total}
            feeLoading={feeLoading}
            feeError={feeErrorMessage}
            usingFallbackFees={usingFallbackFees}
          />
        )}

        <button
          type="submit"
          disabled={lineItems.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Ticket className="h-5 w-5" />
          Vérifier la commande
        </button>
      </form>

      <TicketReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          if (onReviewClose) {
            onReviewClose();
          }
        }}
        onConfirm={handleConfirmOrder}
        items={lineItems}
        currency={currency}
        subtotal={subtotal}
        processingFee={processingFee}
        total={total}
        feeLoading={feeLoading}
        feeError={feeErrorMessage}
        usingFallbackFees={usingFallbackFees}
      />
    </>
  );
}

