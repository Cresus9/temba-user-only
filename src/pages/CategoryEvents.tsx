import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EventCard from '../components/EventCard';
import { CardSkeleton } from '../components/events/FlyerFrame';
import DomePattern from '../components/design/DomePattern';
import { categoryLabelFr } from '../utils/labels';
import { calendarDayInZone, formatCalendarDate, parseLocalDate } from '../utils/formatters';
import { supabase } from '../lib/supabase-client';
import { CategoryService } from '../services/categoryService';
import { Event, EventCategory } from '../types/event';
import toast from 'react-hot-toast';
import { isPastSpan, spanFor, ymd } from '../utils/eventDisplay';
import PageSEO from '../components/SEO/PageSEO';
import { CITY_LANDINGS } from '../data/cityLandings';
import {
  categoryLandingFromParam,
  categoryLandingFromRecord,
  categoryPublicSlug,
} from '../data/categoryLandings';

function dateSortValue(event: Event): number {
  const d = String(event.date ?? '').split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return event.is_permanent ? Number.MAX_SAFE_INTEGER : 0;
  }
  return parseLocalDate(d).getTime();
}

export default function CategoryEvents() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy] = useState('date');

  useEffect(() => {
    if (categoryId) {
      fetchCategoryAndEvents();
    }
  }, [categoryId, sortBy]);

  const fetchCategoryAndEvents = async () => {
    try {
      setLoading(true);

      let resolvedCategoryId: string | null = null;
      let categoryData: EventCategory | null = null;

      if (categoryId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(categoryId)) {
          categoryData = await CategoryService.fetchCategoryById(categoryId);
        } else {
          categoryData = await CategoryService.fetchCategoryBySlug(categoryId);
        }
        setCategory(categoryData);
        resolvedCategoryId = categoryData?.id ?? null;
        if (categoryData && categoryId) {
          const canonical = categoryPublicSlug(categoryData);
          if (canonical && canonical !== categoryId) {
            navigate(`/categories/${canonical}`, { replace: true });
          }
        }
      }

      if (resolvedCategoryId) {
        const eventsData = await CategoryService.fetchEventsByCategory(resolvedCategoryId);
        const today = calendarDayInZone();
        const ids = eventsData.map((event) => event.id).filter(Boolean);
        const lastById = new Map<string, string>();
        for (let i = 0; i < ids.length; i += 80) {
          const chunk = ids.slice(i, i + 80);
          const { data } = await supabase.from('event_dates').select('event_id, date').in('event_id', chunk);
          for (const row of data || []) {
            const day = ymd((row as { date?: string }).date);
            const id = (row as { event_id: string }).event_id;
            if (!day) continue;
            const prev = lastById.get(id);
            if (!prev || day > prev) lastById.set(id, day);
          }
        }
        setEvents(eventsData.filter((event) => {
          if (event.is_permanent) return true;
          const span = spanFor(event, lastById.get(event.id) ? { dates: [lastById.get(event.id) as string], min: '', max: '' } : null);
          return !isPastSpan(span, today);
        }));
      }
    } catch (error) {
      console.error('Error fetching category and events:', error);
      toast.error('Impossible de charger les événements');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) =>
    searchQuery
      ? event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'popularity':
        return (b.tickets_sold || 0) - (a.tickets_sold || 0);
      case 'date':
      default:
        return dateSortValue(a) - dateSortValue(b);
    }
  });

  const landing =
    categoryLandingFromRecord(category || {}) || categoryLandingFromParam(categoryId);
  const name = landing?.name || category?.name || 'cette catégorie';
  const seoPath = landing?.slug || (category ? categoryPublicSlug(category) : categoryId);
  const intro =
    landing?.description ||
    category?.description?.trim() ||
    `Billets ${name} sur Temba — concerts, festivals et sorties en FCFA. Paiement Orange Money, Moov ou carte, QR à l’entrée.`;

  const title = categoryLabelFr(name);
  const months = new Map<string, Event[]>();
  sortedEvents.forEach((event) => {
    const key = String(event.date || '').split('T')[0].slice(0, 7) || 'sans-date';
    const list = months.get(key) ?? [];
    list.push(event);
    months.set(key, list);
  });

  if (!category && !loading) {
    return (
      <div className="bg-white px-5 py-20 text-center">
        <h1 className="font-display text-[32px] font-bold">Catégorie introuvable</h1>
        <p className="mt-2 text-[15px] text-ink-2">Cette catégorie n’est pas en ligne.</p>
        <Link to="/categories" className="mt-5 inline-flex h-11 items-center rounded-[10px] bg-brand px-4 font-semibold text-white">Toutes les catégories</Link>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {category && (
        <PageSEO
          title={`${title} — billets Temba`}
          description={intro.slice(0, 220)}
          canonicalUrl={`https://tembas.com/categories/${seoPath}`}
          keywords={[title, 'billets', 'Temba', 'FCFA', 'Ouagadougou']}
        />
      )}
      <header className="relative overflow-hidden bg-brand text-white">
        <DomePattern variant="band" className="opacity-80" />
        <div className="relative mx-auto max-w-[1440px] px-5 py-8 md:px-16 md:py-12 xl:px-20">
          <Link to="/categories" className="inline-flex items-center gap-1 text-[13px] text-white/80"><ArrowLeft className="h-3.5 w-3.5" /> Catégories</Link>
          <h1 className="mt-3 font-display text-[34px] font-bold leading-none tracking-[-0.04em] md:text-[56px]">{title}</h1>
          <p className="mt-3 max-w-2xl text-[15px] text-white/85 md:text-[17px]">{loading ? 'Chargement des dates…' : `${sortedEvents.length} événement${sortedEvents.length > 1 ? 's' : ''} à venir.`}</p>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-5 py-4 md:px-16 xl:px-20">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Rechercher dans cette catégorie"
          className="h-10 min-w-[200px] flex-1 rounded-full border border-line px-4 text-[14px] focus:outline-none"
        />
      </div>
      <div className="mx-auto max-w-[1440px] px-5 pb-16 md:px-16 xl:px-20">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, index) => <CardSkeleton key={index} />)}
          </div>
        ) : sortedEvents.length > 0 ? (
          [...months.entries()].map(([key, list]) => (
            <section key={key} className="pt-6">
              <h2 className="font-display text-[26px] font-bold capitalize">
                {key === 'sans-date' ? 'Date à confirmer' : formatCalendarDate(`${key}-01`, { month: 'long', year: 'numeric' })}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {list.map((event) => <EventCard key={event.id} {...event} />)}
              </div>
            </section>
          ))
        ) : (
          <div className="py-16">
            <h2 className="font-display text-[28px] font-bold">{searchQuery ? 'Aucun résultat' : 'Aucun événement ici pour l’instant'}</h2>
            <p className="mt-2 max-w-lg text-[15px] text-ink-2">
              {searchQuery ? `Aucun titre ne contient « ${searchQuery} ». Effacez la recherche pour revoir ${title}.` : `Pas de date ${title} en ligne aujourd’hui.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {searchQuery ? (
                <button type="button" onClick={() => setSearchQuery('')} className="h-10 rounded-full bg-ink px-4 text-[14px] font-semibold text-white">Effacer la recherche</button>
              ) : (
                <Link to="/events" className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-[14px] font-semibold text-white">Tout l’agenda</Link>
              )}
              {CITY_LANDINGS.map((city) => (
                <Link key={city.slug} to={`/${city.slug}`} className="inline-flex h-10 items-center rounded-full border border-line px-4 text-[14px] font-semibold">{city.name}</Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
