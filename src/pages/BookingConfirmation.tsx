import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Download, Loader, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/AuthContext';
import FestivalTicket from '../components/tickets/FestivalTicket';
import EnhancedFestivalTicket from '../components/tickets/EnhancedFestivalTicket';
import toast from 'react-hot-toast';
import { generateTicketPNG } from '../utils/ticketService';
import { paymentService } from '../services/paymentService';

interface Ticket {
  id: string;
  qr_code: string;
  ticket_type: {
    name: string;
    price: number;
  };
  event: {
    title: string;
    date: string;
    time: string;
    location: string;
    image_url: string;
  };
}

export default function BookingConfirmation() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Function to clear cart for current event
  const clearCartForCurrentEvent = () => {
    try {
      const cartData = localStorage.getItem('temba_cart_selections');
      if (cartData) {
        const cartState = JSON.parse(cartData);
        // Try to find the event ID from tickets data
        const eventId = tickets.length > 0 ? tickets[0].event.id : null;
        if (eventId && cartState[eventId]) {
          delete cartState[eventId];
          if (Object.keys(cartState).length === 0) {
            localStorage.removeItem('temba_cart_selections');
          } else {
            localStorage.setItem('temba_cart_selections', JSON.stringify(cartState));
          }
          window.dispatchEvent(new Event('cartUpdated'));
          console.log('🛒 Cart cleared for event:', eventId);
        }
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  useEffect(() => {
    if (bookingId) {
      const token = searchParams.get('token');
      if (token) {
        verifyPaymentAndFetchTickets(token);
      } else {
        fetchTickets();
      }
    }
  }, [bookingId, searchParams]);

  const verifyPaymentAndFetchTickets = async (token: string) => {
    try {
      setVerifyingPayment(true);
      
      // Check if we're coming from PaymentSuccess (which already verified the payment)
      const fromPaymentSuccess = sessionStorage.getItem('paymentVerified');
      if (fromPaymentSuccess === token) {
        console.log('🎯 Payment already verified, skipping re-verification');
        sessionStorage.removeItem('paymentVerified'); // Clean up
        toast.success('🎉 Paiement confirmé !');
        setTimeout(() => {
          fetchTickets();
        }, 500);
        return;
      }
      
      // If not from PaymentSuccess, try to fetch tickets first (they might already exist)
      console.log('🔍 Checking if tickets already exist before verification...');
      try {
        await fetchTickets();
        // If fetchTickets succeeded without errors, tickets exist, no need to verify
        console.log('✅ Tickets already exist, skipping payment verification');
        return;
      } catch (fetchError) {
        console.log('📋 Tickets not found, proceeding with payment verification...');
      }
      
      console.log('Verifying payment with token:', token);
      
      // Only verify payment if tickets don't exist yet
      const result = await paymentService.verifyPayment(token, bookingId);
      console.log('Payment verification result:', result);
      console.log('Payment verification details:', {
        success: result.success,
        status: result.status,
        message: result.message,
        payment_id: result.payment_id,
        order_id: result.order_id
      });
      
      if (result.success) {
        toast.success('Paiement vérifié avec succès !');
        
        // Clear cart after successful payment verification
        clearCartForCurrentEvent();
        
        // Wait a moment for tickets to be created, then fetch them
        setTimeout(() => {
          fetchTickets();
        }, 1000);
      } else {
        toast.error('Échec de la vérification du paiement');
        fetchTickets(); // Still try to fetch tickets
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      
      // If verification times out but we have a token, still try to fetch tickets
      if (error.message && error.message.includes('timeout')) {
        console.log('⏰ Verification timeout, trying to fetch tickets anyway...');
        toast.success('🎫 Chargement de vos billets...');
        fetchTickets();
      } else {
        toast.error('Erreur lors de la vérification du paiement');
        fetchTickets(); // Still try to fetch tickets
      }
    } finally {
      setVerifyingPayment(false);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id,
          qr_code,
          ticket_type:ticket_type_id (
            name,
            price
          ),
          event:event_id (
            title,
            date,
            time,
            location,
            image_url
          )
        `)
        .eq('order_id', bookingId);

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Aucun billet trouvé pour cette réservation');
      }

      setTickets(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des billets:', error);
      toast.error(error.message || 'Échec du chargement des billets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTickets = async () => {
    if (!tickets.length) return;
    
    try {
      setDownloadingTicket(true);
      const ticketElements = document.querySelectorAll('[data-ticket]');
      
      if (ticketElements.length === 0) {
        throw new Error('Élément de billet non trouvé');
      }
      
      // Télécharger chaque billet individuellement
      for (let i = 0; i < ticketElements.length; i++) {
        const element = ticketElements[i] as HTMLElement;
        const ticket = tickets[i];
        
        const png = await generateTicketPNG(element);
        const url = URL.createObjectURL(png);
        const link = document.createElement('a');
        link.href = url;
        link.download = `billet-${ticket.event.title.replace(/\s+/g, '-')}-${ticket.id.slice(-8)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      toast.success('Billets téléchargés avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement des billets:', error);
      toast.error('Échec du téléchargement des billets');
    } finally {
      setDownloadingTicket(false);
    }
  };

  if (loading || verifyingPayment) {
    return (
      <div className="min-h-[80vh] bg-cream bg-grain grid place-items-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl2 border border-line bg-paper shadow-pop overflow-hidden">
          <div className="px-5 py-3 bg-cream border-b border-line">
            <span className="eyebrow !text-ink">
              {verifyingPayment ? 'Vérification' : 'Chargement'}
            </span>
          </div>
          <div className="p-7 text-center space-y-4">
            <div className="grid place-items-center w-14 h-14 rounded-full bg-brand-50 mx-auto">
              <Loader className="h-6 w-6 animate-spin text-brand" />
            </div>
            <p className="text-[14px] text-ink-mute">
              {verifyingPayment ? 'Vérification du paiement…' : 'Chargement de vos billets…'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="min-h-[80vh] bg-cream bg-grain grid place-items-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <p className="eyebrow !text-ink-mute mb-2">Réservation introuvable</p>
          <h2 className="text-ink mb-3">Aucun billet trouvé</h2>
          <p className="text-[14px] text-ink-mute mb-6 leading-relaxed">
            Nous n'avons pas pu trouver de billets pour cette réservation.
          </p>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[14px] font-bold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Parcourir les événements
          </Link>
        </div>
      </div>
    );
  }

  const orderCode = bookingId ? bookingId.slice(0, 8).toUpperCase() : '—';

  return (
    <div>
      {/* — — — Success band (cream) — — — */}
      <section className="relative bg-cream bg-grain border-b border-line overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full bg-brand-50 blur-3xl opacity-60"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-24 w-[260px] h-[260px] rounded-full bg-accent-50 blur-3xl opacity-50"
        />

        <div className="relative max-w-3xl mx-auto px-4 lg:px-6 pt-7 pb-8 md:pt-9 md:pb-10 text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="absolute top-5 left-4 lg:left-6 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-mute hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Mon tableau de bord
          </button>

          <div className="grid place-items-center w-14 h-14 rounded-full bg-green-50 mx-auto mb-4 ring-1 ring-green-200">
            <Check className="h-7 w-7 text-green-600" />
          </div>

          <p className="eyebrow mb-2">
            <span
              className="tabular-nums"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              ORD · {orderCode}
            </span>
            <span className="mx-2 text-ink/40">·</span>
            Étape 3 / 3
          </p>

          <h1 className="!text-[clamp(24px,3.4vw,36px)] !leading-[1.06] text-ink mb-2 tracking-tight">
            Vos billets sont prêts !
          </h1>
          <p className="text-[14px] text-ink-mute">
            Une copie a été envoyée à <span className="font-semibold text-ink">{user?.email}</span>.
          </p>
        </div>
      </section>

      {/* — — — Tickets — — — */}
      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8 md:py-10">
          <div className="space-y-6 mb-7">
            {tickets.map(ticket => (
              <div key={ticket.id} data-ticket>
                <EnhancedFestivalTicket
                  ticketHolder={profile?.name || user?.email?.split('@')[0] || 'Non assigné'}
                  ticketType={ticket.ticket_type.name}
                  ticketId={ticket.id}
                  eventTitle={ticket.event.title}
                  eventDate={ticket.event.date}
                  eventTime={ticket.event.time}
                  eventLocation={ticket.event.location}
                  qrCode={ticket.qr_code}
                  eventImage={ticket.event.image_url}
                  price={ticket.ticket_type.price}
                  currency="XOF"
                  eventCategory="Concert"
                  specialInstructions="Arrivez 30 minutes avant le début. Présentez ce billet à l'entrée."
                />
              </div>
            ))}
          </div>

          {/* Action row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 mb-8">
            <button
              onClick={handleDownloadTickets}
              disabled={downloadingTicket}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[14px] font-bold transition-colors disabled:opacity-50"
            >
              {downloadingTicket ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Télécharger les billets
            </button>
            {tickets.length > 0 && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tickets[0].event.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-11 px-5 border border-line bg-paper text-ink rounded-lg text-[14px] font-medium hover:border-brand/40 hover:text-brand transition-colors"
              >
                Voir le lieu sur Google Maps
              </a>
            )}
          </div>

          {/* Info card */}
          <div className="bg-cream rounded-xl2 border border-line p-5">
            <p className="eyebrow mb-3">Avant le jour J</p>
            <ul className="space-y-2 text-[13px] text-ink/85">
              <li className="flex gap-2.5">
                <span className="text-accent flex-shrink-0">→</span>
                Arrivez au moins 30 minutes avant le début de l'événement.
              </li>
              <li className="flex gap-2.5">
                <span className="text-accent flex-shrink-0">→</span>
                Ayez votre QR code prêt pour la numérisation à l'entrée.
              </li>
              <li className="flex gap-2.5">
                <span className="text-accent flex-shrink-0">→</span>
                Respectez le code vestimentaire et les directives de l'événement.
              </li>
              <li className="flex gap-2.5">
                <span className="text-accent flex-shrink-0">→</span>
                Pour toute question, contactez notre équipe par WhatsApp ou email.
              </li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-brand transition-colors"
            >
              Voir toutes vos réservations
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}