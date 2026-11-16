import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Check, Download, Loader, ArrowLeft, Share2, Calendar, 
  MapPin, Clock, Users, Mail, Smartphone, Star, 
  Gift, Camera, Music, Ticket, ExternalLink,
  Copy, CheckCircle, Heart, MessageCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/AuthContext';
import TicketPass from '../components/design/TicketPass';
import TicketsDesk from '../components/design/TicketsDesk';
import TransferTicketModal from '../components/tickets/TransferTicketModal';
import { shortPlace } from '../utils/eventGeo';
import { formatCalendarDate, formatEventTime } from '../utils/formatters';
import toast from 'react-hot-toast';
import { generateTicketPNG } from '../utils/ticketService';
import { paymentService } from '../services/paymentService';
import PageSEO from '../components/SEO/PageSEO';
import { referralService } from '../services/referralService';
import {
  getGuestTokenForOrder,
  getGuestTicketsByToken,
  guestTicketsPath,
  type GuestTicketRow,
} from '../services/guestTicketService';
import { trackPurchase } from '../lib/metaPixel';

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

function mapGuestRowsToTickets(rows: GuestTicketRow[]): Ticket[] {
  return rows.map((row) => ({
    id: row.id,
    qr_code: row.qr_code,
    ticket_type: {
      id: row.id,
      name: row.ticket_type_name || 'Billet',
      price: Number(row.ticket_type_price || 0),
    },
    event: {
      id: row.order_id,
      title: row.event_title || 'Événement',
      date: row.event_date || '',
      time: row.event_time || '',
      location: row.event_location || '',
      image_url: row.event_image || '',
    },
  }));
}

