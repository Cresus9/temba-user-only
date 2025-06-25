import { supabase } from '../lib/supabase-client';
import { EventCategory, Event } from '../types/event';

// Category Service for the improved category system
export class CategoryService {
  // Fetch all categories
  static async fetchCategories(): Promise<EventCategory[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  // Fetch category by ID
  static async fetchCategoryById(id: string): Promise<EventCategory | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching category by ID:', error);
      return null;
    }
  }

  // Fetch category by name
  static async fetchCategoryByName(name: string): Promise<EventCategory | null> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('name', name)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching category by name:', error);
      return null;
    }
  }

  // Fetch events by category ID
  static async fetchEventsByCategory(categoryId: string): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          ticket_types (*),
          event_category_relations (
            category_id,
            categories (*)
          )
        `)
        .eq('status', 'PUBLISHED')
        .eq('event_category_relations.category_id', categoryId)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching events by category:', error);
      throw new Error('Failed to fetch events by category');
    }
  }

  // Fetch events by multiple category IDs
  static async fetchEventsByCategories(categoryIds: string[]): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          ticket_types (*),
          event_category_relations (
            category_id,
            categories (*)
          )
        `)
        .eq('status', 'PUBLISHED')
        .in('event_category_relations.category_id', categoryIds)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching events by categories:', error);
      throw new Error('Failed to fetch events by categories');
    }
  }

  // Fetch events by subcategory
  static async fetchEventsBySubcategory(subcategory: string): Promise<Event[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          ticket_types (*),
          event_category_relations (
            category_id,
            categories (*)
          )
        `)
        .eq('status', 'PUBLISHED')
        .contains('event_category_relations.categories.subcategories', [subcategory])
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching events by subcategory:', error);
      throw new Error('Failed to fetch events by subcategory');
    }
  }

  // Create new category (admin only)
  static async createCategory(category: Omit<EventCategory, 'id' | 'created_at' | 'updated_at'>): Promise<EventCategory> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw new Error('Failed to create category');
    }
  }

  // Update category (admin only)
  static async updateCategory(id: string, updates: Partial<EventCategory>): Promise<EventCategory> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error('Failed to update category');
    }
  }

  // Delete category (admin only)
  static async deleteCategory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error('Failed to delete category');
    }
  }

  // Assign categories to event
  static async assignCategoriesToEvent(eventId: string, categoryIds: string[]): Promise<void> {
    try {
      // First, remove existing relationships
      await supabase
        .from('event_category_relations')
        .delete()
        .eq('event_id', eventId);

      // Then, create new relationships
      if (categoryIds.length > 0) {
        const relations = categoryIds.map(categoryId => ({
          event_id: eventId,
          category_id: categoryId
        }));

        const { error } = await supabase
          .from('event_category_relations')
          .insert(relations);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error assigning categories to event:', error);
      throw new Error('Failed to assign categories to event');
    }
  }

  // Remove category from event
  static async removeCategoryFromEvent(eventId: string, categoryId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('event_category_relations')
        .delete()
        .eq('event_id', eventId)
        .eq('category_id', categoryId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing category from event:', error);
      throw new Error('Failed to remove category from event');
    }
  }

  // Get event count by category
  static async getEventCountByCategory(categoryId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('event_category_relations')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting event count by category:', error);
      return 0;
    }
  }

  // Get all available subcategories
  static async getAvailableSubcategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('subcategories');

      if (error) throw error;

      const allSubcategories = data
        ?.flatMap(category => category.subcategories || [])
        .filter((subcategory, index, array) => array.indexOf(subcategory) === index) // Remove duplicates
        .sort();

      return allSubcategories || [];
    } catch (error) {
      console.error('Error getting available subcategories:', error);
      return [];
    }
  }
}

// Legacy functions for backward compatibility
export const fetchCategories = CategoryService.fetchCategories;
export const fetchCategoryById = CategoryService.fetchCategoryById;
export const fetchCategoryByName = CategoryService.fetchCategoryByName;
export const fetchEventsByCategory = CategoryService.fetchEventsByCategory;
export const fetchEventsByCategories = CategoryService.fetchEventsByCategories;
export const fetchEventsBySubcategory = CategoryService.fetchEventsBySubcategory; 