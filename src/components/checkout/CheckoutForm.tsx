import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, AlertCircle, Loader, Plus, Check, Smartphone, Gift, Ticket } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import { paymentMethodService } from '../../services/paymentMethodService';
import { SavedPaymentMethod } from '../../types/payment';
import { clearCartForEvent } from '../../utils/cartUtils';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase-client';
import { useFeeCalculation } from '../../hooks/useFeeCalculation';
import StripeElementsProvider from './StripeElementsProvider';
import StripePaymentForm from './StripePaymentForm';
import { stripePaymentService, FXQuote } from '../../services/stripePaymentService';
import { pawapayService } from '../../services/pawapayService';
import { formatCurrency } from '../../utils/formatters';

interface CheckoutFormProps {
  tickets: { [key: string]: number };
  totalAmount: number;
  currency: string;
  eventId: string;
  eventDateId?: string | null;
  onSuccess: (orderId: string) => void;
}

export default function CheckoutForm({ 
  tickets, 
  totalAmount, 
  currency, 
  eventId,
  eventDateId,
  onSuccess 
}: CheckoutFormProps) {

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('card'); // Default to card
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<string | null>(null);
  const [useNewMethod, setUseNewMethod] = useState(false);
  const [loadingSavedMethods, setLoadingSavedMethods] = useState(true);
  
  // Stripe payment state
  const [fxQuote, setFxQuote] = useState<FXQuote | null>(null);
  const [loadingFxQuote, setLoadingFxQuote] = useState(false);
  const [stripePaymentId, setStripePaymentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    provider: '',
    phone: '',
    preAuthorisationCode: '', // OTP code for Orange Money (required for ORANGE_BFA)
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: '',
    billingCity: '',
    billingCountry: '',
    saveMethod: false
  });
  const { user } = useAuth();
  const selections = useMemo(() => Object.entries(tickets).map(([ticket_type_id, quantity]) => ({ ticket_type_id, quantity: Number(quantity), price: 0 })), [tickets]);

  // Fetch prices for selections
  const [pricedSelections, setPricedSelections] = useState(selections);
  useEffect(() => {
    const loadPrices = async () => {
      const ids = Object.keys(tickets);
      if (ids.length === 0) { setPricedSelections([]); return; }
      const { data } = await supabase.from('ticket_types').select('id, price').in('id', ids);
      const map = new Map((data || []).map((t: any) => [t.id, Number(t.price || 0)]));
      setPricedSelections(Object.entries(tickets).map(([id, q]) => ({ ticket_type_id: id, quantity: Number(q), price: map.get(id) || 0 })));
    };
    loadPrices();
  }, [tickets]);

  const { fees } = useFeeCalculation(eventId, pricedSelections);
  const subtotal = pricedSelections.reduce((s, it) => s + it.price * it.quantity, 0);
  const buyerFees = fees.total_buyer_fees || 0;
  const grandTotal = subtotal + buyerFees;

  // Detect if this is a FREE order (all tickets are free)
  const isFreeOrder = grandTotal === 0 && subtotal === 0;

  // Format account display for better presentation
  const formatAccountDisplay = (method: SavedPaymentMethod) => {
    if (method.method_type === 'mobile_money') {
      return method.account_number;
    } else {
      // For credit cards, show in format: •••• •••• •••• 1234
      const cleanNumber = method.account_number.replace(/\D/g, '');
      if (cleanNumber.length >= 4) {
        const lastFour = cleanNumber.slice(-4);
        return `•••• •••• •••• ${lastFour}`;
      }
      return method.account_number;
    }
  };

  // Load saved payment methods on component mount
  useEffect(() => {
    const loadSavedMethods = async () => {
      if (!user) {
        setLoadingSavedMethods(false);
        return;
      }

      try {
        const methods = await paymentMethodService.getSavedPaymentMethods();
        
        // TEMPORARILY: Filter out mobile money methods (only show card methods)
        const cardMethods = methods.filter(method => method.method_type !== 'mobile_money');
        setSavedMethods(cardMethods);
        
        // Auto-select default card method if available
        const defaultMethod = cardMethods.find(method => method.is_default);
        const firstCardMethod = cardMethods[0];
        
        if (defaultMethod && !useNewMethod) {
          setSelectedSavedMethod(defaultMethod.id);
          setPaymentMethod('card');
        } else if (firstCardMethod && !useNewMethod) {
          // Select first card method if available
          setSelectedSavedMethod(firstCardMethod.id);
          setPaymentMethod('card');
        } else {
          // No saved card methods, force new method entry (card only)
          setUseNewMethod(true);
          setPaymentMethod('card');
        }
      } catch (error) {
        console.error('Error loading saved payment methods:', error);
        setUseNewMethod(true);
        setPaymentMethod('card');
      } finally {
        setLoadingSavedMethods(false);
      }
    };

    loadSavedMethods();
  }, [user, useNewMethod]);

  // Fetch FX quote when card payment is selected and we have a total amount
  useEffect(() => {
    const fetchFXQuote = async () => {
      console.log('🔍 FX Quote check:', { paymentMethod, grandTotal, currency });
      
      if (paymentMethod === 'card' && grandTotal > 0 && currency === 'XOF') {
        console.log('✅ Fetching FX quote for card payment...');
        setLoadingFxQuote(true);
        try {
          // Convert grandTotal to minor units (XOF is zero-decimal, so we don't multiply by 100)
          // For XOF: 15750 XOF = 15750 minor units (no cents)
          const xofAmountMinor = Math.round(grandTotal);
          console.log('💱 Requesting FX quote for:', xofAmountMinor, 'XOF');
          const quote = await stripePaymentService.getFXQuote(xofAmountMinor);
          setFxQuote(quote);
          console.log('✅ FX Quote fetched successfully:', quote);
        } catch (error: any) {
          console.error('❌ Failed to fetch FX quote:', error);
          toast('Taux de change indisponible pour le moment. Vous pouvez continuer le paiement.', {
            icon: 'ℹ️',
          });
        } finally {
          setLoadingFxQuote(false);
        }
      } else {
        console.log('⏭️ Skipping FX quote:', { 
          isCard: paymentMethod === 'card',
          hasAmount: grandTotal > 0,
          isXOF: currency === 'XOF'
        });
        setFxQuote(null);
      }
    };

    fetchFXQuote();
  }, [paymentMethod, grandTotal, currency]);

  // Handle Stripe payment success
  const handleStripePaymentSuccess = async (paymentId: string, orderId: string, paymentToken: string) => {
    console.log('🎉 [CHECKOUT] Stripe payment success handler called');
    console.log('Parameters:', { paymentId, orderId, paymentToken });
    
    try {
      setIsProcessing(true);
      
      // Store payment details for saving after successful payment
      const paymentDetails = {
        orderId,
        paymentToken,
        eventId,
        method: 'credit_card',
        provider: 'stripe',
        saveMethod: false
      };
      
      console.log('💾 [CHECKOUT] Storing payment details in localStorage:', paymentDetails);
      localStorage.setItem('paymentDetails', JSON.stringify(paymentDetails));

      // Redirect to unified payment status page (webhook + realtime source of truth)
      const statusUrl = `${window.location.origin}/payment/${encodeURIComponent(
        paymentId
      )}?order_id=${encodeURIComponent(orderId)}&provider=stripe`;
      console.log('🔄 [CHECKOUT] Redirecting to:', statusUrl);
      window.location.href = statusUrl;
      
    } catch (error: any) {
      console.error('❌ [CHECKOUT] Error handling Stripe payment success:', error);
      toast.error('Erreur lors du traitement du paiement');
      setIsProcessing(false);
    }
  };

  // Handle Stripe payment error
  const handleStripePaymentError = (error: string) => {
    console.error('❌ [CHECKOUT] Stripe payment error handler called');
    console.error('Error:', error);
    toast.error(error);
  };

  // Handle FREE ticket reservation (no payment needed)
  const handleFreeReservation = async () => {
    console.log('🎫 [FREE] Starting free ticket reservation...');
    
    if (isProcessing) {
      console.warn('⚠️ [FREE] Already processing, ignoring');
      return;
    }
    
    if (!user) {
      console.error('❌ [FREE] No user');
      toast.error('Veuillez vous connecter pour continuer');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Create order with FREE_TICKET payment method
      const result = await orderService.createFreeOrder({
        eventId,
        ticketQuantities: tickets,
        eventDateId
      });

      if (!result.success || !result.orderId) {
        throw new Error(result.error || 'Échec de la création de la commande');
      }

      console.log('✅ [FREE] Order created:', result.orderId);

      // Clear cart after successful reservation
      const cleared = clearCartForEvent(eventId, 'CheckoutForm-Free');
      if (cleared) {
        console.log('🛒 [FREE] Cart cleared');
      }

      // Show success message
      toast.success('Réservation confirmée ! Vos billets gratuits sont prêts.');

      // Redirect to confirmation page
      onSuccess(result.orderId);
      
    } catch (error: any) {
      console.error('❌ [FREE] Reservation error:', error);
      toast.error(error.message || 'Échec de la réservation');
    } finally {
      setIsProcessing(false);
    }
  };

  const validateForm = (): boolean => {
    // If using a saved payment method, no validation needed
    if (selectedSavedMethod && !useNewMethod) {
      return true;
    }

    // Validate new payment method
    if (paymentMethod === 'mobile_money') {
      console.log('🔍 [VALIDATE] Mobile money validation:', {
        provider: formData.provider,
        phone: formData.phone,
        hasProvider: !!formData.provider,
        hasPhone: !!formData.phone
      });
      
      if (!formData.provider) {
        console.error('❌ [VALIDATE] Missing provider');
        toast.error('Veuillez sélectionner un fournisseur de paiement');
        return false;
      }
      if (!formData.phone) {
        console.error('❌ [VALIDATE] Missing phone');
        toast.error('Veuillez entrer votre numéro de téléphone');
        return false;
      }
      // Validate phone number format
      const phoneRegex = /^\+?[0-9]{8,}$/;
      const cleanedPhone = formData.phone.replace(/\s+/g, '');
      if (!phoneRegex.test(cleanedPhone)) {
        console.error('❌ [VALIDATE] Invalid phone format:', cleanedPhone);
        toast.error('Veuillez entrer un numéro de téléphone valide');
        return false;
      }
      console.log('✅ [VALIDATE] Phone format valid');
      // Check if pre-authorization code field is visible and required
      const preAuthField = document.getElementById('pre-auth-field');
      if (preAuthField && !preAuthField.classList.contains('hidden')) {
        // Field is visible, so it's required
        const otpInput = preAuthField.querySelector('input') as HTMLInputElement | null;
        if (!formData.preAuthorisationCode || formData.preAuthorisationCode.trim().length === 0) {
          otpInput?.focus();
          return false;
        }
        // Validate OTP format (should be numeric, 4-10 digits)
        const otpRegex = /^[0-9]{4,10}$/;
        if (!otpRegex.test(formData.preAuthorisationCode.trim())) {
          otpInput?.focus();
          return false;
        }
      }
    } else {
      if (!formData.cardNumber || !formData.expiryDate || !formData.cvv || !formData.cardholderName) {
        toast.error('Veuillez entrer tous les détails de la carte');
        return false;
      }
      // Validate card number format (basic check)
      const cardNumberRegex = /^[0-9]{16}$/;
      if (!cardNumberRegex.test(formData.cardNumber.replace(/\s+/g, ''))) {
        toast.error('Veuillez entrer un numéro de carte valide');
        return false;
      }
      // Validate expiry date format (MM/YY)
      const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
      if (!expiryRegex.test(formData.expiryDate)) {
        toast.error('Veuillez entrer une date d\'expiration valide (MM/AA)');
        return false;
      }
      // Validate CVV format
      const cvvRegex = /^[0-9]{3,4}$/;
      if (!cvvRegex.test(formData.cvv)) {
        toast.error('Veuillez entrer un CVV valide');
        return false;
      }
      // Validate cardholder name
      if (formData.cardholderName.trim().length < 2) {
        toast.error('Veuillez entrer le nom du titulaire de la carte');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔵 [FORM] Submit triggered', { 
      paymentMethod, 
      isProcessing,
      provider: formData.provider,
      phone: formData.phone,
      user: !!user,
      timestamp: new Date().toISOString()
    });
    
    if (isProcessing) {
      console.warn('⚠️ [FORM] Already processing, ignoring submit');
      return;
    }
    
    if (!user) {
      console.error('❌ [FORM] No user');
      toast.error('Veuillez vous connecter pour continuer');
      return;
    }

    const validationResult = validateForm();
    console.log('🔍 [FORM] Validation result:', validationResult);
    if (!validationResult) {
      console.error('❌ [FORM] Validation failed');
      return;
    }
    
    console.log('✅ [FORM] Validation passed, starting payment...');

    try {
      setIsProcessing(true);
      
      // Get payment details from saved method or form
      let paymentDetails;
      let actualPaymentMethod;
      
      if (selectedSavedMethod && !useNewMethod) {
        const savedMethod = savedMethods.find(m => m.id === selectedSavedMethod);
        if (!savedMethod) {
          throw new Error('Méthode de paiement sauvegardée non trouvée');
        }
        
        actualPaymentMethod = savedMethod.method_type === 'mobile_money' ? 'MOBILE_MONEY' : 'CARD';
        paymentDetails = savedMethod.method_type === 'mobile_money' ? {
          provider: savedMethod.provider,
          phone: savedMethod.account_number
        } : {
          cardNumber: savedMethod.account_number,
          expiryDate: '12/25', // Placeholder for saved cards
          cvv: '123', // Placeholder for saved cards
          cardholderName: savedMethod.account_name || 'Card Holder'
        };
      } else {
        actualPaymentMethod = paymentMethod === 'mobile_money' ? 'MOBILE_MONEY' : 'CARD';
        paymentDetails = paymentMethod === 'mobile_money' ? {
          provider: formData.provider,
          phone: formData.phone,
          preAuthorisationCode: formData.preAuthorisationCode // Include OTP if provided
        } : {
          cardNumber: formData.cardNumber,
          expiryDate: formData.expiryDate,
          cvv: formData.cvv,
          cardholderName: formData.cardholderName,
          billingAddress: formData.billingAddress,
          billingCity: formData.billingCity,
          billingCountry: formData.billingCountry
        };
      }
      
      // ═══════════════════════════════════════════════════════
      // ✅ STRIPE CODE PATH - UNTOUCHED (Card payments)
      // ═══════════════════════════════════════════════════════
      if (actualPaymentMethod === 'CARD') {
        // Card payments continue using existing Stripe flow through orderService
        const result = await orderService.createOrder({
          eventId,
          ticketQuantities: tickets,
          paymentMethod: actualPaymentMethod,
          paymentDetails
        });

        if (result.success && result.paymentUrl) {
          // Stripe may return paymentUrl for redirects (if needed)
          // Store payment details for saving after successful payment
          const shouldSave = useNewMethod && formData.saveMethod;
          const paymentDetailsForStorage = {
            method: 'credit_card',
            saveMethod: shouldSave,
            cardNumber: paymentDetails.cardNumber,
            cardholderName: paymentDetails.cardholderName || user?.email?.split('@')[0] || 'Card Holder'
          };

          localStorage.setItem('paymentDetails', JSON.stringify({
            orderId: result.orderId,
            paymentToken: result.paymentToken,
            eventId: eventId,
            ...paymentDetailsForStorage
          }));

          // Stripe typically uses in-page forms, but handle redirect if provided
          if (result.paymentUrl) {
            window.location.href = result.paymentUrl;
          }
        } else if (result.orderId) {
          // Clear cart after successful order creation
          const cleared = clearCartForEvent(eventId, 'CheckoutForm');
          if (cleared) {
            toast.success('🛒 Panier vidé après commande créée');
          }
          
          // Fallback to success page
          onSuccess(result.orderId);
          toast.success('Commande créée avec succès !');
        } else {
          throw new Error('Aucun ID de commande retourné');
        }
        return; // Exit early for card payments
      }

      // ═══════════════════════════════════════════════════════
      // ⚠️ MOBILE MONEY CODE PATH - NOW USES PAWAPAY
      // ═══════════════════════════════════════════════════════
      // Create order first
      const orderResult = await orderService.createOrder({
        eventId,
        ticketQuantities: tickets,
        paymentMethod: actualPaymentMethod,
        paymentDetails
      });

      if (!orderResult.success || !orderResult.orderId) {
        throw new Error('Failed to create order');
      }

      // Prepare ticket lines for pawaPay
      const ticketLines = pricedSelections.map(selection => ({
        ticket_type_id: selection.ticket_type_id,
        quantity: selection.quantity,
        price_major: selection.price,
        currency: 'XOF'
      }));

      // Create pawaPay payment
      const idempotencyKey = `web-pawapay-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const pawapayResponse = await pawapayService.createPayment({
        idempotency_key: idempotencyKey,
        user_id: user?.id,
        buyer_email: user?.email,
        event_id: eventId,
        order_id: orderResult.orderId,
        ticket_lines: ticketLines,
        amount_major: grandTotal,
        currency: 'XOF',
        method: 'mobile_money',
        phone: paymentDetails.phone,
        provider: paymentDetails.provider, // orange-money-bf, mtn-mobile-money, moov-money, etc.
        preAuthorisationCode: paymentDetails.preAuthorisationCode || undefined, // OTP for second attempt (if provided)
        return_url: `${window.location.origin}/payment/success?order=${orderResult.orderId}`,
        cancel_url: `${window.location.origin}/payment/cancelled?order=${orderResult.orderId}`,
        description: `Billets d'événement - ${eventId}`
      });

      // ✅ BEST CASE: Payment URL redirect available (no OTP needed!)
      if (pawapayResponse.has_payment_redirect && pawapayResponse.payment_url) {
        console.log('🚀 Redirecting to pawaPay payment page (no OTP needed)');
        
        // Store payment details for saving after successful payment
        const shouldSave = useNewMethod && formData.saveMethod;
        const paymentDetailsForStorage = {
          method: 'mobile_money',
          saveMethod: shouldSave,
          provider: paymentDetails.provider,
          phone: paymentDetails.phone
        };

        localStorage.setItem('paymentDetails', JSON.stringify({
          orderId: orderResult.orderId,
          paymentToken: pawapayResponse.transaction_id || pawapayResponse.payment_token,
          paymentId: pawapayResponse.payment_id,
          eventId: eventId,
          provider: 'pawapay',
          ...paymentDetailsForStorage
        }));

        // Use window.location.assign for smoother flow (same tab)
        window.location.assign(pawapayResponse.payment_url);
        return; // Exit - user will be redirected
      }

      // ⚠️ PRE_AUTH_REQUIRED: Show OTP field (fallback case)
      if (pawapayResponse.requires_pre_auth || pawapayResponse.error === 'PRE_AUTH_REQUIRED') {
        // Show the pre-authorization code field
        const preAuthField = document.getElementById('pre-auth-field');
        if (preAuthField) {
          preAuthField.classList.remove('hidden');
          preAuthField.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Show helpful message with hint about auto-SMS
        setIsProcessing(false);
        return; // Don't proceed, wait for user to enter OTP and retry
      }

      // ❌ ERROR: Payment creation failed
      if (!pawapayResponse.success) {
        throw new Error(pawapayResponse.error || pawapayResponse.error_message || 'Failed to create pawaPay payment');
      }

      // ✅ SUCCESS without redirect: Store and redirect to success page
      const shouldSave = useNewMethod && formData.saveMethod;
      const paymentDetailsForStorage = {
        method: 'mobile_money',
        saveMethod: shouldSave,
        provider: paymentDetails.provider,
        phone: paymentDetails.phone
      };

      localStorage.setItem('paymentDetails', JSON.stringify({
        orderId: orderResult.orderId,
        paymentToken: pawapayResponse.transaction_id || pawapayResponse.payment_token,
        paymentId: pawapayResponse.payment_id,
        eventId: eventId,
        provider: 'pawapay',
        ...paymentDetailsForStorage
      }));

      // Fallback: redirect to success page if no payment URL
      const paymentId = pawapayResponse.payment_id;
      if (!paymentId) {
        throw new Error('payment_id manquant dans la réponse pawaPay');
      }
      const statusUrl = `${window.location.origin}/payment/${encodeURIComponent(
        paymentId
      )}?order_id=${encodeURIComponent(orderResult.orderId)}&provider=pawapay`;
      window.location.href = statusUrl;
      return; // Exit after mobile money payment
    } catch (error: any) {
      console.error('Erreur de paiement:', error);
      toast.error(error.message || 'Échec du traitement de la commande');
    } finally {
      setIsProcessing(false);
    }
  };

  const otpExampleAmount = Math.max(1, Math.round(grandTotal || 0));

  // ═══════════════════════════════════════════════════════
  // 🎫 FREE ORDER UI - Show simplified confirmation for free tickets
  // ═══════════════════════════════════════════════════════
  if (isFreeOrder) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Free ticket header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Gift className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Événement Gratuit
            </h2>
            <p className="text-gray-600">
              Aucun paiement requis pour cet événement
            </p>
          </div>

          {/* Order summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Ticket className="h-5 w-5 text-indigo-600" />
              Récapitulatif de votre réservation
            </h3>
            <div className="space-y-2">
              {pricedSelections.filter(s => s.quantity > 0).map((selection) => (
                <div key={selection.ticket_type_id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {selection.quantity}x Billet
                  </span>
                  <span className="font-medium text-green-600">Gratuit</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-3 pt-3">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-green-600">Gratuit</span>
              </div>
            </div>
          </div>

          {/* Info message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700">
              <strong>📧 Confirmation par email</strong><br />
              Vous recevrez un email de confirmation avec vos billets après la réservation.
            </p>
          </div>

          {/* Confirm button */}
          <button
            type="button"
            onClick={handleFreeReservation}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {isProcessing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Réservation en cours...</span>
              </>
            ) : (
              <>
                <Gift className="h-5 w-5" />
                <span>Confirmer la réservation gratuite</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // 💳 PAID ORDER UI - Normal payment flow
  // ═══════════════════════════════════════════════════════
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Méthode de paiement
        </h2>
        
        <form 
          onSubmit={(e) => {
            console.log('📋 [FORM] onSubmit handler called directly!', e.type);
            handleSubmit(e);
          }}
          className="space-y-6"
          noValidate
        >
          {/* Loading state */}
          {loadingSavedMethods && (
            <div className="flex justify-center py-4">
              <Loader className="h-6 w-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-gray-600">Chargement des méthodes sauvegardées...</span>
            </div>
          )}

          {/* Saved Payment Methods */}
          {!loadingSavedMethods && savedMethods.length > 0 && !useNewMethod && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Méthodes sauvegardées
                </h3>
                <button
                  type="button"
                  onClick={() => setUseNewMethod(true)}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Nouvelle méthode
                </button>
              </div>

              <div className="space-y-3">
                {savedMethods
                  .sort((a, b) => {
                    // Sort mobile money first, then credit cards
                    if (a.method_type === 'mobile_money' && b.method_type !== 'mobile_money') return -1;
                    if (a.method_type !== 'mobile_money' && b.method_type === 'mobile_money') return 1;
                    // Then sort by default status
                    if (a.is_default && !b.is_default) return -1;
                    if (!a.is_default && b.is_default) return 1;
                    return 0;
                  })
                  .map((method) => (
                  <div
                    key={method.id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${
                      selectedSavedMethod === method.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedSavedMethod(method.id);
                      setPaymentMethod(method.method_type === 'mobile_money' ? 'mobile_money' : 'card');
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      {method.method_type === 'mobile_money' ? (
                        <Smartphone className="h-5 w-5 text-green-600" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-blue-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {method.method_type === 'mobile_money' 
                            ? method.provider
                            : (method.provider === 'Unknown' || method.provider === 'Carte' ? 'Carte de Crédit' : method.provider)
                          }
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatAccountDisplay(method)}
                        </p>
                        {method.account_name && (
                          <p className="text-xs text-gray-500">{method.account_name}</p>
                        )}
                        {method.is_default && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-1">
                            Défaut
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedSavedMethod === method.id && (
                      <Check className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Payment Method Form */}
          {(useNewMethod || savedMethods.length === 0) && !loadingSavedMethods && (
            <>
              {savedMethods.length > 0 && (
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Nouvelle méthode de paiement
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setUseNewMethod(false);
                      setSelectedSavedMethod(savedMethods[0]?.id || null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    ← Retour aux méthodes sauvegardées
                  </button>
                </div>
              )}

              {/* Payment Method Selection */}
              <div className="flex gap-4 mb-4">
                {/* Mobile Money Payment - Now using pawaPay */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mobile_money')}
                  className={`flex-1 flex items-center gap-3 p-4 border rounded-lg ${
                    paymentMethod === 'mobile_money'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Smartphone className={`h-5 w-5 ${
                    paymentMethod === 'mobile_money' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      Mobile Money
                    </p>
                    <p className="text-sm text-gray-500">
                      Orange Money, Wave, Moov Money
                    </p>
                  </div>
                </button>

                {/* Card Payment */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 flex items-center gap-3 p-4 border rounded-lg ${
                    paymentMethod === 'card'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className={`h-5 w-5 ${
                    paymentMethod === 'card' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      Carte de Crédit / Débit
                    </p>
                    <p className="text-sm text-gray-500">
                      Visa, Mastercard, American Express
                    </p>
                  </div>
                </button>
              </div>

              {/* Info message about payment options */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Paiements sécurisés</strong><br />
                  Mobile Money via pawaPay ou Carte bancaire via Stripe.
                </p>
              </div>

              {/* Payment Details */}
              {paymentMethod === 'mobile_money' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fournisseur
                    </label>
                    <select
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">
                        Sélectionner un fournisseur
                      </option>
                      <option value="orange">Orange Money</option>
                      <option value="wave">Wave</option>
                      <option value="moov">Moov Money</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="+226 XX XX XX XX"
                      required
                    />
                  </div>
                  
                  {/* Pre-authorization code - Only show if backend requires it (PRE_AUTH_REQUIRED) */}
                  <div className="hidden" id="pre-auth-field">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code d’autorisation (OTP) <span className="text-red-500">*</span>
                    </label>
                    <div className="mb-3 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-3">
                      <p className="text-sm font-medium text-blue-900">
                        Code d'autorisation (OTP) requis pour valider le paiement
                      </p>
                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-800 mb-2 font-medium">
                          Composez ce code sur votre téléphone Orange Money :
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-lg font-bold text-blue-900 bg-blue-100 px-3 py-2 rounded font-mono tracking-wider text-center">
                            *144*4*6*{Math.round(grandTotal)}#
                          </code>
                        </div>
                        <p className="text-xs text-blue-600 mt-2">
                          Entrez le code OTP reçu par SMS ci-dessous
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.preAuthorisationCode}
                        onChange={(e) => setFormData({ ...formData, preAuthorisationCode: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Entrez le code OTP"
                        maxLength={10}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          // Allow user to retry without OTP (in case payment URL becomes available)
                          document.getElementById('pre-auth-field')?.classList.add('hidden');
                          setFormData({ ...formData, preAuthorisationCode: '' });
                        }}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                        title="Réessayer sans OTP"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* FX Quote Loading */}
                  {loadingFxQuote && (
                    <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <Loader className="w-5 h-5 mr-2 animate-spin text-blue-600" />
                      <span className="text-blue-700">Getting exchange rate...</span>
                    </div>
                  )}

                  {/* FX Quote Error */}
                  {!loadingFxQuote && !fxQuote && paymentMethod === 'card' && (
                    <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                      <span className="text-red-700">Taux de change indisponible pour le moment.</span>
                    </div>
                  )}

                  {/* Stripe Payment Form */}
                  {fxQuote && !loadingFxQuote && (
                    <StripeElementsProvider>
                      <StripePaymentForm
                        xofAmountMinor={Math.round(grandTotal)}
                        eventId={eventId}
                        userId={user?.id}
                        tickets={tickets}
                        fxQuote={fxQuote}
                        subtotal={subtotal}
                        serviceFees={buyerFees}
                        currency={currency}
                        onSuccess={handleStripePaymentSuccess}
                        onError={handleStripePaymentError}
                        isProcessing={isProcessing}
                        setIsProcessing={setIsProcessing}
                      />
                    </StripeElementsProvider>
                  )}

                  {/* Fallback to basic form if FX quote fails */}
                  {!fxQuote && !loadingFxQuote && paymentMethod === 'card' && (
                    <div className="space-y-4">
                      <div className="flex items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
                        <span className="text-yellow-700">Formulaire carte basique activé. Le taux sera appliqué au moment du paiement.</span>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Numéro de carte
                        </label>
                        <input
                          type="text"
                          value={formData.cardNumber}
                          onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="1234 5678 9012 3456"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date d'expiration
                          </label>
                          <input
                            type="text"
                            value={formData.expiryDate}
                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="MM/AA"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CVV
                          </label>
                          <input
                            type="text"
                            value={formData.cvv}
                            onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="123"
                            required
                          />
                        </div>
                      </div>

                      {/* Cardholder Information */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nom du titulaire de la carte
                        </label>
                        <input
                          type="text"
                          value={formData.cardholderName}
                          onChange={(e) => setFormData({ ...formData, cardholderName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Nom complet tel qu'il apparaît sur la carte"
                          required
                        />
                      </div>

                      {/* Billing Address Section */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Adresse de facturation (optionnel)
                        </h4>
                        <p className="text-xs text-gray-500 mb-4">
                          Certaines banques requièrent l'adresse de facturation pour la vérification
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Adresse
                            </label>
                            <input
                              type="text"
                              value={formData.billingAddress}
                              onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="123 Rue de la Paix"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ville
                              </label>
                              <input
                                type="text"
                                value={formData.billingCity}
                                onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Ouagadougou"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Pays
                              </label>
                              <select
                                value={formData.billingCountry}
                                onChange={(e) => setFormData({ ...formData, billingCountry: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="">Sélectionner un pays</option>
                                <option value="BF">Burkina Faso</option>
                                <option value="CI">Côte d'Ivoire</option>
                                <option value="GH">Ghana</option>
                                <option value="ML">Mali</option>
                                <option value="NE">Niger</option>
                                <option value="SN">Sénégal</option>
                                <option value="TG">Togo</option>
                                <option value="NG">Nigeria</option>
                                <option value="KE">Kenya</option>
                                <option value="ZA">Afrique du Sud</option>
                                <option value="FR">France</option>
                                <option value="US">États-Unis</option>
                                <option value="CA">Canada</option>
                                <option value="GB">Royaume-Uni</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Save Payment Method Option - Only show for mobile money */}
              {user && paymentMethod === 'mobile_money' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="saveMethod"
                    checked={formData.saveMethod}
                    onChange={(e) => setFormData({ ...formData, saveMethod: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="saveMethod" className="ml-2 text-sm text-gray-700">
                    Sauvegarder cette méthode de paiement pour les prochains achats
                  </label>
                </div>
              )}
            </>
          )}

          {/* Total breakdown - only show for mobile money payments */}
          {paymentMethod === 'mobile_money' && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Sous-total</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Frais de service</span>
                <span>{formatCurrency(buyerFees, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 text-lg pt-2">
                <span>Total</span>
                <span>{formatCurrency(grandTotal, currency)}</span>
              </div>
            </div>
          )}

          {/* Submit button only for mobile money payments */}
          {paymentMethod === 'mobile_money' && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={(e) => {
                console.log('🔴 [BUTTON] Clicked!', { 
                  isProcessing, 
                  paymentMethod, 
                  provider: formData.provider,
                  phone: formData.phone,
                  user: !!user
                });
                
                // Since form onSubmit isn't firing, call handleSubmit directly
                e.preventDefault();
                e.stopPropagation();
                
                // Get the form element to create a proper event
                const form = e.currentTarget.closest('form');
                if (form) {
                  console.log('📋 [BUTTON] Calling handleSubmit directly');
                  // Create a synthetic form event
                  const syntheticEvent = {
                    preventDefault: () => {},
                    stopPropagation: () => {},
                    currentTarget: form,
                    target: form
                  } as unknown as React.FormEvent<HTMLFormElement>;
                  
                  handleSubmit(syntheticEvent);
                } else {
                  console.error('❌ [BUTTON] Form not found!');
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>Payer {formatCurrency(grandTotal, currency)}</>
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}