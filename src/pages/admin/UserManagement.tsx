import React, { useState, useEffect } from 'react';
import { Search, Mail, Phone, Shield, UserX, Send, Users, Loader, AlertCircle, MoreVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useTranslation } from '../../context/TranslationContext';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    search: ''
  });
  const { t } = useTranslation();

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('admin.users.error.load', { default: 'Failed to load users' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(t('admin.users.success.role_update', { default: 'User role updated successfully' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error(t('admin.users.error.role_update', { default: 'Failed to update user role' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  };

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(t('admin.users.success.status_update', { default: 'User status updated successfully' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error(t('admin.users.error.status_update', { default: 'Failed to update user status' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t('admin.users.confirm.delete', { 
      default: 'Are you sure you want to delete this user? This action cannot be undone.' 
    }))) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      
      toast.success(t('admin.users.success.delete', { default: 'User deleted successfully' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('admin.users.error.delete', { default: 'Failed to delete user' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    }
  };

  const handleSendNotification = async (userId: string) => {
    const message = prompt(t('admin.users.actions.send_message', { default: 'Enter message:' }));
    if (!message) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: 'Admin Notification',
          message,
          type: 'INFO'
        });

      if (error) throw error;
      toast.success(t('admin.users.success.message_sent', { default: 'Message sent successfully' }), {
        icon: <img src="/favicon.svg" alt="Temba Icon" className="w-6 h-6" />,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(t('admin.users.error.message_send', { default: 'Failed to send message' }), {
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('admin.users.title', { default: 'User Management' })}
        </h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('admin.users.search', { default: 'Search users...' })}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={filters.role}
          onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{t('admin.users.filters.all_roles', { default: 'All Roles' })}</option>
          <option value="USER">{t('admin.users.roles.user', { default: 'User' })}</option>
          <option value="ADMIN">{t('admin.users.roles.admin', { default: 'Admin' })}</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{t('admin.users.filters.all_status', { default: 'All Status' })}</option>
          <option value="ACTIVE">{t('admin.users.status.active', { default: 'Active' })}</option>
          <option value="SUSPENDED">{t('admin.users.status.suspended', { default: 'Suspended' })}</option>
          <option value="BANNED">{t('admin.users.status.banned', { default: 'Banned' })}</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.users.table.user', { default: 'User' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.users.table.contact', { default: 'Contact' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.users.table.role', { default: 'Role' })}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  {t('admin.users.table.status', { default: 'Status' })}
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                  {t('admin.users.table.actions', { default: 'Actions' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-600">
                          {user.name[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Phone className="h-4 w-4" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="px-3 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="USER">{t('admin.users.roles.user', { default: 'User' })}</option>
                      <option value="ADMIN">{t('admin.users.roles.admin', { default: 'Admin' })}</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.status}
                      onChange={(e) => handleStatusChange(user.id, e.target.value)}
                      className={`px-3 py-1 rounded-lg ${
                        user.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : user.status === 'SUSPENDED'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      <option value="ACTIVE">{t('admin.users.status.active', { default: 'Active' })}</option>
                      <option value="SUSPENDED">{t('admin.users.status.suspended', { default: 'Suspended' })}</option>
                      <option value="BANNED">{t('admin.users.status.banned', { default: 'Banned' })}</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSendNotification(user.id)}
                        className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100"
                        title={t('admin.users.actions.send_message', { default: 'Send Message' })}
                      >
                        <Send className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                        title={t('admin.users.actions.delete', { default: 'Delete User' })}
                      >
                        <UserX className="h-5 w-5" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        title={t('admin.users.actions.more', { default: 'More Actions' })}
                      >
                        <MoreVertical className="h-5 w-5" />
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