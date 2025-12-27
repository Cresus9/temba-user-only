import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { Event } from '../../types/event';
import { CategoryService } from '../../services/categoryService';

interface TrendingSearch {
  id: string;
  name: string;
  image: string;
  category: string;
  eventCount?: number;
}

export default function TrendingSearches() {
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTrendingSearches();
  }, []);

  const fetchTrendingSearches = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching trending searches...');

      // Get categories with most events (trending)
      const categories = await CategoryService.fetchCategories();
      console.log('📋 Categories found:', categories.length);
      
      // Get event count for each category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const count = await CategoryService.getPublishedEventCountByCategory(category.id);
          return { category, count };
        })
      );

      // Sort by event count and take top 8
      const topCategories = categoriesWithCounts
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      console.log('⭐ Top categories:', topCategories.length);

      // Get a featured event for each category to use as image
      const trending: TrendingSearch[] = await Promise.all(
        topCategories.map(async ({ category, count }) => {
          try {
            const events = await CategoryService.fetchEventsByCategory(category.id);
            const featuredEvent = events[0]; // Get first event for image

            return {
              id: category.id,
              name: category.name,
              image: featuredEvent?.image_url || 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea',
              category: category.name,
              eventCount: count
            };
          } catch (err) {
            console.error(`Error fetching events for category ${category.name}:`, err);
            return {
              id: category.id,
              name: category.name,
              image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea',
              category: category.name,
              eventCount: count
            };
          }
        })
      );

      console.log('✅ Trending searches loaded:', trending.length);
      setTrendingSearches(trending);
    } catch (error) {
      console.error('❌ Error fetching trending searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">TRENDING SEARCHES</h2>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48 h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (trendingSearches.length === 0) {
    console.log('⚠️ No trending searches found');
    return (
      <section className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">TRENDING SEARCHES</h2>
        <p className="text-gray-600 text-sm">Aucune recherche tendance disponible pour le moment.</p>
      </section>
    );
  }

  return (
    <section className="py-8 relative group">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">TRENDING SEARCHES</h2>
      
      {/* Navigation Buttons */}
      <button
        onClick={scrollLeft}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-6 w-6 text-gray-700" />
      </button>
      <button
        onClick={scrollRight}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-6 w-6 text-gray-700" />
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
      >
        {trendingSearches.map((search) => (
          <Link
            key={search.id}
            to={`/categories/${search.id}`}
            className="flex-shrink-0 group"
          >
            <div className="relative w-48 h-32 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <img
                src={search.image}
                alt={search.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <div className="text-xs font-semibold uppercase tracking-wide mb-1">
                  {search.category}
                </div>
                <div className="text-sm font-bold line-clamp-2">
                  {search.name}
                </div>
                {search.eventCount && (
                  <div className="text-xs mt-1 opacity-90">
                    {search.eventCount} événement{search.eventCount > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

