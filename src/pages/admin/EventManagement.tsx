import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Calendar, MapPin, Users, Edit2, Trash2, Star, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import EventForm from '../../components/admin/events/EventForm';
import { useTranslation } from '../../context/TranslationContext';
import toast from 'react-hot-toast';
import { buildTextSearchFilter } from '../../utils/supabaseFilters';
import type { Event, EventOrganizer, TicketType } from '../../types/event';
import { ADMIN_EVENT_STATUSES } from '../../services/eventAdminService';

type Organizer = EventOrganizer;

type AdminEvent = Event & {
  ticket_types: TicketType[];
};

type EventStatus = (typeof ADMIN_EVENT_STATUSES)[number];
const EVENT_STATUS_SET = new Set<EventStatus>(ADMIN_EVENT_STATUSES);
const ORGANIZER_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function EventManagement() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    organizer: 'all'
  });
  const { t } = useTranslation();
  const isMountedRef = useRef(true);
  const activeRequestId = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchOrganizers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .eq('role', 'ORGANIZER');

      if (error) throw error;
      if (!isMountedRef.current) return;
      setOrganizers((data ?? []) as Organizer[]);
    } catch (error) {
      console.error('Error fetching organizers:', error);
      if (!isMountedRef.current) return;
      toast.error('Failed to load organizers', {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    const requestId = ++activeRequestId.current;
    try {
      if (isMountedRef.current) {
        setLoading(true);
      }

      let query = supabase
        .from('events')
        .select(`
          *,
          ticket_types (*),
          organizer:profiles!events_organizer_id_fkey (
            user_id,
            name,
            email
          )
        `);

      const statusFilter = filters.status;
      if (statusFilter !== 'all') {
        if (EVENT_STATUS_SET.has(statusFilter as EventStatus)) {
          query = query.eq('status', statusFilter);
        } else {
          console.warn('Ignoring invalid status filter when fetching events', statusFilter);
        }
      }
      const organizerFilter = filters.organizer;
      if (organizerFilter !== 'all') {
        if (ORGANIZER_UUID_REGEX.test(organizerFilter)) {
          query = query.eq('organizer_id', organizerFilter);
        } else {
          console.warn('Ignoring invalid organizer filter when fetching events', organizerFilter);
        }
      }
      if (filters.search) {
        const filter = buildTextSearchFilter(['title', 'description'], filters.search);
        if (filter) {
          query = query.or(filter);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      if (!isMountedRef.current || requestId !== activeRequestId.current) {
        return;
      }
      const fetchedEvents = ((data ?? []) as AdminEvent[]).map(eventRecord => ({
        ...eventRecord,
        ticket_types: eventRecord.ticket_types ?? [],
      }));
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      if (isMountedRef.current && requestId === activeRequestId.current) {
        toast.error(t('admin.events.error.load', { default: 'Failed to load events' }), {
          icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
        });
      }
    } finally {
      if (isMountedRef.current && requestId === activeRequestId.current) {
        setLoading(false);
      }
    }
  }, [filters.organizer, filters.search, filters.status, t]);

  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleStatusChange = async (id: string, status: EventStatus) => {
    try {
      if (!EVENT_STATUS_SET.has(status)) {
        console.warn('Attempted to set invalid status on event', { id, status });
        toast.error(t('admin.events.error.update', { default: 'Failed to update event status' }), {
          icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
        });
        return;
      }

      const { error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast.success(t('admin.events.success.update', { default: 'Event status updated successfully' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
      await fetchEvents();
    } catch (error) {
      console.error('Error updating event status:', error);
      toast.error(t('admin.events.error.update', { default: 'Failed to update event status' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  };

  const handleToggleFeatured = async (id: string, featured: boolean) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ featured })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(
        featured
          ? t('admin.events.success.featured', { default: 'Event marked as featured' })
          : t('admin.events.success.unfeatured', { default: 'Event removed from featured' }),
        {
          icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
        }
      );
      await fetchEvents();
    } catch (error) {
      console.error('Error updating event featured status:', error);
      toast.error(t('admin.events.error.featured', { default: 'Failed to update featured status' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm(t('admin.events.confirm_delete', { default: 'Are you sure you want to delete this event?' }))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success(t('admin.events.success.delete', { default: 'Event deleted successfully' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
      await fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(t('admin.events.error.delete', { default: 'Failed to delete event' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedEvent 
              ? t('admin.events.edit', { default: 'Edit Event' })
              : t('admin.events.create', { default: 'Create Event' })
            }
          </h1>
          <button
            onClick={() => {
              setShowForm(false);
              setSelectedEvent(null);
            }}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t('common.cancel', { default: 'Cancel' })}
          </button>
        </div>

        <EventForm
          event={selectedEvent}
          organizers={organizers}
          onSuccess={async () => {
            setShowForm(false);
            setSelectedEvent(null);
            await fetchEvents();
          }}
          onCancel={() => {
            setShowForm(false);
            setSelectedEvent(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('admin.events.title', { default: 'Event Management' })}
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          {t('admin.events.create', { default: 'Create Event' })}
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin.events.search', { default: 'Search events...' })}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{t('admin.events.filters.all_status', { default: 'All Status' })}</option>
          {ADMIN_EVENT_STATUSES.map(statusValue => (
            <option key={statusValue} value={statusValue}>
              {statusValue === 'DRAFT'
                ? t('admin.events.filters.draft', { default: 'Draft' })
                : statusValue === 'PUBLISHED'
                ? t('admin.events.filters.published', { default: 'Published' })
                : statusValue === 'CANCELLED'
                ? t('admin.events.filters.cancelled', { default: 'Cancelled' })
                : t('admin.events.filters.completed', { default: 'Completed' })}
            </option>
          ))}
        </select>

        <select
          value={filters.organizer}
          onChange={(e) => setFilters(prev => ({ ...prev, organizer: e.target.value }))}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{t('admin.events.filters.all_organizers', { default: 'All Organizers' })}</option>
          {organizers.map(organizer => (
            <option key={organizer.user_id} value={organizer.user_id}>
              {organizer.name}
            </option>
          ))}
        </select>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.events.table.event', { default: 'Event' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.events.table.organizer', { default: 'Organizer' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.events.table.date_time', { default: 'Date & Time' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.events.table.location', { default: 'Location' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.events.table.status', { default: 'Status' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.events.table.tickets', { default: 'Tickets' })}
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                  {t('admin.events.table.actions', { default: 'Actions' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{event.title}</div>
                        <div className="text-sm text-gray-500">
                          {event.currency} {event.price}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{event.organizer?.name}</div>
                      <div className="text-gray-500">{event.organizer?.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <div>
                        <div>{event.date}</div>
                        <div className="text-sm">{event.time}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={event.status}
                      onChange={(e) => handleStatusChange(event.id, e.target.value as EventStatus)}
                      className={`px-3 py-1 rounded-lg ${
                        event.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-800'
                          : event.status === 'DRAFT'
                          ? 'bg-yellow-100 text-yellow-800'
                          : event.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {ADMIN_EVENT_STATUSES.map(statusValue => (
                        <option key={statusValue} value={statusValue}>
                          {statusValue === 'DRAFT'
                            ? t('admin.events.status.draft', { default: 'Draft' })
                            : statusValue === 'PUBLISHED'
                            ? t('admin.events.status.published', { default: 'Published' })
                            : statusValue === 'CANCELLED'
                            ? t('admin.events.status.cancelled', { default: 'Cancelled' })
                            : t('admin.events.status.completed', { default: 'Completed' })}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Users className="h-4 w-4" />
                      {event.tickets_sold} / {event.capacity}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleFeatured(event.id, !event.featured)}
                        className={`p-2 rounded-lg hover:bg-gray-100 ${
                          event.featured ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                        }`}
                        title={event.featured 
                          ? t('admin.events.unfeatured', { default: 'Remove from featured' })
                          : t('admin.events.featured', { default: 'Mark as featured' })
                        }
                      >
                        <Star className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowForm(true);
                        }}
                        className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100"
                        title={t('admin.events.edit', { default: 'Edit event' })}
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                        title={t('admin.events.delete', { default: 'Delete event' })}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}