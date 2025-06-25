import { create } from 'zustand';
import { EventCategory } from '../types/event';
import { CategoryService } from '../services/categoryService';

interface CategoriesState {
  categories: EventCategory[];
  loading: boolean;
  error: string | null;
  selectedCategories: string[];
  selectedSubcategory: string | null;
  
  // Actions
  fetchCategories: () => Promise<void>;
  setSelectedCategories: (categories: string[]) => void;
  setSelectedSubcategory: (subcategory: string | null) => void;
  clearFilters: () => void;
  addCategory: (category: Omit<EventCategory, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<EventCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Getters
  getCategoryByName: (name: string) => EventCategory | undefined;
  getCategoryById: (id: string) => EventCategory | undefined;
  getAvailableSubcategories: () => string[];
  getEventCountByCategory: (categoryId: string) => Promise<number>;
}

export const useCategoryStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,
  selectedCategories: [],
  selectedSubcategory: null,

  // Actions
  fetchCategories: async () => {
    try {
      set({ loading: true, error: null });
      const categories = await CategoryService.fetchCategories();
      set({ categories, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch categories', 
        loading: false 
      });
    }
  },

  setSelectedCategories: (categories: string[]) => {
    set({ selectedCategories: categories });
  },

  setSelectedSubcategory: (subcategory: string | null) => {
    set({ selectedSubcategory: subcategory });
  },

  clearFilters: () => {
    set({ selectedCategories: [], selectedSubcategory: null });
  },

  addCategory: async (category: Omit<EventCategory, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      set({ loading: true, error: null });
      const newCategory = await CategoryService.createCategory(category);
      set(state => ({
        categories: [...state.categories, newCategory],
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add category', 
        loading: false 
      });
    }
  },

  updateCategory: async (id: string, updates: Partial<EventCategory>) => {
    try {
      set({ loading: true, error: null });
      const updatedCategory = await CategoryService.updateCategory(id, updates);
      set(state => ({
        categories: state.categories.map(cat => 
          cat.id === id ? updatedCategory : cat
        ),
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update category', 
        loading: false 
      });
    }
  },

  deleteCategory: async (id: string) => {
    try {
      set({ loading: true, error: null });
      await CategoryService.deleteCategory(id);
      set(state => ({
        categories: state.categories.filter(cat => cat.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete category', 
        loading: false 
      });
    }
  },

  // Getters
  getCategoryByName: (name: string) => {
    const { categories } = get();
    return categories.find(cat => cat.name === name);
  },

  getCategoryById: (id: string) => {
    const { categories } = get();
    return categories.find(cat => cat.id === id);
  },

  getAvailableSubcategories: () => {
    const { categories } = get();
    const allSubcategories = categories
      .flatMap(category => category.subcategories || [])
      .filter((subcategory, index, array) => array.indexOf(subcategory) === index) // Remove duplicates
      .sort();
    return allSubcategories;
  },

  getEventCountByCategory: async (categoryId: string) => {
    try {
      return await CategoryService.getEventCountByCategory(categoryId);
    } catch (error) {
      console.error('Error getting event count by category:', error);
      return 0;
    }
  }
})); 