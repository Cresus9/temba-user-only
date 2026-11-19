import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CaretDown, CaretRight } from '@phosphor-icons/react';
import PageSEO from '../../components/SEO/PageSEO';
import { CityTabs, DirectoryPage, SearchField } from '../../components/directory/DirectoryUi';
import { getCatalog, isMainCity, MAIN_CITIES, type Catalog, type VenueGroup } from '../../services/laCatalog';
import { formatCalendarDate } from '../../utils/formatters';
import { whenLabel } from '../../utils/eventDisplay';
import { venuesDirectoryStructuredData } from '../../utils/venueSeo';

function matches(venue: VenueGroup, query: string) {
  if (!query) return true;
  return venue.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'));
}

function inTab(venue: VenueGroup, tab: string) {
  if (tab === 'all') return true;
  if (tab === 'other') return !isMainCity(venue.city);
  return venue.city === tab;
}

function upcomingOrder(a: VenueGroup, b: VenueGroup) {
  const left = a.upcoming.find((show) => !show.permanent);
  const right = b.upcoming.find((show) => !show.permanent);
  if (Boolean(left) !== Boolean(right)) return left ? -1 : 1;
  return (left?.span.min || '9999').localeCompare(right?.span.min || '9999') || a.name.localeCompare(b.name, 'fr');
}

function lastText(venue: VenueGroup) {
  const count = venue.past.length;
  const day = venue.past[0]?.span.max;
  const when = day ? formatCalendarDate(day, { month: 'short', year: 'numeric' }) : '';
  return `${count} événement${count > 1 ? 's' : ''}${when ? ` · dernier en ${when}` : ''}`;
}

function Thumbs({ venue, limit }: { venue: VenueGroup; limit: number }) {
  return (
    <span className="flex justify-end gap-2">
      {venue.upcoming.slice(0, limit).map((show) => (
        <span key={show.event.id} className="block h-[50px] w-10 overflow-hidden rounded-md bg-[#1B1D33] md:h-[60px] md:w-12">
          {show.event.image_url ? <img src={show.event.image_url} alt="" className="h-full w-full object-cover" /> : null}
        </span>
      ))}
    </span>
  );
}

function VenueRow({ venue }: { venue: VenueGroup }) {
  const next = venue.upcoming[0];
  const count = `${venue.upcoming.length} date${venue.upcoming.length > 1 ? 's' : ''} à venir`;
  return (
    <Link to={`/venues/${venue.primarySlug}`} className="block border-b border-line py-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,360px)_168px_20px] md:items-center md:gap-8 md:py-6">
      <span className="flex items-center gap-4 md:contents">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[18px] font-semibold leading-6 md:text-[22px] md:leading-8">{venue.name}</span>
          <span className="mt-1 hidden text-[14px] font-medium text-ink-3 md:block">{count}</span>
          <span className="mt-1 block truncate text-[14px] text-ink-2 md:hidden">
            <span className="font-semibold text-brand">{whenLabel(next.event, next.span)}</span>
            {` · ${next.event.title}`}
          </span>
          <span className="mt-1 block text-[14px] font-medium text-ink-3 md:hidden">{count}</span>
        </span>
        <span className="md:hidden"><Thumbs venue={venue} limit={1} /></span>
      </span>
      <span className="hidden min-w-0 flex-col md:flex">
        <small className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-4">Prochaine date</small>
        <span className="text-[14px] font-semibold text-brand">{whenLabel(next.event, next.span)}</span>
        <span className="truncate text-[16px] font-medium">{next.event.title}</span>
      </span>
      <span className="hidden md:block"><Thumbs venue={venue} limit={3} /></span>
      <CaretRight size={20} className="hidden text-ink-4 md:block" />
    </Link>
  );
}

