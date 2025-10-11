import React, { useState } from 'react';
import { Mail, User, Phone, CreditCard, Wallet, AlertCircle, Loader } from 'lucide-react';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await orderService.createGuestOrder({
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        eventId,
        ticketQuantities: tickets,
        paymentMethod: paymentMethod === 'mobile_money' ? 'MOBILE_MONEY' : 'CARD',
        paymentDetails: paymentMethod === 'mobile_money' ? {
          provider: formData.provider,
          phone: formData.phone
        } : {
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
        // Store payment details (guests can't save methods, but we store for consistency)
        const paymentDetails = {
          method: paymentMethod === 'mobile_money' ? 'mobile_money' : 'credit_card',
          saveMethod: false, // Guests can't save payment methods
          ...(paymentMethod === 'mobile_money' ? {
            provider: formData.provider,
            phone: formData.phone
          } : {
            cardNumber: formData.cardNumber,
            cardholderName: formData.cardholderName || formData.name
          })
        };

        localStorage.setItem('paymentDetails', JSON.stringify({
          orderId: result.orderId,
          paymentToken: result.paymentToken,
          eventId: eventId, // Store eventId for cart clearing
          ...paymentDetails
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
        clearCartForEvent(eventId);
        
        // Fallback to success page
        onSuccess(result.orderId);
        toast.success('Commande créée avec succès !');
      } else {
        throw new Error('Aucun ID de commande retourné');
      }
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
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? (
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