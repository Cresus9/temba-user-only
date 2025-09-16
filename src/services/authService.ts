import type { PostgrestError, Session, SupabaseClient, User } from '@supabase/supabase-js';
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

interface SignupFunctionResponse {
  success: boolean;
  error?: string;
}

export interface Profile {
  id?: string;
  user_id: string;
  email: string;
  name: string;
  phone?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  [key: string]: unknown;
}

type AuthSuccessResponse = {
  user: User;
  profile: Profile | null;
  session: Session | null;
};

export interface AuthServiceOptions {
  supabaseClient?: SupabaseClient;
  fetch?: typeof fetch;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export class AuthService {
  private readonly client: SupabaseClient;
  private readonly fetchImpl: typeof fetch;
  private readonly configuredSupabaseUrl?: string;
  private readonly configuredSupabaseAnonKey?: string;

  constructor(options: AuthServiceOptions = {}) {
    this.client = options.supabaseClient ?? supabase;

    if (options.fetch) {
      this.fetchImpl = options.fetch;
    } else if (typeof fetch === 'function') {
      this.fetchImpl = fetch;
    } else {
      throw new Error('Fetch API is not available in the current environment.');
    }

    this.configuredSupabaseUrl = options.supabaseUrl ?? undefined;
    this.configuredSupabaseAnonKey = options.supabaseAnonKey ?? undefined;
  }

  async login(credentials: LoginCredentials): Promise<AuthSuccessResponse> {
    const email = credentials.email?.trim();
    const password = credentials.password;

    if (!email) {
      throw new Error('Adresse e-mail requise');
    }

    if (!password) {
      throw new Error('Le mot de passe est requis');
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error('Utilisateur introuvable après la connexion');
      }

      const profile = await this.fetchProfile(data.user.id);

      return {
        user: data.user,
        profile,
        session: data.session ?? null,
      };
    } catch (error) {
      this.handleError(error, 'Échec de la connexion', 'Erreur de connexion:');
    }
  }

