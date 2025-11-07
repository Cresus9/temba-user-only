import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Check, Download, Loader, ArrowLeft, Share2, Calendar, 
  MapPin, Clock, Users, Mail, Smartphone, Star, 
  Gift, Camera, Music, Ticket, ExternalLink,
  Copy, CheckCircle, Heart, MessageCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/AuthContext';
import FestivalTicket from '../components/tickets/FestivalTicket';
import EnhancedFestivalTicket from '../components/tickets/EnhancedFestivalTicket';
import toast from 'react-hot-toast';
import { generatePDF } from '../utils/ticketService';
import { paymentService } from '../services/paymentService';

interface Ticket {
  id: string;
  qr_code: string;
  ticket_type: {
    id: string;
    name: string;
    price: number;
  };
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    image_url: string;
    description?: string;
  };
}

interface OrderSummary {
  total_amount: number;
  currency: string;
  payment_method?: string;
  booking_date: string;
}

export default function EnhancedBookingConfirmation() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [addedToCalendar, setAddedToCalendar] = useState(false);

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
      
      // Only verify payment if tickets don't exist yet
      const result = await paymentService.verifyPayment(token, bookingId);
      
      if (result.success) {
        toast.success('🎉 Paiement vérifié avec succès !');
        
        // Clear cart after successful payment verification
        clearCartForCurrentEvent();
        
        // Wait a bit longer for tickets to be created after verification
        setTimeout(() => {
          fetchTickets();
        }, 2000); // Increased from 1000ms to 2000ms
      } else {
        console.log('⚠️ Payment verification returned success=false:', result);
        // Even if verification says failed, tickets might still exist
        // Try fetching tickets after a short delay
        setTimeout(() => {
          fetchTickets();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      
      // If verification times out but we have a token, still try to fetch tickets
      if (error.message && error.message.includes('timeout')) {
        console.log('⏰ Verification timeout, trying to fetch tickets anyway...');
        toast.success('🎫 Chargement de vos billets...');
        fetchTickets();
      } else {
        toast.error('❌ Erreur lors de la vérification du paiement');
        fetchTickets();
      }
    } finally {
      setVerifyingPayment(false);
    }
  };

  const fetchTickets = async (retryCount = 0) => {
    let ticketsData: any[] | null = null;
    
    try {
      setLoading(true);
      
      if (!bookingId) {
        throw new Error('ID de réservation manquant');
      }
      
      // Get token from URL params for payment lookup fallback and verification
      const token = searchParams.get('token');
      
      console.log('🔍 Fetching tickets for order:', bookingId);
      
      // Fetch tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          qr_code,
          ticket_type:ticket_types!inner (
            id,
            name,
            price
          ),
          event:events!inner (
            id,
            title,
            date,
            time,
            location,
            image_url,
            description
          )
        `)
        .eq('order_id', bookingId);

      if (ticketsError) {
        console.error('❌ Error fetching tickets:', ticketsError);
        throw ticketsError;
      }
      
      ticketsData = tickets;
      console.log('📋 Tickets query result:', { count: ticketsData?.length || 0, ticketsData });
      
      if (!ticketsData || ticketsData.length === 0) {
        // Check payment status to see if it's still processing
        // Note: orders table doesn't have payment_id, so we query payments by order_id
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, status, event_id, user_id')
          .eq('id', bookingId)
          .single();
        
        // Get payment from payments table using order_id
        let paymentData = null;
        const { data: paymentByOrderId, error: paymentError } = await supabase
          .from('payments')
          .select('id, status, provider, order_id, transaction_id')
          .eq('order_id', bookingId)
          .maybeSingle();
        
        // If no payment found by order_id, try to find by token (from URL params)
        if (!paymentByOrderId && token) {
          console.log('⚠️ No payment found by order_id, trying token lookup:', token);
          const { data: paymentByToken } = await supabase
            .from('payments')
            .select('id, status, provider, order_id, transaction_id')
            .eq('token', token)
            .maybeSingle();
          
          if (paymentByToken) {
            console.log('✅ Found payment by token, but order_id is missing. Payment ID:', paymentByToken.id);
            // If payment exists but order_id is missing, update it
            if (!paymentByToken.order_id && bookingId) {
              console.log('🔧 Updating payment with order_id...');
              await supabase
                .from('payments')
                .update({ order_id: bookingId })
                .eq('id', paymentByToken.id);
              paymentData = { ...paymentByToken, order_id: bookingId };
            } else {
              paymentData = paymentByToken;
            }
          }
        }
        
        // If still no payment found, try finding by event_id and user_id (fallback)
        if (!paymentData && orderData) {
          console.log('⚠️ No payment found by order_id or token, trying event_id + user_id lookup...');
          const { data: paymentByEvent } = await supabase
            .from('payments')
            .select('id, status, provider, order_id, transaction_id')
            .eq('event_id', orderData.event_id)
            .eq('user_id', orderData.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (paymentByEvent) {
            console.log('✅ Found payment by event_id + user_id. Payment ID:', paymentByEvent.id);
            // Update payment with order_id if missing
            if (!paymentByEvent.order_id && bookingId) {
              console.log('🔧 Updating payment with order_id...');
              await supabase
                .from('payments')
                .update({ order_id: bookingId })
                .eq('id', paymentByEvent.id);
              paymentData = { ...paymentByEvent, order_id: bookingId };
            } else {
              paymentData = paymentByEvent;
            }
          } else {
            paymentData = paymentByOrderId; // Use null if nothing found
          }
        } else {
          paymentData = paymentByOrderId;
        }
        
        console.log('💳 Payment status check:', { 
          orderStatus: orderData?.status, 
          paymentStatus: paymentData?.status, 
          provider: paymentData?.provider,
          paymentId: paymentData?.id,
          hasOrderId: !!paymentData?.order_id,
          paymentError: paymentError?.message
        });
        
        // If order is COMPLETED but payment is not found or still pending, trigger verification
        if (orderData?.status === 'COMPLETED') {
          if (!paymentData) {
            // Order is COMPLETED but no payment found - tickets might already exist
            // Check if tickets exist directly (webhook might have created them)
            console.log('⚠️ Order is COMPLETED but no payment found - checking if tickets exist anyway...');
            // Continue to show "no tickets" message - tickets should exist if order is COMPLETED
            // This might indicate a data inconsistency
          } else if (paymentData.status === 'pending' || paymentData.status === 'processing') {
            console.log('🔍 Order is COMPLETED but payment still pending - triggering verification...');
            
            // Trigger payment verification to sync status and create tickets
            try {
              const verifyToken = token || paymentData.transaction_id || paymentData.id;
              if (verifyToken && paymentData.provider === 'pawapay') {
                const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-pawapay-payment', {
                  body: {
                    payment_id: paymentData.id,
                    payment_token: verifyToken,
                    order_id: bookingId
                  }
                });
                
                if (!verifyError && verifyResult?.success) {
                  console.log('✅ Payment verified successfully, retrying ticket fetch...');
                  // Retry immediately after verification
                  setTimeout(() => {
                    fetchTickets(retryCount);
                  }, 1000);
                  return;
                } else {
                  console.error('❌ Payment verification failed:', verifyError || verifyResult);
                  
                  // Check if verification explicitly failed (not just processing)
                  if (verifyResult?.state === 'failed') {
                    const errorMessage = verifyResult?.message || 'Le paiement a échoué. Veuillez réessayer.';
                    toast.error(errorMessage, {
                      duration: 8000,
                      icon: '❌'
                    });
                    setTickets([]);
                    setLoading(false);
                    return; // Stop retrying - payment failed
                  }
                  
                  // If state is 'processing', continue to retry logic below
                  // Otherwise, log and continue
                }
              } else if (verifyToken) {
                // Try unified verify-payment for other providers
                const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-payment', {
                  body: {
                    payment_id: paymentData.id,
                    payment_token: verifyToken,
                    order_id: bookingId
                  }
                });
                
                if (!verifyError && verifyResult?.success) {
                  console.log('✅ Payment verified successfully, retrying ticket fetch...');
                  setTimeout(() => {
                    fetchTickets(retryCount);
                  }, 1000);
                  return;
                } else if (verifyResult?.state === 'failed') {
                  // Unified verify-payment also returned failed
                  const errorMessage = verifyResult?.message || 'Le paiement a échoué. Veuillez réessayer.';
                  toast.error(errorMessage, {
                    duration: 8000,
                    icon: '❌'
                  });
                  setTickets([]);
                  setLoading(false);
                  return; // Stop retrying - payment failed
                }
              }
            } catch (verifyErr) {
              console.error('Verification error:', verifyErr);
            }
          } else if (paymentData.status === 'completed') {
            // Payment is completed but no tickets - call admin_finalize_payment to create them
            console.log('✅ Payment is completed but no tickets found - triggering ticket creation...');
            try {
              const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_finalize_payment', {
                p_payment_id: paymentData.id
              });
              
              if (!rpcError && rpcResult?.success) {
                console.log('✅ Tickets created via RPC, retrying fetch...');
                setTimeout(() => {
                  fetchTickets(retryCount);
                }, 1000);
                return;
              } else {
                console.error('❌ admin_finalize_payment failed:', rpcError || rpcResult);
              }
            } catch (rpcErr) {
              console.error('RPC error:', rpcErr);
            }
          }
        }
        
        // If payment is processing (pawaPay waiting for confirmation), show waiting message and auto-retry
        // BUT: Only retry if payment status is actually processing/pending (not failed)
        if (paymentData?.status === 'processing' || paymentData?.status === 'pending') {
          // Double-check: if payment status is 'failed', don't retry
          if (paymentData.status === 'failed') {
            toast.error('Le paiement a échoué. Veuillez réessayer ou contacter le support.', {
              duration: 8000,
              icon: '❌'
            });
            setTickets([]);
            setLoading(false);
            return;
          }
          
          console.log('⏳ Payment is processing, will auto-retry...');
          toast('⏳ Paiement en cours de traitement. Les billets seront disponibles une fois confirmé.', {
            duration: 5000,
            icon: '⏳'
          });
          
          // Auto-retry up to 10 times (30 seconds total)
          if (retryCount < 10) {
            setTimeout(() => {
              fetchTickets(retryCount + 1);
            }, 3000); // Retry every 3 seconds
            return;
          } else {
            // After 10 retries, show message but don't throw error
            toast('⏳ Paiement toujours en traitement. Vos billets apparaîtront automatiquement une fois le paiement confirmé.', {
              duration: 8000,
              icon: '⏳'
            });
            setTickets([]);
            setLoading(false);
            return;
          }
        }
        
        // If payment status is 'failed', stop immediately
        if (paymentData?.status === 'failed') {
          toast.error('Le paiement a échoué. Veuillez réessayer ou contacter le support.', {
            duration: 8000,
            icon: '❌'
          });
          setTickets([]);
          setLoading(false);
          return;
        }
        
        // If no tickets found and payment is not processing, retry once
        if (retryCount === 0) {
          console.log('⏳ No tickets found, retrying after 2 seconds...');
          setTimeout(() => {
            fetchTickets(1);
          }, 2000);
          return;
        }
        
        // Final attempt failed - show helpful message
        toast('⏳ Les billets sont en cours de création. Veuillez actualiser la page dans quelques instants.', {
          duration: 6000,
          icon: '⏳'
        });
        setTickets([]);
        setLoading(false);
        return;
      }

      // Fetch order summary
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('total_amount, currency, payment_method, created_at')
        .eq('id', bookingId)
        .single();

      if (orderError) console.warn('Could not fetch order summary:', orderError);

      setTickets(ticketsData);
      if (orderData) {
        setOrderSummary({
          total_amount: orderData.total_amount,
          currency: orderData.currency,
          payment_method: orderData.payment_method,
          booking_date: orderData.created_at
        });
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('Erreur lors du chargement des billets:', error);
      
      // Check if this is a "no tickets" error and payment might be processing
      if (error.message?.includes('Aucun billet trouvé') || !ticketsData || ticketsData.length === 0) {
        // Check payment status one more time
        try {
          // Query payment directly by order_id (orders table doesn't have payment_id)
          const { data: paymentData } = await supabase
            .from('payments')
            .select('id, status, provider')
            .eq('order_id', bookingId)
            .maybeSingle();
          
          if (paymentData && (paymentData.status === 'processing' || paymentData.status === 'pending')) {
            // Payment is processing - auto-retry
            if (retryCount < 10) {
              toast('⏳ Paiement en cours de traitement. Vérification des billets...', {
                duration: 3000,
                icon: '⏳'
              });
              setTimeout(() => {
                fetchTickets(retryCount + 1);
              }, 3000);
              return;
            } else {
              // After 10 retries, show message but don't throw error
              toast('⏳ Paiement toujours en traitement. Vos billets apparaîtront automatiquement une fois le paiement confirmé.', {
                duration: 8000,
                icon: '⏳'
              });
              setTickets([]);
              setLoading(false);
              return;
            }
          }
        } catch (checkError) {
          console.error('Error checking payment status:', checkError);
        }
      }
      
      // Only show error toast if not a retry attempt and not a processing payment
      if (retryCount === 0) {
        toast.error(error.message || 'Échec du chargement des billets');
      }
      
      setTickets([]);
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
      
      toast.success('✅ Billets téléchargés avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement des billets:', error);
      toast.error('❌ Échec du téléchargement des billets');
    } finally {
      setDownloadingTicket(false);
    }
  };

  const handleAddToCalendar = () => {
    if (!tickets.length) return;
    
    const ticket = tickets[0];
    const eventDate = new Date(ticket.event.date);
    const startTime = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ticket.event.title)}&dates=${startTime}/${endTime}&location=${encodeURIComponent(ticket.event.location)}&details=${encodeURIComponent(`Votre billet pour ${ticket.event.title}. ID: ${ticket.id}`)}`;
    
    window.open(calendarUrl, '_blank');
    setAddedToCalendar(true);
    toast.success('📅 Événement ajouté au calendrier !');
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedToClipboard(true);
      toast.success('🔗 Lien copié dans le presse-papiers !');
      setTimeout(() => setCopiedToClipboard(false), 3000);
    } catch (error) {
      toast.error('❌ Impossible de copier le lien');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading || verifyingPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex justify-center items-center">
        <div className="text-center">
          <div className="relative">
            <Loader className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-6" />
            <div className="absolute inset-0 h-12 w-12 border-4 border-indigo-200 rounded-full animate-pulse mx-auto"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {verifyingPayment ? 'Vérification du paiement' : 'Préparation de vos billets'}
          </h3>
          <p className="text-gray-600">
            {verifyingPayment ? 'Confirmation de votre transaction...' : 'Quelques instants, nous préparons tout pour vous...'}
          </p>
        </div>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex justify-center items-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ticket className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucun billet trouvé</h2>
          <p className="text-gray-600 mb-8">Nous n'avons pas pu trouver de billets pour cette réservation.</p>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="h-5 w-5" />
            Parcourir les événements
          </Link>
        </div>
      </div>
    );
  }

  const mainTicket = tickets[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour au tableau de bord
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Partager
            </button>
          </div>
        </div>

        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-75"></div>
            <div className="relative inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <Check className="h-10 w-10 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            🎉 Félicitations !
          </h1>
          <p className="text-xl text-gray-600">
            Vos billets sont confirmés et prêts
          </p>
        </div>



        {/* Order Summary */}
        {orderSummary && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé de commande</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(orderSummary.total_amount, orderSummary.currency)}
                </div>
                <div className="text-sm text-gray-600">Total payé</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-gray-900">{tickets.length}</div>
                <div className="text-sm text-gray-600">Billet{tickets.length > 1 ? 's' : ''}</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-lg font-bold text-gray-900 capitalize">
                  {orderSummary.payment_method || 'Mobile Money'}
                </div>
                <div className="text-sm text-gray-600">Mode de paiement</div>
              </div>
            </div>
          </div>
        )}

        {/* Tickets Display */}
        <div className="space-y-8 mb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Ticket className="h-6 w-6 text-indigo-600" />
              Vos billets ({tickets.length})
            </h3>
            <div className="text-sm text-gray-500">
              Cliquez sur un billet pour l'agrandir
            </div>
          </div>
          
          {tickets.map((ticket, index) => (
            <div key={ticket.id} data-ticket className="transform hover:scale-[1.01] transition-all duration-300 hover:shadow-2xl">
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
                currency={orderSummary?.currency || 'XOF'}
                orderNumber={bookingId}
                purchaseDate={orderSummary?.booking_date}
                eventCategory="Concert" // Could be dynamically set based on event data
                specialInstructions="Arrivez 30 minutes avant le début. Présentez ce billet à l'entrée."
              />
            </div>
          ))}
          
          {/* Ticket Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <button
              onClick={handleDownloadTickets}
              disabled={downloadingTicket}
              className="flex items-center justify-center gap-3 p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 border border-gray-100"
            >
              {downloadingTicket ? (
                <Loader className="h-5 w-5 animate-spin text-indigo-600" />
              ) : (
                <Download className="h-5 w-5 text-indigo-600" />
              )}
              <span className="font-medium">Télécharger PDF</span>
            </button>

            <button
              onClick={handleAddToCalendar}
              className={`flex items-center justify-center gap-3 p-4 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 ${
                addedToCalendar 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              {addedToCalendar ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Calendar className="h-5 w-5 text-gray-600" />
              )}
              <span className="font-medium">
                {addedToCalendar ? 'Ajouté au calendrier' : 'Ajouter au calendrier'}
              </span>
            </button>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mainTicket.event.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100"
            >
              <MapPin className="h-5 w-5 text-red-500" />
              <span className="font-medium">Voir sur Maps</span>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
          </div>
        </div>

        {/* Event Description - Only if available and unique info */}
        {mainTicket.event.description && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Music className="h-5 w-5 text-indigo-600" />
              À propos de l'événement
            </h3>
            <p className="text-gray-600 leading-relaxed">{mainTicket.event.description}</p>
          </div>
        )}

        {/* Important Information */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-8 border border-amber-200">
          <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-600" />
            Informations importantes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="space-y-3 text-amber-800">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-1 text-amber-600 flex-shrink-0" />
                <span className="text-sm">Arrivez 30 minutes avant le début</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-1 text-amber-600 flex-shrink-0" />
                <span className="text-sm">Code QR requis pour l'entrée</span>
              </li>
            </ul>
            <ul className="space-y-3 text-amber-800">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-1 text-amber-600 flex-shrink-0" />
                <span className="text-sm">Respectez le code vestimentaire</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-1 text-amber-600 flex-shrink-0" />
                <span className="text-sm">Support disponible 24/7</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="text-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
          >
            <Users className="h-5 w-5" />
            Voir toutes vos réservations
          </Link>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Partager vos billets</h3>
            
            <div className="space-y-3">
              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  copiedToClipboard 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {copiedToClipboard ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5 text-gray-600" />
                )}
                <span className="font-medium">
                  {copiedToClipboard ? 'Lien copié !' : 'Copier le lien'}
                </span>
              </button>

              <button
                onClick={() => {
                  const text = `Je vais à ${mainTicket.event.title} ! 🎉`;
                  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`;
                  window.open(url, '_blank');
                }}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-700">Partager sur Twitter</span>
              </button>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full mt-4 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
