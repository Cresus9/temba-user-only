import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Check,
  Gift,
  Loader2,
  RefreshCw,
  Share2,
  Wallet,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  referralService,
  type ReferralConfig,
  type ReferralLinkPayload,
  type ReferralStats,
} from '../../services/referralService';
import { creditService, type CreditAggregates } from '../../services/creditService';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

/** Same pattern as mobile: message + full OneLink in one string for copy/share. */
const DEFAULT_REFERRAL_STATS: ReferralStats = {
  totalReferrals: 0,
  completedReferrals: 0,
  pendingReferrals: 0,
  creditsEarnedApprox: 0,
};

const DEFAULT_CREDIT_AGGREGATES: CreditAggregates = {
  available: 0,
  earned: 0,
  spent: 0,
  currency: 'XOF',
};

function buildFullShareText(code: string, oneLink: string, backendMessage: string): string {
  const t = backendMessage?.trim() ?? '';
  if (t) {
    if (t.includes(oneLink) || /https?:\/\//i.test(t)) {
      return t;
    }
    const sep = /[!?.]$/.test(t) ? ' ' : '. ';
    return `${t}${sep}Téléchargez: ${oneLink}`;
  }
  return `Rejoignez TEMBA avec mon code de parrainage ${code} et recevez des récompenses! Téléchargez: ${oneLink}`;
}

