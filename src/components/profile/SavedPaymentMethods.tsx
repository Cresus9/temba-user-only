import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Trash2, Star, StarOff, Wallet } from 'lucide-react';
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

  const getPaymentIconBlock = (methodType: string) => {
    if (methodType === 'mobile_money') {
      return (
        <div className="grid place-items-center w-11 h-11 rounded-xl bg-accent/40 ring-1 ring-accent flex-shrink-0">
          <Smartphone className="h-4.5 w-4.5 text-ink" />
        </div>
      );
    }
    return (
      <div className="grid place-items-center w-11 h-11 rounded-xl bg-brand-50 ring-1 ring-brand-100 flex-shrink-0">
        <CreditCard className="h-4.5 w-4.5 text-brand" />
      </div>
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

  const Header = () => (
    <header className="flex items-center justify-between gap-3 px-5 py-4 bg-cream border-b border-line">
      <div className="flex items-center gap-2.5">
        <div className="grid place-items-center w-8 h-8 rounded-lg bg-brand-50 ring-1 ring-brand-100">
          <Wallet className="h-4 w-4 text-brand" />
        </div>
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          >
            Paiement
          </p>
          <h3
            className="text-[15px] font-bold text-ink !mb-0"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            Méthodes sauvegardées
          </h3>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute tabular-nums">
        {String(savedMethods.length).padStart(2, '0')} ENREGISTRÉE
        {savedMethods.length > 1 ? 'S' : ''}
      </span>
    </header>
  );

  if (loading) {
    return (
      <div className="bg-paper rounded-xl2 border border-line shadow-card overflow-hidden">
        <Header />
        <div className="p-5 space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl2 bg-cream-deep relative overflow-hidden"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s infinite',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper rounded-xl2 border border-line shadow-card overflow-hidden">
      <Header />

      {savedMethods.length === 0 ? (
        <div className="text-center py-10 px-6">
          <div className="grid place-items-center w-14 h-14 rounded-full bg-cream-deep mx-auto mb-3">
            <CreditCard className="h-6 w-6 text-ink-mute" />
          </div>
          <p className="eyebrow !mb-1">Aucune méthode</p>
          <p className="text-[13px] font-bold text-ink mb-1">
            Pas encore de moyen de paiement enregistré
          </p>
          <p className="text-[12px] text-ink-mute max-w-sm mx-auto leading-relaxed">
            Lors de votre prochain achat, vous pourrez sauvegarder votre carte ou votre compte
            mobile money pour gagner du temps.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {savedMethods
            .sort((a, b) => {
              if (a.method_type === 'mobile_money' && b.method_type !== 'mobile_money') return -1;
              if (a.method_type !== 'mobile_money' && b.method_type === 'mobile_money') return 1;
              if (a.is_default && !b.is_default) return -1;
              if (!a.is_default && b.is_default) return 1;
              return 0;
            })
            .map((method) => {
              const providerLabel =
                method.method_type === 'mobile_money'
                  ? getProviderDisplayName(method.provider)
                  : method.provider === 'Unknown' || method.provider === 'Carte'
                  ? 'Carte de crédit'
                  : getProviderDisplayName(method.provider);

              return (
                <li
                  key={method.id}
                  className={`flex items-start sm:items-center justify-between gap-3 p-4 transition-colors flex-col sm:flex-row ${
                    method.is_default ? 'bg-brand-50/40' : 'hover:bg-cream/40'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {getPaymentIconBlock(method.method_type)}
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-0.5">
                        <p className="text-[14px] font-bold text-ink leading-tight">
                          {providerLabel}
                        </p>
                        {method.is_default && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.08em] bg-brand text-paper">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            Défaut
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[12px] text-ink-mute tabular-nums tracking-wide"
                        style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                      >
                        {formatAccountDisplay(method)}
                      </p>
                      {method.account_name && (
                        <p className="text-[11px] text-ink-mute/85 mt-0.5 truncate">
                          {method.account_name}
                        </p>
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute/80 mt-1 tabular-nums">
                        Ajoutée le{' '}
                        {new Date(method.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-center">
                    {!method.is_default && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="grid place-items-center w-9 h-9 rounded-lg border border-line bg-paper text-ink-mute hover:text-brand hover:border-brand transition-colors"
                        title="Définir par défaut"
                      >
                        <StarOff className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(method.id)}
                      disabled={deletingId === method.id}
                      className="grid place-items-center w-9 h-9 rounded-lg border border-line bg-paper text-ink-mute hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
