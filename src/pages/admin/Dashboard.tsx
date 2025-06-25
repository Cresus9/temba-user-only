import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import AdminMetricCard from '../../components/admin/AdminMetricCard';
import RevenueChart from '../../components/admin/charts/RevenueChart';
import CategoryDistributionChart from '../../components/admin/charts/CategoryDistributionChart';
import { formatCurrency } from '../../utils/formatters';
import { useTranslation } from '../../context/TranslationContext';
import EmailTest from '../../components/admin/EmailTest';
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
  revenueData: {
    labels: string[];
    values: number[];
  };
  categoryData: {
    labels: string[];
    values: number[];
  };
  topEvents: Array<{
    id: string;
    title: string;
    ticketsSold: number;
    revenue: number;
    occupancy: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetchStats();
  }, []);

  const calculatePercentageChange = (current: number, previous: number): string => {
    if (previous === 0) return '+100%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

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
        (event.categories || []).forEach((category: string) => {
          acc[category] = (acc[category] || 0) + (event.tickets_sold || 0);
        });
        return acc;
      }, {});

      const revenueByDate = revenueData?.reduce((acc: Record<string, number>, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + order.total;
        return acc;
      }, {});

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
        revenueData: {
          labels: Object.keys(revenueByDate || {}),
          values: Object.values(revenueByDate || {})
        },
        categoryData: {
          labels: Object.keys(categoryTotals || {}),
          values: Object.values(categoryTotals || {})
        },
        topEvents: [] // You can add top events data here if needed
      });
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard statistics');
      if (navigator.onLine) {
        toast.error('Failed to load dashboard statistics');
      }
    } finally {
      setLoading(false);
    }
  };

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
          onClick={fetchStats}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {t('common.try_again', { default: 'Try Again' })}
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const metrics = [
    {
      title: t('admin.metrics.total_revenue', { default: 'Total Revenue' }),
      value: formatCurrency(stats.totalRevenue.current),
      change: calculatePercentageChange(stats.totalRevenue.current, stats.totalRevenue.previous),
      trend: stats.totalRevenue.current >= stats.totalRevenue.previous ? 'up' : 'down',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: t('admin.metrics.ticket_sales', { default: 'Ticket Sales' }),
      value: stats.ticketsSold.current.toLocaleString(),
      change: calculatePercentageChange(stats.ticketsSold.current, stats.ticketsSold.previous),
      trend: stats.ticketsSold.current >= stats.ticketsSold.previous ? 'up' : 'down',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      title: t('admin.metrics.active_users', { default: 'Active Users' }),
      value: stats.totalUsers.current.toLocaleString(),
      change: calculatePercentageChange(stats.totalUsers.current, stats.totalUsers.previous),
      trend: stats.totalUsers.current >= stats.totalUsers.previous ? 'up' : 'down',
      icon: Users,
      color: 'indigo'
    },
    {
      title: t('admin.metrics.total_events', { default: 'Total Events' }),
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
        <h1 className="text-2xl font-bold text-gray-900">
          {t('admin.dashboard.title', { default: 'Platform Analytics' })}
        </h1>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <AdminMetricCard key={metric.title} {...metric} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.charts.revenue_overview', { default: 'Revenue Overview' })}
          </h2>
          <RevenueChart data={stats.revenueData} />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.charts.sales_by_category', { default: 'Sales by Category' })}
          </h2>
          <CategoryDistributionChart data={stats.categoryData} />
        </div>
      </div>

      {/* Email Testing Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <EmailTest />
      </div>
    </div>
  );
}