export default function ReferralProgram() {
  const { user, loading: authLoading } = useAuth();
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [linkPayload, setLinkPayload] = useState<ReferralLinkPayload | null>(null);
  const [stats, setStats] = useState<ReferralStats>(DEFAULT_REFERRAL_STATS);
  const [aggregates, setAggregates] = useState<CreditAggregates>(DEFAULT_CREDIT_AGGREGATES);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const settled = await Promise.allSettled([
        referralService.getConfig(),
        referralService.getReferralLink(),
        referralService.getReferralStats(),
        creditService.getAggregates(),
      ]);

      if (settled[0].status === 'fulfilled') {
        setConfig(settled[0].value);
      } else {
        console.warn('[referral] getConfig failed', settled[0].reason);
        setConfig(null);
      }

      if (settled[1].status === 'fulfilled') {
        setLinkPayload(settled[1].value);
      } else {
        console.warn('[referral] getReferralLink failed', settled[1].reason);
        setLinkPayload(null);
      }

      if (settled[2].status === 'fulfilled') {
        setStats(settled[2].value ?? DEFAULT_REFERRAL_STATS);
      } else {
        console.warn('[referral] getReferralStats failed', settled[2].reason);
        setStats(DEFAULT_REFERRAL_STATS);
      }

      if (settled[3].status === 'fulfilled') {
        const agg = settled[3].value;
        setAggregates(agg ?? DEFAULT_CREDIT_AGGREGATES);
      } else {
        console.warn('[credits] getAggregates failed', settled[3].reason);
        setAggregates(DEFAULT_CREDIT_AGGREGATES);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void loadAll();
  }, [authLoading, user?.id, loadAll]);

  const referralCode = linkPayload?.referralCode || linkPayload?.code || '';
  const links = linkPayload?.links;
  const shareMessage =
    linkPayload?.shareMessage || linkPayload?.share_message || '';

  const fullShareText = useMemo(() => {
    if (!referralCode || !links?.oneLink) return '';
    return buildFullShareText(referralCode, links.oneLink, shareMessage);
  }, [referralCode, links?.oneLink, shareMessage]);

  const copyText = async (label: string, text: string | undefined) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast.success('Copié dans le presse-papiers');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const shareFullMessage = async () => {
    const url = links?.oneLink;
    const text = fullShareText;
    if (!url || !text) {
      toast.error('Lien de partage indisponible');
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'TEMBA — Référer & gagner',
          text,
          url,
        });
        return;
      }
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'AbortError') return;
    }
    await copyText('sharefb', text);
  };

  const copyPayload = fullShareText || referralCode;

  const programOff = config && config.program_enabled === false;

  const refereeBonus = Number(
    config?.referee_reward_fcfa ?? config?.referee_reward_amount ?? 0
  );
  const referrerReward = Number(
    config?.referrer_reward_fcfa ?? config?.referrer_reward_amount ?? 0
  );

  const currency = aggregates.currency || 'XOF';
  const disponible = aggregates.available;
  const gagne = aggregates.earned;
  const depense = aggregates.spent;

  const hasReferralReady = Boolean(referralCode && links?.oneLink);

  return (
    <div className="space-y-6 max-w-lg mx-auto md:max-w-none">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Référer &amp; Gagner</h1>
        <button
          type="button"
          onClick={() => loadAll()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          aria-label="Actualiser"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        </button>
      </div>

      {programOff && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Le programme de parrainage est momentanément désactivé.
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        </div>
      )}

      {!loading && (
        <>
          {/* VOS CRÉDITS — same structure as mobile */}
          <section className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="absolute right-4 top-4 text-indigo-500">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 pr-10">
              Vos crédits
            </p>
            <>
              <p className="text-3xl font-bold text-indigo-600 tabular-nums">
                {formatCurrency(disponible, currency)}
              </p>
              <p className="text-sm text-gray-500 mb-5">disponible</p>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Gagné</p>
                  <p className="text-base font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(gagne, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Dépensé</p>
                  <p className="text-base font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(depense, currency)}
                  </p>
                </div>
              </div>
            </>
          </section>

          {/* Code + OneLink — purple card (always same shell when program on) */}
          {!programOff && hasReferralReady && (
            <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-center shadow-lg text-white">
              <div className="flex justify-center mb-3">
                <div className="rounded-full bg-white/15 p-3">
                  <Gift className="h-8 w-8 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-indigo-100 mb-3">Votre code de référence</p>
              <button
                type="button"
                onClick={() => copyText('code', copyPayload)}
                className="w-full rounded-xl bg-sky-100/95 px-4 py-4 text-center transition hover:bg-sky-50 active:scale-[0.99]"
              >
                <span className="font-mono text-xl font-bold tracking-wide text-indigo-900">
                  {referralCode}
                </span>
                <p className="text-xs text-indigo-700/80 mt-2">
                  Cliquez pour copier le texte complet (code + lien OneLink)
                </p>
              </button>
              {linkPayload?.source === 'database' && (
                <p className="text-xs text-indigo-200 mt-3 text-left">
                  Code issu de la base — vérifiez <code className="rounded bg-white/10 px-1">generate-referral-link</code>{' '}
                  si besoin.
                </p>
              )}
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => copyText('codebtn', copyPayload)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-medium backdrop-blur hover:bg-white/20"
                >
                  {copiedField === 'codebtn' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copier
                </button>
                <button
                  type="button"
                  onClick={shareFullMessage}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  <Share2 className="h-4 w-4" />
                  Partager
                </button>
              </div>
              <p className="text-[11px] text-indigo-200 mt-3 leading-relaxed">
                Copier et Partager incluent le message complet avec l&apos;URL OneLink, comme sur l&apos;app mobile.
              </p>
            </section>
          )}

          {!programOff && !hasReferralReady && !loading && (
            <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-center shadow-lg text-white">
              <div className="flex justify-center mb-3">
                <div className="rounded-full bg-white/15 p-3">
                  <Gift className="h-8 w-8 text-white" />
                </div>
              </div>
              <p className="text-sm font-medium text-indigo-100 mb-3">Votre code de référence</p>
              <div className="w-full rounded-xl bg-sky-100/95 px-4 py-6 text-indigo-900">
                <p className="text-sm font-medium leading-relaxed">
                  Votre code sera affiché ici dès qu&apos;il sera prêt. Vérifiez votre connexion ou réessayez.
                </p>
                <p className="text-xs text-indigo-800/80 mt-3">
                  Si le problème continue, la fonction{' '}
                  <code className="rounded bg-indigo-200/50 px-1">generate-referral-link</code> côté Supabase peut être
                  indisponible ou votre compte n&apos;a pas encore de code en base.
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadAll()}
                className="mt-5 w-full rounded-xl bg-white py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Réessayer
              </button>
            </section>
          )}

          {/* Comment ça marche */}
          {!programOff && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4">Comment ça marche</h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">Partagez votre code</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Envoyez votre code de référence à vos amis (lien intelligent via « Partager »).
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">L&apos;ami s&apos;inscrit</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {refereeBonus > 0 ? (
                        <>
                          Il reçoit {formatCurrency(refereeBonus, 'XOF')} de bonus de bienvenue.
                        </>
                      ) : (
                        <>Il peut bénéficier d&apos;un bonus de bienvenue selon les règles du programme.</>
                      )}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">Vous gagnez tous les deux !</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {referrerReward > 0 ? (
                        <>
                          Recevez {formatCurrency(referrerReward, 'XOF')} lors de son premier achat.
                        </>
                      ) : (
                        <>Récompenses lors du premier achat, selon la configuration du programme.</>
                      )}
                    </p>
                  </div>
                </li>
              </ol>
            </section>
          )}

          {/* Vos statistiques — 2×2 like mobile (toujours affiché si programme actif) */}
          {!programOff && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4">Vos statistiques</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <Users className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.totalReferrals}</p>
                  <p className="text-xs text-gray-500 mt-1">Total</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.completedReferrals}</p>
                  <p className="text-xs text-gray-500 mt-1">Complétés</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <Clock className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.pendingReferrals}</p>
                  <p className="text-xs text-gray-500 mt-1">En attente</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <Wallet className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">
                    {formatCurrency(stats.creditsEarnedApprox, 'XOF')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">FCFA gagnés</p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
