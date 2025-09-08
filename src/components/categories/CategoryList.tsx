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
    // 2x2 Grid layout for small screens
    return (
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((category) => (
          <div key={category.id}>
            <CategoryCard
              {...category}
              eventCount={getEventCount(category.id)}
            />
          </div>
        ))}
      </div>
    );
  }

  // Horizontal scroll layout for larger screens
  return (
    <div className="relative group">
      {/* Navigation Arrows */}
      {CATEGORIES.length > categoriesPerView && (
        <>
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-all duration-200 ${
              canGoPrevious 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 hover:shadow-xl opacity-90 hover:opacity-100' 
                : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed opacity-50'
            }`}
            aria-label="Catégories précédentes"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full shadow-lg border flex items-center justify-center transition-all duration-200 ${
              canGoNext 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 hover:shadow-xl opacity-90 hover:opacity-100' 
                : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed opacity-50'
            }`}
            aria-label="Catégories suivantes"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Categories Container */}
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

      {/* Progress Indicators */}
      {CATEGORIES.length > categoriesPerView && (
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: Math.ceil(CATEGORIES.length / categoriesPerView) }, (_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i * categoriesPerView)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                Math.floor(currentIndex / categoriesPerView) === i
                  ? 'bg-indigo-600 w-6'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Aller à la page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}