export default function EnhancedBookingConfirmation() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [transferTicket, setTransferTicket] = useState<{ id: string; title: string } | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [addedToCalendar, setAddedToCalendar] = useState(false);

  const firstTicket = tickets[0] || null;

  useEffect(() => {
    if (!bookingId || tickets.length === 0) return;
    trackPurchase({
      orderId: bookingId,
      eventId: firstTicket?.event?.id,
      value: orderSummary?.total_amount,
      currency: orderSummary?.currency,
      numItems: tickets.length,
      createdAt: orderSummary?.booking_date,
    });
  }, [bookingId, tickets.length, firstTicket?.event?.id, orderSummary?.total_amount, orderSummary?.currency, orderSummary?.booking_date]);

  const pageTitle = firstTicket
    ? `Confirmation – ${firstTicket.event.title}`
    : 'Confirmation de réservation';

  const pageDescription = firstTicket && orderSummary
    ? `Vos billets pour ${firstTicket.event.title} le ${(() => { const [y,m,d] = firstTicket.event.date.split('T')[0].split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('fr-FR'); })()} à ${shortPlace(firstTicket.event.location).label}. Montant total : ${orderSummary.total_amount} ${orderSummary.currency}.`
    : 'Consultez la confirmation de votre réservation et téléchargez vos billets sur Temba.';

  const breadcrumbSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: 'https://tembas.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Mes billets',
        item: 'https://tembas.com/profile/my-tickets',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: firstTicket?.event?.title || 'Confirmation',
        item: `https://tembas.com/profile/bookings/${bookingId ?? ''}`,
      },
    ],
  }), [firstTicket?.event?.title, bookingId]);

  const orderSchema = useMemo(() => {
    if (!orderSummary || !tickets.length || !bookingId) return undefined;

    return {
      '@context': 'https://schema.org',
      '@type': 'Order',
      orderNumber: bookingId,
      priceCurrency: orderSummary.currency,
      price: orderSummary.total_amount,
      acceptedOffer: tickets.map((ticket) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Event',
          name: ticket.event.title,
          startDate: ticket.event.time
            ? `${ticket.event.date}T${ticket.event.time}`
            : ticket.event.date,
          location: {
            '@type': 'Place',
            name: ticket.event.location,
          },
        },
        price: ticket.ticket_type.price,
        priceCurrency: orderSummary.currency,
      })),
      orderedItem: tickets.map((ticket, index) => ({
        '@type': 'OrderItem',
        orderItemNumber: `${index + 1}`,
        orderedItem: {
          '@type': 'EventReservation',
          reservationStatus: 'https://schema.org/ReservationConfirmed',
          reservationFor: {
            '@type': 'Event',
            name: ticket.event.title,
            startDate: ticket.event.time
              ? `${ticket.event.date}T${ticket.event.time}`
              : ticket.event.date,
            location: {
              '@type': 'Place',
              name: ticket.event.location,
            },
          },
          ticketToken: ticket.qr_code,
          ticketNumber: ticket.id,
        },
      })),
      seller: {
        '@type': 'Organization',
        name: 'Temba',
        url: 'https://tembas.com/',
      },
      customer: {
        '@type': 'Person',
        name: profile?.name || user?.email || 'Client Temba',
        email: profile?.email || user?.email || undefined,
        telephone: profile?.phone || undefined,
      },
      paymentMethod: orderSummary.payment_method || undefined,
      orderDate: orderSummary.booking_date,
    };
  }, [orderSummary, tickets, bookingId, profile?.name, profile?.email, profile?.phone, user?.email]);

  const structuredData = useMemo(() => {
    const data = [];
    if (breadcrumbSchema) data.push(breadcrumbSchema);
    if (orderSchema) data.push(orderSchema);
    return data.length ? data : undefined;
  }, [breadcrumbSchema, orderSchema]);

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
    if (!bookingId || authLoading) return;

    if (!user) {
      const guestToken = searchParams.get('guest') || getGuestTokenForOrder(bookingId);
      if (guestToken) {
        navigate(guestTicketsPath(guestToken), { replace: true });
        return;
      }
    }

    const token = searchParams.get('token');
    if (token) {
      verifyPaymentAndFetchTickets(token);
    } else {
      fetchTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, authLoading, user]);

  // first_purchase referral completion (parity with mobile); fires once per order. Checkout credit logic unchanged.
  useEffect(() => {
    if (!bookingId || !user?.id || tickets.length === 0) return;
    const flagKey = `referral_complete_${bookingId}`;
    if (sessionStorage.getItem(flagKey)) return;

    let cancelled = false;
    (async () => {
      try {
        const { data: orderRow } = await supabase
          .from('orders')
          .select('user_id, total_amount')
          .eq('id', bookingId)
          .single();
        if (cancelled || !orderRow || orderRow.user_id !== user.id) return;
        const amount = Number(orderRow.total_amount ?? 0);
        const ok = await referralService.completeReferral({
          userId: user.id,
          orderId: bookingId,
          orderAmount: amount,
        });
        if (ok) {
          sessionStorage.setItem(flagKey, '1');
        }
      } catch (e) {
        console.warn('[referral] post-order completion skipped', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId, user?.id, tickets.length]);

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

      if (!user) {
        const guestToken = searchParams.get('guest') || getGuestTokenForOrder(bookingId);
        if (guestToken) {
          try {
            const guestRows = await getGuestTicketsByToken(guestToken);
            if (guestRows.length > 0) {
              setTickets(mapGuestRowsToTickets(guestRows));
              setLoading(false);
              return;
            }
          } catch (guestErr) {
            console.warn('Guest ticket lookup failed:', guestErr);
          }
        }
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
          .maybeSingle();
        
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
        
        // Guests cannot read orders/tickets via RLS — stop the 406 retry loop.
        if (!user) {
          toast('Retrouvez vos billets avec le lien reçu ou votre numéro de téléphone.', {
            duration: 6000,
            icon: '🎫',
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
        .select('total, display_currency, payment_method, created_at')
        .eq('id', bookingId)
        .maybeSingle();

      if (orderError) console.warn('Could not fetch order summary:', orderError);

      setTickets(ticketsData);
      if (orderData) {
        setOrderSummary({
          total_amount: Number(orderData.total ?? 0),
          currency: orderData.display_currency || 'XOF',
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
    const [ey, em, ed] = ticket.event.date.split('T')[0].split('-').map(Number);
    const eventDate = new Date(ey, em - 1, ed);
    const startTime = eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ticket.event.title)}&dates=${startTime}/${endTime}&location=${encodeURIComponent(shortPlace(ticket.event.location).label)}&details=${encodeURIComponent(`Votre billet pour ${ticket.event.title}. ID: ${ticket.id}`)}`;
    
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
    const [y, m, d] = dateString.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading || verifyingPayment || authLoading) {
    return (
      <div className="min-h-screen bg-paper flex justify-center items-center">
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
      <div className="min-h-screen bg-paper flex justify-center items-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ticket className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucun billet trouvé</h2>
          <p className="text-gray-600 mb-8">
            {user
              ? "Nous n'avons pas pu trouver de billets pour cette réservation."
              : 'Cette page est réservée aux comptes connectés. Retrouvez vos billets avec votre numéro de téléphone.'}
          </p>
          <Link
            to={user ? '/events' : '/find-tickets'}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="h-5 w-5" />
            {user ? 'Parcourir les événements' : 'Retrouver mes billets'}
          </Link>
        </div>
      </div>
    );
  }

  const paidDay = orderSummary?.booking_date
    ? formatCalendarDate(orderSummary.booking_date, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const paidTime = orderSummary?.booking_date?.includes('T') ? formatEventTime(orderSummary.booking_date) : '';
  const paidAt = [paidDay, paidTime].filter(Boolean).join(' à ') || null;

  return (
    <>
      <PageSEO
        title={pageTitle}
        description={pageDescription}
        canonicalUrl={`https://tembas.com/profile/bookings/${bookingId ?? ''}`}
        ogImage={firstTicket?.event?.image_url}
        keywords={['confirmation billet temba', firstTicket?.event?.title || 'billet Temba']}
        structuredData={structuredData}
        robots="noindex, nofollow"
      />
      <TicketsDesk
        tickets={tickets.map((ticket) => ({
          id: ticket.id,
          eventTitle: ticket.event.title,
          eventDate: ticket.event.date,
          eventTime: ticket.event.time,
          venue: ticket.event.location,
          holder: profile?.name || user?.email?.split('@')[0] || 'Détenteur',
          categoryName: ticket.ticket_type.name,
          price: ticket.ticket_type.price,
          qrValue: ticket.qr_code,
          ticketCode: ticket.id.slice(0, 8).toUpperCase(),
          orderCode: bookingId ? String(bookingId).slice(0, 8).toUpperCase() : undefined,
          state: 'valid' as const,
          image: ticket.event.image_url,
        }))}
        paymentLabel={orderSummary?.payment_method || null}
        paidAtLabel={paidAt}
        phoneHint={profile?.phone}
        emailHint={profile?.email || user?.email}
        total={orderSummary?.total_amount}
        onDownload={handleDownloadTickets}
        onCalendar={handleAddToCalendar}
        onTransfer={user ? (ticket) => setTransferTicket({ id: ticket.id, title: ticket.eventTitle }) : undefined}
        onShare={() => setShowShareModal(true)}
      />
      {showShareModal && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[#03061E]/50 px-4" onClick={() => setShowShareModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <p className="font-display text-[18px] font-bold">Partager</p>
            <button type="button" onClick={handleCopyLink} className="btn btn-secondary mt-4 h-11 w-full">
              {copiedToClipboard ? 'Lien copié' : 'Copier le lien'}
            </button>
            <button type="button" onClick={() => setShowShareModal(false)} className="mt-2 h-11 w-full text-[14px] text-ink-3">
              Fermer
            </button>
          </div>
        </div>
      )}
      {transferTicket && (
        <TransferTicketModal
          isOpen
          onClose={() => setTransferTicket(null)}
          ticketId={transferTicket.id}
          ticketTitle={transferTicket.title}
          onTransferComplete={() => setTransferTicket(null)}
        />
      )}
    </>
  );
}
