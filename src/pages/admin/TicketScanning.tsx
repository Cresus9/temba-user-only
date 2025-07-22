import React, { useState, useEffect } from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { supabase } from '../../lib/supabase-client';
import { Check, X, RotateCcw, Loader, History, Clock, MapPin, User } from 'lucide-react';
import toast from 'react-hot-toast';
import TicketScanner from '../../components/tickets/TicketScanner';

interface ScanHistory {
  id: string;
  ticket_id: string;
  event_title: string;
  ticket_type_name: string;
  user_name: string;
  scan_location: string;
  scanned_at: string;
  scanned_by_name: string;
}

export default function TicketScanning() {
  const [showHistory, setShowHistory] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (showHistory) {
      fetchScanHistory();
    }
  }, [showHistory]);

  const fetchScanHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scanned_tickets_view')
        .select('*')
        .order('scanned_at', { ascending: false });

      if (error) throw error;
      setScanHistory(data || []);
    } catch (error) {
      console.error('Error fetching scan history:', error);
      toast.error('Failed to load scan history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Scan Tickets</h1>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 text-[var(--gray-600)] hover:text-[var(--gray-900)]"
        >
          <History className="h-5 w-5" />
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      {!showHistory ? (
        <div className="space-y-6">
          <TicketScanner
            onScan={(success) => {
              if (success) {
                // Refresh history if showing
                if (showHistory) {
                  fetchScanHistory();
                }
              }
            }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="h-8 w-8 animate-spin text-[var(--primary-600)]" />
            </div>
          ) : scanHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scanned By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scanHistory.map((scan) => (
                    <tr key={scan.id} className="hover:bg-[var(--gray-50)]">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-[var(--gray-900)]">{scan.event_title}</div>
                          <div className="text-sm text-gray-500">
                            {scan.ticket_type_name} - {scan.user_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {scan.scanned_by_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {scan.scan_location}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {new Date(scan.scanned_at).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-[var(--gray-400)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">No Scan History</h3>
              <p className="text-[var(--gray-600)]">No tickets have been scanned yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
