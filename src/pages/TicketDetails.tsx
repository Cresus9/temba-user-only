import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import TicketChat from '../components/support/TicketChat';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
  user_name: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  category_name: string;
  user_name: string;
  user_email: string;
  messages: Message[];
}

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/support');
      return;
    }
    fetchTicket();
  }, [id, navigate]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get ticket details
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_ticket_details')
        .select('*')
        .eq('id', id)
        .single();

      if (ticketError) {
        if (ticketError.code === 'PGRST116') {
          throw new Error('Ticket not found');
        }
        throw ticketError;
      }

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from('support_message_details')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setTicket({
        ...ticketData,
        messages: messages || []
      });
    } catch (error: any) {
      console.error('Error fetching ticket:', error);
      setError(error.message || 'Failed to load ticket details');
      toast.error(error.message || 'Failed to load ticket details');
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

  if (error || !ticket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Ticket Not Found'}
          </h2>
          <p className="text-gray-600 mb-4">
            This ticket doesn't exist or you don't have permission to view it.
          </p>
          <Link
            to="/support"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Return to Support
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        to="/support"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Support
      </Link>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Ticket Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{ticket.subject}</h1>
              <div className="flex flex-wrap items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                  {ticket.status}
                </span>
                <span className={`text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority} Priority
                </span>
                <span className="text-sm text-gray-500">
                  {ticket.category_name}
                </span>
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Chat */}
        <TicketChat
          ticketId={ticket.id}
          messages={ticket.messages}
          onNewMessage={fetchTicket}
        />
      </div>
    </div>
  );
}