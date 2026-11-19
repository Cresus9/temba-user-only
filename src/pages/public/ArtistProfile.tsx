import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Globe, MapPin, MusicNotes, ShareNetwork } from '@phosphor-icons/react';
import PageSEO from '../../components/SEO/PageSEO';
import BrandMark from '../../components/directory/BrandMark';
import { Crumbs, DirectoryPage, EmptyBlock, FaqList } from '../../components/directory/DirectoryUi';
import { getCatalog, type Catalog, type CatalogArtist, type CatalogShow } from '../../services/laCatalog';
import { formatCalendarDate } from '../../utils/formatters';
import { whenLabel } from '../../utils/eventDisplay';
import { eventPublicPath } from '../../utils/eventPath';
import { eventPricePresentation } from '../../utils/labels';
import { genreTokens, roleBadge } from '../../utils/artistDisplay';
import { artistSocialHref } from '../../utils/artistSeo';
import {
  artistCanonicalUrl,
  artistFaqItems,
  artistMetaDescription,
  artistSeoTitle,
  artistStructuredData,
} from '../../utils/artistSeo';

async function sharePage(title: string, url: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
  } catch {
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Lien copié');
  } catch {
    toast.error('Partage indisponible');
  }
}

function priceBits(show: CatalogShow) {
  const price = eventPricePresentation(show.event);
  return {
    main: price.label.replace(/\s·\svente pas encore ouverte$/i, ''),
    soon: /vente pas encore ouverte/i.test(price.label),
  };
}

function Socials({ artist }: { artist: CatalogArtist }) {
  const items = [
    artist.social.instagram ? { href: artistSocialHref('instagram', artist.social.instagram), label: 'Instagram', icon: <BrandMark brand="instagram" /> } : null,
    artist.social.facebook ? { href: artistSocialHref('facebook', artist.social.facebook), label: 'Facebook', icon: <BrandMark brand="facebook" /> } : null,
    artist.social.youtube ? { href: artistSocialHref('youtube', artist.social.youtube), label: 'YouTube', icon: <BrandMark brand="youtube" /> } : null,
    artist.social.website
      ? {
          href: artistSocialHref('website', artist.social.website),
          label: /soundcloud/i.test(artist.social.website) ? 'SoundCloud' : 'Site officiel',
          icon: /soundcloud/i.test(artist.social.website) ? <BrandMark brand="soundcloud" /> : <Globe size={18} />,
        }
      : null,
  ].filter(Boolean) as { href: string; label: string; icon: JSX.Element }[];
  return (
    <>
      {items.map((item) => (
        <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-[15px] font-medium">
          {item.icon} {item.label}
        </a>
      ))}
    </>
  );
}

function PastRow({ show }: { show: CatalogShow }) {
  const day = show.span.min || show.event.date;
  const role = roleBadge(show.role);
  return (
    <Link to={eventPublicPath(show.event)} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 border-b border-line py-4 md:grid-cols-[48px_minmax(0,1fr)_auto_auto]">
      <span className="block h-[60px] w-12 overflow-hidden rounded-md bg-[#1B1D33]">
        {show.event.image_url ? <img src={show.event.image_url} alt="" className="h-full w-full object-cover grayscale" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] text-ink-3">{day ? `${formatCalendarDate(day, { weekday: 'short', day: 'numeric', month: 'short' })} ${day.slice(0, 4)}` : ''}</span>
        <span className="block truncate text-[16px] font-medium">{show.event.title}</span>
        <span className="block truncate text-[14px] text-ink-3">{show.venueName}{show.city ? ` · ${show.city}` : ''}</span>
      </span>
      {role ? <span className="hidden h-6 items-center rounded-md bg-surf px-2 text-[12px] font-semibold text-ink-2 md:inline-flex">{role}</span> : <span className="hidden md:block" />}
      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Terminé</span>
    </Link>
  );
}

