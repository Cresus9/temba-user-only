import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Calendar, Instagram, Facebook, Youtube, Twitter, Globe,
  CheckCircle, ArrowLeft, ArrowRight, Users, Share2, Ticket,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase-client';
import { formatCurrency, parseLocalDate, localTodayYmd } from '../../utils/formatters';
import { countryFlag } from '../../utils/eventGeo';
import PageSEO from '../../components/SEO/PageSEO';
import { eventPublicPath } from '../../utils/eventPath';
import {
  ARTIST_ROLE_FR,
  artistCanonicalUrl,
  artistFaqItems,
  artistMetaDescription,
  artistSeoTitle,
  artistSocialHref,
  artistStructuredData,
} from '../../utils/artistSeo';
import { FadeUp, Stagger, StaggerItem } from '../../components/common/Motion';
import { ArtistStage } from '../../components/ui/artist-stage';

interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  genre: string | null;
  photo_url: string | null;
  cover_image_url: string | null;
  country_code: string | null;
  city: string | null;
  social_links: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    twitter?: string;
    website?: string;
  } | null;
  verified: boolean;
}

interface PeerArtist {
  id: string;
  name: string;
  slug: string;
  genre: string | null;
  photo_url: string | null;
  city: string | null;
  verified: boolean;
}

interface ShowCard {
  id: string;
  title: string;
  date: string;
  location: string;
  image_url: string | null;
  price: number;
  currency: string;
  role?: string;
  slug?: string | null;
}

type Tab = 'upcoming' | 'past';
const display = '"Plus Jakarta Sans", Inter, sans-serif';



function todayLocal() {
  const [y, m, d] = localTodayYmd().split('-').map(Number);
  return new Date(y, m - 1, d);
}

const STOCK_COVER_HOSTS = [
  'images.pexels.com',
  'pexels.com',
  'images.unsplash.com',
  'unsplash.com',
  'cdn-images.dzcdn.net',
  'e-cdns-images.dzcdn.net',
  'lastfm.freetls.fastly.net',
  'i.scdn.co',
];

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isStockCover(url: string) {
  const host = hostOf(url);
  return STOCK_COVER_HOSTS.some((b) => host === b || host.endsWith(`.${b}`));
}

function isBannerUrl(url?: string | null) {
  return Boolean(url && !isStockCover(url));
}

function pickPoster(artist: Artist, shows: ShowCard[]) {
  const fromShow = shows.find((s) => isBannerUrl(s.image_url))?.image_url || '';
  if (fromShow) return fromShow;
  const cover = artist.cover_image_url?.trim() || '';
  const photo = artist.photo_url?.trim() || '';
  if (isBannerUrl(cover) && cover !== photo) return cover;
  return '';
}

