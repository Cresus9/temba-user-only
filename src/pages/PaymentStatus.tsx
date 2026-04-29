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
    return <div className="p-8 text-center text-red-600">Identifiant de paiement manquant.</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {phase === 'waiting' && (
          <div className="text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
            <h1 className="text-xl font-semibold text-gray-900">Paiement en cours</h1>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        )}

        {phase === 'otp' && (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold text-gray-900 text-center">Code OTP requis</h1>
            <p className="text-sm text-gray-600 text-center">{message}</p>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-900 mb-2">Composez le code USSD, puis entrez l’OTP reçu :</p>
              <div className="flex gap-2">
                <code className="flex-1 rounded bg-white px-2 py-1 text-sm font-mono">{ussdCode}</code>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  onClick={async () => {
                    await navigator.clipboard.writeText(ussdCode);
                    toast.success('Code USSD copié');
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <a href={dialerHref} className="rounded border px-2 py-1 text-xs inline-flex items-center">
                  <Phone className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Entrez le code OTP"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <button
              type="button"
              disabled={busy || !otpCode}
              onClick={handleOtpSubmit}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
            >
              {busy ? 'Validation...' : 'Valider OTP'}
            </button>
          </div>
        )}

        {phase === 'success' && (
          <div className="text-center space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <h1 className="text-xl font-semibold text-gray-900">Paiement confirmé</h1>
            <p className="text-sm text-gray-600">{message}</p>
            <button
              type="button"
              onClick={() => navigate(`/booking/confirmation/${orderId}`)}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white"
            >
              Voir mes billets
            </button>
          </div>
        )}

        {phase === 'failed' && (
          <div className="text-center space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-red-600" />
            <h1 className="text-xl font-semibold text-gray-900">Paiement échoué</h1>
            <p className="text-sm text-gray-600">{message}</p>
            <Link to="/checkout" className="inline-block rounded-lg border px-4 py-2 text-sm">
              Retour au paiement
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