export default function VenuesDirectory() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [params, setParams] = useSearchParams();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const tab = params.get('ville') || 'all';

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => setFailed(true));
  }, []);

  const venues = catalog?.venues ?? [];
  const tabs = useMemo(() => {
    const list = [
      { id: 'all', label: 'Toutes les villes', count: venues.length },
      ...MAIN_CITIES.map((city) => ({ id: city, label: city, count: venues.filter((venue) => venue.city === city).length })),
      { id: 'other', label: 'Autres villes', count: venues.filter((venue) => !isMainCity(venue.city)).length },
    ];
    return list.filter((item) => item.id === 'all' || item.count > 0);
  }, [venues]);

  const visible = venues.filter((venue) => inTab(venue, tab) && matches(venue, search.trim()));
  const cities = tab === 'all'
    ? [...MAIN_CITIES, 'other']
    : [tab];
  const upcomingCount = visible.filter((venue) => venue.upcoming.length > 0).length;

  const schema = useMemo(
    () => venuesDirectoryStructuredData(venues.map((venue) => ({ name: venue.name, slug: venue.primarySlug }))),
    [venues],
  );

  return (
    <DirectoryPage>
      <PageSEO
        title="Lieux — salles et sites Temba"
        description="Les salles, scènes et terrains où se jouent les événements vendus sur Temba. Chaque fiche liste les prochaines dates du lieu."
        canonicalUrl="https://tembas.com/venues"
        keywords={['salles concert Burkina', 'lieux Ouagadougou', 'événements Temba', 'billets concert Burkina']}
        structuredData={schema}
      />
      <section className="flex flex-col py-8 md:flex-row md:items-end md:justify-between md:gap-12 md:py-16">
        <div>
          <h1 className="!text-[32px] !font-semibold !leading-10 md:!text-[48px] md:!leading-[56px]">Lieux</h1>
          <p className="mt-2 max-w-xl text-[16px] leading-6 text-ink-2 md:mt-4 md:text-[18px] md:leading-7">
            Les salles, scènes et terrains où se jouent les événements vendus sur Temba. Chaque fiche liste les prochaines dates du lieu.
          </p>
        </div>
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher un lieu" />
      </section>
      <CityTabs
        tabs={tabs}
        value={tabs.some((item) => item.id === tab) ? tab : 'all'}
        onChange={(id) => {
          const next = new URLSearchParams(params);
          if (id === 'all') next.delete('ville');
          else next.set('ville', id);
          setParams(next, { replace: true });
        }}
      />

      {!catalog && !failed ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border border-ink/20 border-t-ink" /></div>
      ) : failed ? (
        <p className="py-16 text-[16px] text-ink-3">Les lieux ne se sont pas chargés. Rechargez la page.</p>
      ) : (
        <>
          <section className="pt-12 md:pt-16">
            <div className="mb-2">
              <h2 className="!text-[24px] !font-semibold !leading-8 md:!text-[28px]">À l’affiche</h2>
              <p className="mt-2 text-[16px] leading-6 text-ink-3">{upcomingCount} lieu{upcomingCount > 1 ? 'x' : ''} {upcomingCount > 1 ? 'ont' : 'a'} au moins une date à venir. Triés par prochaine date.</p>
            </div>
            {cities.map((city) => {
              const rows = visible.filter((venue) => (city === 'other' ? !isMainCity(venue.city) : venue.city === city) && venue.upcoming.length > 0).sort(upcomingOrder);
              if (!rows.length) return null;
              const shown = rows;
              return (
                <div key={city}>
                  <div className="mt-8 flex items-baseline gap-4 border-b border-ink py-2">
                    <h3 className="!text-[20px] !font-semibold !leading-6">{city === 'other' ? 'Autres villes' : city}</h3>
                    <span className="text-[14px] font-medium text-ink-3">{rows.length} lieu{rows.length > 1 ? 'x' : ''} avec des dates à venir</span>
                  </div>
                  {shown.map((venue) => <VenueRow key={venue.key} venue={venue} />)}
                </div>
              );
            })}
          </section>

          <section className="pt-12 md:pt-16">
            <h2 className="!text-[24px] !font-semibold !leading-8 md:!text-[28px]">Déjà passés sur Temba</h2>
            <p className="mt-2 text-[16px] leading-6 text-ink-3">Pas de date à venir pour l’instant. Leur fiche garde les événements passés.</p>
            {cities.map((city) => {
              const rows = visible
                .filter((venue) => (city === 'other' ? !isMainCity(venue.city) : venue.city === city) && venue.upcoming.length === 0 && venue.past.length > 0)
                .sort((a, b) => b.past.length - a.past.length || a.name.localeCompare(b.name, 'fr'));
              if (!rows.length) return null;
              const label = city === 'other' ? 'Autres villes' : city;
              const shown = expanded[`past-${city}`] ? rows : rows.slice(0, 12);
              return (
                <div key={city}>
                  <div className="mt-8 flex items-baseline gap-4 border-b border-line py-2">
                    <h3 className="!text-[20px] !font-semibold !leading-6">{label}</h3>
                    <span className="text-[14px] font-medium text-ink-3">{rows.length}</span>
                  </div>
                  <div className="md:grid md:grid-cols-3 md:gap-x-8">
                    {shown.map((venue) => (
                      <Link key={venue.key} to={`/venues/${venue.primarySlug}`} className="flex flex-col border-b border-line py-4">
                        <span className="text-[16px] font-medium">{venue.name}</span>
                        <small className="text-[14px] text-ink-3">{city === 'other' && venue.city ? `${venue.city} · ` : ''}{lastText(venue)}</small>
                      </Link>
                    ))}
                  </div>
                  {shown.length < rows.length ? (
                    <button type="button" className="mt-2 flex h-12 w-full items-center justify-center gap-2 text-[15px] font-semibold text-brand" onClick={() => setExpanded((state) => ({ ...state, [`past-${city}`]: true }))}>
                      Voir les {rows.length} lieux <CaretDown size={18} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </section>
        </>
      )}
    </DirectoryPage>
  );
}
