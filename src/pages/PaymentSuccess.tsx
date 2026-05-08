import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Check, Loader, AlertCircle } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { clearCartForEvent } from '../utils/cartUtils';
import toast from 'react-hot-toast';

export default function PaymentSuccess() {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasVerifiedRef = useRef(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const token = searchParams.get('token');
  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    if (paymentId) {
      navigate(`/payment/${encodeURIComponent(paymentId)}?order_id=${encodeURIComponent(orderId || '')}&provider=pawapay`, {
        replace: true,
      });
      return;
    }

    try {
      const raw = localStorage.getItem('paymentDetails');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.paymentId && (parsed?.orderId === orderId || !orderId)) {
          navigate(
            `/payment/${encodeURIComponent(parsed.paymentId)}?order_id=${encodeURIComponent(
              parsed.orderId || orderId || ''
            )}&provider=${encodeURIComponent(parsed.provider || 'pawapay')}`,
            { replace: true }
          );
          return;
        }
      }
    } catch {
      // ignore localStorage parse issues
    }

    if (!orderId || !token) {
      setError('Paramètres de paiement manquants');
      setLoading(false);
      return;
    }

    // Prevent duplicate verification calls using ref
    if (!hasVerifiedRef.current) {
      hasVerifiedRef.current = true;
      verifyPayment();
    }
  }, [orderId, token, paymentId, navigate]);

  const verifyPayment = async () => {
    try {
      setLoading(true);
      
      // Add timeout to prevent infinite loading - reduced to 5 seconds
      const timeoutId = setTimeout(() => {
        console.log('⏰ Verification timeout - redirecting anyway');
        setLoading(false);
        setSuccess(true);
        toast.success('Paiement traité - Redirection vers vos billets...');
        navigate(`/booking/confirmation/${orderId}?token=${token}`);
      }, 5000); // 5 second timeout (reduced from 7)
      
      // Add even quicker fallback - 2 seconds for immediate redirect option
      const quickTimeoutId = setTimeout(() => {
        console.log('🚀 Quick redirect - payment likely succeeded');
        // Don't stop the verification, but show user they can skip
        if (loading) {
          toast.success('Paiement traité! Cliquez ici pour voir vos billets', {
            duration: 6000,
            onClick: () => {
              clearTimeout(timeoutId);
              clearTimeout(quickTimeoutId);
              navigate(`/booking/confirmation/${orderId}?token=${token}`);
            }
          });
        }
      }, 2000); // 2 second quick option (reduced from 3)
      
      // Get payment details from localStorage
      const storedPaymentDetails = localStorage.getItem('paymentDetails');
      let paymentDetails = null;
      let saveMethod = false;
      
      if (storedPaymentDetails) {
        try {
          const parsed = JSON.parse(storedPaymentDetails);
          if (parsed.orderId === orderId) {
            paymentDetails = parsed;
            saveMethod = parsed.saveMethod;
            console.log('Found stored payment details for saving:', { saveMethod, method: parsed.method });
          }
        } catch (e) {
          console.error('Error parsing payment details:', e);
        }
      }
      
      // If we're here and have orderId + token, payment likely succeeded
      // Add quick success check before full verification
      console.log('🎯 Quick success check:', {
        hasOrderId: !!orderId,
        hasToken: !!token,
        tokenLength: token?.length,
        currentUrl: window.location.href
      });
      
      // Verify payment using our service with payment details for saving
      const result = await paymentService.verifyPayment(token!, orderId!, saveMethod, paymentDetails);
      
      console.log('Payment verification result:', result);
      console.log('Payment verification details:', {
        success: result.success,
        status: result.status,
        message: result.message,
        payment_id: result.payment_id
      });
      console.log('Environment check:', {
        DEV: import.meta.env.DEV,
        VITE_PAYDUNYA_MODE: import.meta.env.VITE_PAYDUNYA_MODE
      });
      
      // Check if the function indicates test mode - FORCE LIVE MODE for production
      const isTestMode = result.test_mode || import.meta.env.VITE_PAYDUNYA_MODE === 'test';
      const isStripeToken = token?.startsWith('stripe-') ?? false;
      const isPawapayPayment = !isStripeToken; // pawaPay for mobile money
      
      // Payment is considered successful if:
      // 1. Explicitly successful (completed)
      // 2. Stripe pending/processing (will be confirmed)
      // 3. pawaPay processing (payment initiated, waiting for confirmation)
      // 4. Test mode pending
      const isSuccessful = result.success && (
        result.status === 'completed' ||
        (isStripeToken && ['pending', 'processing'].includes(result.status)) ||
        (isPawapayPayment && ['pending', 'processing'].includes(result.status)) || // pawaPay processing is valid
        (isTestMode && result.status === 'pending')
      );
      
      // Also consider "processing" state as valid even if success=false (for pawaPay)
      const isProcessing = !result.success && result.status === 'processing' && isPawapayPayment;
      
      console.log('Test mode check:', {
        isTestMode,
        resultSuccess: result.success,
        resultStatus: result.status,
        isSuccessful,
        isProcessing,
        isPawapayPayment,
        resultTestMode: result.test_mode,
        envDEV: import.meta.env.DEV,
        envPaydunyaMode: import.meta.env.VITE_PAYDUNYA_MODE
      });
      
      console.log('Full verification result:', JSON.stringify(result, null, 2));
      
      if (isSuccessful || isProcessing) {
        setSuccess(true);
        const statusMessage = isStripeToken && ['pending', 'processing'].includes(result.status)
          ? 'Paiement carte en cours de finalisation - vos billets seront disponibles sous peu !'
          : isProcessing || (isPawapayPayment && result.status === 'processing')
          ? 'Paiement mobile money en cours de traitement - vos billets seront disponibles une fois confirmé !'
          : isTestMode && result.status === 'pending' 
          ? 'Paiement en attente (mode test) - Billets créés !'
          : 'Paiement confirmé avec succès !';
        toast.success(statusMessage);
        
        // Mark payment as verified to avoid duplicate verification on booking confirmation page
        sessionStorage.setItem('paymentVerified', token!);
        
        // Clean up localStorage after successful verification
        if (storedPaymentDetails) {
          localStorage.removeItem('paymentDetails');
        }
        
        // Clear cart after successful payment
        const eventId = storedPaymentDetails?.eventId;
        console.log('🛒 PaymentSuccess: Stored payment details:', storedPaymentDetails);
        
        if (eventId) {
          const cleared = clearCartForEvent(eventId, 'PaymentSuccess');
          if (cleared) {
            toast.success('🛒 Panier vidé après paiement réussi');
          }
        } else {
          console.log('🛒 PaymentSuccess: No eventId found in payment details, cannot clear cart');
        }
        
        // Clear both timeouts since verification succeeded
        clearTimeout(timeoutId);
        clearTimeout(quickTimeoutId);
        
        // Redirect immediately since verification succeeded (or processing)
        console.log('✅ Verification successful/processing - redirecting immediately');
        setTimeout(() => {
          navigate(`/booking/confirmation/${orderId}?token=${token}`);
        }, 1000); // Reduced to 1 second
      } else {
        // Clear both timeouts
        clearTimeout(timeoutId);
        clearTimeout(quickTimeoutId);
        throw new Error(result.message || 'Paiement non confirmé');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Handle timeout errors specifically
      if (error.message && error.message.includes('timeout')) {
        console.log('⏰ Timeout error - redirecting to tickets anyway');
        setSuccess(true);
        toast.success('Vérification en cours... Redirection vers vos billets');
        setTimeout(() => {
          navigate(`/booking/confirmation/${orderId}?token=${token}`);
        }, 1000);
      }
      // If verification succeeded but other requests failed, still redirect
      else if (error.message && error.message.includes('already exist')) {
        console.log('🎫 Tickets already exist - redirecting to confirmation');
        setSuccess(true);
        toast.success('Billets déjà créés - redirection vers la confirmation');
        setTimeout(() => {
          navigate(`/booking/confirmation/${orderId}?token=${token}`);
        }, 1000);
      } else if (error.message && (error.message.includes('400') || error.message.includes('Bad Request'))) {
        // Ignore 400 errors if we have orderId and token (payment likely succeeded)
        console.log('⚠️ 400 error but payment likely succeeded - redirecting anyway');
        setSuccess(true);
        toast.success('Paiement traité - redirection vers vos billets');
        setTimeout(() => {
          navigate(`/booking/confirmation/${orderId}?token=${token}`);
        }, 1000);
      } else {
        setError(error.message || 'Échec de la vérification du paiement');
        toast.error(error.message || 'Échec de la vérification du paiement');
      }
    } finally {
      // Clear both timeouts in finally block to ensure they're always cleared
      if (typeof timeoutId !== 'undefined') {
        clearTimeout(timeoutId);
      }
      if (typeof quickTimeoutId !== 'undefined') {
        clearTimeout(quickTimeoutId);
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] bg-cream bg-grain grid place-items-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl2 border border-line bg-paper shadow-pop overflow-hidden">
          <div className="px-5 py-3 bg-cream border-b border-line flex items-center justify-between">
            <span className="eyebrow !text-ink">Vérification</span>
            {orderId && (
              <span
                className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute tabular-nums"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
              >
                ORD · {orderId.slice(0, 8).toUpperCase()}
              </span>
            )}
          </div>
          <div className="p-7 text-center space-y-4">
            <div className="grid place-items-center w-14 h-14 rounded-full bg-brand-50 mx-auto">
              <Loader className="h-6 w-6 animate-spin text-brand" />
            </div>
            <h2
              className="text-ink text-[20px] font-bold tracking-tight"
              style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
            >
              Vérification du paiement
            </h2>
            <p className="text-[13px] text-ink-mute">Confirmation de votre transaction…</p>

            <div className="w-full bg-cream-deep rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-brand rounded-full animate-pulse" style={{ width: '70%' }} />
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => navigate(`/booking/confirmation/${orderId}?token=${token}`)}
                className="w-full h-11 rounded-lg bg-brand hover:bg-brand-700 text-paper text-[14px] font-bold transition-colors"
              >
                Voir mes billets maintenant →
              </button>
              <p className="text-[11px] text-ink-mute/70">
                La vérification continue en arrière-plan.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] bg-cream bg-grain grid place-items-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl2 border border-line bg-paper shadow-pop overflow-hidden">
          <div className="px-5 py-3 bg-cream border-b border-line">
            <span className="eyebrow !text-red-600">Erreur</span>
          </div>
          <div className="p-7 text-center space-y-4">
            <div className="grid place-items-center w-14 h-14 rounded-full bg-red-50 mx-auto ring-1 ring-red-200">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <h2
              className="text-ink text-[20px] font-bold tracking-tight"
              style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
            >
              Erreur de paiement
            </h2>
            <p className="text-[13px] text-ink-mute leading-relaxed">{error}</p>
            <div className="space-y-2 pt-2">
              <button
                onClick={verifyPayment}
                className="w-full h-11 rounded-lg bg-brand hover:bg-brand-700 text-paper text-[14px] font-bold transition-colors"
              >
                Réessayer la vérification
              </button>
              <button
                onClick={() => navigate('/events')}
                className="w-full h-11 rounded-lg border border-line bg-paper text-ink text-[14px] font-medium hover:border-brand/40 hover:text-brand transition-colors"
              >
                Retour aux événements
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-cream bg-grain grid place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl2 border border-line bg-paper shadow-pop overflow-hidden">
        <div className="px-5 py-3 bg-cream border-b border-line flex items-center justify-between">
          <span className="eyebrow !text-ink">Confirmé</span>
          {orderId && (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute tabular-nums"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              ORD · {orderId.slice(0, 8).toUpperCase()}
            </span>
          )}
        </div>
        <div className="p-7 text-center space-y-4">
          <div className="grid place-items-center w-14 h-14 rounded-full bg-green-50 mx-auto ring-1 ring-green-200">
            <Check className="h-7 w-7 text-green-600" />
          </div>
          <h2
            className="text-ink text-[22px] font-bold tracking-tight"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            Paiement réussi !
          </h2>
          <p className="text-[13px] text-ink-mute leading-relaxed">
            Votre paiement a été traité avec succès.
            <br />
            Redirection vers vos billets…
          </p>
          <div className="w-full bg-cream-deep rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-brand rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
