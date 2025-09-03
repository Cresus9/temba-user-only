import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';

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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('mobile_money');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    provider: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });
  const { user } = useAuth();

  const validateForm = (): boolean => {
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
      if (!formData.cardNumber || !formData.expiryDate || !formData.cvv) {
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
      
      const result = await orderService.createOrder({
        eventId,
        ticketQuantities: tickets,
        paymentMethod: paymentMethod === 'mobile_money' ? 'MOBILE_MONEY' : 'CARD',
        paymentDetails: paymentMethod === 'mobile_money' ? {
          provider: formData.provider,
          phone: formData.phone
        } : {
          cardNumber: formData.cardNumber,
          expiryDate: formData.expiryDate,
          cvv: formData.cvv
        }
      });

      if (result.success && result.paymentUrl) {
        // Check if we're in test mode
        const isTestMode = import.meta.env.DEV || import.meta.env.VITE_PAYDUNYA_MODE === 'test';
        
        if (isTestMode) {
          // In test mode, redirect directly to success page with payment token
          const successUrl = `${window.location.origin}/payment/success?order=${result.orderId}&token=${result.paymentToken}`;
          window.location.href = successUrl;
        } else {
          // In production, redirect to Paydunya payment page
          window.location.href = result.paymentUrl;
        }
      } else if (result.orderId) {
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
          <div className="flex gap-4 mb-4">
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
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Sous-total</span>
              <span>{currency} {totalAmount}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Frais de traitement (2%)</span>
              <span>{currency} {(totalAmount * 0.02).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 text-lg pt-2">
              <span>Total</span>
              <span>{currency} {(totalAmount * 1.02).toFixed(2)}</span>
            </div>
          </div>

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
              <>Payer {currency} {(totalAmount * 1.02).toFixed(2)}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}