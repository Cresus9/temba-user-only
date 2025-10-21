import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { CreditCard, AlertCircle, Loader, Check } from 'lucide-react';
import { stripePaymentService, FXQuote } from '../../services/stripePaymentService';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';

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

  const formatXOFAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatUSDAmount = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">Résumé du paiement</h3>
        <div className="space-y-2 text-sm">
          {/* Breakdown */}
          {subtotal !== undefined && serviceFees !== undefined && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Sous-total :</span>
                <span className="font-medium">{currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frais de service :</span>
                <span className="font-medium">{currency} {serviceFees.toFixed(2)}</span>
              </div>
              <div className="border-t border-blue-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-700 font-medium">Total :</span>
                  <span className="font-semibold">{formatXOFAmount(xofAmountMinor)}</span>
                </div>
              </div>
            </>
          )}
          
          {/* Currency conversion */}
          {fxQuote && (
            <>
              <div className="border-t border-blue-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant débité :</span>
                  <span className="font-medium">{formatUSDAmount(fxQuote.usd_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taux de change :</span>
                  <span className="font-medium">1 USD = {fxQuote.effective_xof_per_usd} XOF</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="inline w-4 h-4 mr-1" />
            Informations de la carte
          </label>
          <div className="border border-gray-300 rounded-lg p-3 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#374151',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    '::placeholder': {
                      color: '#9CA3AF',
                    },
                  },
                  invalid: {
                    color: '#EF4444',
                  },
                },
                hidePostalCode: true, // We'll collect this separately if needed
              }}
            />
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus === 'processing' && (
          <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader className="w-5 h-5 mr-2 animate-spin text-blue-600" />
            <span className="text-blue-700">Traitement du paiement...</span>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="flex items-center justify-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <Check className="w-5 h-5 mr-2 text-green-600" />
            <span className="text-green-700">Paiement réussi !</span>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
            <span className="text-red-700">Paiement échoué. Veuillez réessayer.</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!stripe || isProcessing || paymentStatus === 'processing'}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Payer avec la carte
            </>
          )}
        </button>
      </div>

      {/* Security Notice */}
      <div className="text-xs text-gray-500 text-center">
        <p>🔒 Vos informations de paiement sont sécurisées et chiffrées</p>
        <p>Propulsé par Stripe • Sécurité bancaire</p>
      </div>
    </div>
  );
}
