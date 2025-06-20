import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase-client';
import { Loader, Globe, AlertCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface LoginRecord {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  location: string;
  created_at: string;
}

export default function LoginHistory() {
  const [loading, setLoading] = useState(true);
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);

  useEffect(() => {
    fetchLoginHistory();
  }, []);

  const fetchLoginHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('auth_audit_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLoginHistory(data || []);
    } catch (error) {
      console.error('Error fetching login history:', error);
      toast.error('Failed to load login history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!loginHistory.length) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Login History</h3>
        <p className="text-gray-600">Your login activity will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loginHistory.map((record) => (
        <div
          key={record.id}
          className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Globe className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Login from {record.location || 'Unknown Location'}
                </p>
                <p className="text-sm text-gray-600">
                  IP: {record.ip_address}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {record.user_agent}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              {new Date(record.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}