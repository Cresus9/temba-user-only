import type { PostgrestError, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService, type AuthServiceOptions, type Profile } from '../authService';
import { getRedirectUrl } from '../../config/auth';

type SupabaseAuthMock = {
  signInWithPassword: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  getUser: ReturnType<typeof vi.fn>;
  resetPasswordForEmail: ReturnType<typeof vi.fn>;
  updateUser: ReturnType<typeof vi.fn>;
};

type SupabaseQueryBuilderMock = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

type SupabaseMock = {
  client: SupabaseClient;
  auth: SupabaseAuthMock;
  queryBuilder: SupabaseQueryBuilderMock;
  from: ReturnType<typeof vi.fn>;
};

const createSupabaseMock = (): SupabaseMock => {
  const queryBuilder: SupabaseQueryBuilderMock = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);

  const auth: SupabaseAuthMock = {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  };

  const from = vi.fn().mockReturnValue(queryBuilder);

  const client = {
    auth,
    from,
  } as unknown as SupabaseClient;

  return { client, auth, queryBuilder, from };
};

const createJsonResponse = (body: unknown, init?: ResponseInit): Response => {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
};

const createTextResponse = (text: string, init?: ResponseInit): Response => {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('content-type')) {
    headers.set('content-type', 'text/plain');
  }

  return new Response(text, {
    ...init,
    headers,
  });
};

