import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Copy, Loader2, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase-client';
import { postEdgeFunctionAnon } from '../lib/payments/edge';
import { waitForPawaPayPaymentTerminal } from '../lib/payments/pawapayWatcher';

type Phase = 'waiting' | 'otp' | 'success' | 'failed';

interface VerifyResult {
  success: boolean;
  state: string;
  payment_id: string;
  order_id: string;
  requires_pre_auth?: boolean;
  message?: string;
  error_code?: string;
}

export default function PaymentStatus() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order_id') || '';
  const provider = (searchParams.get('provider') || '').toLowerCase();
  const [phase, setPhase] = useState<Phase>('waiting');
  const [otpCode, setOtpCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Vérification du paiement en cours…');

  const isPawaPay = provider === 'pawapay' || provider === 'mobile_money' || provider === 'orange';
  const ussdCode = '*144*4*6#';

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    let stripeCleanup: (() => void) | null = null;
    setBusy(true);

    (async () => {
      try {
        if (isPawaPay) {
          const result = await waitForPawaPayPaymentTerminal(paymentId, orderId, {
            fallbackIntervalMs: 6000,
            fallbackMaxAttempts: 10,
          });
          if (cancelled) return;
          const state = String(result.state || '').toLowerCase();
          if (result.requires_pre_auth) {
            setPhase('otp');
            setMessage(result.message || 'Code d’autorisation requis.');
            return;
          }
          if (state === 'failed') {
            setPhase('failed');
            setMessage(result.message || 'Paiement échoué.');
            return;
          }
          if (state === 'completed' || state === 'succeeded') {
            setPhase('success');
            setMessage('Paiement confirmé.');
            return;
          }
          setPhase('waiting');
          setMessage(
            result.message ||
              'La vérification du paiement prend plus de temps que prévu. Veuillez vérifier vos billets dans quelques minutes.'
          );
          return;
        }

        // Stripe/webhook flow: read row only (no verify-stripe function)
        const applyStripeStatus = (status: string, errorMessage?: string) => {
          const normalized = String(status || '').toLowerCase();
          if (normalized === 'completed' || normalized === 'succeeded') {
            setPhase('success');
            setMessage('Paiement confirmé.');
            return true;
          }
          if (normalized === 'failed') {
            setPhase('failed');
            setMessage(errorMessage || 'Paiement échoué.');
            return true;
          }
          setPhase('waiting');
          setMessage('Paiement en attente de confirmation webhook.');
          return false;
        };

        const { data: initial, error: initialErr } = await supabase
          .from('payments')
          .select('status,error_message')
          .eq('id', paymentId)
          .maybeSingle();
        if (initialErr) throw new Error(initialErr.message);
        if (applyStripeStatus(String(initial?.status || ''), String(initial?.error_message || ''))) {
          return;
        }

        const channel = supabase
          .channel(`stripe-payment-${paymentId}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'payments', filter: `id=eq.${paymentId}` },
            (payload: any) => {
              const oldStatus = String(payload?.old?.status || '').toLowerCase();
              const newStatus = String(payload?.new?.status || '').toLowerCase();
              if (!newStatus || newStatus === oldStatus) return;
              applyStripeStatus(newStatus, String(payload?.new?.error_message || ''));
            }
          )
          .subscribe();

        const fallbackInterval = setInterval(async () => {
          const { data: row } = await supabase
            .from('payments')
            .select('status,error_message')
            .eq('id', paymentId)
            .maybeSingle();
          applyStripeStatus(String(row?.status || ''), String(row?.error_message || ''));
        }, 12000);

        stripeCleanup = () => {
          clearInterval(fallbackInterval);
          supabase.removeChannel(channel);
        };
      } catch (e: any) {
        if (!cancelled) {
          setPhase('failed');
          setMessage(e?.message || 'Impossible de vérifier le paiement.');
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      if (stripeCleanup) stripeCleanup();
    };
  }, [paymentId, orderId, isPawaPay]);

  const dialerHref = useMemo(() => `tel:${encodeURIComponent(ussdCode)}`, [ussdCode]);

  const handleOtpSubmit = async () => {
    if (!paymentId || !otpCode.trim()) return;
    try {
      setBusy(true);
      const verify = await postEdgeFunctionAnon<VerifyResult>('create-pawapay-payment', {
        payment_id: paymentId,
        order_id: orderId,
        preAuthorisationCode: otpCode.trim(),
      });
      const st = String(verify.state || '').toLowerCase();
      if (verify.requires_pre_auth) {
        setPhase('otp');
        setMessage(verify.message || 'Code OTP invalide, réessayez.');
        return;
      }
      if (st === 'completed' || st === 'succeeded') {
        setPhase('success');
        setMessage('Paiement confirmé.');
        return;
      }
      if (st === 'failed') {
        setPhase('failed');
        setMessage(verify.message || 'Paiement échoué.');
        return;
      }
      setPhase('waiting');
      setMessage('Paiement soumis. Vérification en cours…');
    } catch (e: any) {
      setMessage(e?.message || 'Erreur OTP');
    } finally {
      setBusy(false);
    }
  };

  if (!paymentId) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <div className="max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-ink mb-2">Identifiant manquant</h2>
          <p className="text-[14px] text-ink-mute">
            Aucun identifiant de paiement détecté dans l'URL.
          </p>
        </div>
      </div>
    );
  }

  // Tiny ticket-style code chip header — used across all phases for continuity
  const evtCode = paymentId.slice(0, 8).toUpperCase();

  const Header = ({ subtitle }: { subtitle: string }) => (
    <div className="px-5 py-3 bg-cream border-b border-line flex items-center justify-between">
      <span className="eyebrow !text-ink">{subtitle}</span>
      <span
        className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute tabular-nums"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
      >
        PAY · {evtCode}
      </span>
    </div>
  );

  return (
    <div className="min-h-[80vh] bg-cream bg-grain grid place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl2 border border-line bg-paper shadow-pop overflow-hidden">
        {phase === 'waiting' && (
          <>
            <Header subtitle="Paiement en cours" />
            <div className="p-7 text-center space-y-4">
              <div className="grid place-items-center w-14 h-14 rounded-full bg-brand-50 mx-auto">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
              </div>
              <h1
                className="text-ink text-[20px] font-bold tracking-tight"
                style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
              >
                Paiement en cours
              </h1>
              <p className="text-[13px] text-ink-mute leading-relaxed">{message}</p>
              <p className="text-[11px] text-ink-mute/70">
                Cette opération peut prendre jusqu'à 30 secondes.
              </p>
            </div>
          </>
        )}

        {phase === 'otp' && (
          <>
            <Header subtitle="Code OTP requis" />
            <div className="p-6 space-y-4">
              <p className="text-[13px] text-ink-mute leading-relaxed text-center">{message}</p>

              <div className="rounded-lg border border-brand/20 bg-brand-50 p-3">
                <p className="text-[11px] font-medium text-brand-800 mb-2">
                  Composez le code USSD, puis entrez l'OTP reçu :
                </p>
                <div className="flex gap-1.5">
                  <code
                    className="flex-1 rounded bg-paper border border-line px-2.5 py-1.5 text-[13px] font-bold text-ink tabular-nums"
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                  >
                    {ussdCode}
                  </code>
                  <button
                    type="button"
                    className="grid place-items-center w-8 h-8 rounded border border-line bg-paper text-ink hover:border-brand/40 hover:text-brand transition-colors"
                    onClick={async () => {
                      await navigator.clipboard.writeText(ussdCode);
                      toast.success('Code USSD copié');
                    }}
                    aria-label="Copier le code USSD"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={dialerHref}
                    className="grid place-items-center w-8 h-8 rounded border border-line bg-paper text-ink hover:border-brand/40 hover:text-brand transition-colors"
                    aria-label="Composer le code"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <input
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full h-11 rounded-lg border border-line bg-paper px-3 text-[14px] text-ink placeholder:text-ink-mute focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow tabular-nums"
                placeholder="Entrez le code OTP"
                inputMode="numeric"
                autoComplete="one-time-code"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
              />

              <button
                type="button"
                disabled={busy || !otpCode}
                onClick={handleOtpSubmit}
                className="w-full h-11 rounded-lg bg-brand hover:bg-brand-700 text-paper text-[14px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Validation…' : 'Valider OTP'}
              </button>
            </div>
          </>
        )}

        {phase === 'success' && (
          <>
            <Header subtitle="Paiement confirmé" />
            <div className="p-7 text-center space-y-4">
              <div className="grid place-items-center w-14 h-14 rounded-full bg-green-50 mx-auto ring-1 ring-green-200">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h1
                className="text-ink text-[20px] font-bold tracking-tight"
                style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
              >
                Paiement confirmé
              </h1>
              <p className="text-[13px] text-ink-mute leading-relaxed">{message}</p>
              <button
                type="button"
                onClick={() => navigate(`/booking/confirmation/${orderId}`)}
                className="w-full h-11 rounded-lg bg-brand hover:bg-brand-700 text-paper text-[14px] font-bold transition-colors"
              >
                Voir mes billets →
              </button>
            </div>
          </>
        )}

        {phase === 'failed' && (
          <>
            <Header subtitle="Paiement échoué" />
            <div className="p-7 text-center space-y-4">
              <div className="grid place-items-center w-14 h-14 rounded-full bg-red-50 mx-auto ring-1 ring-red-200">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
              <h1
                className="text-ink text-[20px] font-bold tracking-tight"
                style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
              >
                Paiement échoué
              </h1>
              <p className="text-[13px] text-ink-mute leading-relaxed">{message}</p>
              <Link
                to="/checkout"
                className="inline-flex items-center justify-center w-full h-11 rounded-lg border border-line bg-paper text-ink text-[14px] font-bold hover:border-brand/40 hover:text-brand transition-colors"
              >
                Retour au paiement
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