export default function ArtistProfile() {
  const { slug = '' } = useParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => setFailed(true));
  }, [slug]);

  const artist = catalog?.artists.find((item) => item.slug === slug) || null;
  const peers = useMemo(() => {
    if (!catalog || !artist) return [];
    const tokens = new Set(genreTokens(artist.genre));
    return catalog.artists
      .filter((item) => item.id !== artist.id && item.photo)
      .map((item) => ({ item, score: genreTokens(item.genre).filter((token) => tokens.has(token)).length }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'fr'))
      .slice(0, 6)
      .map((row) => row.item);
  }, [catalog, artist]);

  if (!catalog && !failed) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border border-ink/20 border-t-ink" /></div>;
  }
  if (!artist) {
    return (
      <DirectoryPage>
        <PageSEO title="Artiste introuvable" description="Cette fiche artiste n’existe pas sur Temba." canonicalUrl="https://tembas.com/artists" robots="noindex, follow" />
        <div className="py-24 text-center">
          <h1 className="!text-[28px]">Artiste introuvable</h1>
          <Link to="/artists" className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand px-4 text-[15px] font-semibold text-white">Voir tous les artistes</Link>
        </div>
      </DirectoryPage>
    );
  }

  const next = artist.upcoming[0];
  const pageUrl = artistCanonicalUrl(artist.slug);
  const price = next ? priceBits(next) : null;
  const role = roleBadge(next?.role);
  const place = artist.city || 'Ouagadougou';
  const faq = artistFaqItems({
    name: artist.name,
    city: artist.city,
    nextShow: next ? { id: next.event.id, title: next.event.title, date: next.span.min || next.event.date, location: `${next.venueName}${next.city ? `, ${next.city}` : ''}`, slug: next.event.slug } : null,
  });
  const styleLabel = artist.genre.split('/')[0]?.trim() || 'Sur Temba';

  return (
    <DirectoryPage>
      <PageSEO
        title={artistSeoTitle(artist.name, { city: artist.city, nextLocation: next?.venueName })}
        description={artistMetaDescription({ name: artist.name, bio: artist.bio, genre: artist.genre, city: artist.city, nextShow: next ? { id: next.event.id, title: next.event.title, date: next.span.min || next.event.date, location: next.venueName, slug: next.event.slug } : null })}
        canonicalUrl={pageUrl}
        ogImage={artist.photo || undefined}
        keywords={[artist.name, artist.genre, artist.city, 'billets Temba'].filter(Boolean) as string[]}
        structuredData={artistStructuredData({
          name: artist.name,
          slug: artist.slug,
          bio: artist.bio,
          genre: artist.genre,
          city: artist.city,
          countryCode: artist.countryCode,
          image: artist.photo,
          social: artist.social,
          shows: artist.upcoming.map((show) => ({ id: show.event.id, title: show.event.title, date: show.span.min || show.event.date, location: show.venueName, slug: show.event.slug })),
        })}
      />
      <Link to="/artists" className="mt-4 inline-flex items-center gap-1 text-[16px] font-semibold md:hidden"><ArrowLeft size={20} /> Artistes</Link>
      <Crumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Artistes', to: '/artists' }, { label: artist.name }]} />
      <section className={`grid items-center gap-8 border-b border-line py-6 md:gap-16 md:py-8 md:pb-16 ${artist.photo ? 'md:grid-cols-[400px_minmax(0,1fr)]' : 'md:grid-cols-1'}`}>
        {artist.photo ? (
          <span className="block aspect-square overflow-hidden rounded-lg bg-surf">
            <img src={artist.photo} alt={artist.name} className="h-full w-full object-cover object-[50%_25%]" />
          </span>
        ) : null}
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Artiste</p>
          <h1 className="!mt-2 !text-[40px] !font-semibold !leading-[48px] md:!text-[56px] md:!leading-[64px]">{artist.name}</h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[16px] font-medium text-ink-2">
            {artist.genre ? <span className="inline-flex items-center gap-2"><MusicNotes size={20} className="text-ink-3" />{artist.genre}</span> : null}
            {artist.city ? <span className="inline-flex items-center gap-2"><MapPin size={20} className="text-ink-3" />{artist.city}, {artist.countryCode === 'CI' ? 'Côte d’Ivoire' : artist.countryCode === 'SN' ? 'Sénégal' : 'Burkina Faso'}</span> : null}
          </div>
          {artist.bio ? <p className="mt-6 max-w-xl text-[16px] leading-6 text-ink-2 md:text-[18px] md:leading-7">{artist.bio}</p> : null}
          <div className="mt-6 flex flex-wrap gap-2 md:mt-8">
            <Socials artist={artist} />
            <button type="button" onClick={() => sharePage(artist.name, pageUrl)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-[15px] font-medium">
              <ShareNetwork size={18} /> Partager
            </button>
          </div>
        </div>
      </section>

      <section className="pt-12 md:pt-16">
        <h2 className="!mb-6 !text-[24px] !font-semibold !leading-8 md:!text-[28px]">Prochaine date</h2>
        {next ? (
          <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-line p-4 md:grid-cols-[160px_minmax(0,1fr)_auto] md:gap-8 md:p-6">
            <span className="block h-[120px] w-24 overflow-hidden rounded-md bg-[#1B1D33] md:h-[200px] md:w-40">
              {next.event.image_url ? <img src={next.event.image_url} alt="" className="h-full w-full object-cover" /> : null}
            </span>
            <div className="min-w-0">
              {role ? <span className="inline-flex h-6 items-center rounded-md bg-surf px-2 text-[12px] font-semibold text-ink-2">{role}</span> : null}
              <div className="mt-2 text-[14px] font-semibold text-brand md:mt-4 md:text-[16px]">{whenLabel(next.event, next.span)}</div>
              <div className="mt-1 font-display text-[20px] font-semibold leading-6 md:text-[28px] md:leading-8">{next.event.title}</div>
              <div className="mt-2 flex items-center gap-2 text-[15px] text-ink-2"><MapPin size={18} className="text-ink-3" />{next.venueName}{next.city ? ` · ${next.city}` : ''}</div>
              <div className="mt-2 text-[15px] font-semibold">{price?.main}</div>
              {price?.soon ? <div className="text-[13px] font-medium text-ink-3">Vente pas encore ouverte</div> : null}
            </div>
            <Link to={eventPublicPath(next.event)} className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[15px] font-semibold text-white md:col-span-1">
              Voir l’événement <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <EmptyBlock
            title="Pas de date à venir sur Temba pour l’instant."
            text="Sa prochaine date s’affichera ici dès qu’un organisateur la publie."
            action={<Link to="/events" className="inline-flex h-12 items-center gap-2 rounded-lg border border-line px-4 text-[15px] font-semibold">Voir l’agenda à {place} <ArrowRight size={18} /></Link>}
          />
        )}
      </section>

      {artist.past.length ? (
        <section className="pt-12 md:pt-16">
          <div className="mb-2 flex items-baseline gap-4">
            <h2 className="!text-[24px] !font-semibold !leading-8 md:!text-[28px]">Déjà passé sur Temba</h2>
            <span className="text-[16px] text-ink-4">{artist.past.length}</span>
          </div>
          {artist.past.map((show) => <PastRow key={`${show.event.id}-${show.role || ''}`} show={show} />)}
        </section>
      ) : null}

      {peers.length ? (
        <section className="pt-12 md:pt-16">
          <h2 className="!text-[24px] !font-semibold !leading-8 md:!text-[28px]">Dans le même style</h2>
          <p className="mt-2 text-[16px] text-ink-3">{styleLabel}, sur Temba.</p>
          <div className="mt-6 flex gap-4 overflow-x-auto md:grid md:grid-cols-6 md:gap-6 md:overflow-visible">
            {peers.map((peer) => (
              <Link key={peer.id} to={`/artists/${peer.slug}`} className="w-36 shrink-0 md:w-auto">
                <span className="block aspect-square overflow-hidden rounded-lg bg-surf">
                  <img src={peer.photo} alt={peer.name} className="h-full w-full object-cover object-[50%_25%]" />
                </span>
                <span className="mt-4 block font-display text-[17px] font-semibold leading-6">{peer.name}</span>
                <span className="block text-[14px] text-ink-3">{[peer.genre, peer.city].filter(Boolean).join(' · ')}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <FaqList items={faq} />
    </DirectoryPage>
  );
}
