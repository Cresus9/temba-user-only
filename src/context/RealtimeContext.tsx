import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase-client';

interface RealtimeContextType {
  isConnected: boolean;
  onlineUsers: Set<string>;
  joinEventRoom: (eventId: string) => void;
  leaveEventRoom: (eventId: string) => void;
  sendChatMessage: (eventId: string, message: string) => void;
  setTyping: (eventId: string, isTyping: boolean) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to presence changes
    const presenceChannel = supabase.channel('online-users');
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const online = new Set(Object.keys(state));
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => new Set(prev).add(key));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: user.id });
          setIsConnected(true);
        }
      });

    return () => {
      presenceChannel.unsubscribe();
      setIsConnected(false);
    };
  }, [user]);

  const joinEventRoom = async (eventId: string) => {
    if (!user) return;

    const channel = supabase.channel(`event:${eventId}`);
    await channel.subscribe();
  };

  const leaveEventRoom = async (eventId: string) => {
    const channels = supabase.getChannels();
    const channel = channels.find(ch => ch.topic === `event:${eventId}`);
    if (channel) {
      await channel.unsubscribe();
    }
  };

  const sendChatMessage = async (eventId: string, message: string) => {
    if (!user) return;

    await supabase
      .from('event_messages')
      .insert({
        event_id: eventId,
        user_id: user.id,
        message
      });
  };

  const setTyping = async (eventId: string, isTyping: boolean) => {
    if (!user) return;

    const channel = supabase.channel(`event:${eventId}`);
    if (isTyping) {
      await channel.track({ user_id: user.id, typing: true });
    } else {
      await channel.untrack();
    }
  };

  return (
    <RealtimeContext.Provider value={{
      isConnected,
      onlineUsers,
      joinEventRoom,
      leaveEventRoom,
      sendChatMessage,
      setTyping
    }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}