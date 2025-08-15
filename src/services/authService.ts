// src/services/authService.ts
import { supabase } from '../lib/supabase-client';
import { getRedirectUrl, validatePassword } from '../config/auth';

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
      // Use the custom signup edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          phone: data.phone
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Échec de la création du compte');
      }

      // Sign in the user after successful registration
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (signInError) throw signInError;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', signInData.user.id)
        .single();

      return {
        user: signInData.user,
        profile,
        session: signInData.session
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

  async resetPassword(email: string) {
    try {
      const redirectUrl = getRedirectUrl('PASSWORD_RESET');
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      
      return { success: true };
    } catch (error: any) {
      console.error('Erreur de réinitialisation du mot de passe:', error);
      throw new Error(error.message || 'Échec de l\'envoi des instructions de réinitialisation');
    }
  }

  async updatePassword(newPassword: string) {
    try {
      // Validate password strength
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      return { success: true };
    } catch (error: any) {
      console.error('Erreur de mise à jour du mot de passe:', error);
      throw new Error(error.message || 'Échec de la mise à jour du mot de passe');
    }
  }
}

export const authService = new AuthService();