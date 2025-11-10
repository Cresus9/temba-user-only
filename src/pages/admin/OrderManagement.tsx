import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Download, Eye, Ban, RefreshCcw, Loader, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { formatCurrency } from '../../utils/formatters';
import OrderDetailsModal from '../../components/admin/orders/OrderDetailsModal';
import DateRangePicker from '../../components/common/DateRangePicker';
import { useTranslation } from '../../context/TranslationContext';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  total: number;
  status: 'AWAITING_PAYMENT' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  created_at: string;
  user_name: string;
  user_email: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_location: string;
  event_currency: string;
  ticket_count: number;
}

interface OrderStats {
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  recentOrders: number;
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });
  const { t } = useTranslation();

  useEffect(() => {
    fetchOrders();
    fetchOrderStats();
  }, [filters]);

  const fetchOrderStats = async () => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get total orders
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Get completed orders
      const { count: completedOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'COMPLETED');

      // Get total revenue from completed orders
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total')
        .eq('status', 'COMPLETED');

      const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

      // Get recent orders (last 30 days)
      const { count: recentOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      setStats({
        totalOrders: totalOrders || 0,
        completedOrders: completedOrders || 0,
        totalRevenue,
        recentOrders: recentOrders || 0
      });
    } catch (error) {
      console.error('Error fetching order stats:', error);
      toast.error(t('admin.orders.error.load_stats', { default: 'Failed to load order statistics' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('order_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters.search) {
        query = query.or(`user_name.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%,event_title.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(t('admin.orders.error.load', { default: 'Failed to load orders' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success(t('admin.orders.success.status_update', { default: 'Order status updated successfully' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
      fetchOrders();
      fetchOrderStats();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(t('admin.orders.error.status_update', { default: 'Failed to update order status' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  };

  const handleRefund = async (orderId: string) => {
    const reason = prompt(t('admin.orders.refund.reason', { default: 'Please enter the refund reason:' }));
    if (!reason) return;

    try {
      // First update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Then create refund record
      const { error: refundError } = await supabase
        .from('refunds')
        .insert({
          order_id: orderId,
          reason,
          status: 'COMPLETED'
        });

      if (refundError) throw refundError;

      toast.success(t('admin.orders.success.refund', { default: 'Order refunded successfully' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
      fetchOrders();
      fetchOrderStats();
    } catch (error) {
      console.error('Error refunding order:', error);
      toast.error(t('admin.orders.error.refund', { default: 'Failed to refund order' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from('order_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const csvContent = [
        [
          t('admin.orders.export.order_id', { default: 'Order ID' }),
          t('admin.orders.export.customer', { default: 'Customer' }),
          t('admin.orders.export.email', { default: 'Email' }),
          t('admin.orders.export.event', { default: 'Event' }),
          t('admin.orders.export.total', { default: 'Total' }),
          t('admin.orders.export.status', { default: 'Status' }),
          t('admin.orders.export.date', { default: 'Date' })
        ].join(','),
        ...data.map(order => [
          order.id,
          order.user_name,
          order.user_email,
          order.event_title,
          order.total,
          order.status,
          new Date(order.created_at).toLocaleDateString()
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `orders-${new Date().toISOString()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success(t('admin.orders.success.export', { default: 'Orders exported successfully' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    } catch (error) {
      console.error('Error exporting orders:', error);
      toast.error(t('admin.orders.error.export', { default: 'Failed to export orders' }), {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('admin.orders.title', { default: 'Gestion des Commandes' })}
        </h1>
        <button
          onClick={handleExport}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Download className="h-5 w-5" />
          {t('admin.orders.export', { default: 'Exporter les Commandes' })}
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {t('admin.orders.stats.total_orders', { default: 'Total des Commandes' })}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {t('admin.orders.stats.completed_orders', { default: 'Commandes Terminées' })}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {t('admin.orders.stats.total_revenue', { default: 'Revenu Total' })}
                </p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  {t('admin.orders.stats.recent_orders', { default: 'Commandes Récentes' })}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentOrders}</p>
                <p className="text-xs text-gray-500">
                  {t('admin.orders.stats.last_30_days', { default: 'Derniers 30 jours' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin.orders.search', { default: 'Rechercher des commandes...' })}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{t('admin.orders.filters.all_status', { default: 'Tous les Statuts' })}</option>
          <option value="AWAITING_PAYMENT">{t('admin.orders.status.pending', { default: 'En Attente' })}</option>
          <option value="COMPLETED">{t('admin.orders.status.completed', { default: 'Terminée' })}</option>
          <option value="CANCELLED">{t('admin.orders.status.cancelled', { default: 'Annulée' })}</option>
        </select>

        <DateRangePicker
          startDate={filters.startDate}
          endDate={filters.endDate}
          onStartDateChange={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
          onEndDateChange={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.orders.table.order_id', { default: 'ID Commande' })}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.orders.table.customer', { default: 'Client' })}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.orders.table.event', { default: 'Événement' })}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.orders.table.date', { default: 'Date' })}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.orders.table.amount', { default: 'Montant' })}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.orders.table.status', { default: 'Statut' })}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.orders.table.actions', { default: 'Actions' })}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="max-w-xs truncate">
                        <div className="font-medium text-gray-900 truncate">{order.user_name}</div>
                        <div className="text-sm text-gray-500 truncate">{order.user_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-sm text-gray-900">
                        {order.event_title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'COMPLETED' 
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'AWAITING_PAYMENT'
                            ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {t(`admin.orders.status.${order.status.toLowerCase()}`, { default: order.status })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100"
                          title={t('admin.orders.actions.view', { default: 'Voir les Détails' })}
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {order.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleRefund(order.id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                            title={t('admin.orders.actions.refund', { default: 'Rembourser la Commande' })}
                          >
                            <RefreshCcw className="h-5 w-5" />
                          </button>
                        )}
                        {order.status === 'AWAITING_PAYMENT' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                            title={t('admin.orders.actions.cancel', { default: 'Annuler la Commande' })}
                          >
                            <Ban className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onRefund={handleRefund}
        />
      )}
    </div>
  );
}