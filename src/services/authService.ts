// src/services/authService.ts
import { supabase } from '../lib/supabase-client';
import { getRedirectUrl, validatePassword } from '../config/auth';
import { normalizePhone, isValidPhone, detectInputType } from '../utils/phoneValidation';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email?: string;  // Optional for phone-only signup
  password: string;
  phone?: string;
}

interface PhoneRegisterData {
  name: string;
  phone: string;
  password: string;
}

class AuthService {
  /**
   * Login with email or phone number
   * Automatically detects input type and handles accordingly
   */
  async login(credentials: LoginCredentials) {
    try {
      const inputType = detectInputType(credentials.email);
      let emailForAuth = credentials.email;

      // If input is a phone number, try to construct the temp email format
      // used for phone signups: {phoneDigits}@temba.temp
      if (inputType === 'phone') {
        const normalizedPhone = normalizePhone(credentials.email);
        // Generate temp email format: remove all non-digits and append @temba.temp
        const phoneDigits = normalizedPhone.replace(/[^0-9]/g, '');
        emailForAuth = `${phoneDigits}@temba.temp`;
      }

      // Try to authenticate with the email (original or constructed from phone)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailForAuth,
        password: credentials.password
      });

      // If authentication fails and we tried phone format, provide helpful error
      if (error) {
        if (inputType === 'phone') {
          // Check if it's an invalid credentials error
          if (error.message?.includes('Invalid login credentials') || 
              error.message?.includes('Invalid password') ||
              error.message?.includes('Email not confirmed')) {
            throw new Error('Numéro de téléphone ou mot de passe incorrect');
          }
          throw new Error('Aucun compte trouvé avec ce numéro de téléphone. Veuillez vérifier le numéro ou créer un compte.');
        }
        throw error;
      }

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

  /**
   * Send OTP code to phone number via SMS
   */
  async sendOTP(phone: string) {
    try {
      if (!isValidPhone(phone)) {
        throw new Error('Format de numéro de téléphone invalide. Utilisez le format international: +[code pays][numéro]');
      }

      const normalizedPhone = normalizePhone(phone);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({ phone: normalizedPhone })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send OTP' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to send OTP`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Erreur envoi OTP:', error);
      throw new Error(error.message || 'Échec de l\'envoi du code de vérification');
    }
  }

  /**
   * Verify OTP code for phone number
   */
  async verifyOTP(phone: string, code: string): Promise<boolean> {
    try {
      if (!isValidPhone(phone)) {
        throw new Error('Format de numéro de téléphone invalide');
      }

      if (!code || code.length !== 6) {
        throw new Error('Le code de vérification doit contenir 6 chiffres');
      }

      const normalizedPhone = normalizePhone(phone);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          code: code.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to verify OTP' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to verify OTP`);
      }

      const result = await response.json();
      return result.valid === true;
    } catch (error: any) {
      console.error('Erreur vérification OTP:', error);
      throw new Error(error.message || 'Échec de la vérification du code');
    }
  }

  /**
   * Register with email or phone
   * For phone signup, email should be a temporary email generated from phone
   */
  async register(data: RegisterData) {
    try {
      let emailForAuth = data.email;
      
      // If phone is provided but no email, generate temporary email for phone-only signup
      if (data.phone && !data.email) {
        const normalizedPhone = normalizePhone(data.phone);
        // Create temporary email: phone number digits @temba.temp
        const phoneDigits = normalizedPhone.replace(/[^0-9]/g, '');
        emailForAuth = `${phoneDigits}@temba.temp`;
      }

      if (!emailForAuth) {
        throw new Error('Email ou numéro de téléphone requis');
      }

      // Use the custom signup edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email: emailForAuth,
          password: data.password,
          name: data.name,
          phone: data.phone ? normalizePhone(data.phone) : undefined
        })
      });

      const result = await response.json();

      if (!result.success) {
        // Check if error indicates existing user
        const errorMsg = result.error || '';
        if (
          errorMsg.includes('already been registered') || 
          errorMsg.includes('already exists') ||
          errorMsg.includes('User already registered') ||
          errorMsg.includes('duplicate')
        ) {
          // If this was a phone signup, provide phone-specific message
          if (data.phone && !data.email) {
            throw new Error('Un compte existe déjà avec ce numéro de téléphone. Veuillez vous connecter au lieu de créer un nouveau compte.');
          }
          throw new Error('Un compte existe déjà avec cette adresse email. Veuillez vous connecter.');
        }
        throw new Error(result.error || 'Échec de la création du compte');
      }

      // Sign in the user after successful registration
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailForAuth,
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

  /**
   * Register using phone number with OTP verification
   * Two-step process: send OTP, verify OTP, then create account
   */
  async registerWithPhone(data: PhoneRegisterData): Promise<void> {
    try {
      if (!isValidPhone(data.phone)) {
        throw new Error('Format de numéro de téléphone invalide. Utilisez le format international: +[code pays][numéro]');
      }

      const normalizedPhone = normalizePhone(data.phone);
      
      // Step 1: Verify OTP was already sent and verified (should be done before calling this)
      // Step 2: Create account with phone
      await this.register({
        name: data.name,
        password: data.password,
        phone: normalizedPhone
        // email will be auto-generated as temp email
      });
    } catch (error: any) {
      console.error('Erreur inscription par téléphone:', error);
      
      // Handle specific Supabase auth error for existing email/user
      const errorMessage = error.message || '';
      if (
        errorMessage.includes('already been registered') || 
        errorMessage.includes('already exists') ||
        errorMessage.includes('User already registered') ||
        errorMessage.includes('duplicate key')
      ) {
        throw new Error('Un compte existe déjà avec ce numéro de téléphone. Veuillez vous connecter au lieu de créer un nouveau compte.');
      }
      
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

  /**
   * Reset password using phone number and OTP verification
   * This method calls an edge function that verifies OTP and updates the password
   * @param phone - Phone number in E.164 format
   * @param newPassword - New password to set
   * @param otpCode - Optional OTP code (if not provided, assumes OTP was already verified)
   */
  async resetPasswordWithPhone(phone: string, newPassword: string, otpCode?: string) {
    try {
      if (!isValidPhone(phone)) {
        throw new Error('Format de numéro de téléphone invalide');
      }

      // Validate password strength
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const normalizedPhone = normalizePhone(phone);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/reset-password-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          newPassword: newPassword,
          otpCode: otpCode
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to reset password' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to reset password`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Échec de la réinitialisation du mot de passe');
      }

      return result;
    } catch (error: any) {
      console.error('Erreur réinitialisation mot de passe par téléphone:', error);
      throw new Error(error.message || 'Échec de la réinitialisation du mot de passe');
    }
  }
}

export const authService = new AuthService();