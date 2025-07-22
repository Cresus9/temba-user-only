import React, { useEffect } from 'react';
import { useCategoryStore } from '../stores/categoryStore';
import { CategoryService } from '../services/categoryService';

export default function CategoryTest() {
  const { categories, loading, error, fetchCategories } = useCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const testCategoryService = async () => {
    try {
      console.log('Testing CategoryService...');
      
      // Test fetching categories
      const allCategories = await CategoryService.fetchCategories();
      console.log('All categories:', allCategories);
      
      if (allCategories.length > 0) {
        const firstCategory = allCategories[0];
        console.log('First category:', firstCategory);
        
        // Test fetching events by category
        const events = await CategoryService.fetchEventsByCategory(firstCategory.id);
        console.log('Events in first category:', events);
        
        // Test getting event count
        const eventCount = await CategoryService.getEventCountByCategory(firstCategory.id);
        console.log('Event count for first category:', eventCount);
      }
    } catch (error) {
      console.error('CategoryService test failed:', error);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Category System Test</h1>
      
      <div className="mb-6">
        <button 
          onClick={testCategoryService}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Category Service
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Category Store State:</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          <p><strong>Error:</strong> {error || 'None'}</p>
          <p><strong>Categories Count:</strong> {categories.length}</p>
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Categories:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="border p-4 rounded">
                <h3 className="font-semibold">{category.name}</h3>
                <p className="text-[var(--gray-600)]">{category.description}</p>
                <p className="text-sm text-gray-500">Icon: {category.icon}</p>
                <p className="text-sm text-gray-500">Color: {category.color}</p>
                {category.subcategories && category.subcategories.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Subcategories:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {category.subcategories.map((sub, index) => (
                        <span key={index} className="text-xs bg-[var(--gray-200)] px-2 py-1 rounded">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}    