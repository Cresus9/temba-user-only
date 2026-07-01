import React, { useState, useEffect, useMemo } from 'react';
import { Mail, User, CreditCard, Loader, Check } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { pawapayService } from '../../services/pawapayService';
import { supabase } from '../../lib/supabase-client';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

/**
 * Normalize a phone input to E.164-ish for Burkina Faso (+226).
 * - Strips any non-digits.
 * - If the digits already start with `226` and are long enough, returns `+<digits>`.
 * - Otherwise prepends `+226`.
 * Returns empty string if there are no digits.
 */
function toInternationalPhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('226') && digits.length >= 10) return `+${digits}`;
  return `+226${digits}`;
}

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
    provider: 'orange', // Only Orange Money supported for now (Wave / Moov coming later)
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
        const result: any = await orderService.createGuestOrder({
          email: formData.email,
          name: formData.name,
          phone: toInternationalPhone(formData.phone),
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
          } as any
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
      const intlPhone = toInternationalPhone(formData.phone);
      const orderResult: any = await orderService.createGuestOrder({
        email: formData.email,
        name: formData.name,
        phone: intlPhone,
        eventId,
        ticketQuantities: tickets,
        paymentMethod: 'MOBILE_MONEY',
        paymentDetails: {
          provider: formData.provider,
          phone: intlPhone,
          preAuthorisationCode: formData.preAuthorisationCode || undefined
        } as any
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
      const idempotencyKey = `web-pawapay-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
        phone: intlPhone,
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
      const paymentId = pawapayResponse.payment_id;
      if (!paymentId) {
        throw new Error('payment_id manquant dans la réponse pawaPay');
      }
      const statusUrl = `${window.location.origin}/payment/${encodeURIComponent(
        paymentId
      )}?order_id=${encodeURIComponent(orderResult.orderId)}&provider=pawapay`;
      window.location.href = statusUrl;
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
      <div className="bg-paper rounded-xl2 border border-line shadow-card p-5 md:p-6">
        <div className="mb-5">
          <p className="eyebrow !mb-1.5">Achat invité</p>
          <h2
            className="!text-[20px] md:!text-[22px] !leading-[1.15] text-ink font-bold tracking-tight !mb-0"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            Vos informations & paiement
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Contact Information */}
          <div className="space-y-3.5">
            <p className="eyebrow !mb-0">Informations de contact</p>

            <div>
              <label className="block text-[12px] font-semibold text-ink mb-1.5">
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-mute" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 pl-10 pr-3.5 border border-line rounded-lg bg-paper text-[14px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-ink mb-1.5">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-mute" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 pl-10 pr-3.5 border border-line rounded-lg bg-paper text-[14px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow"
                  required
                />
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-[12px] font-semibold text-ink mb-1.5">
                <span>Numéro de téléphone</span>
                {paymentMethod === 'mobile_money' && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand">
                    Utilisé pour le paiement
                  </span>
                )}
              </label>
              <div className="flex">
                <div
                  className="inline-flex items-center px-3.5 h-11 border border-line border-r-0 rounded-l-lg bg-cream text-[13px] font-bold text-ink tabular-nums select-none"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                >
                  +226
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="flex-1 min-w-0 h-11 px-3.5 border border-line rounded-r-lg bg-paper text-[14px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow tabular-nums"
                  placeholder="XX XX XX XX"
                  inputMode="tel"
                  autoComplete="tel-national"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                />
              </div>
            </div>
            
            {/* Pre-authorization code - Only show if backend requires it (PRE_AUTH_REQUIRED) */}
            <div className="hidden" id="pre-auth-field-guest">
              <label className="block text-[12px] font-semibold text-ink mb-1.5">
                Code d'autorisation (OTP) <span className="text-red-500">*</span>
              </label>
              <div className="mb-3 p-4 bg-brand-50 border border-brand/25 rounded-xl space-y-3">
                <p className="text-[13px] font-bold text-brand-800">
                  Code d'autorisation requis pour valider le paiement
                </p>
                <div className="bg-paper p-3 rounded-lg border border-brand/20">
                  <p className="text-[11px] text-brand-800 mb-2 font-medium uppercase tracking-[0.06em]">
                    Composez ce code sur votre téléphone
                  </p>
                  <code
                    className="block text-center text-[17px] font-bold text-ink bg-cream px-3 py-2 rounded border border-line tracking-[0.08em]"
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                  >
                    *144*4*6*{otpExampleAmount}#
                  </code>
                  <p className="text-[11px] text-ink-mute mt-2">
                    Entrez le code OTP reçu par SMS ci-dessous.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.preAuthorisationCode}
                  onChange={(e) => setFormData({ ...formData, preAuthorisationCode: e.target.value })}
                  className="flex-1 h-11 px-3.5 border border-line rounded-lg bg-paper text-[14px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow tabular-nums"
                  placeholder="Entrez le code OTP"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('pre-auth-field-guest')?.classList.add('hidden');
                    setFormData({ ...formData, preAuthorisationCode: '' });
                  }}
                  className="px-3.5 text-[13px] font-medium text-ink-mute hover:text-ink border border-line rounded-lg hover:border-brand/40 hover:bg-cream transition-colors"
                  title="Réessayer sans OTP"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <p className="eyebrow !mb-0">Méthode de paiement</p>

            {/* Unified 3-tile selector */}
            <div className="grid grid-cols-3 gap-3">

              {/* Orange Money */}
              <button
                type="button"
                onClick={() => { setPaymentMethod('mobile_money'); setFormData({ ...formData, provider: 'orange', preAuthorisationCode: '' }); }}
                className={`relative flex flex-col items-center gap-2 p-3 pt-4 pb-3 border-2 rounded-2xl transition-all ${
                  paymentMethod === 'mobile_money' && formData.provider === 'orange'
                    ? 'border-[#FF6600] bg-orange-50/60'
                    : 'border-line bg-paper hover:border-[#FF6600]/40 hover:bg-orange-50/30'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm bg-[#1a1a2e] flex-shrink-0">
                  <img src="/orange-money-seeklogo.png" alt="Orange Money" className="w-full h-full object-cover" />
                </div>
                <span className={`text-[11px] font-bold leading-tight text-center ${
                  paymentMethod === 'mobile_money' && formData.provider === 'orange' ? 'text-[#FF6600]' : 'text-ink'
                }`}>Orange Money</span>
                {paymentMethod === 'mobile_money' && formData.provider === 'orange' && (
                  <span className="absolute top-2 right-2 grid place-items-center w-5 h-5 rounded-full bg-[#FF6600] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>

              {/* Moov Money */}
              <button
                type="button"
                onClick={() => { setPaymentMethod('mobile_money'); setFormData({ ...formData, provider: 'moov', preAuthorisationCode: '' }); }}
                className={`relative flex flex-col items-center gap-2 p-3 pt-4 pb-3 border-2 rounded-2xl transition-all ${
                  paymentMethod === 'mobile_money' && formData.provider === 'moov'
                    ? 'border-[#0057A8] bg-sky-50/60'
                    : 'border-line bg-paper hover:border-[#0057A8]/40 hover:bg-sky-50/30'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl shadow-sm flex-shrink-0 relative overflow-hidden flex flex-col items-center justify-center pb-1" style={{ backgroundColor: '#1060B0' }}>
                  <img src="/moov-money-transparent.png" alt="" className="w-10 object-contain flex-shrink-0" style={{ height: '26px' }} />
                  <div className="text-center leading-none mt-0.5">
                    <div className="text-white font-extrabold" style={{ fontSize: '9px' }}>Moov</div>
                    <div className="text-white/75 font-semibold" style={{ fontSize: '6px', letterSpacing: '0.5px' }}>Africa</div>
                  </div>
                </div>
                <span className={`text-[11px] font-bold leading-tight text-center ${
                  paymentMethod === 'mobile_money' && formData.provider === 'moov' ? 'text-[#0057A8]' : 'text-ink'
                }`}>Moov Money</span>
                {paymentMethod === 'mobile_money' && formData.provider === 'moov' && (
                  <span className="absolute top-2 right-2 grid place-items-center w-5 h-5 rounded-full bg-[#0057A8] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>

              {/* Card */}
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`relative flex flex-col items-center gap-2 p-3 pt-4 pb-3 border-2 rounded-2xl transition-all ${
                  paymentMethod === 'card'
                    ? 'border-brand bg-brand-50/60'
                    : 'border-line bg-paper hover:border-brand/40 hover:bg-cream'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-100 flex flex-col items-center justify-center gap-1 p-2 flex-shrink-0">
                  <img src="/visa.svg" alt="Visa" className="w-full object-contain" style={{ height: '22px' }} />
                  <img src="/mastercard.svg" alt="Mastercard" className="object-contain" style={{ height: '22px', width: '40px' }} />
                </div>
                <span className={`text-[11px] font-bold leading-tight text-center ${
                  paymentMethod === 'card' ? 'text-brand' : 'text-ink'
                }`}>Carte</span>
                {paymentMethod === 'card' && (
                  <span className="absolute top-2 right-2 grid place-items-center w-5 h-5 rounded-full bg-brand text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>

            </div>

            {/* Payment Details */}
            {paymentMethod === 'mobile_money' ? (
              <p className="text-[11px] text-ink-mute/85 leading-relaxed">
                {formData.provider === 'moov'
                  ? 'Le paiement Moov Money utilisera le numéro renseigné plus haut. Aucun code requis.'
                  : 'Le paiement Orange Money utilisera le numéro renseigné plus haut.'}
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-ink mb-1.5">
                    Numéro de carte
                  </label>
                  <input
                    type="text"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                    className="w-full h-11 px-3.5 border border-line rounded-lg bg-paper text-[14px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow"
                    placeholder="1234 5678 9012 3456"
                    required={paymentMethod === 'card'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-ink mb-1.5">
                      Date d'expiration
                    </label>
                    <input
                      type="text"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full h-11 px-3.5 border border-line rounded-lg bg-paper text-[14px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow"
                      placeholder="MM/AA"
                      required={paymentMethod === 'card'}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-ink mb-1.5">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={formData.cvv}
                      onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                      className="w-full h-11 px-3.5 border border-line rounded-lg bg-paper text-[14px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow"
                      placeholder="123"
                      required={paymentMethod === 'card'}
                    />
                  </div>
                </div>

                {/* Cardholder Information */}
                <div>
                  <label className="block text-[12px] font-semibold text-ink mb-1.5">
                    Nom du titulaire de la carte
                  </label>
                  <input
                    type="text"
                    value={formData.cardholderName}
                    onChange={(e) => setFormData({ ...formData, cardholderName: e.target.value })}
                    className="w-full h-11 px-3.5 border border-line rounded-lg bg-paper text-[14px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow"
                    placeholder="Laisser vide pour utiliser le nom ci-dessus"
                  />
                  <p className="text-[11px] text-ink-mute mt-1.5 leading-relaxed">
                    Si différent du nom du compte, entrez le nom tel qu'il apparaît sur la carte.
                  </p>
                </div>

                {/* Billing Address Section */}
                <div className="border-t border-line pt-4">
                  <p className="eyebrow !mb-1.5">Adresse de facturation (optionnel)</p>
                  <p className="text-[12px] text-ink-mute mb-4 leading-relaxed">
                    Certaines banques requièrent l'adresse de facturation pour la vérification.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-semibold text-ink mb-1.5">
                        Adresse
                      </label>
                      <input
                        type="text"
                        value={formData.billingAddress}
                        onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                        className="w-full h-11 px-3.5 border border-line rounded-lg bg-paper text-[14px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow"
                        placeholder="123 Rue de la Paix"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[12px] font-semibold text-ink mb-1.5">
                          Ville
                        </label>
                        <input
                          type="text"
                          value={formData.billingCity}
                          onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                          className="w-full h-11 px-3.5 border border-line rounded-lg bg-paper text-[14px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow"
                          placeholder="Ouagadougou"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[12px] font-semibold text-ink mb-1.5">
                          Pays
                        </label>
                        <select
                          value={formData.billingCountry}
                          onChange={(e) => setFormData({ ...formData, billingCountry: e.target.value })}
                          className="w-full h-11 px-3.5 border border-line rounded-lg bg-paper text-[14px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow"
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

          <div className="border-t border-line pt-4 space-y-1.5">
            <div className="flex justify-between text-[13px] text-ink-mute">
              <span>Sous-total</span>
              <span className="tabular-nums text-ink">{formatCurrency(totalAmount, currency)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-ink-mute">
              <span>Frais de traitement (2%)</span>
              <span className="tabular-nums text-ink">{formatCurrency(totalAmount * 0.02, currency)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-line">
              <span className="text-[14px] font-bold text-ink">Total</span>
              <span
                className="text-[20px] font-bold text-ink tabular-nums tracking-tight"
                style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
              >
                {formatCurrency(totalAmount * 1.02, currency)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 h-12 px-4 bg-brand text-paper rounded-lg text-[14px] font-bold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.985] shadow-card"
          >
            {submitting ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Traitement en cours…</span>
              </>
            ) : (
              <>
                <span>Payer</span>
                <span className="tabular-nums">{formatCurrency(totalAmount * 1.02, currency)}</span>
                <span aria-hidden>→</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}