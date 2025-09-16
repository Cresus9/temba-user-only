import { afterEach, describe, expect, it, vi } from 'vitest';

describe('auth configuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('builds absolute redirect URLs when browser location is available', async () => {
    const fakeLocation = { origin: 'https://example.com', hostname: 'example.com' } as Pick<Location, 'origin' | 'hostname'>;
    vi.stubGlobal('window', { location: fakeLocation } as unknown as Window);
    vi.stubGlobal('location', fakeLocation as unknown as Location);
    vi.resetModules();

    const { AUTH_CONFIG, getRedirectUrl } = await import('../auth');

    expect(AUTH_CONFIG.REDIRECT_URLS.PASSWORD_RESET).toBe('https://example.com/reset-password');
    expect(getRedirectUrl('PASSWORD_RESET')).toBe('https://example.com/reset-password');
  });

  it('falls back to relative URLs when window is unavailable', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('location', undefined);
    vi.resetModules();

    const { AUTH_CONFIG, getRedirectUrl } = await import('../auth');

    expect(AUTH_CONFIG.REDIRECT_URLS.PASSWORD_RESET).toBe('/reset-password');
    expect(getRedirectUrl('PASSWORD_RESET')).toBe('/reset-password');
  });

  it('validates password requirements with overrides', async () => {
    vi.resetModules();
    const { validatePassword } = await import('../auth');

    const short = validatePassword('short');
    expect(short.isValid).toBe(false);
    expect(short.errors).toContain('Le mot de passe doit contenir au moins 8 caractères');

    const missingNumber = validatePassword('Password!', { REQUIRE_NUMBERS: true });
    expect(missingNumber.isValid).toBe(false);
    expect(missingNumber.errors).toContain('Le mot de passe doit contenir au moins un chiffre');

    const strong = validatePassword('Str0ngPass!', {
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SPECIAL_CHARS: true,
    });

    expect(strong.isValid).toBe(true);
    expect(strong.errors).toHaveLength(0);
  });
});
