import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarBlank, MapPin, NavigationArrow, ShareNetwork } from '@phosphor-icons/react';
import PageSEO from '../../components/SEO/PageSEO';
import DisplayCard from '../../components/events/DisplayCard';
import { Crumbs, DirectoryPage, EmptyBlock, FaqList } from '../../components/directory/DirectoryUi';
import { getCatalog, isMainCity, type Catalog, type CatalogShow, type VenueGroup } from '../../services/laCatalog';
import { formatCalendarDate } from '../../utils/formatters';
import { whenLabel } from '../../utils/eventDisplay';
import { eventPricePresentation } from '../../utils/labels';
import { eventPublicPath } from '../../utils/eventPath';
import {
  venueCanonicalUrl,
  venueFaqItems,
  venueMetaDescription,
  venueSeoTitle,
  venueStructuredData,
} from '../../utils/venueSeo';

function mapsHref(name: string, city: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${city}`)}`;
}

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

function PastRow({ show }: { show: CatalogShow }) {
  const day = show.span.min || show.event.date;
  return (
    <Link to={eventPublicPath(show.event)} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 border-b border-line py-4">
      <span className="block h-[60px] w-12 overflow-hidden rounded-md bg-[#1B1D33]">
        {show.event.image_url ? <img src={show.event.image_url} alt="" className="h-full w-full object-cover grayscale" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] text-ink-3">{day ? `${formatCalendarDate(day, { weekday: 'short', day: 'numeric', month: 'short' })} ${day.slice(0, 4)}` : ''}</span>
        <span className="block truncate text-[16px] font-medium">{show.event.title}</span>
      </span>
      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Terminé</span>
    </Link>
  );
}

export default function VenueProfile() {
  const { slug = '' } = useParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => setFailed(true));
  }, [slug]);

  const venue = catalog?.venues.find((item) => item.slugs.includes(slug)) || null;
  const others = useMemo(() => {
    if (!catalog || !venue) return [];
    return catalog.venues
      .filter((item) => item.city === venue.city && item.key !== venue.key)
      .sort((a, b) => Number(b.upcoming.length > 0) - Number(a.upcoming.length > 0) || (a.upcoming[0]?.span.min || '9999').localeCompare(b.upcoming[0]?.span.min || '9999') || a.name.localeCompare(b.name, 'fr'));
  }, [catalog, venue]);

  if (!catalog && !failed) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border border-ink/20 border-t-ink" /></div>;
  }
  if (!venue) {
    return (
      <DirectoryPage>
        <PageSEO title="Lieu introuvable" description="Cette fiche lieu n’existe pas sur Temba." canonicalUrl="https://tembas.com/venues" robots="noindex, follow" />
        <div className="py-24 text-center">
          <h1 className="!text-[28px]">Lieu introuvable</h1>
          <Link to="/venues" className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand px-4 text-[15px] font-semibold text-white">Voir tous les lieux</Link>
        </div>
      </DirectoryPage>
    );
  }

  return <VenueBody venue={venue} others={others} />;
}

