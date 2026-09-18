import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Search, Filter, Loader } from 'lucide-react';
import EventCard from '../components/EventCard';
import { CategoryService } from '../services/categoryService';
import { Event, EventCategory } from '../types/event';
import toast from 'react-hot-toast';
import { parseLocalDate } from '../utils/formatters';
import PageSEO from '../components/SEO/PageSEO';
import { CITY_LANDINGS } from '../data/cityLandings';
import {
  categoryLandingFromParam,
  categoryLandingFromRecord,
  categoryPublicSlug,
} from '../data/categoryLandings';

const display = '"Plus Jakarta Sans", Inter, sans-serif';

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
  const [sortBy, setSortBy] = useState('date');

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
        setEvents(eventsData);
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

  if (!category && !loading) {
    return (
      <div className="min-h-screen bg-cream bg-grain">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-extrabold text-ink" style={{ fontFamily: display }}>
            Catégorie introuvable
          </h2>
          <Link to="/categories" className="mt-4 inline-block font-semibold text-brand">
            Retour aux catégories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream bg-grain">
      {category && (
        <PageSEO
          title={`${name} — billets Temba`}
          description={intro.slice(0, 220)}
          canonicalUrl={`https://tembas.com/categories/${seoPath}`}
          keywords={[name, 'billets', 'Temba', 'FCFA', 'Ouagadougou']}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-10 md:py-14">
        <Link
          to="/categories"
          className="mb-6 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-mute hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Toutes les catégories
        </Link>

        <p className="eyebrow mb-2">Catégorie</p>
        <h1 className="text-[28px] md:text-[36px] font-extrabold text-ink leading-tight mb-3" style={{ fontFamily: display }}>
          {name}
        </h1>
        <p className="text-[15px] text-ink-mute leading-relaxed max-w-2xl mb-3">{intro}</p>
        {category && (
          <p className="text-[13px] text-ink-mute mb-8">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
              style={{ backgroundColor: category.color }}
            />
            {events.length} événement{events.length !== 1 ? 's' : ''} · Orange Money, Moov, carte
          </p>
        )}

        <div className="mb-8 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
            <input
              type="text"
              placeholder="Rechercher un événement…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-line rounded-xl2 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-mute" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 border border-line rounded-xl2 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="date">Date : les plus proches</option>
              <option value="price_asc">Prix : croissant</option>
              <option value="price_desc">Prix : décroissant</option>
              <option value="popularity">Les plus demandés</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[280px]">
            <Loader className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : sortedEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-paper border border-line rounded-2xl px-6">
            <Calendar className="h-10 w-10 text-ink-mute mx-auto mb-4" />
            <h3 className="text-lg font-extrabold text-ink mb-2" style={{ fontFamily: display }}>
              Aucun événement ici pour l’instant
            </h3>
            <p className="text-[14px] text-ink-mute max-w-md mx-auto mb-5">
              {searchQuery
                ? 'Aucun titre ne correspond à votre recherche. Essayez un autre mot.'
                : `Pas de date ${name} en ligne aujourd’hui. Voyez l’agenda complet ou une ville.`}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/events" className="px-3 py-1.5 rounded-full bg-brand text-paper text-[13px] font-semibold">
                Tout l’agenda
              </Link>
              {CITY_LANDINGS.map((c) => (
                <Link
                  key={c.slug}
                  to={`/${c.slug}`}
                  className="px-3 py-1.5 rounded-full bg-cream border border-line text-[13px] font-semibold text-ink"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
