import React, { useState, useEffect } from 'react';
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
import { FadeUp, Stagger, StaggerItem } from '../../components/common/Motion';

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

function socialHref(kind: 'instagram' | 'facebook' | 'youtube' | 'twitter' | 'website', raw: string) {
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '').replace(/^\//, '');
  if (kind === 'instagram') return `https://instagram.com/${handle}`;
  if (kind === 'facebook') return `https://facebook.com/${handle}`;
  if (kind === 'twitter') return `https://twitter.com/${handle}`;
  if (kind === 'youtube') return `https://youtube.com/${handle.includes('/') ? handle : `@${handle}`}`;
  return v.startsWith('http') ? v : `https://${v}`;
}

function todayLocal() {
  const [y, m, d] = localTodayYmd().split('-').map(Number);
  return new Date(y, m - 1, d);
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
          .select('role, events(id, slug, title, date, location, image_url, price, currency, status)')
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
        .filter((row: { events?: ShowCard & { status?: string } }) => row.events?.status === 'PUBLISHED')
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
      social.instagram && { kind: 'instagram' as const, label: 'Instagram', href: socialHref('instagram', social.instagram), Icon: Instagram },
      social.facebook && { kind: 'facebook' as const, label: 'Facebook', href: socialHref('facebook', social.facebook), Icon: Facebook },
      social.youtube && { kind: 'youtube' as const, label: 'YouTube', href: socialHref('youtube', social.youtube), Icon: Youtube },
      social.twitter && { kind: 'twitter' as const, label: 'X', href: socialHref('twitter', social.twitter), Icon: Twitter },
      social.website && { kind: 'website' as const, label: 'Site', href: socialHref('website', social.website), Icon: Globe },
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
  const heroSrc = artist.cover_image_url || artist.photo_url;
  const pageUrl = `https://tembas.com/artists/${artist.slug}`;
  const place = [artist.city, artist.country_code ? countryFlag(artist.country_code) : null].filter(Boolean).join(' ');

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
        title={`${artist.name} — billets`}
        description={
          artist.bio ||
          `Dates de ${artist.name}${artist.genre ? ` (${artist.genre})` : ''}${artist.city ? ` à ${artist.city}` : ''} — billets sur Temba.`
        }
        canonicalUrl={pageUrl}
        ogType="profile"
        ogImage={heroSrc || undefined}
        keywords={[artist.name, artist.genre, artist.city, 'concert Burkina', 'billets Temba'].filter(Boolean) as string[]}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'MusicGroup',
          name: artist.name,
          url: pageUrl,
          image: heroSrc || undefined,
          description: artist.bio || undefined,
          genre: artist.genre || undefined,
          address: artist.city
            ? { '@type': 'PostalAddress', addressLocality: artist.city, addressCountry: artist.country_code || 'BF' }
            : undefined,
        }}
      />

      <div className="min-h-screen bg-cream bg-grain">
        <section className="relative bg-ink overflow-hidden">
          {heroSrc ? (
            <img src={heroSrc} alt="" className="absolute inset-0 w-full h-full object-cover scale-[1.04]" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand/40 via-ink to-accent/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/20" />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 top-10 w-72 h-72 rounded-full bg-accent/25 blur-3xl"
          />

          <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-4 pb-7 md:pt-6 md:pb-12 min-h-[320px] md:min-h-[480px] flex flex-col">
            <Link
              to="/artists"
              className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 bg-paper/12 backdrop-blur-sm text-paper rounded-lg text-[12px] font-medium hover:bg-paper/20 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Artistes
            </Link>

            <div className="mt-auto flex flex-col md:flex-row md:items-end gap-5 md:gap-8">
              <div className="w-28 h-36 sm:w-36 sm:h-44 rounded-xl2 overflow-hidden border border-paper/20 shadow-pop flex-shrink-0 bg-ink">
                {artist.photo_url ? (
                  <img src={artist.photo_url} alt={artist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-accent/20">
                    <span className="text-[40px] font-extrabold text-paper" style={{ fontFamily: display }}>
                      {artist.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="eyebrow !text-paper/55 mb-2">
                  {artist.genre || 'Artiste'}
                  {artist.verified ? ' · Vérifié' : ''}
                </p>
                <div className="flex items-start gap-2.5 mb-3">
                  <h1
                    className="text-[clamp(32px,6vw,64px)] font-extrabold text-paper leading-[0.95] tracking-tight"
                    style={{ fontFamily: display }}
                  >
                    {artist.name}
                  </h1>
                  {artist.verified && <CheckCircle className="w-6 h-6 text-accent flex-shrink-0 mt-2" />}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-paper/75 mb-5">
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
        </section>

        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 md:py-12">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-8 space-y-8">
              <FadeUp>
                <section className="bg-paper border border-line rounded-xl2 shadow-card p-5 sm:p-7">
                  <p className="eyebrow mb-3">À propos</p>
                  {artist.bio ? (
                    <p className="text-[15px] text-ink/85 leading-relaxed">{artist.bio}</p>
                  ) : (
                    <p className="text-[14px] text-ink-mute">
                      Fiche {artist.name} sur Temba. Les dates publiées par les organisateurs apparaissent ici.
                    </p>
                  )}
                  {socials.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-line">
                      {socials.map(({ kind, label, href, Icon }) => (
                        <a
                          key={kind}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-line rounded-lg text-[12px] font-medium text-ink hover:border-brand/40 hover:text-brand transition-colors"
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
                  <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                    <div>
                      <p className="eyebrow mb-1">Sur Temba</p>
                      <h2 className="text-[22px] font-extrabold text-ink" style={{ fontFamily: display }}>
                        Concerts
                      </h2>
                    </div>
                    {events.length > 0 && (
                      <div className="flex gap-1 p-1 bg-paper border border-line rounded-xl">
                        {(['upcoming', 'past'] as Tab[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                              tab === t ? 'bg-brand text-paper shadow-sm' : 'text-ink-mute hover:text-ink'
                            }`}
                          >
                            {t === 'upcoming' ? `À venir (${upcoming.length})` : `Passés (${past.length})`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {events.length === 0 ? (
                    <div className="relative overflow-hidden rounded-xl2 border border-line bg-paper shadow-card p-6 sm:p-8">
                      <div className="pointer-events-none absolute -right-8 -top-10 w-40 h-40 rounded-full bg-accent/10 blur-2xl" />
                      <p className="text-[16px] font-extrabold text-ink mb-1.5" style={{ fontFamily: display }}>
                        Pas encore de date sur Temba
                      </p>
                      <p className="text-[14px] text-ink-mute leading-relaxed max-w-lg mb-5">
                        Dès qu’un organisateur programme {artist.name}, les billets s’achètent ici — Orange Money, Moov, carte.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to="/events"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-paper text-[13px] font-bold hover:bg-brand/90"
                        >
                          Explorer l’agenda
                        </Link>
                        <Link
                          to="/artists"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line text-[13px] font-semibold text-ink hover:border-brand/40"
                        >
                          Autres artistes
                        </Link>
                      </div>
                    </div>
                  ) : shown.length === 0 ? (
                    <div className="rounded-xl2 border border-line bg-paper p-8 text-center">
                      <Calendar className="w-7 h-7 text-ink-mute mx-auto mb-2" />
                      <p className="text-[14px] font-bold text-ink">
                        {tab === 'upcoming' ? 'Aucune date à venir' : 'Aucun concert passé'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shown.map((event) => {
                        const dt = parseLocalDate(event.date);
                        const d = dt.getDate();
                        return (
                          <Link
                            key={event.id}
                            to={eventPublicPath(event)}
                            className="group flex gap-4 p-4 bg-paper border border-line rounded-xl2 hover:border-brand/40 hover:shadow-card transition-all"
                          >
                            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-cream border border-line flex flex-col items-center justify-center text-center">
                              <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
                                {dt.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                              </span>
                              <span className="text-[22px] font-extrabold text-ink leading-tight" style={{ fontFamily: display }}>
                                {String(d).padStart(2, '0')}
                              </span>
                            </div>
                            {event.image_url && (
                              <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden hidden xs:block sm:block">
                                <img
                                  src={event.image_url}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-bold text-ink truncate group-hover:text-brand transition-colors" style={{ fontFamily: display }}>
                                {event.title}
                              </p>
                              {event.role && (
                                <span className="inline-block mt-0.5 text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                                  {event.role}
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 mt-1">
                                <MapPin className="w-3 h-3 text-ink-mute flex-shrink-0" />
                                <span className="text-[12px] text-ink-mute truncate">{event.location}</span>
                              </div>
                            </div>
                            <span className="text-[12px] font-bold text-brand flex-shrink-0 self-center">
                              {event.price === 0 ? 'Gratuit' : formatCurrency(event.price, event.currency)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              </FadeUp>
            </div>

            <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24 self-start">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-paper border border-line rounded-xl2 p-4">
                  <p className="text-[26px] font-extrabold text-ink tabular-nums leading-none" style={{ fontFamily: display }}>
                    {upcoming.length}
                  </p>
                  <p className="text-[11px] text-ink-mute mt-1.5">Dates à venir</p>
                </div>
                <div className="bg-paper border border-line rounded-xl2 p-4">
                  <p className="text-[26px] font-extrabold text-ink tabular-nums leading-none" style={{ fontFamily: display }}>
                    {past.length}
                  </p>
                  <p className="text-[11px] text-ink-mute mt-1.5">Passés</p>
                </div>
              </div>

              {nextShow && (
                <Link
                  to={eventPublicPath(nextShow)}
                  className="block group bg-paper border border-line rounded-xl2 overflow-hidden hover:border-brand/40 shadow-card"
                >
                  <div className="aspect-[16/9] bg-ink relative">
                    {nextShow.image_url ? (
                      <img src={nextShow.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand/30 to-ink" />
                    )}
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-accent text-ink text-[10px] font-extrabold uppercase tracking-wide">
                      Prochain
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[14px] font-bold text-ink leading-snug" style={{ fontFamily: display }}>
                      {nextShow.title}
                    </p>
                    <p className="text-[12px] text-ink-mute mt-1">
                      {parseLocalDate(nextShow.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-[13px] font-bold text-brand mt-2">
                      {nextShow.price === 0 ? 'Gratuit' : formatCurrency(nextShow.price, nextShow.currency)}
                    </p>
                  </div>
                </Link>
              )}

              {peers.length > 0 && (
                <div className="bg-paper border border-line rounded-xl2 p-4">
                  <p className="eyebrow mb-3">À découvrir</p>
                  <Stagger className="space-y-1">
                    {peers.map((p) => (
                      <StaggerItem key={p.id}>
                        <Link
                          to={`/artists/${p.slug}`}
                          className="flex items-center gap-3 rounded-xl p-2 -mx-1 hover:bg-cream transition-colors"
                        >
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-cream flex-shrink-0">
                            {p.photo_url ? (
                              <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full grid place-items-center text-[13px] font-extrabold text-accent">
                                {p.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-ink truncate" style={{ fontFamily: display }}>
                              {p.name}
                            </p>
                            <p className="text-[11px] text-ink-mute truncate">{p.genre || p.city || 'Artiste'}</p>
                          </div>
                          {p.verified && <CheckCircle className="w-3.5 h-3.5 text-brand flex-shrink-0" />}
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
    </>
  );
}
