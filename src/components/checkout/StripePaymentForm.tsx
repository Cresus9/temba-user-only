import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { CreditCard, AlertCircle, Loader, Check } from 'lucide-react';
import { stripePaymentService, FXQuote } from '../../services/stripePaymentService';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../utils/formatters';

interface StripePaymentFormProps {
  xofAmountMinor: number;
  eventId: string;
  userId?: string;
  tickets: { [key: string]: number };
  description?: string;
  onSuccess: (paymentId: string, orderId: string, paymentToken: string) => void;
  onError: (error: string) => void;
  fxQuote?: FXQuote;
  // Breakdown details
  subtotal?: number;
  serviceFees?: number;
  currency?: string;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export default function StripePaymentForm({
  xofAmountMinor,
  eventId,
  userId,
  tickets,
  description,
  onSuccess,
  onError,
  fxQuote,
  subtotal,
  serviceFees,
  currency = 'XOF',
  isProcessing,
  setIsProcessing,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handleSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    console.log('🚀 [STRIPE] Payment button clicked');

    if (!stripe || !elements) {
      console.error('❌ [STRIPE] Stripe or Elements not loaded');
      onError('Stripe n\'est pas chargé');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      console.error('❌ [STRIPE] Card element not found');
      onError('Élément de carte introuvable');
      return;
    }

    console.log('✅ [STRIPE] Stripe and CardElement ready');
    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      // Step 1: Get order data (order will be created by Edge Function)
      console.log('📝 [STRIPE STEP 1] Preparing order data...');
      console.log('Order params:', { eventId, ticketQuantities: tickets, paymentMethod: 'CARD' });
      
      const orderResult = await orderService.createOrder({
        eventId,
        ticketQuantities: tickets,
        paymentMethod: 'CARD', // This returns orderId: null and ticket data
        paymentDetails: {
          provider: 'stripe',
          cardNumber: '****',
          expiryDate: '**/**',
          cvv: '***',
          cardholderName: 'Card Holder'
        }
      });

      console.log('📦 [STRIPE STEP 1] Order result:', orderResult);

      if (!orderResult.success) {
        console.error('❌ [STRIPE STEP 1] Order preparation failed:', orderResult);
        throw new Error(orderResult.error || 'Échec de la préparation de la commande');
      }

      // Order will be created by Edge Function, so we don't have an orderId yet
      console.log('✅ [STRIPE STEP 1] Order data prepared successfully');
      console.log('Ticket quantities:', orderResult.ticketQuantities);
      console.log('Total amount:', orderResult.totalAmount);

      // Step 2: Create Stripe payment intent WITH order_id
      console.log('💳 [STRIPE STEP 2] Creating Stripe PaymentIntent...');
      const idempotencyKey = stripePaymentService.generateIdempotencyKey();
      console.log('Idempotency Key:', idempotencyKey);
      
      let paymentResponse;
      const paymentDescription = description || `Event ticket purchase - ${eventId}`;

      if (fxQuote) {
        console.log('Using FX Quote (Advanced Mode):', {
          xofAmountMinor,
          usdCents: fxQuote.usd_cents,
          fxRate: `${fxQuote.fx_num}/${fxQuote.fx_den}`,
          effectiveRate: fxQuote.effective_xof_per_usd
        });
        
        // Use pre-calculated FX quote with order creation
        paymentResponse = await stripePaymentService.createPaymentAdvanced(
          xofAmountMinor,
          fxQuote.usd_cents,
          fxQuote.fx_num,
          fxQuote.fx_den,
          fxQuote.fx_locked_at,
          eventId,
          {
            user_id: userId,
            order_id: null, // Will be created by Edge Function
            description: paymentDescription,
            idempotencyKey,
            fx_margin_bps: fxQuote.margin_bps,
            create_order: true, // ✅ NEW: Create order via Edge Function
            ticket_quantities: orderResult.ticketQuantities,
            payment_method: 'CARD'
          }
        );
      } else {
        console.log('Using Simple Mode (auto-conversion):', {
          xofAmountMinor,
          currency: 'XOF'
        });
        
        // Use simple mode with auto-conversion and order creation
        paymentResponse = await stripePaymentService.createPaymentSimple(
          xofAmountMinor,
          'XOF',
          eventId,
          {
            user_id: userId,
            order_id: null, // Will be created by Edge Function
            description: paymentDescription,
            idempotencyKey,
            amount_is_minor: true,
            create_order: true, // ✅ NEW: Create order via Edge Function
            ticket_quantities: orderResult.ticketQuantities,
            payment_method: 'CARD'
          }
        );
      }

      console.log('✅ [STRIPE STEP 2] PaymentIntent created successfully');
      console.log('Payment Response:', paymentResponse);
      console.log('Client Secret:', paymentResponse.clientSecret ? '✅ Present' : '❌ Missing');
      console.log('Payment ID:', paymentResponse.paymentId);
      console.log('🔗 Order linked to payment:', {
        orderId: paymentResponse.orderId, // ✅ Use orderId from Edge Function response
        paymentId: paymentResponse.paymentId,
        paymentToken: paymentResponse.paymentToken,
        orderCreated: paymentResponse.order_created
      });

      if (!paymentResponse.clientSecret) {
        console.error('❌ [STRIPE STEP 2] Client secret missing');
        throw new Error('Client secret manquant dans la réponse Stripe');
      }

      if (!paymentResponse.paymentToken) {
        console.warn('⚠️ [STRIPE STEP 2] Payment token missing, using generated token');
      }

      // Step 3: Confirm payment with Stripe
      console.log('🔐 [STRIPE STEP 3] Confirming card payment with Stripe...');
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentResponse.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (confirmError) {
        console.error('❌ [STRIPE STEP 3] Payment confirmation failed');
        console.error('Error:', confirmError);
        setPaymentStatus('error');
        onError(confirmError.message || 'Paiement échoué');
        return;
      }

      console.log('📊 [STRIPE STEP 3] PaymentIntent result:', paymentIntent);
      console.log('Status:', paymentIntent.status);

      if (paymentIntent.status === 'succeeded') {
        console.log('✅ [STRIPE STEP 3] Payment succeeded!');
        console.log('PaymentIntent ID:', paymentIntent.id);
        setPaymentStatus('success');
        
        // Use paymentToken from Stripe response
        const finalPaymentToken = paymentResponse.paymentToken;
        
        console.log('🎉 [SUCCESS] Calling success handler with:');
        console.log('- Payment ID:', paymentResponse.paymentId);
        console.log('- Order ID:', paymentResponse.orderId);
        console.log('- Payment Token:', finalPaymentToken);
        console.log('- Order Created:', paymentResponse.order_created);
        
        onSuccess(paymentResponse.paymentId, paymentResponse.orderId, finalPaymentToken);
        toast.success('Paiement réussi !');
      } else {
        console.warn('⚠️ [STRIPE STEP 3] Payment not succeeded');
        console.warn('Status:', paymentIntent.status);
        setPaymentStatus('error');
        onError(`Payment status: ${paymentIntent.status}`);
      }
    } catch (error: any) {
      console.error('❌ [STRIPE ERROR] Payment error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      setPaymentStatus('error');
      onError(error.message || 'Payment failed');
      toast.error(error.message || 'Payment failed');
    } finally {
      console.log('🏁 [STRIPE] Payment process completed');
      setIsProcessing(false);
    }
  };

  const formatXOFAmount = (amount: number) => formatCurrency(amount, 'XOF');

  const formatUSDAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <div className="space-y-5">
      {/* Payment Summary */}
      <div className="bg-cream rounded-xl2 border border-line p-4">
        <p className="eyebrow !mb-2.5">Résumé du paiement</p>
        <div className="space-y-1.5 text-[13px]">
          {/* Breakdown */}
          {subtotal !== undefined && serviceFees !== undefined && (
            <>
              <div className="flex justify-between">
                <span className="text-ink-mute">Sous-total</span>
                <span className="tabular-nums text-ink">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">Frais de service</span>
                <span className="tabular-nums text-ink">{formatCurrency(serviceFees, currency)}</span>
              </div>
              <div className="border-t border-line pt-2 mt-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[13px] font-bold text-ink">Total</span>
                  <span
                    className="text-[18px] font-bold text-ink tabular-nums tracking-tight"
                    style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
                  >
                    {formatXOFAmount(xofAmountMinor)}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Currency conversion */}
          {fxQuote && (
            <div className="border-t border-line pt-2 mt-1.5 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-mute">Montant débité</span>
                <span className="tabular-nums text-ink">{formatUSDAmount(fxQuote.usd_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">Taux de change</span>
                <span
                  className="tabular-nums text-ink"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                >
                  1 USD = {fxQuote.effective_xof_per_usd} XOF
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Form */}
      <div className="space-y-3.5">
        <div>
          <label className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink mb-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Informations de la carte
          </label>
          <div className="border border-line rounded-lg px-3.5 py-3 bg-paper transition-shadow focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '15px',
                    color: '#0E1020',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    '::placeholder': {
                      color: '#67686D',
                    },
                  },
                  invalid: {
                    color: '#EF4444',
                  },
                },
                hidePostalCode: true,
              }}
            />
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'processing' && (
          <div className="flex items-center gap-2.5 p-3 bg-brand-50 border border-brand/20 rounded-lg">
            <Loader className="w-4 h-4 animate-spin text-brand flex-shrink-0" />
            <span className="text-[13px] text-brand-800">Traitement du paiement…</span>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-[13px] font-semibold text-green-700">Paiement réussi !</span>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="text-[13px] text-red-700">Paiement échoué. Veuillez réessayer.</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!stripe || isProcessing || paymentStatus === 'processing'}
          className="w-full inline-flex items-center justify-center gap-2 h-12 px-4 bg-brand text-paper rounded-lg text-[14px] font-bold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.985] shadow-card"
        >
          {isProcessing ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Traitement…</span>
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>Payer avec la carte</span>
              <span aria-hidden>→</span>
            </>
          )}
        </button>
      </div>

      {/* Security Notice */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink-mute pt-1">
        <span aria-hidden>🔒</span>
        <span>Sécurisé · Propulsé par Stripe</span>
      </div>
    </div>
  );
}
