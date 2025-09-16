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
      const email = credentials.email.trim();
      const password = credentials.password;

      if (!email) {
        throw new Error('Adresse email invalide');
      }

      if (!password) {
        throw new Error('Mot de passe requis');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      if (!data?.user) {
        throw new Error('Compte utilisateur introuvable');
      }

      // Get user profile after successful login
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

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
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuration Supabase manquante');
      }

      const email = data.email.trim();
      const name = data.name.trim();

      if (!email) {
        throw new Error('Adresse email invalide');
      }

      if (!name) {
        throw new Error('Le nom est requis');
      }

      // Use the custom signup edge function
      const signupEndpoint = new URL('functions/v1/signup', supabaseUrl).toString();

      const response = await fetch(signupEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          email,
          password: data.password,
          name,
          phone: data.phone?.trim()
        })
      });

      let result: { success?: boolean; error?: string } | null = null;
      const isJsonResponse = response.headers?.get?.('content-type')?.includes('application/json');
      if (isJsonResponse) {
        try {
          result = await response.json();
        } catch (parseError) {
          console.error('Erreur lors de l\'analyse de la réponse d\'inscription:', parseError);
          throw new Error('Réponse inattendue du serveur lors de la création du compte');
        }
      } else if (response.ok) {
        result = { success: true };
      }

      if (!response.ok) {
        throw new Error(result?.error || `Échec de la création du compte (code ${response.status})`);
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Échec de la création du compte');
      }

      // Sign in the user after successful registration
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: data.password
      });

      if (signInError) throw signInError;
      if (!signInData?.user) {
        throw new Error('Compte utilisateur introuvable après inscription');
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', signInData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

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
      .maybeSingle();

    if (profileError) throw profileError;
    return profile;
  }

  async resetPassword(email: string) {
    try {
      const sanitizedEmail = email.trim();
      if (!sanitizedEmail) {
        throw new Error('Adresse email invalide');
      }

      const redirectUrl = getRedirectUrl('PASSWORD_RESET');

      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
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