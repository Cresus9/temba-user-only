import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
  user_name: string;
}

interface TicketChatProps {
  ticketId: string;
  messages: Message[];
  onNewMessage: () => void;
}

export default function TicketChat({ ticketId, messages, onNewMessage }: TicketChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      setSending(true);
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          message: newMessage.trim(),
          is_staff_reply: false
        });

      if (error) throw error;

      setNewMessage('');
      onNewMessage();
      toast.success('Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isStaffMessage = message.is_staff_reply;
          
          return (
            <div
              key={message.id}
              className={`flex ${isStaffMessage ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg ${
                  isStaffMessage
                    ? 'bg-white border border-gray-200'
                    : 'bg-indigo-600'
                }`}
              >
                {/* Message Header */}
                <div className={`px-4 py-2 border-b ${
                  isStaffMessage 
                    ? 'border-gray-200 text-gray-700'
                    : 'border-indigo-500 text-indigo-100'
                }`}>
                  <span className="font-medium">
                    {isStaffMessage ? 'Support Team' : message.user_name}
                  </span>
                </div>

                {/* Message Content */}
                <div className={`px-4 py-3 ${
                  isStaffMessage ? 'text-gray-800' : 'text-white'
                }`}>
                  <p className="whitespace-pre-wrap">{message.message}</p>
                </div>

                {/* Message Footer */}
                <div className={`px-4 py-2 text-xs ${
                  isStaffMessage ? 'text-gray-500' : 'text-indigo-200'
                }`}>
                  {new Date(message.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}