describe('AuthService', () => {
  let supabaseMock: SupabaseMock;

  const buildService = (options: Partial<AuthServiceOptions> = {}) => {
    return new AuthService({
      supabaseClient: supabaseMock.client,
      ...options,
    });
  };

  beforeEach(() => {
    supabaseMock = createSupabaseMock();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs in and returns the user session with profile', async () => {
    const user = { id: 'user-1' } as User;
    const session = { access_token: 'token' } as Session;
    const profile: Profile = {
      user_id: 'user-1',
      email: 'user@example.com',
      name: 'User',
    };

    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user, session },
      error: null,
    });

    supabaseMock.queryBuilder.single.mockResolvedValue({ data: profile, error: null });

    const service = buildService();
    const result = await service.login({ email: '  user@example.com  ', password: 'password123' });

    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result).toEqual({ user, profile, session });
  });

  it('returns a null profile when none exists for the user', async () => {
    const user = { id: 'user-2' } as User;

    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user, session: null },
      error: null,
    });

    const notFoundError = {
      code: 'PGRST116',
      message: 'JSON object requested, but no rows returned',
    } as PostgrestError;

    supabaseMock.queryBuilder.single.mockResolvedValue({ data: null, error: notFoundError });

    const service = buildService();
    const result = await service.login({ email: 'user@example.com', password: 'password123' });

    expect(result.profile).toBeNull();
  });

  it('registers a user through the signup function then logs them in', async () => {
    const user = { id: 'user-3' } as User;
    const session = { access_token: 'token' } as Session;
    const profile: Profile = {
      user_id: 'user-3',
      email: 'new@example.com',
      name: 'New User',
    };

    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ success: true }));

    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user, session },
      error: null,
    });

    supabaseMock.queryBuilder.single.mockResolvedValue({ data: profile, error: null });

    const service = buildService({
      fetch: fetchMock,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
    });

    const result = await service.register({
      email: ' new@example.com ',
      password: 'password123',
      name: '  New User ',
      phone: ' 123456 ',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/functions/v1/signup');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer anon-key',
    });
    expect(JSON.parse(options?.body as string)).toEqual({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
      phone: '123456',
    });

    expect(result).toEqual({ user, profile, session });
  });

  it('rejects registration attempts with weak passwords before calling the API', async () => {
    const fetchMock = vi.fn();
    const service = buildService({
      fetch: fetchMock,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
    });

    await expect(
      service.register({ email: 'user@example.com', password: 'short', name: 'User' })
    ).rejects.toThrow('Le mot de passe doit contenir au moins 8 caractères');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('propagates errors returned by the signup function', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      )
    );

    const service = buildService({
      fetch: fetchMock,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
    });

    await expect(
      service.register({ email: 'user@example.com', password: 'password123', name: 'User' })
    ).rejects.toThrow('Email already exists');

    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('surfaces plain text errors returned by the signup function', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createTextResponse('Service indisponible', { status: 503 })
    );

    const service = buildService({
      fetch: fetchMock,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
    });

    await expect(
      service.register({ email: 'user@example.com', password: 'password123', name: 'User' })
    ).rejects.toThrow('Service indisponible');

    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('throws a friendly error when the signup endpoint is unreachable', async () => {
    const networkError = new TypeError('Failed to fetch');
    const fetchMock = vi.fn().mockRejectedValue(networkError);

    const service = buildService({
      fetch: fetchMock,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
    });

    await expect(
      service.register({ email: 'user@example.com', password: 'password123', name: 'User' })
    ).rejects.toMatchObject({
      message: "Impossible de contacter le serveur d'inscription",
      cause: networkError,
    });

    expect(console.error).toHaveBeenCalledWith(
      "Erreur d'inscription:",
      expect.objectContaining({ message: "Impossible de contacter le serveur d'inscription" })
    );
    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('accepts successful signup responses without a JSON body', async () => {
    const user = { id: 'user-5' } as User;
    const session = { access_token: 'token' } as Session;
    const profile: Profile = {
      user_id: 'user-5',
      email: 'nojson@example.com',
      name: 'No Json',
    };

    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user, session },
      error: null,
    });

    supabaseMock.queryBuilder.single.mockResolvedValue({ data: profile, error: null });

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const service = buildService({
      fetch: fetchMock,
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
    });

    const result = await service.register({
      email: 'nojson@example.com',
      password: 'password123',
      name: 'No Json',
    });

    expect(result).toEqual({ user, profile, session });
  });

  it('falls back to process.env when Vite env variables are blank', async () => {
    const originalSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const originalSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const originalProcessUrl = process.env.SUPABASE_URL;
    const originalProcessAnon = process.env.SUPABASE_ANON_KEY;

    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    process.env.SUPABASE_URL = 'https://process.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'process-anon-key';

    const user = { id: 'user-6' } as User;
    const session = { access_token: 'token' } as Session;
    const profile: Profile = {
      user_id: 'user-6',
      email: 'process@example.com',
      name: 'Process User',
    };

    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user, session },
      error: null,
    });
    supabaseMock.queryBuilder.single.mockResolvedValue({ data: profile, error: null });

    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ success: true }));

    const service = buildService({ fetch: fetchMock });

    try {
      await service.register({
        email: 'process@example.com',
        password: 'password123',
        name: 'Process User',
      });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://process.supabase.co/functions/v1/signup');
      expect(options?.headers).toMatchObject({ Authorization: 'Bearer process-anon-key' });
    } finally {
      vi.stubEnv('VITE_SUPABASE_URL', originalSupabaseUrl);
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', originalSupabaseAnonKey);

      if (typeof originalProcessUrl === 'string') {
        process.env.SUPABASE_URL = originalProcessUrl;
      } else {
        delete process.env.SUPABASE_URL;
      }

      if (typeof originalProcessAnon === 'string') {
        process.env.SUPABASE_ANON_KEY = originalProcessAnon;
      } else {
        delete process.env.SUPABASE_ANON_KEY;
      }
    }
  });

  it('retrieves the current session from Supabase', async () => {
    const session = { access_token: 'token' } as Session;
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session }, error: null });

    const service = buildService();
    const result = await service.getSession();

    expect(result).toBe(session);
  });

  it('throws a fallback error when session retrieval fails', async () => {
    const sessionError = new Error('Session unavailable');
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: sessionError,
    });

    const service = buildService();

    await expect(service.getSession()).rejects.toMatchObject({
      message: 'Échec de la récupération de la session',
      cause: sessionError,
    });
  });

  it('logs out the current user session', async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });

    const service = buildService();
    await service.logout();

    expect(supabaseMock.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('throws a fallback error when logout fails', async () => {
    const logoutError = new Error('Logout failed');
    supabaseMock.auth.signOut.mockResolvedValue({ error: logoutError });

    const service = buildService();

    await expect(service.logout()).rejects.toMatchObject({
      message: 'Échec de la déconnexion',
      cause: logoutError,
    });
  });

  it('returns null when no authenticated user is available for profile lookup', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const service = buildService();
    const result = await service.getProfile();

    expect(result).toBeNull();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('retrieves the current user profile when a session exists', async () => {
    const user = { id: 'user-4' } as User;
    const profile: Profile = {
      user_id: 'user-4',
      email: 'user4@example.com',
      name: 'User 4',
    };

    supabaseMock.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    supabaseMock.queryBuilder.single.mockResolvedValue({ data: profile, error: null });

    const service = buildService();
    const result = await service.getProfile();

    expect(result).toEqual(profile);
  });

  it('trims the email before requesting a password reset', async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    const service = buildService();
    await service.resetPassword('  reset@example.com  ');

    expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'reset@example.com',
      expect.objectContaining({ redirectTo: getRedirectUrl('PASSWORD_RESET') })
    );
  });

  it('validates password strength before attempting an update', async () => {
    const service = buildService();

    await expect(service.updatePassword('short')).rejects.toThrow(
      'Le mot de passe doit contenir au moins 8 caractères'
    );

    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it('updates the password when validation passes', async () => {
    supabaseMock.auth.updateUser.mockResolvedValue({ error: null });

    const service = buildService();
    await service.updatePassword('password123');

    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: 'password123' });
  });
});