  async register(data: RegisterData): Promise<AuthSuccessResponse> {
    const email = data.email?.trim();
    const password = data.password;
    const name = data.name?.trim();
    const phone = data.phone?.trim();

    if (!email) {
      throw new Error('Adresse e-mail requise');
    }

    if (!password) {
      throw new Error('Le mot de passe est requis');
    }

    if (!name) {
      throw new Error('Le nom est requis');
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    try {
      const { supabaseUrl, supabaseAnonKey } = this.resolveSignupConfig();

      let response: Response;
      try {
        response = await this.fetchImpl(`${supabaseUrl}/functions/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            email,
            password,
            name,
            ...(phone ? { phone } : {}),
          }),
        });
      } catch (networkError) {
        throw this.normalizeError(
          networkError,
          'Impossible de contacter le serveur d\'inscription',
          true
        );
      }

      const result = await this.safeJsonParse<SignupFunctionResponse>(response);

      if (!response.ok) {
        const message =
          result?.error ||
          (await this.safeReadText(response)) ||
          `Échec de la création du compte (code ${response.status})`;
        throw new Error(message);
      }

      if (!result) {
        if (response.status === 204) {
          return await this.login({ email, password });
        }

        throw new Error('Réponse invalide du serveur d\'inscription');
      }

      if (!result.success) {
        throw new Error(result.error || 'Échec de la création du compte');
      }

      return await this.login({ email, password });
    } catch (error) {
      this.handleError(error, 'Échec de la création du compte', 'Erreur d\'inscription:');
    }
  }

  async logout(): Promise<void> {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      this.handleError(error, 'Échec de la déconnexion', 'Erreur de déconnexion:', {
        preferFallbackMessage: true,
      });
    }
  }

  async getSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error) {
        throw error;
      }
      return session ?? null;
    } catch (error) {
      this.handleError(error, 'Échec de la récupération de la session', 'Erreur de récupération de la session:', {
        preferFallbackMessage: true,
      });
    }
  }

  async getProfile(): Promise<Profile | null> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      if (error) {
        throw error;
      }

      if (!user) {
        return null;
      }

      return await this.fetchProfile(user.id);
    } catch (error) {
      this.handleError(error, 'Échec de la récupération du profil', 'Erreur de récupération du profil:');
    }
  }

  async resetPassword(email: string): Promise<{ success: true }> {
    const normalizedEmail = email?.trim();
    if (!normalizedEmail) {
      throw new Error('Adresse e-mail requise');
    }

    try {
      const redirectUrl = getRedirectUrl('PASSWORD_RESET');
      const { error } = await this.client.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      this.handleError(
        error,
        'Échec de l\'envoi des instructions de réinitialisation',
        'Erreur de réinitialisation du mot de passe:'
      );
    }
  }

  async updatePassword(newPassword: string): Promise<{ success: true }> {
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    try {
      const { error } = await this.client.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      this.handleError(error, 'Échec de la mise à jour du mot de passe', 'Erreur de mise à jour du mot de passe:');
    }
  }

  private async fetchProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (this.isRecordNotFound(error)) {
        return null;
      }

      throw error;
    }

    if (!data) {
      return null;
    }

    return data as Profile;
  }

  private resolveSignupConfig(): { supabaseUrl: string; supabaseAnonKey: string } {
    const envSupabaseUrl =
      this.configuredSupabaseUrl ??
      this.getEnvValue('VITE_SUPABASE_URL', 'SUPABASE_URL');
    const envSupabaseAnonKey =
      this.configuredSupabaseAnonKey ??
      this.getEnvValue('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');

    const supabaseUrl = typeof envSupabaseUrl === 'string' ? envSupabaseUrl.trim().replace(/\/$/, '') : '';
    const supabaseAnonKey = typeof envSupabaseAnonKey === 'string' ? envSupabaseAnonKey.trim() : '';

    if (!supabaseUrl) {
      throw new Error('Configuration Supabase manquante (URL).');
    }

    if (!supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante (clé Anon).');
    }

    return { supabaseUrl, supabaseAnonKey };
  }

  private async safeJsonParse<T>(response: Response): Promise<T | null> {
    const target = typeof response.clone === 'function' ? response.clone() : response;
    const contentType = target.headers?.get?.('content-type');
    if (!contentType || !contentType.toLowerCase().includes('application/json')) {
      return null;
    }

    try {
      return (await target.json()) as T;
    } catch (error) {
      console.warn('Impossible d\'analyser la réponse JSON de la fonction signup:', error);
      return null;
    }
  }

  private async safeReadText(response: Response): Promise<string | null> {
    const target = typeof response.clone === 'function' ? response.clone() : response;

    if (typeof target.text !== 'function') {
      return null;
    }

    try {
      const text = await target.text();
      const trimmed = text.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch (error) {
      console.warn('Impossible de lire la réponse textuelle de la fonction signup:', error);
      return null;
    }
  }

  private getEnvValue(...keys: string[]): string | undefined {
    for (const key of keys) {
      const fromImportMeta = this.readFromImportMeta(key);
      if (fromImportMeta) {
        return fromImportMeta;
      }

      const fromProcessEnv = this.readFromProcessEnv(key);
      if (fromProcessEnv) {
        return fromProcessEnv;
      }
    }

    return undefined;
  }

  private readFromImportMeta(key: string): string | undefined {
    try {
      const meta = import.meta as ImportMeta & { env?: Record<string, unknown> };
      const env = meta?.env;
      const value = env?.[key as keyof ImportMetaEnv] ?? (env?.[key] as string | undefined);
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    } catch {
      // Ignored: import.meta may not be available in all runtimes (e.g. SSR tests)
    }

    return undefined;
  }

  private readFromProcessEnv(key: string): string | undefined {
    if (typeof process === 'undefined' || typeof process.env !== 'object' || process.env === null) {
      return undefined;
    }

    const env = process.env as Record<string, string | undefined>;
    const value = env[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    return undefined;
  }

  private normalizeError(error: unknown, fallbackMessage: string, preferFallbackMessage = false): Error {
    if (!preferFallbackMessage) {
      if (error instanceof Error) {
        const message = typeof error.message === 'string' ? error.message.trim() : '';
        if (message) {
          return error;
        }
      }

      if (typeof error === 'string') {
        const trimmed = error.trim();
        if (trimmed) {
          return new Error(trimmed);
        }
      }
    }

    return new Error(fallbackMessage, { cause: error });
  }

  private isRecordNotFound(error: PostgrestError): boolean {
    return error.code === 'PGRST116'
      || error.message === 'JSON object requested, but no rows returned'
      || (typeof error.details === 'string' && error.details.includes('Results contain 0 rows'));
  }

  private handleError(
    error: unknown,
    fallbackMessage: string,
    context: string,
    options: { preferFallbackMessage?: boolean } = {}
  ): never {
    console.error(context, error);

    const { preferFallbackMessage = false } = options;
    throw this.normalizeError(error, fallbackMessage, preferFallbackMessage);
  }
}

export const authService = new AuthService();
