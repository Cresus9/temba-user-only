import React, { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import CategoryList from '../components/categories/CategoryList';
import { useCategoryStore } from '../stores/categoryStore';
import { EventCategory } from '../types/event';

export default function Categories() {
  const { categories, loading, error, fetchCategories } = useCategoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [filteredCategories, setFilteredCategories] = useState<EventCategory[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    let filtered = categories;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(query) ||
        category.description?.toLowerCase().includes(query) ||
        category.subcategories?.some(sub => sub.toLowerCase().includes(query))
      );
    }

    // Filter by subcategory
    if (selectedSubcategory) {
      filtered = filtered.filter(category =>
        category.subcategories?.includes(selectedSubcategory)
      );
    }

    setFilteredCategories(filtered);
  }, [categories, searchQuery, selectedSubcategory]);

  const allSubcategories = categories
    .flatMap(category => category.subcategories || [])
    .filter((subcategory, index, array) => array.indexOf(subcategory) === index)
    .sort();

  const handleCategorySelect = (categoryId: string) => {
    // Navigate to category page
    window.location.href = `/categories/${categoryId}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-[var(--gray-600)]">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-[var(--error-600)] mb-4">{error}</p>
          <button 
            onClick={fetchCategories}
            className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--gray-900)] mb-4">
          Browse Event Categories
        </h1>
        <p className="text-lg text-[var(--gray-600)] max-w-2xl">
          Discover events by category. From music concerts to sports events, find experiences that match your interests.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--gray-400)]" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--gray-400)]" />
            <select
              value={selectedSubcategory || ''}
              onChange={(e) => setSelectedSubcategory(e.target.value || null)}
              className="w-full md:w-48 pl-10 pr-4 py-3 rounded-lg border border-[var(--gray-200)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
            >
              <option value="">All Subcategories</option>
              {allSubcategories.map(subcategory => (
                <option key={subcategory} value={subcategory}>
                  {subcategory}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filters */}
        {(searchQuery || selectedSubcategory) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[var(--gray-600)]">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                Search: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-1 text-[var(--primary-600)] hover:text-[var(--primary-800)]"
                >
                  ×
                </button>
              </span>
            )}
            {selectedSubcategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                Subcategory: {selectedSubcategory}
                <button
                  onClick={() => setSelectedSubcategory(null)}
                  className="ml-1 text-[var(--primary-600)] hover:text-[var(--primary-800)]"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSubcategory(null);
              }}
              className="text-sm text-[var(--primary-600)] hover:text-[var(--primary-700)]"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="mb-6">
        <p className="text-[var(--gray-600)]">
          {filteredCategories.length} category{filteredCategories.length !== 1 ? 'ies' : 'y'} found
        </p>
      </div>

      {/* Categories Grid */}
      {filteredCategories.length > 0 ? (
        <CategoryList 
          showSubcategories={true}
          onCategorySelect={handleCategorySelect}
        />
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-[var(--gray-400)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">
            No categories found
          </h3>
          <p className="text-[var(--gray-600)]">
            Try adjusting your search terms or filters
          </p>
        </div>
      )}
    </div>
  );
}
