import React, { useEffect, useState } from 'react';
import CategoryCard from './CategoryCard';
import { useCategoryStore } from '../../stores/categoryStore';
import { categoryImages } from './categoryImages';

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

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    // Fetch event counts for all categories in parallel
    const fetchCounts = async () => {
      const counts: CategoryEventCounts = {};
      await Promise.all(
        categories.map(async (category) => {
          counts[category.id] = await getEventCountByCategory(category.id);
        })
      );
      setEventCounts(counts);
    };
    if (categories.length > 0) fetchCounts();
  }, [categories, getEventCountByCategory]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-[var(--gray-200)] rounded-xl aspect-[4/3] mb-4" />
            <div className="space-y-3">
              <div className="h-6 bg-[var(--gray-200)] rounded w-3/4" />
              <div className="h-4 bg-[var(--gray-200)] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--error-600)] mb-4">{error}</p>
        <button 
          onClick={fetchCategories}
          className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)]"
        >
          Retry
        </button>
      </div>
    );
  }

  const containerClass = horizontal 
    ? "flex gap-6 overflow-x-auto pb-4" 
    : "grid grid-cols-1 gap-8 sm:grid-cols-2";

  return (
    <div className={containerClass}>
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          {...category}
          image={categoryImages[category.name.toLowerCase()]}
          eventCount={eventCounts[category.id] ?? 0}
          showSubcategories={showSubcategories}
        />
      ))}
    </div>
  );
}
