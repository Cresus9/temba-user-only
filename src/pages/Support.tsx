import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Clock, AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import NewTicketModal from '../components/support/NewTicketModal';
import { useTranslation } from '../context/TranslationContext';
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
}

export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('support_ticket_details')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load support tickets');
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
        return 'text-[var(--gray-600)]';
      case 'MEDIUM':
        return 'text-blue-600';
      case 'HIGH':
        return 'text-orange-600';
      case 'URGENT':
        return 'text-[var(--error-600)]';
      default:
        return 'text-[var(--gray-600)]';
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back button */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-[var(--gray-600)] hover:text-[var(--gray-900)] mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        {t('support.back_to_dashboard', { default: 'Back to Dashboard' })}
      </Link>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)]">
            {t('support.title', { default: 'Support' })}
          </h1>
          <p className="text-[var(--gray-600)]">
            {t('support.description', { default: 'View and manage your support tickets' })}
          </p>
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)]"
        >
          <Plus className="h-5 w-5" />
          {t('support.new_ticket', { default: 'New Ticket' })}
        </button>
      </div>

      {tickets.length > 0 ? (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/support/${ticket.id}`}
              className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-5 w-5 text-[var(--gray-400)]" />
                      <h3 className="font-medium text-[var(--gray-900)]">{ticket.subject}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{ticket.category_name}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                      {ticket.last_reply_at && (
                        <span>Last reply: {new Date(ticket.last_reply_at).toLocaleDateString()}</span>
                      )}
                      <span>Messages: {ticket.message_count}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <MessageSquare className="h-12 w-12 text-[var(--gray-400)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">
            {t('support.no_tickets.title', { default: 'No Support Tickets' })}
          </h3>
          <p className="text-[var(--gray-600)] mb-4">
            {t('support.no_tickets.description', { default: 'You haven\'t created any support tickets yet' })}
          </p>
          <button
            onClick={() => setShowNewTicket(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)]"
          >
            <Plus className="h-5 w-5" />
            {t('support.create_first_ticket', { default: 'Create Your First Ticket' })}
          </button>
        </div>
      )}

      {showNewTicket && (
        <NewTicketModal
          onClose={() => setShowNewTicket(false)}
          onSuccess={() => {
            setShowNewTicket(false);
            fetchTickets();
          }}
        />
      )}
    </div>
  );
}
