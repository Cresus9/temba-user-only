import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase-client';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  profile: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
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
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        const sessionUser = session?.user ?? null;
        if (!isMountedRef.current) return;

        setUser(sessionUser);

        if (sessionUser) {
          setLoading(true);
          await loadProfile(sessionUser.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de la session:', error);
        if (!isMountedRef.current) return;
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMountedRef.current) {
        return;
      }

      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        setLoading(true);
        await loadProfile(sessionUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!isMountedRef.current) return;
      setProfile(data ?? null);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      if (!isMountedRef.current) return;
      toast.error('Échec du chargement du profil utilisateur');
      setProfile(null);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
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
      setLoading(false);
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

  const value = {
    user,
    profile,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateProfile
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