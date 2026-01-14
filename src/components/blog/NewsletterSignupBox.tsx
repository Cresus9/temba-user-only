import React, { useState } from 'react';
import { Mail, Check } from 'lucide-react';
import { newsletterService } from '../../services/newsletterService';
import toast from 'react-hot-toast';

export default function NewsletterSignupBox() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.trim()) {
      toast.error('Veuillez entrer une adresse email');
      return;
    }

    try {
      setLoading(true);
      await newsletterService.subscribe(email.trim());
      setSubscribed(true);
      setEmail('');
      toast.success('Abonnement réussi! Vérifiez votre email pour confirmer.');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          Abonnement réussi!
        </h3>
        <p className="text-green-700 text-sm">
          Vérifiez votre email pour confirmer votre abonnement.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Mail className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Newsletter
          </h3>
          <p className="text-sm text-gray-600">
            Recevez nos derniers articles
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Votre adresse email"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Abonnement...' : "S'abonner"}
        </button>
      </form>

      <p className="text-xs text-gray-500 mt-3">
        En vous abonnant, vous acceptez de recevoir nos emails. Vous pouvez vous désabonner à tout moment.
      </p>
    </div>
  );
}