function VenueBody({ venue, others }: { venue: VenueGroup; others: VenueGroup[] }) {
  const next = venue.upcoming[0];
  const nextPrice = next ? eventPricePresentation(next.event) : null;
  const pageUrl = venueCanonicalUrl(venue.primarySlug);
  const directions = mapsHref(venue.name, venue.city);
  const count = venue.upcoming.length;
  const faq = venueFaqItems({
    name: venue.name,
    city: venue.city,
    address: venue.address,
    nextShow: next ? { id: next.event.id, title: next.event.title, date: next.span.min || next.event.date, slug: next.event.slug, is_permanent: next.permanent } : null,
  }).slice(0, 3);
  const structuredData = useMemo(
    () => venueStructuredData({
      name: venue.name,
      slug: venue.primarySlug,
      city: venue.city,
      address: venue.address,
      image: next?.event.image_url,
      nextShow: next ? { id: next.event.id, title: next.event.title, date: next.span.min || next.event.date, slug: next.event.slug, is_permanent: next.permanent } : null,
    }),
    [venue, next],
  );
  const agenda = isMainCity(venue.city) ? `/events?location=${encodeURIComponent(venue.city)}` : '/events';

  return (
    <DirectoryPage>
      <PageSEO
        title={venueSeoTitle(venue.name, venue.city)}
        description={venueMetaDescription({ name: venue.name, city: venue.city, nextShow: next ? { id: next.event.id, title: next.event.title, date: next.span.min, slug: next.event.slug, is_permanent: next.permanent } : null })}
        canonicalUrl={pageUrl}
        ogType="place"
        ogImage={next?.event.image_url}
        keywords={[venue.name, venue.city, 'billets Temba']}
        structuredData={structuredData}
      />
      <Link to="/venues" className="mt-4 inline-flex items-center gap-1 text-[16px] font-semibold md:hidden"><ArrowLeft size={20} /> Lieux</Link>
      <Crumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Lieux', to: '/venues' }, { label: venue.city, to: `/venues?ville=${encodeURIComponent(venue.city)}` }, { label: venue.name }]} />
      <section className="grid items-end gap-8 border-b border-line py-6 md:grid-cols-[minmax(0,1fr)_400px] md:gap-16 md:py-0 md:pb-12">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Lieu</p>
          <h1 className="!mt-2 !text-[40px] !font-semibold !leading-[48px] md:!text-[56px] md:!leading-[64px]">{venue.name}</h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[16px] font-medium text-ink-2">
            <span className="inline-flex items-center gap-2"><MapPin size={20} className="text-ink-3" />{venue.city}, {venue.country}</span>
            <span className="inline-flex items-center gap-2"><CalendarBlank size={20} className="text-ink-3" />{count ? `${count} date${count > 1 ? 's' : ''} à venir` : 'Pas de date à venir'}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 md:mt-8">
            <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-[15px] font-medium">
              <NavigationArrow size={18} /> Itinéraire
            </a>
            <button type="button" onClick={() => sharePage(venue.name, pageUrl)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-[15px] font-medium">
              <ShareNetwork size={18} /> Partager
            </button>
          </div>
        </div>
        {next ? (
          <aside className="rounded-2xl border border-line p-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Prochaine date</p>
            <Link to={eventPublicPath(next.event)} className="mt-4 flex gap-4">
              <span className="block h-[120px] w-24 shrink-0 overflow-hidden rounded-md bg-[#1B1D33]">
                {next.event.image_url ? <img src={next.event.image_url} alt="" className="h-full w-full object-cover" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-brand">{whenLabel(next.event, next.span)}</span>
                <span className="mt-1 block font-display text-[18px] font-semibold leading-6">{next.event.title}</span>
                <span className="mt-2 block text-[15px] font-semibold">{nextPrice?.label.replace(/\s·\svente pas encore ouverte$/i, '')}</span>
                {nextPrice && /vente pas encore ouverte/i.test(nextPrice.label) ? <span className="block text-[13px] font-medium text-ink-3">Vente pas encore ouverte</span> : null}
              </span>
            </Link>
            <Link to={eventPublicPath(next.event)} className="mt-6 flex h-12 items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-semibold text-white">
              Voir l’événement <ArrowRight size={18} />
            </Link>
          </aside>
        ) : null}
      </section>

      <div className="grid gap-12 pt-8 md:grid-cols-[minmax(0,1fr)_360px] md:gap-16 md:pt-12">
        <div>
          <div className="mb-6 flex items-baseline gap-4">
            <h2 className="!text-[24px] !font-semibold !leading-8 md:!text-[28px]">À venir ici</h2>
            {count ? <span className="text-[16px] text-ink-4">{count}</span> : null}
          </div>
          {count ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-8">
              {venue.upcoming.map((show) => (
                <DisplayCard key={show.event.id} event={show.event} span={show.span} variant="grid" />
              ))}
            </div>
          ) : (
            <EmptyBlock
              title="Pas de date à venir ici pour l’instant."
              text="Les nouvelles dates s’affichent dès qu’un organisateur les publie sur Temba."
              action={<Link to={agenda} className="inline-flex h-12 items-center gap-2 rounded-lg border border-line px-4 text-[15px] font-semibold">Voir l’agenda à {venue.city} <ArrowRight size={18} /></Link>}
            />
          )}
          {venue.past.length ? (
            <div className="mt-12 md:mt-16">
              <div className="mb-2 flex items-baseline gap-4">
                <h2 className="!text-[24px] !font-semibold !leading-8 md:!text-[28px]">Déjà passé ici</h2>
                <span className="text-[16px] text-ink-4">{venue.past.length}</span>
              </div>
              {venue.past.map((show) => <PastRow key={show.event.id} show={show} />)}
            </div>
          ) : null}
          <FaqList items={faq} />
        </div>
        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl border border-line p-6">
            <h3 className="!text-[20px] !font-semibold !leading-6">Infos pratiques</h3>
            <dl className="my-4">
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 py-2 text-[15px] leading-6">
                <dt className="text-ink-3">Ville</dt>
                <dd>{venue.city}, {venue.country}</dd>
              </div>
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 py-2 text-[15px] leading-6">
                <dt className="text-ink-3">Adresse</dt>
                <dd className={venue.address ? '' : 'text-ink-3'}>{venue.address || 'Pas encore renseignée'}</dd>
              </div>
            </dl>
            <a href={directions} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-lg border border-line text-[15px] font-medium">
              <NavigationArrow size={18} /> Itinéraire dans Maps <ArrowUpRight size={18} className="ml-auto" />
            </a>
            <p className="mt-2 text-[13px] leading-5 text-ink-3">La recherche Maps utilise le nom du lieu et la ville.</p>
          </div>
          {others.length ? (
            <div className="rounded-2xl border border-line p-6">
              <h3 className="!text-[20px] !font-semibold !leading-6">Autres lieux à {venue.city}</h3>
              <div className="mt-4">
                {others.slice(0, 6).map((item) => (
                  <Link key={item.key} to={`/venues/${item.primarySlug}`} className="block border-t border-line py-3">
                    <span className="block text-[15px] font-medium">{item.name}</span>
                    <small className="text-[13px] text-ink-3">{item.upcoming.length ? `${item.upcoming.length} date${item.upcoming.length > 1 ? 's' : ''} à venir` : 'Pas de date à venir'}</small>
                  </Link>
                ))}
              </div>
              {others.length > 6 ? (
                <Link to={`/venues?ville=${encodeURIComponent(isMainCity(venue.city) ? venue.city : 'other')}`} className="mt-2 inline-flex h-10 items-center gap-2 text-[15px] font-semibold text-brand">
                  Voir les {others.length} lieux à {venue.city} <ArrowRight size={18} />
                </Link>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </DirectoryPage>
  );
}
