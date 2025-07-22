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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    provider: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
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
        paymentMethod: paymentMethod === 'mobile_money' ? 'MOBILE_MONEY' : 'CARD'
      });

      if (!result.orderId) {
        throw new Error('Aucun ID de commande retourné');
      }

      onSuccess(result.orderId);
      toast.success('Commande complétée avec succès !');
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
        <h2 className="text-2xl font-semibold text-[var(--gray-900)] mb-6">
          Paiement invité
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[var(--gray-900)]">
              Informations de contact
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--gray-400)]" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--gray-400)]" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--gray-400)]" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                  placeholder="+226 XX XX XX XX"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-[var(--gray-900)]">
              Méthode de paiement
            </h3>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('mobile_money')}
                className={`flex-1 flex items-center gap-3 p-4 border rounded-lg ${
                  paymentMethod === 'mobile_money'
                    ? 'border-indigo-600 bg-[var(--primary-50)]'
                    : 'border-[var(--gray-200)] hover:bg-[var(--gray-50)]'
                }`}
              >
                <Wallet className={`h-5 w-5 ${
                  paymentMethod === 'mobile_money' ? 'text-[var(--primary-600)]' : 'text-[var(--gray-400)]'
                }`} />
                <div className="text-left">
                  <p className="font-medium text-[var(--gray-900)]">
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
                    ? 'border-indigo-600 bg-[var(--primary-50)]'
                    : 'border-[var(--gray-200)] hover:bg-[var(--gray-50)]'
                }`}
              >
                <CreditCard className={`h-5 w-5 ${
                  paymentMethod === 'card' ? 'text-[var(--primary-600)]' : 'text-[var(--gray-400)]'
                }`} />
                <div className="text-left">
                  <p className="font-medium text-[var(--gray-900)]">
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
                    className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
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
                    className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
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
                      className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
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
                      className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                      placeholder="123"
                      required={paymentMethod === 'card'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--gray-200)] pt-4">
            <div className="flex justify-between text-sm text-[var(--gray-600)] mb-2">
              <span>Sous-total</span>
              <span>{currency} {totalAmount}</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--gray-600)] mb-2">
              <span>Frais de traitement (2%)</span>
              <span>{currency} {(totalAmount * 0.02).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-[var(--gray-900)] text-lg pt-2">
              <span>Total</span>
              <span>{currency} {(totalAmount * 1.02).toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] disabled:opacity-50"
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
