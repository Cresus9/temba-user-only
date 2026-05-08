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
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
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

const monoFamily = 'ui-monospace, SFMono-Regular, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

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

      if (settled[0].status === 'fulfilled') setConfig(settled[0].value);
      else setConfig(null);

      if (settled[1].status === 'fulfilled') setLinkPayload(settled[1].value);
      else setLinkPayload(null);

      if (settled[2].status === 'fulfilled')
        setStats(settled[2].value ?? DEFAULT_REFERRAL_STATS);
      else setStats(DEFAULT_REFERRAL_STATS);

      if (settled[3].status === 'fulfilled')
        setAggregates(settled[3].value ?? DEFAULT_CREDIT_AGGREGATES);
      else setAggregates(DEFAULT_CREDIT_AGGREGATES);
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
  const shareMessage = linkPayload?.shareMessage || linkPayload?.share_message || '';

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
      if (e && typeof e === 'object' && 'name' in e && (e as { name: string }).name === 'AbortError')
        return;
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-line">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-accent text-ink ring-1 ring-accent flex-shrink-0">
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="eyebrow !mb-1">Programme de parrainage</p>
            <h2
              className="!text-[20px] md:!text-[22px] !leading-[1.15] text-ink font-bold tracking-tight !mb-0"
              style={{ fontFamily: displayFamily }}
            >
              Référer &amp; gagner
            </h2>
            <p className="text-[12px] text-ink-mute mt-1">
              Partagez votre code, vos amis profitent — vous gagnez des crédits.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadAll()}
          disabled={loading}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-line bg-paper text-ink-mute hover:text-brand hover:border-brand transition-colors disabled:opacity-50 flex-shrink-0"
          aria-label="Actualiser"
          title="Actualiser"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      </div>

      {programOff && (
        <div className="rounded-xl2 border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900 flex items-start gap-2.5">
          <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Le programme de parrainage est momentanément désactivé.</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="grid place-items-center w-12 h-12 rounded-full bg-brand-50">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
          </div>
        </div>
      ) : (
        <>
          {/* Vos crédits — dark editorial card */}
          <section className="relative rounded-xl2 bg-ink text-paper p-5 shadow-card overflow-hidden">
            {/* glows */}
            <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-brand opacity-20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-accent opacity-20 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-paper/70"
                  style={{ fontFamily: monoFamily }}
                >
                  Vos crédits TEMBA
                </p>
                <div className="grid place-items-center w-9 h-9 rounded-xl bg-paper/10 ring-1 ring-paper/20 backdrop-blur-sm">
                  <Wallet className="h-4.5 w-4.5 text-accent" />
                </div>
              </div>

              <p
                className="text-[36px] md:text-[40px] leading-none font-bold tracking-tight tabular-nums"
                style={{ fontFamily: displayFamily }}
              >
                {formatCurrency(disponible, currency)}
              </p>
              <p className="text-[12px] text-paper/70 mt-1.5 mb-5">disponible</p>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-paper/10">
                <div className="flex items-start gap-2.5">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-paper/10 ring-1 ring-paper/15 flex-shrink-0">
                    <ArrowDownToLine className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em] text-paper/60"
                      style={{ fontFamily: monoFamily }}
                    >
                      Gagné
                    </p>
                    <p
                      className="text-[14px] font-bold tabular-nums tracking-tight"
                      style={{ fontFamily: displayFamily }}
                    >
                      {formatCurrency(gagne, currency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-paper/10 ring-1 ring-paper/15 flex-shrink-0">
                    <ArrowUpFromLine className="h-3.5 w-3.5 text-paper/70" />
                  </div>
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em] text-paper/60"
                      style={{ fontFamily: monoFamily }}
                    >
                      Dépensé
                    </p>
                    <p
                      className="text-[14px] font-bold tabular-nums tracking-tight"
                      style={{ fontFamily: displayFamily }}
                    >
                      {formatCurrency(depense, currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Code + Share — paper card with cream code ticket */}
          {!programOff && hasReferralReady && (
            <section className="rounded-xl2 bg-paper border border-line shadow-card overflow-hidden">
              <header className="flex items-center justify-between px-5 py-3 bg-cream border-b border-line">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                  style={{ fontFamily: monoFamily }}
                >
                  Votre code · partage instantané
                </p>
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              </header>

              <div className="p-5">
                {/* Code "ticket" — perforated edges */}
                <button
                  type="button"
                  onClick={() => copyText('code', copyPayload)}
                  className="group relative block w-full rounded-xl2 bg-cream border-2 border-dashed border-line hover:border-brand hover:bg-brand-50/40 transition-all px-4 py-5 text-center active:scale-[0.99]"
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute mb-2"
                    style={{ fontFamily: monoFamily }}
                  >
                    REFERRAL CODE
                  </p>
                  <p
                    className="text-[28px] md:text-[32px] font-bold tracking-[0.08em] text-ink leading-none"
                    style={{ fontFamily: monoFamily }}
                  >
                    {referralCode}
                  </p>
                  <p className="text-[11px] text-ink-mute mt-3 inline-flex items-center gap-1.5">
                    {copiedField === 'code' ? (
                      <>
                        <Check className="h-3 w-3 text-green-600" />
                        <span className="text-green-700 font-semibold">Copié!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Cliquer pour copier le message complet</span>
                      </>
                    )}
                  </p>
                </button>

                {/* Action buttons */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => copyText('codebtn', copyPayload)}
                    className="inline-flex items-center justify-center gap-1.5 h-11 px-4 border border-line bg-paper text-ink rounded-lg text-[13px] font-bold hover:border-brand hover:text-brand transition-colors"
                  >
                    {copiedField === 'codebtn' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-green-700">Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copier
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={shareFullMessage}
                    className="inline-flex items-center justify-center gap-1.5 h-11 px-4 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[13px] font-bold transition-colors shadow-card"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Partager
                  </button>
                </div>

                <p className="text-[11px] text-ink-mute mt-3 leading-relaxed text-center">
                  Le partage inclut votre code et le lien d'installation OneLink.
                </p>

                {linkPayload?.source === 'database' && (
                  <p className="text-[11px] text-ink-mute mt-2 text-center">
                    Code issu de la base · vérifiez{' '}
                    <code
                      className="rounded bg-cream px-1 py-0.5 text-ink-mute"
                      style={{ fontFamily: monoFamily }}
                    >
                      generate-referral-link
                    </code>{' '}
                    si besoin.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Code unavailable state */}
          {!programOff && !hasReferralReady && (
            <section className="rounded-xl2 bg-paper border border-line shadow-card overflow-hidden">
              <header className="flex items-center justify-between px-5 py-3 bg-cream border-b border-line">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                  style={{ fontFamily: monoFamily }}
                >
                  Code en préparation
                </p>
              </header>
              <div className="p-5 text-center">
                <div className="grid place-items-center w-14 h-14 rounded-full bg-amber-50 ring-1 ring-amber-200 mx-auto mb-3">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <p className="text-[14px] font-bold text-ink mb-1">
                  Votre code sera bientôt disponible
                </p>
                <p className="text-[12px] text-ink-mute leading-relaxed mb-4 max-w-sm mx-auto">
                  Vérifiez votre connexion ou réessayez dans un instant.
                </p>
                <button
                  type="button"
                  onClick={() => loadAll()}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-5 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[13px] font-bold transition-colors shadow-card"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Réessayer
                </button>
              </div>
            </section>
          )}

          {/* Comment ça marche — editorial 3-step */}
          {!programOff && (
            <section className="rounded-xl2 bg-paper border border-line shadow-card overflow-hidden">
              <header className="flex items-center justify-between px-5 py-3 bg-cream border-b border-line">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                  style={{ fontFamily: monoFamily }}
                >
                  Mode d'emploi
                </p>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute">
                  3 étapes
                </span>
              </header>
              <ol className="divide-y divide-line">
                {[
                  {
                    n: '01',
                    title: 'Partagez votre code',
                    body: 'Envoyez votre code à vos amis (ou utilisez le bouton "Partager" pour un lien intelligent).',
                  },
                  {
                    n: '02',
                    title: 'Votre ami s\'inscrit',
                    body:
                      refereeBonus > 0
                        ? `Il reçoit ${formatCurrency(refereeBonus, 'XOF')} de bonus de bienvenue.`
                        : 'Il bénéficie d\'un bonus de bienvenue selon les règles du programme.',
                  },
                  {
                    n: '03',
                    title: 'Vous gagnez tous les deux',
                    body:
                      referrerReward > 0
                        ? `Vous recevez ${formatCurrency(referrerReward, 'XOF')} lors de son premier achat.`
                        : 'Récompenses lors du premier achat, selon la configuration du programme.',
                  },
                ].map((step, idx) => (
                  <li key={step.n} className="px-5 py-4 flex items-start gap-3 hover:bg-cream/40 transition-colors">
                    <span
                      className={`grid place-items-center w-9 h-9 rounded-lg flex-shrink-0 font-bold text-[12px] tabular-nums ${
                        idx === 0
                          ? 'bg-brand text-paper'
                          : 'bg-cream text-ink ring-1 ring-line'
                      }`}
                      style={{ fontFamily: monoFamily }}
                    >
                      {step.n}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-[14px] font-bold text-ink leading-tight"
                        style={{ fontFamily: displayFamily }}
                      >
                        {step.title}
                      </p>
                      <p className="text-[12px] text-ink-mute mt-0.5 leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Stats — 4 tiles */}
          {!programOff && (
            <section className="rounded-xl2 bg-paper border border-line shadow-card overflow-hidden">
              <header className="flex items-center justify-between px-5 py-3 bg-cream border-b border-line">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                  style={{ fontFamily: monoFamily }}
                >
                  Vos statistiques
                </p>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute tabular-nums">
                  Mise à jour temps réel
                </span>
              </header>
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-line">
                {[
                  {
                    icon: Users,
                    iconBg: 'bg-brand-50 text-brand ring-brand-100',
                    label: 'Total',
                    value: String(stats.totalReferrals),
                    isMono: true,
                  },
                  {
                    icon: CheckCircle2,
                    iconBg: 'bg-green-50 text-green-700 ring-green-200',
                    label: 'Complétés',
                    value: String(stats.completedReferrals),
                    isMono: true,
                  },
                  {
                    icon: Clock,
                    iconBg: 'bg-amber-50 text-amber-700 ring-amber-200',
                    label: 'En attente',
                    value: String(stats.pendingReferrals),
                    isMono: true,
                  },
                  {
                    icon: Wallet,
                    iconBg: 'bg-accent/40 text-ink ring-accent',
                    label: 'Gagnés',
                    value: formatCurrency(stats.creditsEarnedApprox, 'XOF'),
                    isMono: false,
                  },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={i}
                      className={`p-4 ${i === 0 ? 'border-l-0' : ''} ${
                        i < 2 ? 'lg:border-t-0' : ''
                      }`}
                    >
                      <div
                        className={`grid place-items-center w-9 h-9 rounded-lg ring-1 mb-2.5 ${s.iconBg}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <p
                        className={`text-[22px] leading-none font-bold text-ink tabular-nums tracking-tight ${
                          s.isMono ? '' : 'text-[16px]'
                        }`}
                        style={{ fontFamily: displayFamily }}
                      >
                        {s.value}
                      </p>
                      <p
                        className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-mute mt-1.5"
                        style={{ fontFamily: monoFamily }}
                      >
                        {s.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
