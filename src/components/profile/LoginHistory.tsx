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
      <div className="flex justify-center items-center min-h-[160px]">
        <div className="grid place-items-center w-10 h-10 rounded-full bg-brand-50">
          <Loader className="h-4 w-4 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  if (!loginHistory.length) {
    return (
      <div className="text-center py-8 px-4 bg-cream/40 rounded-xl2 border border-line border-dashed">
        <div className="grid place-items-center w-12 h-12 rounded-full bg-cream-deep mx-auto mb-3">
          <AlertCircle className="h-5 w-5 text-ink-mute" />
        </div>
        <p className="eyebrow !mb-1">Aucun historique</p>
        <p className="text-[13px] text-ink-mute">
          Vos prochaines connexions apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-2">
      {loginHistory.map((record, idx) => (
        <li
          key={record.id}
          className="bg-cream/40 p-3 rounded-xl2 border border-line hover:border-brand/40 transition-colors"
        >
          <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-brand-50 ring-1 ring-brand-100 flex-shrink-0">
                <Globe className="h-4 w-4 text-brand" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-bold text-ink leading-tight">
                    {record.location || 'Lieu inconnu'}
                  </p>
                  {idx === 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.08em] bg-green-50 text-green-700 ring-1 ring-green-200">
                      Récent
                    </span>
                  )}
                </div>
                <p
                  className="text-[11px] text-ink-mute tabular-nums"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                >
                  IP · {record.ip_address || '—'}
                </p>
                <p className="text-[11px] text-ink-mute/85 mt-1 line-clamp-2">
                  {record.user_agent}
                </p>
              </div>
            </div>
            <div
              className="flex items-center gap-1.5 text-[11px] text-ink-mute tabular-nums flex-shrink-0 sm:pt-1"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
            >
              <Calendar className="h-3 w-3" />
              {new Date(record.created_at).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}