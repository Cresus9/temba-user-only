import React, { useState } from 'react';
import { X, Send, User, Mail, Phone, MessageSquare, AlertCircle, ShieldAlert, ArrowLeft } from 'lucide-react';
import { ticketTransferService, TransferTicketRequest } from '../../services/ticketTransferService';
import { normalizePhone, isValidPhone } from '../../utils/phoneValidation';
import toast from 'react-hot-toast';

interface TransferTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketTitle: string;
  onTransferComplete: () => void;
}

const monoFamily = 'ui-monospace, SFMono-Regular, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

export default function TransferTicketModal({
  isOpen,
  onClose,
  ticketId,
  ticketTitle,
  onTransferComplete,
}: TransferTicketModalProps) {
  const [formData, setFormData] = useState({
    recipientEmail: '',
    recipientPhone: '',
    recipientName: '',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transferMethod, setTransferMethod] = useState<'email' | 'phone'>('email');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedData, setConfirmedData] = useState<{
    recipient: string;
    method: 'email' | 'phone';
    name: string;
    message: string;
  } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    if (transferMethod === 'email') {
      if (!formData.recipientEmail) {
        setError("L'email est requis");
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.recipientEmail)) {
        setError('Veuillez entrer une adresse email valide');
        return false;
      }
    } else {
      if (!formData.recipientPhone) {
        setError('Le numéro de téléphone est requis');
        return false;
      }
      const normalizedPhone = normalizePhone(formData.recipientPhone);
      if (!isValidPhone(normalizedPhone)) {
        setError('Veuillez entrer un numéro valide (format: +226XXXXXXXX)');
        return false;
      }
      setFormData((prev) => ({ ...prev, recipientPhone: normalizedPhone }));
    }
    return true;
  };

  const handleTransfer = () => {
    if (!validateForm()) return;
    setConfirmedData({
      recipient: transferMethod === 'email' ? formData.recipientEmail : formData.recipientPhone,
      method: transferMethod,
      name: formData.recipientName,
      message: formData.message,
    });
    setShowConfirmation(true);
  };

  const handleConfirmTransfer = async () => {
    if (!confirmedData) return;
    setIsLoading(true);
    setError('');

    try {
      const request: TransferTicketRequest = {
        ticketId,
        recipientEmail: confirmedData.method === 'email' ? confirmedData.recipient : undefined,
        recipientPhone:
          confirmedData.method === 'phone' ? normalizePhone(confirmedData.recipient) : undefined,
        recipientName: confirmedData.name,
        message: confirmedData.message,
      };

      const response = await ticketTransferService.transferTicket(request);

      if (response.success) {
        if (response.instantTransfer) {
          toast.success('Billet transféré avec succès!');
        } else {
          toast.success(
            'Transfert en attente — le destinataire recevra le billet à son inscription.'
          );
        }
        onTransferComplete();
        onClose();
        setFormData({
          recipientEmail: '',
          recipientPhone: '',
          recipientName: '',
          message: '',
        });
      } else {
        setError(response.error || 'Échec du transfert');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      setError("Une erreur inattendue s'est produite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToForm = () => {
    setShowConfirmation(false);
    setConfirmedData(null);
    setError('');
  };

  if (!isOpen) return null;

  const inputClass =
    'w-full h-11 pl-10 pr-3.5 bg-paper border border-line text-ink placeholder:text-ink-mute/60 ' +
    'rounded-lg text-[14px] focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all';
  const labelClass = 'block text-[12px] font-semibold text-ink mb-1.5';

  return (
    <div
      className="fixed inset-0 bg-ink/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-xl2 max-w-md w-full max-h-[92vh] overflow-y-auto shadow-card-hover my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-cream border-b border-line">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid place-items-center w-8 h-8 rounded-lg bg-brand-50 text-brand ring-1 ring-brand-100 flex-shrink-0">
              <Send className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                style={{ fontFamily: monoFamily }}
              >
                {showConfirmation ? 'Étape 2 / 2' : 'Étape 1 / 2'}
              </p>
              <h2
                className="text-[14px] font-bold text-ink !mb-0 leading-tight"
                style={{ fontFamily: displayFamily }}
              >
                {showConfirmation ? 'Confirmer le transfert' : 'Transférer le billet'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid place-items-center w-9 h-9 rounded-lg border border-line bg-paper text-ink-mute hover:text-ink hover:border-ink transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="p-5 space-y-4">
          {showConfirmation && confirmedData ? (
            // ── Confirmation step ──────────────────────────────────────
            <>
              <div className="text-center">
                <div className="grid place-items-center w-14 h-14 rounded-full bg-amber-50 ring-1 ring-amber-200 mx-auto mb-3">
                  <ShieldAlert className="h-6 w-6 text-amber-600" />
                </div>
                <h3
                  className="text-[16px] font-bold text-ink mb-1"
                  style={{ fontFamily: displayFamily }}
                >
                  Vérifiez avant d'envoyer
                </h3>
                <p className="text-[12px] text-ink-mute leading-relaxed max-w-xs mx-auto">
                  Le transfert est immédiat et irréversible une fois confirmé.
                </p>
              </div>

              <dl className="bg-cream rounded-xl2 border border-line divide-y divide-line">
                <div className="flex justify-between gap-3 px-4 py-3">
                  <dt
                    className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-mute flex-shrink-0"
                    style={{ fontFamily: monoFamily }}
                  >
                    Billet
                  </dt>
                  <dd className="text-[12px] font-bold text-ink text-right truncate">
                    {ticketTitle}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 px-4 py-3">
                  <dt
                    className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-mute flex-shrink-0"
                    style={{ fontFamily: monoFamily }}
                  >
                    {confirmedData.method === 'email' ? 'Email' : 'Téléphone'}
                  </dt>
                  <dd
                    className="text-[12px] font-bold text-ink text-right tabular-nums truncate"
                    style={{ fontFamily: monoFamily }}
                  >
                    {confirmedData.recipient}
                  </dd>
                </div>
                {confirmedData.name && (
                  <div className="flex justify-between gap-3 px-4 py-3">
                    <dt
                      className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-mute flex-shrink-0"
                      style={{ fontFamily: monoFamily }}
                    >
                      Nom
                    </dt>
                    <dd className="text-[12px] font-bold text-ink text-right truncate">
                      {confirmedData.name}
                    </dd>
                  </div>
                )}
                {confirmedData.message && (
                  <div className="px-4 py-3">
                    <dt
                      className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-mute mb-1"
                      style={{ fontFamily: monoFamily }}
                    >
                      Message
                    </dt>
                    <dd className="text-[12px] text-ink leading-relaxed">
                      {confirmedData.message}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="rounded-lg bg-amber-50 border-l-4 border-amber-400 p-3 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-amber-900 leading-tight">
                    Action irréversible
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Une fois transféré, vous ne pourrez plus utiliser ce billet.
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-700 leading-relaxed">{error}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-line">
                <button
                  onClick={handleBackToForm}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 border border-line bg-paper text-ink rounded-lg text-[13px] font-bold hover:border-ink hover:bg-cream/50 transition-colors disabled:opacity-50 flex-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour
                </button>
                <button
                  onClick={handleConfirmTransfer}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[13px] font-bold transition-colors shadow-card disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                      Transfert...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            // ── Form step ──────────────────────────────────────────────
            <>
              {/* Ticket badge */}
              <div className="rounded-xl2 bg-cream border border-line p-3.5">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute mb-1"
                  style={{ fontFamily: monoFamily }}
                >
                  Vous transférez
                </p>
                <p
                  className="text-[14px] font-bold text-ink leading-tight"
                  style={{ fontFamily: displayFamily }}
                >
                  {ticketTitle}
                </p>
              </div>

              {/* Method selector */}
              <div>
                <label className={labelClass}>Méthode de transfert</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferMethod('email')}
                    className={`inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border text-[12px] font-bold transition-all ${
                      transferMethod === 'email'
                        ? 'border-brand bg-brand-50 text-brand ring-2 ring-brand/20'
                        : 'border-line bg-paper text-ink-mute hover:border-brand/40 hover:text-ink'
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferMethod('phone')}
                    className={`inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border text-[12px] font-bold transition-all ${
                      transferMethod === 'phone'
                        ? 'border-brand bg-brand-50 text-brand ring-2 ring-brand/20'
                        : 'border-line bg-paper text-ink-mute hover:border-brand/40 hover:text-ink'
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Téléphone
                  </button>
                </div>
              </div>

              {/* Recipient input */}
              <div>
                <label className={labelClass}>
                  {transferMethod === 'email' ? 'Email du destinataire' : 'Téléphone du destinataire'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {transferMethod === 'email' ? (
                      <Mail className="h-4 w-4 text-ink-mute" />
                    ) : (
                      <Phone className="h-4 w-4 text-ink-mute" />
                    )}
                  </div>
                  <input
                    type={transferMethod === 'email' ? 'email' : 'tel'}
                    value={
                      transferMethod === 'email' ? formData.recipientEmail : formData.recipientPhone
                    }
                    onChange={(e) =>
                      handleInputChange(
                        transferMethod === 'email' ? 'recipientEmail' : 'recipientPhone',
                        e.target.value
                      )
                    }
                    className={inputClass}
                    placeholder={transferMethod === 'email' ? 'ami@example.com' : '+226 70 12 34 56'}
                    style={transferMethod === 'phone' ? { fontFamily: monoFamily } : undefined}
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={labelClass}>
                  Nom du destinataire <span className="text-ink-mute font-normal">(optionnel)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-ink-mute" />
                  </div>
                  <input
                    type="text"
                    value={formData.recipientName}
                    onChange={(e) => handleInputChange('recipientName', e.target.value)}
                    className={inputClass}
                    placeholder="ex. Aminata Traoré"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className={labelClass}>
                  Petit mot <span className="text-ink-mute font-normal">(optionnel)</span>
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <MessageSquare className="h-4 w-4 text-ink-mute" />
                  </div>
                  <textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    rows={3}
                    className="w-full pl-10 pr-3.5 py-3 bg-paper border border-line text-ink placeholder:text-ink-mute/60 rounded-lg text-[14px] focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all resize-none"
                    placeholder="Ajoutez un message personnel à votre transfert..."
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-700 leading-relaxed">{error}</p>
                </div>
              )}

              {/* Notice */}
              <div className="rounded-lg bg-amber-50 border-l-4 border-amber-400 p-3 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-amber-900 leading-tight">
                    À savoir avant d'envoyer
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Si le destinataire n'a pas encore de compte Temba, il recevra le billet à son
                    inscription. Sinon, le transfert est instantané.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sticky footer (form step only) */}
        {!showConfirmation && (
          <footer className="sticky bottom-0 flex items-center justify-end gap-2 px-5 py-3 bg-cream border-t border-line">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="inline-flex items-center justify-center h-10 px-4 border border-line bg-paper text-ink rounded-lg text-[13px] font-bold hover:border-ink hover:bg-cream/50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleTransfer}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-5 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[13px] font-bold transition-colors shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                  Transfert...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Continuer
                </>
              )}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
