import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const authMock = {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  };

  const createProfileBuilder = () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };

    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.maybeSingle.mockResolvedValue({ data: { id: 'profile-id' }, error: null });

    return builder;
  };

  let currentProfileBuilder = createProfileBuilder();
  const fromMock = vi.fn(() => currentProfileBuilder);

  const resetProfileBuilder = () => {
    currentProfileBuilder = createProfileBuilder();
    fromMock.mockImplementation(() => currentProfileBuilder);
    return currentProfileBuilder;
  };

  return {
    authMock,
    fromMock,
    resetProfileBuilder,
    getProfileBuilder: () => currentProfileBuilder,
  };
});

vi.mock('../../lib/supabase-client', () => ({
  supabase: {
    auth: mocks.authMock,
    from: mocks.fromMock,
  },
}));

import { authService } from '../authService';

const { authMock, resetProfileBuilder, getProfileBuilder } = mocks;

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    resetProfileBuilder();

    authMock.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-id', email: 'user@example.com' },
        session: { access_token: 'token' }
      },
      error: null,
    });

    authMock.signOut.mockResolvedValue({ error: null });
    authMock.getSession.mockResolvedValue({ data: { session: null }, error: null });
    authMock.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null });
    authMock.resetPasswordForEmail.mockResolvedValue({ error: null });
    authMock.updateUser.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('register', () => {
    it('rejects weak passwords before calling the signup endpoint', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await expect(authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'short',
      })).rejects.toThrow('Le mot de passe doit contenir au moins 8 caractères');

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('propagates errors returned by the signup endpoint', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

      const responseJson = { success: false, error: 'Email déjà utilisé' };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
        },
        json: vi.fn().mockResolvedValue(responseJson),
      });

      vi.stubGlobal('fetch', fetchMock);

      await expect(authService.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
      })).rejects.toThrow('Email déjà utilisé');

      expect(authMock.signInWithPassword).not.toHaveBeenCalled();
    });

    it('normalises email before attempting login after registration', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
        },
        json: vi.fn().mockResolvedValue({ success: true }),
      });

      vi.stubGlobal('fetch', fetchMock);

      const signInSpy = authMock.signInWithPassword.mockImplementation(async (params) => ({
        data: {
          user: { id: 'user-id', email: params.email },
          session: { access_token: 'token' },
        },
        error: null,
      }));

      getProfileBuilder().maybeSingle.mockResolvedValue({ data: { id: 'profile-id' }, error: null });

      const result = await authService.register({
        name: ' Test User ',
        email: ' USER@example.com ',
        password: 'Password123',
      });

      expect(signInSpy).toHaveBeenCalledWith({
        email: 'USER@example.com',
        password: 'Password123',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.user.email).toBe('USER@example.com');
    });
  });
});
