import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Download, Loader, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/AuthContext';
import FestivalTicket from '../components/tickets/FestivalTicket';
import toast from 'react-hot-toast';
import { generatePDF } from '../utils/ticketService';
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
      console.log('Verifying payment with token:', token);
      
      // Verify payment first
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
      toast.error('Erreur lors de la vérification du paiement');
      fetchTickets(); // Still try to fetch tickets
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
        
        const pdf = await generatePDF(element);
        const url = URL.createObjectURL(pdf);
        const link = document.createElement('a');
        link.href = url;
        link.download = `billet-${ticket.event.title.replace(/\s+/g, '-')}-${ticket.id.slice(-8)}.pdf`;
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
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {verifyingPayment ? 'Vérification du paiement...' : 'Chargement des billets...'}
          </p>
        </div>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucun billet trouvé</h2>
        <p className="text-gray-600 mb-8">Nous n'avons pas pu trouver de billets pour cette réservation.</p>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <ArrowLeft className="h-5 w-5" />
          Parcourir les événements
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Return button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
      >
        <ArrowLeft className="h-5 w-5" />
        Retour au tableau de bord
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vos billets sont prêts !</h1>
        <p className="text-gray-600">
          Vos billets ont été envoyés à votre email à {user?.email}
        </p>
      </div>

      {/* Tickets */}
      <div className="space-y-8 mb-8">
        {tickets.map((ticket) => (
          <div key={ticket.id} data-ticket>
            <FestivalTicket
              ticketHolder={profile?.name || user?.email?.split('@')[0] || 'Non assigné'}
              ticketType={ticket.ticket_type.name}
              ticketId={ticket.id}
              eventTitle={ticket.event.title}
              eventDate={ticket.event.date}
              eventTime={ticket.event.time}
              eventLocation={ticket.event.location}
              qrCode={ticket.qr_code}
              eventImage={ticket.event.image_url}
            />
          </div>
        ))}
      </div>

      {/* Google Maps Button */}
      {tickets.length > 0 && (
        <div className="flex justify-center mb-8">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tickets[0].event.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
          >
            Voir le lieu sur Google Maps
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center mb-8">
        <button
          onClick={handleDownloadTickets}
          disabled={downloadingTicket}
          className="flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {downloadingTicket ? (
            <Loader className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          Télécharger les billets
        </button>
      </div>

      {/* Important Information */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations importantes</h3>
        <ul className="space-y-2 text-gray-600">
          <li>• Veuillez arriver au moins 30 minutes avant le début de l'événement</li>
          <li>• Ayez votre code QR de billet prêt pour la numérisation à l'entrée</li>
          <li>• Respectez le code vestimentaire et les directives de l'événement</li>
          <li>• Pour toute question, contactez notre équipe de support</li>
        </ul>
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/dashboard"
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Voir toutes vos réservations →
        </Link>
      </div>
    </div>
  );
}