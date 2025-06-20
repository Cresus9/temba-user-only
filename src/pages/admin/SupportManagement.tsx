import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, AlertCircle, Loader, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useTranslation } from '../../context/TranslationContext';
import toast from 'react-hot-toast';

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  last_reply_at: string | null;
  category_name: string;
  message_count: number;
  user_name: string;
  user_email: string;
}

export default function SupportManagement() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    search: ''
  });
  const { t } = useTranslation();

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('support_ticket_details')
        .select('*')
        .order('latest_activity', { ascending: false });

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters.category !== 'all') {
        query = query.eq('category_name', filters.category);
      }
      if (filters.search) {
        query = query.or(`subject.ilike.%${filters.search}%,user_name.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error(t('admin.support.error.load', { default: 'Failed to load support tickets' }));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'text-gray-600';
      case 'MEDIUM':
        return 'text-blue-600';
      case 'HIGH':
        return 'text-orange-600';
      case 'URGENT':
        return 'text-red-600';
      default:
        return 'text-gray-600';
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('admin.support.title', { default: 'Support Management' })}
        </h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin.support.search', { default: 'Search tickets...' })}
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
          <option value="all">{t('admin.support.filters.all_status', { default: 'All Status' })}</option>
          <option value="OPEN">{t('admin.support.status.open', { default: 'Open' })}</option>
          <option value="IN_PROGRESS">{t('admin.support.status.in_progress', { default: 'In Progress' })}</option>
          <option value="RESOLVED">{t('admin.support.status.resolved', { default: 'Resolved' })}</option>
          <option value="CLOSED">{t('admin.support.status.closed', { default: 'Closed' })}</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{t('admin.support.filters.all_priority', { default: 'All Priority' })}</option>
          <option value="LOW">{t('admin.support.priority.low', { default: 'Low' })}</option>
          <option value="MEDIUM">{t('admin.support.priority.medium', { default: 'Medium' })}</option>
          <option value="HIGH">{t('admin.support.priority.high', { default: 'High' })}</option>
          <option value="URGENT">{t('admin.support.priority.urgent', { default: 'Urgent' })}</option>
        </select>

        <select
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{t('admin.support.filters.all_categories', { default: 'All Categories' })}</option>
          <option value="General">{t('admin.support.categories.general', { default: 'General' })}</option>
          <option value="Technical">{t('admin.support.categories.technical', { default: 'Technical' })}</option>
          <option value="Billing">{t('admin.support.categories.billing', { default: 'Billing' })}</option>
          <option value="Account">{t('admin.support.categories.account', { default: 'Account' })}</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.support.table.ticket', { default: 'Ticket' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.support.table.user', { default: 'User' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.support.table.status', { default: 'Status' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.support.table.priority', { default: 'Priority' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.support.table.category', { default: 'Category' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.support.table.messages', { default: 'Messages' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.support.table.last_activity', { default: 'Last Activity' })}
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                  {t('admin.support.table.actions', { default: 'Actions' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{ticket.subject}</div>
                      <div className="text-sm text-gray-500">
                        {t('admin.support.created', { 
                          date: new Date(ticket.created_at).toLocaleDateString(),
                          default: `Created: ${new Date(ticket.created_at).toLocaleDateString()}`
                        })}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{ticket.user_name}</div>
                      <div className="text-gray-500">{ticket.user_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {t(`admin.support.status.${ticket.status.toLowerCase()}`, { default: ticket.status })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                      {t(`admin.support.priority.${ticket.priority.toLowerCase()}`, { default: ticket.priority })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {t(`admin.support.categories.${ticket.category_name.toLowerCase()}`, { default: ticket.category_name })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {ticket.message_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(ticket.last_reply_at || ticket.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a
                      href={`/support/${ticket.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      {t('admin.support.actions.view', { default: 'View' })}
                    </a>
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