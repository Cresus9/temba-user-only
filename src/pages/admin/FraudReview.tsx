import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, Loader, Search, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface HighRiskOrder {
  id: string;
  order_id: string;
  user_id: string;
  event_id: string;
  amount: number;
  risk_level: string;
  reasons: string;
  ip: string;
  device_id: string;
  reviewed: boolean;
  reviewed_at: string | null;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
  event: {
    title: string;
  };
  order: {
    status: string;
  };
  reviewer: {
    name: string | null;
  };
}

export default function FraudReview() {
  const [orders, setOrders] = useState<HighRiskOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'pending', // pending, reviewed, all
    riskLevel: 'all',
    search: ''
  });

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('high_risk_orders')
        .select(`
          *,
          user:profiles!high_risk_orders_user_id_fkey(name, email),
          event:events!high_risk_orders_event_id_fkey(title),
          order:orders!high_risk_orders_order_id_fkey(status),
          reviewer:profiles!high_risk_orders_reviewed_by_fkey(name)
        `);

      // Apply filters
      if (filters.status === 'pending') {
        query = query.eq('reviewed', false);
      } else if (filters.status === 'reviewed') {
        query = query.eq('reviewed', true);
      }

      if (filters.riskLevel !== 'all') {
        query = query.eq('risk_level', filters.riskLevel.toUpperCase());
      }

      if (filters.search) {
        query = query.or(`user->name.ilike.%${filters.search}%,user->email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching high risk orders:', error);
      toast.error('Failed to load flagged transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (orderId: string, approved: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('high_risk_orders')
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update order status based on review decision
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: approved ? 'COMPLETED' : 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast.success(`Order ${approved ? 'approved' : 'rejected'} successfully`);
      fetchOrders();
    } catch (error) {
      console.error('Error reviewing order:', error);
      toast.error('Failed to update order status');
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin text-[var(--primary-600)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Fraud Review</h1>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[var(--primary-600)]" />
          <span className="text-[var(--gray-600)]">
            {orders.filter(o => !o.reviewed).length} pending reviews
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--gray-400)]" />
          <input
            type="text"
            placeholder="Search by user..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
        >
          <option value="pending">Pending Review</option>
          <option value="reviewed">Reviewed</option>
          <option value="all">All Transactions</option>
        </select>

        <select
          value={filters.riskLevel}
          onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
          className="px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
        >
          <option value="all">All Risk Levels</option>
          <option value="high">High Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="low">Low Risk</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-[var(--gray-200)]">
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Order Details</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Risk Level</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Reasons</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">IP / Device</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-[var(--gray-50)]">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-[var(--gray-900)]">{order.event.title}</p>
                      <p className="text-sm text-[var(--gray-600)]">{order.user.name}</p>
                      <p className="text-sm text-gray-500">{order.user.email}</p>
                      <p className="text-sm font-medium text-[var(--gray-900)] mt-1">
                        {formatCurrency(order.amount)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(order.risk_level)}`}>
                      {order.risk_level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="text-sm text-[var(--gray-600)] list-disc list-inside">
                      {order.reasons.split(', ').map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-[var(--gray-600)]">IP: {order.ip}</p>
                    <p className="text-sm text-[var(--gray-600)]">Device ID: {order.device_id}</p>
                  </td>
                  <td className="px-6 py-4">
                    {order.reviewed ? (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium text-[var(--gray-900)]">Reviewed</p>
                          <p className="text-gray-500">
                            {new Date(order.reviewed_at!).toLocaleDateString()}
                          </p>
                          {order.reviewer?.name && (
                            <p className="text-gray-500">by {order.reviewer.name}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <span className="text-yellow-700">Pending Review</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!order.reviewed && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleReview(order.id, true)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Approve Transaction"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReview(order.id, false)}
                          className="p-2 text-[var(--error-600)] hover:bg-red-50 rounded-lg"
                          title="Reject Transaction"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-[var(--gray-400)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">No Flagged Transactions</h3>
            <p className="text-[var(--gray-600)]">
              {filters.status === 'pending' 
                ? 'No transactions pending review'
                : 'No transactions match your filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
