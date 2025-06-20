import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface EventAnalytics {
  event_id: string;
  event_title: string;
  event_date: string;
  total_orders: number;
  tickets_sold: number;
  total_revenue: number;
  ticket_types: string[];
  order_status_counts: {
    pending: number;
    completed: number;
    cancelled: number;
  };
}

export default function OrganizerDashboard() {
  const [analytics, setAnalytics] = useState<EventAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (profile?.role === 'ORGANIZER') {
      fetchAnalytics();
    }
  }, [profile]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: analyticsError } = await supabase
        .from('organizer_event_analytics')
        .select('*');

      if (analyticsError) throw analyticsError;
      setAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(t('organizer.error.load_analytics', { default: 'Failed to load event analytics' }));
      toast.error(t('organizer.error.load_analytics', { default: 'Failed to load event analytics' }));
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = analytics.reduce((sum, event) => sum + event.total_revenue, 0);
  const totalTickets = analytics.reduce((sum, event) => sum + event.tickets_sold, 0);
  const totalOrders = analytics.reduce((sum, event) => sum + event.total_orders, 0);
  const upcomingEvents = analytics.filter(event => new Date(event.event_date) > new Date()).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {t('common.try_again', { default: 'Try Again' })}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('organizer.dashboard.title', { default: 'Event Analytics' })}
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {t('organizer.stats.total_revenue', { default: 'Total Revenue' })}
              </p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {t('organizer.stats.tickets_sold', { default: 'Tickets Sold' })}
              </p>
              <p className="text-2xl font-bold text-gray-900">{totalTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {t('organizer.stats.total_orders', { default: 'Total Orders' })}
              </p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {t('organizer.stats.upcoming_events', { default: 'Upcoming Events' })}
              </p>
              <p className="text-2xl font-bold text-gray-900">{upcomingEvents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('organizer.events.title', { default: 'Your Events' })}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('organizer.events.table.event', { default: 'Event' })}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('organizer.events.table.date', { default: 'Date' })}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('organizer.events.table.tickets', { default: 'Tickets' })}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('organizer.events.table.revenue', { default: 'Revenue' })}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('organizer.events.table.status', { default: 'Status' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.map((event) => (
                <tr key={event.event_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{event.event_title}</div>
                    <div className="text-sm text-gray-500">
                      {event.ticket_types.join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(event.event_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{event.tickets_sold}</div>
                    <div className="text-sm text-gray-500">
                      {t('organizer.events.orders', { 
                        count: event.total_orders,
                        default: `${event.total_orders} orders`
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(event.total_revenue)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-sm text-gray-600">
                          {t('organizer.events.completed_orders', {
                            count: event.order_status_counts.completed,
                            default: `${event.order_status_counts.completed} completed`
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        <span className="text-sm text-gray-600">
                          {t('organizer.events.pending_orders', {
                            count: event.order_status_counts.pending,
                            default: `${event.order_status_counts.pending} pending`
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="text-sm text-gray-600">
                          {t('organizer.events.cancelled_orders', {
                            count: event.order_status_counts.cancelled,
                            default: `${event.order_status_counts.cancelled} cancelled`
                          })}
                        </span>
                      </div>
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