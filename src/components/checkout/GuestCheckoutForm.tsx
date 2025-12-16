import React, { useState, useEffect, useMemo } from 'react';
import { Mail, User, Phone, CreditCard, Wallet, AlertCircle, Loader } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { pawapayService } from '../../services/pawapayService';
import { supabase } from '../../lib/supabase-client';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

interface GuestCheckoutFormProps {
  tickets: { [key: string]: number };
  totalAmount: number;
  currency: string;
  eventId: string;
  onSuccess: (orderId: string) => void;
}

export default function GuestCheckoutForm({
  tickets,
  totalAmount,
  currency,
  eventId,
  onSuccess
}: GuestCheckoutFormProps) {
  // Function to clear cart for specific event
  const clearCartForEvent = (eventId: string) => {
    try {
      const cartData = localStorage.getItem('temba_cart_selections');
      if (cartData) {
        const cartState = JSON.parse(cartData);
        if (cartState[eventId]) {
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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    provider: '',
    preAuthorisationCode: '', // OTP code for Orange Money (required for ORANGE_BFA)
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: '',
    billingCity: '',
    billingCountry: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('mobile_money');
  const [submitting, setSubmitting] = useState(false);
  const [pricedSelections, setPricedSelections] = useState<Array<{ ticket_type_id: string; quantity: number; price: number }>>([]);

  // Fetch ticket prices
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

  // Calculate grand total for OTP USSD code display (after pricedSelections is declared)
  // Use useMemo to recalculate when pricedSelections changes
  const otpExampleAmount = useMemo(() => {
    if (pricedSelections.length === 0) {
      // Fallback to totalAmount with service fee if no priced selections yet
      return Math.max(1, Math.round(totalAmount * 1.02));
    }
    const subtotal = pricedSelections.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const serviceFee = subtotal * 0.02; // 2% service fee
    return Math.max(1, Math.round(subtotal + serviceFee));
  }, [pricedSelections, totalAmount]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // ═══════════════════════════════════════════════════════
      // ✅ CARD PAYMENTS - Use existing guest order flow
      // ═══════════════════════════════════════════════════════
      if (paymentMethod === 'card') {
        const result = await orderService.createGuestOrder({
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          eventId,
          ticketQuantities: tickets,
          paymentMethod: 'CARD',
          paymentDetails: {
            cardNumber: formData.cardNumber,
            expiryDate: formData.expiryDate,
            cvv: formData.cvv,
            cardholderName: formData.cardholderName || formData.name,
            billingAddress: formData.billingAddress,
            billingCity: formData.billingCity,
            billingCountry: formData.billingCountry
          }
        });

        if (result.success && result.paymentUrl) {
          // Stripe flow for guests
          localStorage.setItem('paymentDetails', JSON.stringify({
            orderId: result.orderId,
            paymentToken: result.paymentToken,
            eventId: eventId,
            method: 'credit_card'
          }));

          if (result.paymentUrl) {
            window.location.href = result.paymentUrl;
          }
        } else if (result.orderId) {
          clearCartForEvent(eventId);
          onSuccess(result.orderId);
          toast.success('Commande créée avec succès !');
        } else {
          throw new Error('Aucun ID de commande retourné');
        }
        return;
      }

      // ═══════════════════════════════════════════════════════
      // ⚠️ MOBILE MONEY - Use pawaPay for guest checkout
      // ═══════════════════════════════════════════════════════
      // Create guest order first
      const orderResult = await orderService.createGuestOrder({
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        eventId,
        ticketQuantities: tickets,
        paymentMethod: 'MOBILE_MONEY',
        paymentDetails: {
          provider: formData.provider,
          phone: formData.phone,
          preAuthorisationCode: formData.preAuthorisationCode || undefined
        }
      });

      if (!orderResult.success || !orderResult.orderId) {
        throw new Error('Failed to create guest order');
      }

      // Prepare ticket lines for pawaPay
      const ticketLines = pricedSelections.map(selection => ({
        ticket_type_id: selection.ticket_type_id,
        quantity: selection.quantity,
        price_major: selection.price,
        currency: 'XOF'
      }));

      // Calculate total
      const subtotal = pricedSelections.reduce((sum, it) => sum + it.price * it.quantity, 0);
      const serviceFee = subtotal * 0.02; // 2% service fee
      const grandTotal = subtotal + serviceFee;

      // Create pawaPay payment
      const idempotencyKey = `pawapay-guest-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const pawapayResponse = await pawapayService.createPayment({
        idempotency_key: idempotencyKey,
        user_id: undefined, // Guest checkout
        buyer_email: formData.email,
        event_id: eventId,
        order_id: orderResult.orderId,
        ticket_lines: ticketLines,
        amount_major: grandTotal,
        currency: 'XOF',
        method: 'mobile_money',
        phone: formData.phone,
        provider: formData.provider, // Map to pawaPay format
        preAuthorisationCode: formData.preAuthorisationCode || undefined, // OTP for second attempt (if provided)
        return_url: `${window.location.origin}/payment/success?order=${orderResult.orderId}`,
        cancel_url: `${window.location.origin}/payment/cancelled?order=${orderResult.orderId}`,
        description: `Billets d'événement (Invité) - ${eventId}`
      });

      // ✅ BEST CASE: Payment URL redirect available (no OTP needed!)
      if (pawapayResponse.has_payment_redirect && pawapayResponse.payment_url) {
        console.log('🚀 Redirecting guest to pawaPay payment page (no OTP needed)');
        
        // Store payment details
        localStorage.setItem('paymentDetails', JSON.stringify({
          orderId: orderResult.orderId,
          paymentToken: pawapayResponse.transaction_id || pawapayResponse.payment_token,
          paymentId: pawapayResponse.payment_id,
          eventId: eventId,
          provider: 'pawapay',
          method: 'mobile_money',
          isGuest: true
        }));

        // Use window.location.assign for smoother flow (same tab)
        window.location.assign(pawapayResponse.payment_url);
        return; // Exit - user will be redirected
      }

      // ⚠️ PRE_AUTH_REQUIRED: Show OTP field (fallback case)
      if (pawapayResponse.requires_pre_auth || pawapayResponse.error === 'PRE_AUTH_REQUIRED') {
        // Show the pre-authorization code field
        const preAuthField = document.getElementById('pre-auth-field-guest');
        if (preAuthField) {
          preAuthField.classList.remove('hidden');
          preAuthField.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Show helpful message with hint about auto-SMS
        setSubmitting(false);
        return; // Don't proceed, wait for user to enter OTP and retry
      }

      // ❌ ERROR: Payment creation failed
      if (!pawapayResponse.success) {
        throw new Error(pawapayResponse.error || pawapayResponse.error_message || 'Failed to create pawaPay payment');
      }

      // ✅ SUCCESS without redirect: Store and redirect to success page
      localStorage.setItem('paymentDetails', JSON.stringify({
        orderId: orderResult.orderId,
        paymentToken: pawapayResponse.transaction_id || pawapayResponse.payment_token,
        paymentId: pawapayResponse.payment_id,
        eventId: eventId,
        provider: 'pawapay',
        method: 'mobile_money',
        isGuest: true
      }));

      // Fallback: redirect to success page if no payment URL
      const successUrl = `${window.location.origin}/payment/success?order=${orderResult.orderId}&token=${pawapayResponse.transaction_id || pawapayResponse.payment_token}`;
      window.location.href = successUrl;
      return;
    } catch (error: any) {
      console.error('Erreur de paiement invité:', error);
      toast.error(error.message || 'Échec du traitement de la commande');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Paiement invité
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Informations de contact
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="+226 XX XX XX XX"
                />
              </div>
            </div>
            
            {/* Pre-authorization code - Only show if backend requires it (PRE_AUTH_REQUIRED) */}
            <div className="hidden" id="pre-auth-field-guest">
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
                      *144*4*6*{otpExampleAmount}#
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
                    document.getElementById('pre-auth-field-guest')?.classList.add('hidden');
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

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Méthode de paiement
            </h3>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('mobile_money')}
                className={`flex-1 flex items-center gap-3 p-4 border rounded-lg ${
                  paymentMethod === 'mobile_money'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Wallet className={`h-5 w-5 ${
                  paymentMethod === 'mobile_money' ? 'text-indigo-600' : 'text-gray-400'
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

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 flex items-center gap-3 p-4 border rounded-lg ${
                  paymentMethod === 'card'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <CreditCard className={`h-5 w-5 ${
                  paymentMethod === 'card' ? 'text-indigo-600' : 'text-gray-400'
                }`} />
                <div className="text-left">
                  <p className="font-medium text-gray-900">
                    Carte
                  </p>
                  <p className="text-sm text-gray-500">
                    Visa ou Mastercard
                  </p>
                </div>
              </button>
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
                  >
                    <option value="">
                      Sélectionner un fournisseur
                    </option>
                    <option value="orange">Orange Money</option>
                    <option value="wave">Wave</option>
                    <option value="moov">Moov Money</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
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
                    required={paymentMethod === 'card'}
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
                      required={paymentMethod === 'card'}
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
                      required={paymentMethod === 'card'}
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
                    placeholder="Laisser vide pour utiliser le nom ci-dessus"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si différent du nom du compte, entrez le nom tel qu'il apparaît sur la carte
                  </p>
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

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Sous-total</span>
              <span>{formatCurrency(totalAmount, currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Frais de traitement (2%)</span>
              <span>{formatCurrency(totalAmount * 0.02, currency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 text-lg pt-2">
              <span>Total</span>
              <span>{formatCurrency(totalAmount * 1.02, currency)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Traitement en cours...</span>
              </>
            ) : (
              <>Payer {formatCurrency(totalAmount * 1.02, currency)}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}