import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Search, Filter, Loader } from 'lucide-react';
import EventCard from '../components/EventCard';
import { CategoryService } from '../services/categoryService';
import { Event, EventCategory } from '../types/event';
import toast from 'react-hot-toast';

export default function CategoryEvents() {
  const { categoryId } = useParams<{ categoryId: string }>();
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
      
      // Fetch category details
      if (categoryId) {
        const categoryData = await CategoryService.fetchCategoryById(categoryId);
        setCategory(categoryData);
      }

      // Fetch events by category
      if (categoryId) {
        const eventsData = await CategoryService.fetchEventsByCategory(categoryId);
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error fetching category and events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => 
    searchQuery ? 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase())
    : true
  );

  // Sort events based on selected criteria
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
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
  });

  if (!category && !loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Category not found</h2>
        <Link to="/categories" className="mt-4 text-indigo-600 hover:text-indigo-700">
          Back to Categories
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/categories"
        className="mb-8 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Categories
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{category?.name}</h1>
        <p className="text-gray-600">{category?.description}</p>
        
        {/* Category details */}
        {category && (
          <div className="mt-4 flex items-center gap-4">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: category.color }}
            />
            <span className="text-sm text-gray-500">
              {events.length} events available
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date">Date: Soonest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popularity">Most Popular</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : sortedEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedEvents.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'There are currently no events in this category'}
          </p>
        </div>
      )}
    </div>
  );
}