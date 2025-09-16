import { describe, it, expect, afterEach } from 'vitest';
import { AUTH_CONFIG, validatePassword } from '../auth';

const originalRequirements = { ...AUTH_CONFIG.PASSWORD_REQUIREMENTS };

afterEach(() => {
  Object.assign(AUTH_CONFIG.PASSWORD_REQUIREMENTS, originalRequirements);
});

describe('validatePassword', () => {
  it('fails when optional requirements are enabled but not met', () => {
    Object.assign(AUTH_CONFIG.PASSWORD_REQUIREMENTS, {
      ...originalRequirements,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SPECIAL_CHARS: true,
    });

    const result = validatePassword('password');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Le mot de passe doit contenir au moins une lettre majuscule');
    expect(result.errors).toContain('Le mot de passe doit contenir au moins un chiffre');
    expect(result.errors).toContain('Le mot de passe doit contenir au moins un caractère spécial');
  });

  it('passes when all requirements are satisfied', () => {
    Object.assign(AUTH_CONFIG.PASSWORD_REQUIREMENTS, {
      ...originalRequirements,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SPECIAL_CHARS: true,
    });

    const result = validatePassword('Password1!');

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