export default function ArtistProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [events, setEvents] = useState<ShowCard[]>([]);
  const [peers, setPeers] = useState<PeerArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('upcoming');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data: a } = await supabase.from('artists').select('*').eq('slug', slug).single();
      if (cancelled) return;
      if (!a) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setArtist(a);

      const [{ data: ea }, { data: similar }] = await Promise.all([
        supabase
          .from('event_artists')
          .select('role, events(id, slug, title, date, location, image_url, price, currency, status, deleted_at)')
          .eq('artist_id', a.id),
        supabase
          .from('artists')
          .select('id, name, slug, genre, photo_url, city, verified')
          .neq('id', a.id)
          .order('name')
          .limit(24),
      ]);

      if (cancelled) return;

      const evts: ShowCard[] = (ea || [])
        .filter(
          (row: { events?: ShowCard & { status?: string; deleted_at?: string | null } }) =>
            row.events?.status === 'PUBLISHED' && !row.events.deleted_at
        )
        .map((row: { role?: string; events: ShowCard }) => ({ ...row.events, role: row.role }));
      setEvents(evts);

      const pool = (similar || []) as PeerArtist[];
      const sameGenre = a.genre ? pool.filter((p) => p.genre === a.genre) : [];
      const rest = pool.filter((p) => !sameGenre.includes(p));
      setPeers([...sameGenre, ...rest].slice(0, 8));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream bg-grain flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !artist) {
    return (
      <div className="min-h-screen bg-cream bg-grain flex flex-col items-center justify-center gap-4 px-4">
        <PageSEO
          title="Artiste introuvable"
          description="Cette fiche artiste n’existe pas sur Temba."
          canonicalUrl={slug ? artistCanonicalUrl(slug) : 'https://tembas.com/artists'}
          robots="noindex, follow"
        />
        <div className="w-16 h-16 rounded-2xl bg-paper border border-line grid place-items-center">
          <Users className="w-7 h-7 text-ink-mute" />
        </div>
        <h1 className="text-[20px] font-bold text-ink" style={{ fontFamily: display }}>Artiste introuvable</h1>
        <p className="text-[14px] text-ink-mute text-center max-w-sm">Cette fiche n’existe pas, ou le lien a changé.</p>
        <Link to="/artists" className="px-5 py-2.5 bg-brand text-paper rounded-xl text-[13px] font-bold">
          Voir tous les artistes
        </Link>
      </div>
    );
  }

  const social = artist.social_links ?? {};
  const socials = (
    [
      social.instagram && { kind: 'instagram' as const, label: 'Instagram', href: artistSocialHref('instagram', social.instagram), Icon: Instagram },
      social.facebook && { kind: 'facebook' as const, label: 'Facebook', href: artistSocialHref('facebook', social.facebook), Icon: Facebook },
      social.youtube && { kind: 'youtube' as const, label: 'YouTube', href: artistSocialHref('youtube', social.youtube), Icon: Youtube },
      social.twitter && { kind: 'twitter' as const, label: 'X', href: artistSocialHref('twitter', social.twitter), Icon: Twitter },
      social.website && { kind: 'website' as const, label: 'Site', href: artistSocialHref('website', social.website), Icon: Globe },
    ] as const
  ).filter(Boolean) as { kind: string; label: string; href: string; Icon: typeof Instagram }[];

  const startOfToday = todayLocal();
  const upcoming = events
    .filter((e) => parseLocalDate(e.date) >= startOfToday)
    .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  const past = events
    .filter((e) => parseLocalDate(e.date) < startOfToday)
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
  const shown = tab === 'upcoming' ? upcoming : past;
  const nextShow = upcoming[0];
  const datedShows = [...upcoming, ...past];
  const posterSrc = pickPoster(artist, datedShows);
  const ogImage = posterSrc || artist.photo_url || undefined;
  const pageUrl = `https://tembas.com/artists/${artist.slug}`;
  const place = [artist.city, artist.country_code ? countryFlag(artist.country_code) : null].filter(Boolean).join(' ');
  const seoDescription = artistMetaDescription({
    name: artist.name,
    bio: artist.bio,
    genre: artist.genre,
    city: artist.city,
    nextShow,
  });
  const structuredData = artistStructuredData({
    name: artist.name,
    slug: artist.slug,
    bio: artist.bio,
    genre: artist.genre,
    city: artist.city,
    countryCode: artist.country_code,
    image: artist.photo_url || ogImage,
    social: artist.social_links,
    shows: upcoming,
  });

  const share = async () => {
    const text = `${artist.name} — dates et billets sur Temba`;
    try {
      if (navigator.share) {
        await navigator.share({ title: artist.name, text, url: pageUrl });
        return;
      }
    } catch {
      /* cancelled */
    }
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${pageUrl}`)}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success('Lien copié');
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  return (
    <>
      <PageSEO
        title={artistSeoTitle(artist.name, { city: artist.city, nextLocation: nextShow?.location })}
        description={seoDescription}
        canonicalUrl={pageUrl}
        ogType="profile"
        ogImage={artist.photo_url || ogImage}
        keywords={[
          artist.name,
          `concert ${artist.name}`,
          `billets ${artist.name}`,
          artist.genre,
          artist.city,
          'concert Ouagadougou',
          'billets Temba',
          'Burkina Faso',
        ].filter(Boolean) as string[]}
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-cream bg-grain">
        <ArtistStage className="min-h-[360px] md:min-h-[400px]" watermark={artist.name}>
          <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-4 pb-8 md:pt-5 md:pb-10">
            <Link
              to="/artists"
              className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 bg-paper/12 backdrop-blur-sm text-paper rounded-lg text-[12px] font-medium hover:bg-paper/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Artistes
            </Link>
            <p className="mt-3 text-[11px] text-white/40">
              <Link to="/" className="hover:text-white/70">Accueil</Link>
              {' · '}
              <Link to="/artists" className="hover:text-white/70">Artistes</Link>
              {' · '}
              <span className="text-white/70">{artist.name}</span>
            </p>

            <div className="mt-8 md:mt-10 relative z-10 max-w-xl">
              <div className="min-w-0 flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-6">
                <div className="relative w-fit flex-shrink-0 self-start">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-1.5 top-1.5 h-full w-full rounded-xl2 border border-accent/45"
                  />
                  <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-xl2 overflow-hidden border border-paper/15 bg-ink">
                  {artist.photo_url ? (
                    <img src={artist.photo_url} alt={`${artist.name}, artiste`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center bg-accent/20">
                      <span className="text-[40px] font-extrabold text-paper" style={{ fontFamily: display }}>
                        {artist.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                </div>
                <div className="min-w-0">
                <p className="eyebrow !text-white/45 mb-2 tracking-[0.22em]">
                  {artist.genre || 'Artiste'}
                  {artist.verified ? ' · Vérifié' : ''}
                </p>
                <div className="flex items-start gap-2.5 mb-3">
                  <h1
                    className="text-[clamp(34px,5.2vw,58px)] font-semibold text-white leading-[1.02] tracking-[-0.045em] antialiased"
                    style={{ fontFamily: display, fontWeight: 600 }}
                  >
                    {artist.name}
                  </h1>
                  {artist.verified && <CheckCircle className="w-5 h-5 text-white/80 flex-shrink-0 mt-2.5" />}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/50 mb-5">
                  {place && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-accent" />
                      {place}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-accent" />
                    {upcoming.length > 0
                      ? `${upcoming.length} date${upcoming.length > 1 ? 's' : ''} à venir`
                      : 'Pas encore de date Temba'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextShow ? (
                    <a
                      href="#dates"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-ink text-[13px] font-bold hover:bg-accent/90 transition-colors"
                    >
                      Prochain concert
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  ) : (
                    <Link
                      to="/events"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-ink text-[13px] font-bold hover:bg-accent/90 transition-colors"
                    >
                      Voir l’agenda
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={share}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-paper/12 text-paper text-[13px] font-semibold hover:bg-paper/20 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Partager
                  </button>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-paper/20 text-paper text-[13px] font-semibold hover:bg-paper/10 transition-colors"
                  >
                    Copier le lien
                  </button>
                </div>
                </div>
              </div>
            </div>
          </div>
        </ArtistStage>

        <div className="bg-cream bg-grain">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10 md:py-14">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
              <div className="lg:col-span-8 space-y-14">
                <FadeUp>
                  <section>
                    <p className="eyebrow mb-4 tracking-[0.18em]">À propos</p>
                    {artist.bio ? (
                      <p
                        className="text-[18px] sm:text-[20px] text-ink leading-[1.5] tracking-[-0.02em] max-w-[38rem]"
                        style={{ fontFamily: display }}
                      >
                        {artist.bio}
                      </p>
                    ) : (
                      <p className="text-[15px] text-ink-mute max-w-lg leading-relaxed">
                        Fiche officielle de {artist.name} sur Temba. Les dates publiées par les organisateurs et les billets en FCFA apparaissent ici.
                      </p>
                    )}
                    <p className="mt-4 text-[13px] text-ink-mute max-w-lg leading-relaxed">
                      Temba est la billetterie de référence : seuls les concerts réellement programmés sur la plateforme sont listés ci-dessous.
                    </p>
                    {socials.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-6">
                        {socials.map(({ kind, label, href, Icon }) => (
                          <a
                            key={kind}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer me"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ink text-paper text-[11px] font-semibold uppercase tracking-[0.12em] hover:bg-ink/80 transition-colors"
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                          </a>
                        ))}
                      </div>
                    )}
                  </section>
                </FadeUp>

                <FadeUp delay={0.06}>
                  <section id="dates">
                    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                      <div>
                        <p className="eyebrow mb-2 tracking-[0.18em]">Sur Temba</p>
                        <h2
                          className="text-[28px] sm:text-[32px] font-semibold text-ink tracking-[-0.04em] leading-none"
                          style={{ fontFamily: display }}
                        >
                          Concerts et billets {artist.name}
                        </h2>
                      </div>
                      {events.length > 0 && (
                        <div className="flex gap-5">
                          {(['upcoming', 'past'] as Tab[]).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTab(t)}
                              className={`pb-1 text-[12px] font-semibold uppercase tracking-[0.14em] border-b transition-colors ${
                                tab === t
                                  ? 'text-ink border-accent'
                                  : 'text-ink-mute border-transparent hover:text-ink'
                              }`}
                            >
                              {t === 'upcoming' ? `À venir ${upcoming.length}` : `Passés ${past.length}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {events.length === 0 ? (
                      <div className="py-7 border-y border-line">
                        <p
                          className="text-[20px] font-semibold text-ink tracking-tight mb-2"
                          style={{ fontFamily: display }}
                        >
                          Pas encore de date sur Temba
                        </p>
                        <p className="text-[14px] text-ink-mute leading-relaxed max-w-lg mb-6">
                          Dès qu’un organisateur programme {artist.name}, les billets s’achètent ici — Orange Money, Moov, carte.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to="/events"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-ink text-[13px] font-bold hover:bg-accent/90"
                          >
                            Explorer l’agenda
                          </Link>
                          <Link
                            to="/artists"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink/15 text-[13px] font-semibold text-ink hover:border-ink/40"
                          >
                            Autres artistes
                          </Link>
                        </div>
                      </div>
                    ) : shown.length === 0 ? (
                      <div className="py-10 border-y border-line text-center">
                        <Calendar className="w-6 h-6 text-ink-mute mx-auto mb-3" />
                        <p className="text-[14px] font-medium text-ink-mute">
                          {tab === 'upcoming' ? 'Aucune date à venir' : 'Aucun concert passé'}
                        </p>
                      </div>
                    ) : (
                      <div className="border-t border-line">
                        {shown.map((event) => {
                          const dt = parseLocalDate(event.date);
                          const d = dt.getDate();
                          return (
                            <Link
                              key={event.id}
                              to={eventPublicPath(event)}
                              className="group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[4.5rem_1fr_auto] gap-4 sm:gap-6 items-center py-5 border-b border-line hover:bg-paper/70 transition-colors -mx-2 px-2 sm:mx-0 sm:px-1"
                            >
                              <div className="flex flex-col items-start sm:items-center min-w-[3.25rem]">
                                <span className="text-[10px] font-semibold text-ink-mute uppercase tracking-[0.16em]">
                                  {dt.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                                </span>
                                <span
                                  className="text-[28px] font-semibold text-ink tabular-nums leading-none tracking-tight"
                                  style={{ fontFamily: display }}
                                >
                                  {String(d).padStart(2, '0')}
                                </span>
                              </div>
                              <div className="min-w-0 flex items-center gap-4">
                                {event.image_url ? (
                                  <div className="hidden sm:block flex-shrink-0 w-14 h-14 overflow-hidden rounded-lg bg-paper">
                                    <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ) : null}
                                <div className="min-w-0">
                                  <p
                                    className="text-[16px] font-semibold text-ink truncate tracking-tight"
                                    style={{ fontFamily: display }}
                                  >
                                    {event.title}
                                  </p>
                                  <p className="mt-1 text-[12px] text-ink-mute truncate">
                                    {event.role ? `${ARTIST_ROLE_FR[event.role] || event.role} · ` : ''}
                                    {event.location}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[13px] font-semibold text-accent tabular-nums flex-shrink-0">
                                {event.price === 0 ? 'Gratuit' : formatCurrency(event.price, event.currency)}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </FadeUp>

                <FadeUp delay={0.08}>
                  <section aria-labelledby="artist-faq">
                    <p className="eyebrow mb-3 tracking-[0.18em]">Billets</p>
                    <h2
                      id="artist-faq"
                      className="text-[22px] sm:text-[26px] font-semibold text-ink tracking-[-0.04em] leading-none mb-6"
                      style={{ fontFamily: display }}
                    >
                      Concert {artist.name} : questions fréquentes
                    </h2>
                    <dl className="space-y-5 border-t border-line pt-6">
                      {artistFaqItems({ name: artist.name, city: artist.city, nextShow }).map((item) => (
                        <div key={item.q}>
                          <dt className="text-[15px] font-semibold text-ink mb-1.5">{item.q}</dt>
                          <dd className="text-[14px] text-ink-mute leading-relaxed max-w-lg">{item.a}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </FadeUp>
              </div>

              <aside className="lg:col-span-4 space-y-10 lg:sticky lg:top-24 self-start lg:border-l lg:border-line lg:pl-10">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p
                      className="text-[40px] font-semibold text-ink tabular-nums leading-none tracking-tight"
                      style={{ fontFamily: display }}
                    >
                      {upcoming.length}
                    </p>
                    <p className="text-[11px] text-ink-mute mt-2 uppercase tracking-[0.16em]">À venir</p>
                  </div>
                  <div>
                    <p
                      className="text-[40px] font-semibold text-ink tabular-nums leading-none tracking-tight"
                      style={{ fontFamily: display }}
                    >
                      {past.length}
                    </p>
                    <p className="text-[11px] text-ink-mute mt-2 uppercase tracking-[0.16em]">Passés</p>
                  </div>
                </div>

                {nextShow && (
                  <Link to={eventPublicPath(nextShow)} className="block group">
                    <p className="eyebrow mb-3 tracking-[0.18em]">Prochain</p>
                    <div className="relative overflow-hidden rounded-xl2 bg-ink aspect-[4/5] max-h-[320px]">
                      {nextShow.image_url ? (
                        <img
                          src={nextShow.image_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-ink" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 to-transparent">
                        <p className="text-[15px] font-semibold text-white leading-snug tracking-tight" style={{ fontFamily: display }}>
                          {nextShow.title}
                        </p>
                        <p className="text-[12px] text-white/60 mt-1 capitalize">
                          {parseLocalDate(nextShow.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </p>
                        <p className="text-[13px] font-semibold text-accent mt-2 tabular-nums">
                          {nextShow.price === 0 ? 'Gratuit' : formatCurrency(nextShow.price, nextShow.currency)}
                        </p>
                      </div>
                    </div>
                  </Link>
                )}

                {peers.length > 0 && (
                  <div>
                    <p className="eyebrow mb-4 tracking-[0.18em]">À découvrir</p>
                    <Stagger className="divide-y divide-line border-t border-line">
                      {peers.map((p) => (
                        <StaggerItem key={p.id}>
                          <Link
                            to={`/artists/${p.slug}`}
                            className="flex items-center gap-3 py-3 group -mx-1 px-1 hover:bg-paper/80 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-paper flex-shrink-0">
                              {p.photo_url ? (
                                <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full grid place-items-center text-[13px] font-semibold text-ink">
                                  {p.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-ink truncate tracking-tight" style={{ fontFamily: display }}>
                                {p.name}
                              </p>
                              <p className="text-[11px] text-ink-mute truncate">{p.genre || p.city || 'Artiste'}</p>
                            </div>
                            {p.verified && <CheckCircle className="w-3.5 h-3.5 text-ink/40 flex-shrink-0" />}
                          </Link>
                        </StaggerItem>
                      ))}
                    </Stagger>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
