import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Trash2, Star, StarOff } from 'lucide-react';
import { paymentMethodService } from '../../services/paymentMethodService';
import { SavedPaymentMethod } from '../../types/payment';
import toast from 'react-hot-toast';

export default function SavedPaymentMethods() {
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedMethods();
  }, []);

  const fetchSavedMethods = async () => {
    try {
      setLoading(true);
      const methods = await paymentMethodService.getSavedPaymentMethods();
      setSavedMethods(methods);
    } catch (error: any) {
      console.error('Error fetching saved payment methods:', error);
      toast.error('Erreur lors du chargement des méthodes de paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette méthode de paiement ?')) {
      return;
    }

    try {
      setDeletingId(id);
      await paymentMethodService.deletePaymentMethod(id);
      setSavedMethods(prev => prev.filter(method => method.id !== id));
      toast.success('Méthode de paiement supprimée');
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await paymentMethodService.setDefaultPaymentMethod(id);
      await fetchSavedMethods(); // Refresh the list
      toast.success('Méthode de paiement définie par défaut');
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getPaymentIcon = (methodType: string) => {
    return methodType === 'mobile_money' ? (
      <Smartphone className="h-5 w-5 text-green-600" />
    ) : (
      <CreditCard className="h-5 w-5 text-blue-600" />
    );
  };

  const getProviderDisplayName = (provider: string) => {
    const providerMap: { [key: string]: string } = {
      'orange': 'Orange Money',
      'wave': 'Wave',
      'moov': 'Moov Money',
      'Visa': 'Visa',
      'Mastercard': 'Mastercard',
      'American Express': 'American Express',
      'Discover': 'Discover',
      'Diners Club': 'Diners Club',
      'JCB': 'JCB',
      'Union Pay': 'Union Pay',
      'Carte': 'Carte de Crédit',
      'Unknown': 'Carte de Crédit'
    };
    return providerMap[provider] || provider;
  };

  const formatAccountDisplay = (method: SavedPaymentMethod) => {
    if (method.method_type === 'mobile_money') {
      return method.account_number;
    } else {
      // For credit cards, show in format: •••• •••• •••• 1234
      const cleanNumber = method.account_number.replace(/\D/g, '');
      if (cleanNumber.length >= 4) {
        const lastFour = cleanNumber.slice(-4);
        return `•••• •••• •••• ${lastFour}`;
      }
      return method.account_number;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Méthodes de paiement sauvegardées
        </h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Méthodes de paiement sauvegardées
      </h3>
      
      {savedMethods.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            Aucune méthode de paiement sauvegardée
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Vos méthodes de paiement seront sauvegardées automatiquement lors de vos prochains achats
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedMethods
            .sort((a, b) => {
              // Sort mobile money first, then credit cards
              if (a.method_type === 'mobile_money' && b.method_type !== 'mobile_money') return -1;
              if (a.method_type !== 'mobile_money' && b.method_type === 'mobile_money') return 1;
              // Then sort by default status
              if (a.is_default && !b.is_default) return -1;
              if (!a.is_default && b.is_default) return 1;
              return 0;
            })
            .map((method) => (
            <div
              key={method.id}
              className={`flex items-center justify-between p-4 border rounded-lg ${
                method.is_default ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                {getPaymentIcon(method.method_type)}
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">
                      {method.method_type === 'mobile_money' 
                        ? getProviderDisplayName(method.provider)
                        : (method.provider === 'Unknown' || method.provider === 'Carte' ? 'Carte de Crédit' : getProviderDisplayName(method.provider))
                      }
                    </p>
                    {method.is_default && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        <Star className="h-3 w-3 mr-1" />
                        Défaut
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatAccountDisplay(method)}
                  </p>
                  {method.account_name && (
                    <p className="text-xs text-gray-500">
                      {method.account_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    Ajoutée le {new Date(method.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!method.is_default && (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50"
                    title="Définir par défaut"
                  >
                    <StarOff className="h-4 w-4" />
                  </button>
                )}
                
                <button
                  onClick={() => handleDelete(method.id)}
                  disabled={deletingId === method.id}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 disabled:opacity-50"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
