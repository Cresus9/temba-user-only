import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase-client';
import { authService } from '../services/authService';
import { ticketTransferService } from '../services/ticketTransferService';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  profile: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  pendingTransfers: any[];
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  checkPendingTransfers: () => Promise<void>;
  claimPendingTransfer: (transferId: string) => Promise<boolean>;
  refreshUserTickets: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface Profile {
  name: string;
  phone?: string;
  location?: string;
  bio?: string;
  role?: string;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const lastCheckRef = useRef<string | null>(null); // Track last check to prevent duplicate calls
  const checkingRef = useRef(false); // Prevent concurrent calls

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setPendingTransfers([]);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setPendingTransfers([]);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Check for pending transfers after user and profile are set (separate effect to avoid loops)
  useEffect(() => {
    if (!user || checkingRef.current) {
      return;
    }

    // Create a unique key for this user/profile combination
    const checkKey = `${user.email}-${profile?.phone || 'no-phone'}`;
    
    // Only check if this is a new user/profile combination
    if (lastCheckRef.current === checkKey) {
      return; // Already checked for this user/profile
    }

    // Mark as checking and update last check
    checkingRef.current = true;
    lastCheckRef.current = checkKey;

    // Perform the check
    checkPendingTransfers().finally(() => {
      checkingRef.current = false;
    });

    // Cleanup on unmount or user change
    return () => {
      if (!user) {
        setPendingTransfers([]);
        lastCheckRef.current = null;
        checkingRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, profile?.phone]); // Only depend on email and phone, not full objects

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      toast.error('Échec du chargement du profil utilisateur');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { user: authUser } = await authService.login({ email, password });
      if (!authUser) throw new Error('Échec de la connexion');
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      await authService.register(data);
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setProfile(null);
    } catch (error: any) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('Aucun utilisateur connecté');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Erreur de mise à jour du profil:', error);
      throw error;
    }
  };

  const checkPendingTransfers = useCallback(async () => {
    if (!user) {
      return;
    }

    // Prevent concurrent calls
    if (checkingRef.current) {
      return;
    }

    // Prevent duplicate calls with same user email
    const checkKey = `${user.email}-${profile?.phone || 'no-phone'}`;
    if (lastCheckRef.current === checkKey) {
      return;
    }

    checkingRef.current = true;
    lastCheckRef.current = checkKey;

    console.log('🔍 checkPendingTransfers: Checking for user:', user.email, 'phone:', profile?.phone);

    try {
      // Check for pending transfers by email or phone
      const { data: transfers, error } = await supabase
        .from('ticket_transfers')
        .select(`
          id,
          ticket_id,
          sender_id,
          recipient_email,
          recipient_phone,
          recipient_name,
          message,
          status,
          created_at
        `)
        .eq('status', 'PENDING')
        .eq('recipient_email', user.email);

      if (error) {
        console.error('Error fetching pending transfers:', error);
        checkingRef.current = false;
        return;
      }

      // If no transfers found by email and user has phone, try phone
      let finalTransfers = transfers;
      if ((!transfers || transfers.length === 0) && profile?.phone) {
        console.log('🔍 No transfers by email, trying phone:', profile.phone);
        const { data: phoneTransfers, error: phoneError } = await supabase
          .from('ticket_transfers')
          .select(`
            id,
            ticket_id,
            sender_id,
            recipient_email,
            recipient_phone,
            recipient_name,
            message,
            status,
            created_at
          `)
          .eq('status', 'PENDING')
          .eq('recipient_phone', profile.phone);
        
        console.log('📱 Phone transfers result:', phoneTransfers, 'error:', phoneError);
        if (!phoneError) {
          finalTransfers = phoneTransfers;
        }
      }

      // If we have transfers, fetch additional data separately
      if (finalTransfers && finalTransfers.length > 0) {
        const enrichedTransfers = await Promise.all(
          finalTransfers.map(async (transfer) => {
            // Get sender info
            const { data: sender } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('user_id', transfer.sender_id)
              .single();

            // Get ticket info
            const { data: ticket } = await supabase
              .from('tickets')
              .select(`
                id,
                event_id,
                ticket_type_id,
                status,
                event:events (
                  title,
                  date,
                  venue
                )
              `)
              .eq('id', transfer.ticket_id)
              .single();

            return {
              ...transfer,
              sender: sender || { name: 'Unknown', email: 'unknown@example.com' },
              ticket: ticket || null
            };
          })
        );

        setPendingTransfers(enrichedTransfers);
      } else {
        setPendingTransfers([]);
      }
    } catch (error) {
      console.error('Error checking pending transfers:', error);
    } finally {
      checkingRef.current = false;
    }
  }, [user, profile?.phone]);

  const claimPendingTransfer = async (transferId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('claim-pending-transfer', {
        body: { transferId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        console.error('Error claiming transfer:', error);
        toast.error('Erreur lors de la réclamation du billet');
        return false;
      }

      if (data.success) {
        toast.success('Billet récupéré avec succès!');
        // Refresh pending transfers and user tickets
        await checkPendingTransfers();
        await refreshUserTickets();
        return true;
      } else {
        toast.error(data.error || 'Erreur lors de la réclamation');
        return false;
      }
    } catch (error) {
      console.error('Error claiming transfer:', error);
      toast.error('Erreur lors de la réclamation du billet');
      return false;
    }
  };

  const refreshUserTickets = async () => {
    // This method can be called to refresh ticket data
    // It's useful after claiming transfers or other ticket operations
    if (!user) return;

    try {
      // Trigger a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('tickets-refreshed'));
    } catch (error) {
      console.error('Error refreshing tickets:', error);
    }
  };

  const value = {
    user,
    profile,
    isAuthenticated: !!user,
    loading,
    pendingTransfers,
    login,
    register,
    logout,
    updateProfile,
    checkPendingTransfers,
    claimPendingTransfer,
    refreshUserTickets
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}