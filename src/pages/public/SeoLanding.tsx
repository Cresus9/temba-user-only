import { Link, useLocation } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';
import { useEvents } from '../../context/EventContext';
import EventsBoard, { type EventsBoardPreset } from '../../components/events/EventsBoard';
import PageSEO from '../../components/SEO/PageSEO';
import NotFound from '../NotFound';
import { LANDING_PAGES, landingByPath } from '../../../netlify/edge-functions/lib/landingPages';

/** "Que faire ce week-end", "Concerts à Ouagadougou"… Same text and filters as the crawler HTML (og-tags). */
export default function SeoLanding() {
  const { pathname } = useLocation();
  const page = landingByPath(pathname);
  const { events, loading } = useEvents();
  if (!page) return <NotFound />;

  const url = `https://tembas.com${page.path}`;
  const preset: EventsBoardPreset = {
    location: page.city,
    date: page.weekend ? 'weekend' : undefined,
    category: page.concertsOnly ? 'concerts' : undefined,
  };
  const citySlug = page.city ? page.path.split('/')[1] : null;
  const related = [
    ...LANDING_PAGES.filter((other) => other.path !== page.path).map((other) => ({ to: other.path, label: other.label })),
    ...(citySlug && page.city ? [{ to: `/${citySlug}`, label: `Sortir à ${page.city}` }] : []),
    { to: '/venues', label: 'Les lieux' },
  ];

  return (
    <div className="bg-white">
      <PageSEO
        title={page.title}
        description={page.description}
        canonicalUrl={url}
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: page.h1,
            url,
            description: page.description,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://tembas.com/' },
              { '@type': 'ListItem', position: 2, name: 'Événements', item: 'https://tembas.com/events' },
              { '@type': 'ListItem', position: 3, name: page.label, item: url },
            ],
          },
        ]}
      />
      <section className="mx-auto max-w-[1440px] px-5 pt-6 md:px-16 md:pt-10 xl:px-20">
        <nav aria-label="Fil d’Ariane" className="flex flex-wrap items-center gap-1 text-[13px] text-ink-3">
          <Link to="/" className="hover:text-ink">Accueil</Link>
          <CaretRight size={12} aria-hidden />
          <Link to="/events" className="hover:text-ink">Événements</Link>
          <CaretRight size={12} aria-hidden />
          <span className="text-ink">{page.label}</span>
        </nav>
        <h1 className="mt-4 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.03em] text-ink md:text-[44px]">{page.h1}</h1>
        <p className="mt-3 max-w-[640px] text-[16px] leading-[1.5] text-ink-2">{page.intro}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {related.map((link) => (
            <Link key={link.to} to={link.to} className="inline-flex h-9 items-center rounded-full border border-line px-3 text-[13.5px] font-semibold text-ink hover:border-brand hover:text-brand">
              {link.label}
            </Link>
          ))}
        </div>
      </section>
      <EventsBoard key={page.path} events={events} loading={loading} preset={preset} hideHero />
    </div>
  );
}
