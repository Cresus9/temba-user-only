import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, AlertCircle, Loader, Plus, Check, Smartphone } from 'lucide-react';
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

interface CheckoutFormProps {
  tickets: { [key: string]: number };
  totalAmount: number;
  currency: string;
  eventId: string;
  onSuccess: (orderId: string) => void;
}

export default function CheckoutForm({ 
  tickets, 
  totalAmount, 
  currency, 
  eventId,
  onSuccess 
}: CheckoutFormProps) {

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('card'); // Default to card - mobile money temporarily disabled
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
          toast.error('Failed to get exchange rate. Please try again.');
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

      // Redirect to payment success page (same as PayDunya flow)
      const successUrl = `${window.location.origin}/payment/success?order=${orderId}&token=${paymentToken}`;
      console.log('🔄 [CHECKOUT] Redirecting to:', successUrl);
      window.location.href = successUrl;
      
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

  const validateForm = (): boolean => {
    // If using a saved payment method, no validation needed
    if (selectedSavedMethod && !useNewMethod) {
      return true;
    }

    // Validate new payment method
    if (paymentMethod === 'mobile_money') {
      if (!formData.provider) {
        toast.error('Veuillez sélectionner un fournisseur de paiement');
        return false;
      }
      if (!formData.phone) {
        toast.error('Veuillez entrer votre numéro de téléphone');
        return false;
      }
      // Validate phone number format
      const phoneRegex = /^\+?[0-9]{8,}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s+/g, ''))) {
        toast.error('Veuillez entrer un numéro de téléphone valide');
        return false;
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
    if (!user) {
      toast.error('Veuillez vous connecter pour continuer');
      return;
    }

    if (!validateForm()) {
      return;
    }

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
          phone: formData.phone
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
      
      const result = await orderService.createOrder({
        eventId,
        ticketQuantities: tickets,
        paymentMethod: actualPaymentMethod,
        paymentDetails
      });

      if (result.success && result.paymentUrl) {
        // Store payment details for saving after successful payment (only for new methods)
        const shouldSave = useNewMethod && formData.saveMethod;
        const paymentDetailsForStorage = {
          method: actualPaymentMethod === 'MOBILE_MONEY' ? 'mobile_money' : 'credit_card',
          saveMethod: shouldSave,
          ...(actualPaymentMethod === 'MOBILE_MONEY' ? {
            provider: paymentDetails.provider,
            phone: paymentDetails.phone
          } : {
            cardNumber: paymentDetails.cardNumber,
            cardholderName: paymentDetails.cardholderName || user?.email?.split('@')[0] || 'Card Holder'
          })
        };

        localStorage.setItem('paymentDetails', JSON.stringify({
          orderId: result.orderId,
          paymentToken: result.paymentToken,
          eventId: eventId, // Store eventId for cart clearing
          ...paymentDetailsForStorage
        }));

        // Check if we're in test mode - FORCE LIVE MODE for production
        const isTestMode = import.meta.env.VITE_PAYDUNYA_MODE === 'test';
        
        if (isTestMode) {
          // In test mode, redirect directly to success page with payment token
          const successUrl = `${window.location.origin}/payment/success?order=${result.orderId}&token=${result.paymentToken}`;
          window.location.href = successUrl;
        } else {
          // In LIVE mode, redirect to Paydunya payment page for real payment
          console.log('🚀 LIVE MODE: Redirecting to Paydunya payment page');
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
    } catch (error: any) {
      console.error('Erreur de paiement:', error);
      toast.error(error.message || 'Échec du traitement de la commande');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Méthode de paiement
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Payment Method Selection - Mobile Money temporarily hidden until PayDunya verification complete */}
              <div className="flex gap-4 mb-4">
                {/* TEMPORARILY HIDDEN: Mobile Money - Awaiting PayDunya Identity Verification
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
                */}

                {/* Card Payment - Currently the only available option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className="flex-1 flex items-center gap-3 p-4 border-2 border-blue-600 bg-blue-50 rounded-lg cursor-default"
                  disabled
                >
                  <CreditCard className="h-5 w-5 text-blue-600" />
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
                  <strong>Paiement sécurisé par carte bancaire</strong><br />
                  Les paiements Mobile Money seront bientôt disponibles.
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
                      <span className="text-red-700">Failed to get exchange rate. Please try again.</span>
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
                        <span className="text-yellow-700">Using basic card form. Exchange rate will be calculated at payment time.</span>
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
                <span>{currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Frais de service</span>
                <span>{currency} {buyerFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 text-lg pt-2">
                <span>Total</span>
                <span>{currency} {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Submit button only for mobile money payments */}
          {paymentMethod === 'mobile_money' && (
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>Payer {currency} {grandTotal.toFixed(2)}</>
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}