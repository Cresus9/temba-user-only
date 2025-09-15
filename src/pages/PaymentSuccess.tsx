import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Check, Loader, AlertCircle } from 'lucide-react';
import { paymentService } from '../services/paymentService';
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

  useEffect(() => {
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
  }, [orderId, token]);

  const verifyPayment = async () => {
    try {
      setLoading(true);
      
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log('⏰ Verification timeout - redirecting anyway');
        setLoading(false);
        setSuccess(true);
        toast.success('Redirection vers vos billets...');
        navigate(`/booking/confirmation/${orderId}?token=${token}`);
      }, 15000); // 15 second timeout
      
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
      
      // Check if the function indicates test mode or if we're in dev environment
      const isTestMode = result.test_mode || import.meta.env.DEV || import.meta.env.VITE_PAYDUNYA_MODE === 'test';
      const isSuccessful = result.success && (result.status === 'completed' || (isTestMode && result.status === 'pending'));
      
      console.log('Test mode check:', {
        isTestMode,
        resultSuccess: result.success,
        resultStatus: result.status,
        isSuccessful,
        resultTestMode: result.test_mode,
        envDEV: import.meta.env.DEV,
        envPaydunyaMode: import.meta.env.VITE_PAYDUNYA_MODE
      });
      
      console.log('Full verification result:', JSON.stringify(result, null, 2));
      
      if (isSuccessful) {
        setSuccess(true);
        const statusMessage = isTestMode && result.status === 'pending' 
          ? 'Paiement en attente (mode test) - Billets créés !'
          : 'Paiement confirmé avec succès !';
        toast.success(statusMessage);
        
        // Clean up localStorage after successful verification
        if (storedPaymentDetails) {
          localStorage.removeItem('paymentDetails');
        }
        
        // Clear timeout since verification succeeded
        clearTimeout(timeoutId);
        
        // Redirect to booking confirmation after 3 seconds
        setTimeout(() => {
          navigate(`/booking/confirmation/${orderId}?token=${token}`);
        }, 3000);
      } else {
        // Clear timeout
        clearTimeout(timeoutId);
        throw new Error(result.message || 'Paiement non confirmé');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // If tickets were created but verification failed, still redirect
      if (error.message && error.message.includes('already exist')) {
        console.log('🎫 Tickets already exist - redirecting to confirmation');
        setSuccess(true);
        toast.success('Billets déjà créés - redirection vers la confirmation');
        setTimeout(() => {
          navigate(`/booking/confirmation/${orderId}?token=${token}`);
        }, 2000);
      } else {
        setError(error.message || 'Échec de la vérification du paiement');
        toast.error(error.message || 'Échec de la vérification du paiement');
      }
    } finally {
      // Clear timeout in finally block to ensure it's always cleared
      if (typeof timeoutId !== 'undefined') {
        clearTimeout(timeoutId);
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Vérification du paiement...
          </h2>
          <p className="text-gray-600">
            Veuillez patienter pendant que nous confirmons votre paiement
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Erreur de paiement
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-4">
            <button
              onClick={verifyPayment}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Réessayer la vérification
            </button>
            <button
              onClick={() => navigate('/events')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Retour aux événements
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Paiement réussi !
        </h2>
        <p className="text-gray-600 mb-6">
          Votre paiement a été traité avec succès. Redirection vers vos billets...
        </p>
        <div className="animate-pulse">
          <div className="h-2 bg-gray-200 rounded-full">
            <div className="h-2 bg-indigo-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
