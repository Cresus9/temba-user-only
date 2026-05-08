import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CategoryCard from './CategoryCard';
import { CATEGORIES } from '../../constants/categories';
import { useEvents } from '../../context/EventContext';
import { CategoryService } from '../../services/categoryService';

export default function CategoryList() {
  const { events } = useEvents();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [useGridLayout, setUseGridLayout] = useState(false);

  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Fetch counts from DB to reflect PUBLISHED events accurately
    const fetchCounts = async () => {
      const entries = await Promise.all(
        CATEGORIES.map(async (cat) => {
          try {
            // Resolve slug to real category UUID first
            const resolved = await CategoryService.fetchCategoryBySlug(cat.id);
            if (!resolved?.id) return [cat.id, 0] as const;
            const count = await CategoryService.getPublishedEventCountByCategory(resolved.id);
            return [cat.id, count] as const;
          } catch {
            return [cat.id, 0] as const;
          }
        })
      );
      setCounts(Object.fromEntries(entries));
    };

    fetchCounts();
  }, []);

  const getEventCount = (categoryId: string) => counts[categoryId] ?? 0;

  // Update layout based on screen size
  useEffect(() => {
    const updateLayout = () => {
      setUseGridLayout(window.innerWidth < 768);
    };
    
    updateLayout();
    window.addEventListener('resize', updateLayout);
    
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  // Show all 4 categories at once on all screen sizes
  const categoriesPerView = 4;
  const maxIndex = Math.max(0, CATEGORIES.length - categoriesPerView);

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    
    const clampedIndex = Math.max(0, Math.min(index, maxIndex));
    setCurrentIndex(clampedIndex);
    
    const container = scrollContainerRef.current;
    const cardWidth = container.scrollWidth / CATEGORIES.length;
    const scrollPosition = clampedIndex * cardWidth;
    
    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
  };

  const handlePrevious = () => {
    scrollToIndex(currentIndex - 1);
  };

  const handleNext = () => {
    scrollToIndex(currentIndex + 1);
  };

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < maxIndex;

  if (useGridLayout) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            {...category}
            eventCount={getEventCount(category.id)}
          />
        ))}
      </div>
    );
  }

  const showCarousel = CATEGORIES.length > categoriesPerView;

  // If we have ≤ 4 categories, just render them as a clean grid (no carousel needed)
  if (!showCarousel) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            {...category}
            eventCount={getEventCount(category.id)}
          />
        ))}
      </div>
    );
  }

  // Horizontal scroll layout (only when > 4 categories)
  const arrowBase =
    'absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full transition-all duration-200 shadow-card';
  const arrowActive = 'bg-paper text-ink border border-line hover:border-ink hover:shadow-card-hover';
  const arrowDisabled = 'bg-paper text-ink-mute border border-line cursor-not-allowed opacity-50';

  return (
    <div className="relative group">
      <button
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        className={`${arrowBase} -left-4 ${canGoPrevious ? arrowActive : arrowDisabled}`}
        aria-label="Catégories précédentes"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={handleNext}
        disabled={!canGoNext}
        className={`${arrowBase} -right-4 ${canGoNext ? arrowActive : arrowDisabled}`}
        aria-label="Catégories suivantes"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="flex-shrink-0 w-1/2 lg:w-1/3 xl:w-1/4 snap-start"
            style={{ minWidth: 'calc(25% - 0.75rem)' }}
          >
            <CategoryCard
              {...category}
              eventCount={getEventCount(category.id)}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-5 gap-1.5">
        {Array.from({ length: Math.ceil(CATEGORIES.length / categoriesPerView) }, (_, i) => (
          <button
            key={i}
            onClick={() => scrollToIndex(i * categoriesPerView)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              Math.floor(currentIndex / categoriesPerView) === i
                ? 'bg-brand w-6'
                : 'bg-line hover:bg-ink-mute w-1.5'
            }`}
            aria-label={`Aller à la page ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}