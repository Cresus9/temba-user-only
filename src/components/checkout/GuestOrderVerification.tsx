import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Check, X, RotateCcw, Loader, AlertCircle } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { paymentService } from '../../services/paymentService';
import toast from 'react-hot-toast';

export default function GuestOrderVerification() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const maxRetries = 3;

  // Function to clear cart for specific event
  const clearCartForOrder = (eventId: string) => {
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

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Aucun jeton de vérification fourni');
      return;
    }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      setLoading(true);
      setError(null);

      // First verify the guest order
      const orderData = await orderService.verifyGuestOrder(token);
      console.log('Réponse de vérification de commande:', orderData);

      if (!orderData.success) {
        throw new Error(orderData.error || 'Échec de la vérification de la commande');
      }

      // If order is awaiting payment, verify payment
      if (orderData.orderStatus === 'AWAITING_PAYMENT') {
        try {
          // Verify payment using the token
          const paymentResult = await paymentService.verifyPayment(token);
          console.log('Résultat de vérification de paiement:', paymentResult);

          if (paymentResult.success) {
            setVerified(true);
            toast.success('Paiement vérifié avec succès !');

            // Clear cart after successful payment verification
            clearCartForOrder(orderData.eventId);

            // Redirect to guest tickets page after a short delay
            setTimeout(() => {
              navigate(`/guest/tickets/${token}`);
            }, 2000);
          } else {
            // Payment verification failed but order exists
            setVerified(true);
            toast.success('Commande vérifiée ! Vérification du paiement en cours...');

            // Redirect to guest tickets page after a short delay
            setTimeout(() => {
              navigate(`/guest/tickets/${token}`);
            }, 2000);
          }
        } catch (paymentError: any) {
          console.error('Erreur de vérification de paiement:', paymentError);
          // Even if payment verification fails, we can still show the order
          setVerified(true);
          toast.success('Commande vérifiée !');

          // Redirect to guest tickets page after a short delay
          setTimeout(() => {
            navigate(`/guest/tickets/${token}`);
          }, 2000);
        }
      } else if (orderData.orderStatus === 'COMPLETED') {
        setVerified(true);
        toast.success('Commande déjà complétée !');

        // Redirect to guest tickets page after a short delay
        setTimeout(() => {
          navigate(`/guest/tickets/${token}`);
        }, 2000);
      } else {
        throw new Error('La commande n\'est plus valide');
      }
    } catch (err: any) {
      console.error('Erreur de vérification:', err);
      
      // If it's a network error and we haven't exceeded max retries
      if (err.message?.includes('Failed to fetch') && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        // Retry after a delay using exponential backoff
        setTimeout(verifyToken, 1000 * Math.pow(2, retryCount));
        return;
      }

      setError(err.message || 'Échec de la vérification de l\'email');
      toast.error(err.message || 'Échec de la vérification de l\'email');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Lien invalide
          </h2>
          <p className="text-gray-600 mb-6">
            Aucun jeton de vérification fourni.
          </p>
          <Link
            to="/events"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Parcourir les événements
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">
            Vérification de votre email...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
        {verified ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Email vérifié !
            </h2>
            <p className="text-gray-600 mb-6">
              Redirection vers vos billets...
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Échec de la vérification
            </h2>
            <p className="text-gray-600 mb-6">
              {error || 'Le lien de vérification est invalide ou a expiré. Veuillez réessayer ou contacter le support.'}
            </p>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setRetryCount(0);
                  verifyToken();
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <RotateCcw className="h-5 w-5" />
                Réessayer
              </button>
              <div>
                <Link
                  to="/events"
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Parcourir les événements
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}