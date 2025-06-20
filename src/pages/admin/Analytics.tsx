import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import RevenueChart from '../../components/admin/charts/RevenueChart';
import CategoryDistributionChart from '../../components/admin/charts/CategoryDistributionChart';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalUsers: {
    current: number;
    previous: number;
  };
  totalEvents: {
    current: number;
    previous: number;
  };
  totalRevenue: {
    current: number;
    previous: number;
  };
  ticketsSold: {
    current: number;
    previous: number;
  };
  revenueData: Array<{
    date: string;
    value: number;
  }>;
  categoryData: Array<{
    category: string;
    total: number;
  }>;
  topEvents: Array<{
    id: string;
    title: string;
    ticketsSold: number;
    revenue: number;
    occupancy: number;
  }>;
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Get current period users
      const { count: currentUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get previous period users
      const { count: previousUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      // Get current period events
      const { count: currentEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get previous period events
      const { count: previousEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      // Get current period revenue
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('status', 'COMPLETED')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get previous period revenue
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('status', 'COMPLETED')
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      const currentRevenue = currentOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      const previousRevenue = previousOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

      // Get current period tickets
      const { count: currentTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get previous period tickets
      const { count: previousTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      // Get revenue data for chart
      const { data: revenueData } = await supabase
        .from('orders')
        .select('created_at, total')
        .eq('status', 'COMPLETED')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at');

      // Get category distribution data
      const { data: events } = await supabase
        .from('events')
        .select('categories, tickets_sold');

      const categoryTotals = events?.reduce((acc: Record<string, number>, event) => {
        event.categories.forEach((category: string) => {
          acc[category] = (acc[category] || 0) + (event.tickets_sold || 0);
        });
        return acc;
      }, {});

      const categoryData = Object.entries(categoryTotals || {}).map(([category, total]) => ({
        category,
        total
      }));

      // Get top performing events
      const { data: topEvents } = await supabase
        .from('events')
        .select(`
          id,
          title,
          tickets_sold,
          capacity,
          orders (
            total
          )
        `)
        .order('tickets_sold', { ascending: false })
        .limit(5);

      const formattedTopEvents = topEvents?.map(event => ({
        id: event.id,
        title: event.title,
        ticketsSold: event.tickets_sold,
        revenue: event.orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0,
        occupancy: (event.tickets_sold / event.capacity) * 100
      })) || [];

      // Format revenue data for chart
      const revenueByDate = revenueData?.reduce((acc: Record<string, number>, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + order.total;
        return acc;
      }, {});

      const formattedRevenueData = Object.entries(revenueByDate || {}).map(([date, value]) => ({
        date,
        value
      }));

      setStats({
        totalUsers: {
          current: currentUsers || 0,
          previous: previousUsers || 0
        },
        totalEvents: {
          current: currentEvents || 0,
          previous: previousEvents || 0
        },
        totalRevenue: {
          current: currentRevenue,
          previous: previousRevenue
        },
        ticketsSold: {
          current: currentTickets || 0,
          previous: previousTickets || 0
        },
        revenueData: formattedRevenueData,
        categoryData: categoryData,
        topEvents: formattedTopEvents
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentageChange = (current: number, previous: number): string => {
    if (previous === 0) return '+100%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load analytics</p>
        <button 
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const metrics = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue.current),
      change: calculatePercentageChange(stats.totalRevenue.current, stats.totalRevenue.previous),
      trend: stats.totalRevenue.current >= stats.totalRevenue.previous ? 'up' : 'down',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Ticket Sales',
      value: stats.ticketsSold.current.toLocaleString(),
      change: calculatePercentageChange(stats.ticketsSold.current, stats.ticketsSold.previous),
      trend: stats.ticketsSold.current >= stats.ticketsSold.previous ? 'up' : 'down',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      title: 'Active Users',
      value: stats.totalUsers.current.toLocaleString(),
      change: calculatePercentageChange(stats.totalUsers.current, stats.totalUsers.previous),
      trend: stats.totalUsers.current >= stats.totalUsers.previous ? 'up' : 'down',
      icon: Users,
      color: 'indigo'
    },
    {
      title: 'Total Events',
      value: stats.totalEvents.current.toString(),
      change: calculatePercentageChange(stats.totalEvents.current, stats.totalEvents.previous),
      trend: stats.totalEvents.current >= stats.totalEvents.previous ? 'up' : 'down',
      icon: Calendar,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <div className="flex gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <AdminMetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h2>
          <RevenueChart data={stats.revenueData} />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h2>
          <CategoryDistributionChart data={stats.categoryData} />
        </div>
      </div>

      {/* Top Events Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Events</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Event</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Tickets Sold</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Revenue</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.topEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{event.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{event.ticketsSold}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatCurrency(event.revenue)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full mr-2">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${event.occupancy}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{Math.round(event.occupancy)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}