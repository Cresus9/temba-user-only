import { useMemo, useState } from 'react';
import { CaretRight, MagnifyingGlass, SlidersHorizontal, X } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import EventCard from '../EventCard';
import { Event } from '../../types/event';
import { calendarDayInZone } from '../../utils/formatters';
import { categoryLabelFr, eventPricePresentation } from '../../utils/labels';

export interface CatalogFilters {
  search: string;
  category: string;
  location: string;
  date: string;
  country: string;
}

interface Props {
  events: Event[];
  loading: boolean;
  filters: CatalogFilters;
  categories: { value: string; label: string }[];
  locations: string[];
  countries: { code: string; name: string }[];
  totalEvents: number | null;
  onChange: (patch: Partial<CatalogFilters>) => void;
  onClear: () => void;
}

const WHEN = [
  { id: '', label: 'Tout' },
  { id: 'today', label: "Aujourd'hui" },
  { id: 'weekend', label: 'Ce week-end' },
  { id: 'week', label: 'Cette semaine' },
  { id: 'month', label: 'Ce mois-ci' },
];

function dayKey(iso?: string | null) {
  return String(iso ?? '').split('T')[0];
}

function inWhen(iso: string | null | undefined, when: string, today: string) {
  if (!when) return true;
  const day = dayKey(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  if (when === 'today') return day === today;
  const [y, m, d] = day.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  const eventUtc = Date.UTC(y, m - 1, d);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const diff = (eventUtc - todayUtc) / 86400000;
  if (diff < 0) return false;
  if (when === 'week') return diff <= 7;
  if (when === 'month') return y === ty && m === tm;
  if (when === 'weekend') {
    const dow = new Date(eventUtc).getUTCDay();
    return diff <= 7 && (dow === 0 || dow === 6);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(when)) return day === when;
  return true;
}

function namesOf(event: Event) {
  const rels = (event.category_relations ?? []).map((c) => c?.name).filter(Boolean) as string[];
  return [...rels, ...(event.categories ?? [])];
}

export default function EventsCatalog({
  events,
  loading,
  filters,
  categories,
  locations,
  countries,
  totalEvents,
  onChange,
  onClear,
}: Props) {
  const [sort, setSort] = useState<'date' | 'price'>('date');
  const [freeOnly, setFreeOnly] = useState(false);
  const [sheet, setSheet] = useState(false);
  const today = calendarDayInZone();

  const cities = useMemo(() => {
    const fromEvents = events.map((e) => e.city).filter(Boolean) as string[];
    const source = fromEvents.length ? fromEvents : locations;
    return [...new Set(source)].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [events, locations]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return events.filter((event) => {
      if (filters.country && (event.country_code ?? 'BF') !== filters.country) return false;
      if (filters.location) {
        const blob = `${event.city ?? ''} ${event.location ?? ''}`.toLowerCase();
        if (!blob.includes(filters.location.toLowerCase())) return false;
      }
      if (filters.category && !namesOf(event).some((n) => n === filters.category || categoryLabelFr(n) === filters.category)) return false;
      if (filters.date && !event.is_permanent && !inWhen(event.date, filters.date, today)) return false;
      if (freeOnly && eventPricePresentation(event).tone !== 'free') return false;
      if (q) {
        const blob = `${event.title} ${event.location} ${event.city ?? ''} ${namesOf(event).join(' ')}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [events, filters, freeOnly, today]);

  const ordered = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (sort === 'price') {
        return (a.price ?? 0) - (b.price ?? 0);
      }
      return dayKey(a.date).localeCompare(dayKey(b.date));
    });
    return copy;
  }, [filtered, sort]);

  const chips = [
    filters.country && countries.find((c) => c.code === filters.country)?.name,
    filters.location,
    filters.category && categoryLabelFr(filters.category),
    filters.date && (WHEN.find((w) => w.id === filters.date)?.label || filters.date),
    freeOnly ? 'Gratuit' : '',
    filters.search ? `“${filters.search}”` : '',
  ].filter(Boolean) as string[];

  const sidebar = (
    <div>
      <FilterGroup title="Ville" options={cities.slice(0, 12).map((c) => ({ id: c, label: c }))} value={filters.location} onPick={(id) => onChange({ location: filters.location === id ? '' : id })} />
      <FilterGroup title="Catégorie" options={categories.map((c) => ({ id: c.value, label: c.label.replace(/\s*\(\d+\)\s*$/, '') }))} value={filters.category} onPick={(id) => onChange({ category: filters.category === id ? '' : id })} />
      {countries.length > 1 && (
        <FilterGroup title="Pays" options={countries.map((c) => ({ id: c.code, label: c.name }))} value={filters.country} onPick={(id) => onChange({ country: filters.country === id ? '' : id })} />
      )}
      <FilterGroup title="Prix" options={[{ id: 'free', label: 'Gratuit' }, { id: 'paid', label: 'Payant' }]} value={freeOnly ? 'free' : ''} onPick={(id) => setFreeOnly(id === 'free' ? !freeOnly : false)} />
      <button type="button" onClick={() => { setFreeOnly(false); onClear(); }} className="mt-3 text-[14px] font-semibold text-brand">Effacer les filtres</button>
    </div>
  );

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-[1200px] px-5 pb-16 pt-7 md:px-10">
        <nav className="flex items-center gap-2 text-[13px] font-medium text-ink-3">
          <Link to="/">Accueil</Link><CaretRight size={12} /><span className="text-ink">Événements</span>
        </nav>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-[36px] font-bold tracking-[-0.03em] md:text-[44px]">Événements</h1>
            <p className="mt-2 text-[16px] text-ink-3">{loading ? 'Chargement…' : `${totalEvents ?? ordered.length} événements · Burkina Faso et Côte d'Ivoire`}</p>
          </div>
          <label className="flex h-12 w-full items-center gap-2 rounded-[10px] border border-line px-3.5 text-ink-4 md:w-[400px]">
            <MagnifyingGlass size={20} />
            <input
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder="Rechercher un événement, un artiste, un lieu"
              className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {WHEN.map((item) => (
            <button key={item.id || 'all'} type="button" onClick={() => onChange({ date: filters.date === item.id ? '' : item.id })} className={`h-10 shrink-0 rounded-lg border px-3.5 text-[14px] font-medium ${filters.date === item.id ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => setFreeOnly((v) => !v)} className={`h-10 shrink-0 rounded-lg border px-3.5 text-[14px] font-medium ${freeOnly ? 'border-ink bg-ink text-white' : 'border-line'}`}>Gratuit</button>
          <span className="flex-1" />
          <label className="hidden h-10 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-[14px] md:inline-flex">
            Trier :
            <select value={sort} onChange={(e) => setSort(e.target.value as 'date' | 'price')} className="bg-transparent font-medium focus:outline-none">
              <option value="date">date</option>
              <option value="price">prix</option>
            </select>
          </label>
          <button type="button" onClick={() => setSheet(true)} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-[14px] font-medium md:hidden">
            <SlidersHorizontal size={18} /> Filtres
          </button>
        </div>

        <div className="mt-7 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">{sidebar}</aside>
          <div>
            {chips.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2 text-[14px]">
                <span className="text-ink-3">Filtres actifs :</span>
                {chips.map((chip) => (
                  <button key={chip} type="button" onClick={onClear} className="inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-[13px]">
                    {chip} <X size={14} />
                  </button>
                ))}
                <span className="ml-auto text-ink-3">{ordered.length} résultat{ordered.length > 1 ? 's' : ''}</span>
              </div>
            )}
            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/5] rounded-[10px] bg-surf" />
                    <div className="mt-3 h-3 w-2/3 rounded bg-surf" />
                    <div className="mt-2 h-4 w-full rounded bg-surf" />
                  </div>
                ))}
              </div>
            ) : ordered.length === 0 ? (
              <div className="border-y border-line py-16">
                <p className="font-display text-[22px] font-bold">Aucun événement</p>
                <p className="mt-2 text-[15px] text-ink-3">Aucun résultat pour ces filtres.</p>
                <button type="button" onClick={() => { setFreeOnly(false); onClear(); }} className="mt-4 text-[15px] font-semibold text-brand">Effacer les filtres</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
                {ordered.map((event) => <EventCard key={event.id} {...event} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Fermer" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white px-5 pb-8 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-[20px] font-bold">Filtres</p>
              <button type="button" onClick={() => setSheet(false)} aria-label="Fermer"><X size={22} /></button>
            </div>
            {sidebar}
            <button type="button" onClick={() => setSheet(false)} className="mt-6 h-12 w-full rounded-[10px] bg-ink text-[15px] font-semibold text-white">Voir {ordered.length} événements</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ title, options, value, onPick }: { title: string; options: { id: string; label: string }[]; value: string; onPick: (id: string) => void }) {
  if (!options.length) return null;
  return (
    <div className="border-t border-line py-4">
      <p className="mb-2 text-[14px] font-semibold">{title}</p>
      {options.map((option) => {
        const on = value === option.id;
        return (
          <button key={option.id} type="button" onClick={() => onPick(option.id)} className="flex h-9 w-full items-center gap-2.5 text-left text-[14.5px] text-ink-2">
            <span className={`grid h-[18px] w-[18px] place-items-center rounded border ${on ? 'border-brand bg-brand text-white' : 'border-ink-4'}`}>{on ? '✓' : ''}</span>
            <span className="flex-1 truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
