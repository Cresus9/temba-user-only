import React, { useEffect, useState } from 'react';
import CategoryCard from './CategoryCard';
import { useCategoryStore } from '../../stores/categoryStore';
import { categoryImages } from './categoryImages';
import { Loader, AlertCircle, RefreshCw } from 'lucide-react';

interface CategoryEventCounts {
  [categoryId: string]: number;
}

interface CategoryListProps {
  onCategorySelect?: (categoryId: string) => void;
  selectedCategories?: string[];
  showSubcategories?: boolean;
  horizontal?: boolean;
}

export default function CategoryList({ 
  onCategorySelect, 
  selectedCategories = [], 
  showSubcategories = false,
  horizontal = false 
}: CategoryListProps) {
  const { 
    categories, 
    loading, 
    error, 
    fetchCategories, 
    getEventCountByCategory 
  } = useCategoryStore();
  const [eventCounts, setEventCounts] = useState<CategoryEventCounts>({});
  const [countsLoading, setCountsLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    // Fetch event counts for all categories in parallel
    const fetchCounts = async () => {
      if (categories.length === 0) return;
      
      setCountsLoading(true);
      try {
        const counts: CategoryEventCounts = {};
        await Promise.all(
          categories.map(async (category) => {
            counts[category.id] = await getEventCountByCategory(category.id);
          })
        );
        setEventCounts(counts);
      } catch (error) {
        console.error('Error fetching event counts:', error);
      } finally {
        setCountsLoading(false);
      }
    };
    
    fetchCounts();
  }, [categories, getEventCountByCategory]);

  // Skeleton loading component
  const SkeletonCard = () => (
    <div className="animate-pulse h-full">
      <div className="bg-gray-200 rounded-xl aspect-[4/3] mb-3" />
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div className="h-5 bg-gray-200 rounded w-3/4" />
        </div>
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="flex gap-1">
          <div className="h-5 bg-gray-200 rounded-full w-16" />
          <div className="h-5 bg-gray-200 rounded-full w-20" />
          <div className="h-5 bg-gray-200 rounded-full w-14" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
        {[...Array(8)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 text-red-500" />
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 px-4">{error}</p>
            <button 
              onClick={fetchCategories}
              className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              Aucune catégorie trouvée
            </h3>
            <p className="text-sm sm:text-base text-gray-600 px-4">
              Aucune catégorie d'événements n'est disponible pour le moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const containerClass = horizontal 
    ? "flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory" 
    : "grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr";

  return (
    <div className={containerClass}>
      {categories.map((category, index) => (
        <div 
          key={category.id} 
          className={`h-full ${horizontal ? 'snap-start flex-shrink-0 w-64 sm:w-72' : ''}`}
        >
          <CategoryCard
            {...category}
            image={categoryImages[category.name.toLowerCase()]}
            eventCount={countsLoading ? undefined : (eventCounts[category.id] ?? 0)}
            showSubcategories={showSubcategories}
          />
        </div>
      ))}
    </div>
  );
}