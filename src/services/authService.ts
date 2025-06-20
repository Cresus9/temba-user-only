// src/services/authService.ts
import { supabase } from '../lib/supabase-client';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

class AuthService {
  async login(credentials: LoginCredentials) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) throw error;

      // Get user profile after successful login
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      return {
        user: data.user,
        profile,
        session: data.session
      };
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      throw new Error(error.message || 'Échec de la connexion');
    }
  }

  async register(data: RegisterData) {
    try {
      // Sign up the user - Supabase will send the confirmation email automatically
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            phone: data.phone
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Aucun utilisateur retourné lors de l\'inscription');

      // Return the user data
      return {
        user: authData.user,
        session: authData.session
      };
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
      throw new Error(error.message || 'Échec de la création du compte');
    }
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  }

  async getProfile() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) throw profileError;
    return profile;
  }
}

export const authService = new AuthService();