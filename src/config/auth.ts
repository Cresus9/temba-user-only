const REDIRECT_PATHS = {
  PASSWORD_RESET: '/reset-password',
  EMAIL_CONFIRMATION: '/login',
  OAUTH_REDIRECT: '/dashboard',
} as const;

type RedirectType = keyof typeof REDIRECT_PATHS;

type MaybeLocation = Pick<Location, 'origin' | 'hostname'>;

const getBrowserLocation = (): MaybeLocation | undefined => {
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    return window.location;
  }

  const globalLocation = (globalThis as { location?: MaybeLocation }).location;
  return globalLocation;
};

const normalizeOrigin = (origin?: string): string => {
  if (!origin) {
    return '';
  }

  return origin.replace(/\/$/, '');
};

const ensureLeadingSlash = (path: string): string => {
  if (!path.startsWith('/')) {
    return `/${path}`;
  }

  return path;
};

const buildRedirectUrl = (path: string, location = getBrowserLocation()): string => {
  const normalizedPath = ensureLeadingSlash(path);
  const origin = normalizeOrigin(location?.origin);

  if (!origin) {
    return normalizedPath;
  }

  return `${origin}${normalizedPath}`;
};

const createRedirectUrls = (
  location = getBrowserLocation(),
): Record<RedirectType, string> => {
  return (Object.keys(REDIRECT_PATHS) as RedirectType[]).reduce(
    (accumulator, key) => {
      accumulator[key] = buildRedirectUrl(REDIRECT_PATHS[key], location);
      return accumulator;
    },
    {} as Record<RedirectType, string>,
  );
};

export const AUTH_CONFIG = {
  BASE_URL: normalizeOrigin(getBrowserLocation()?.origin),
  REDIRECT_URLS: createRedirectUrls(),
  PASSWORD_REQUIREMENTS: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBERS: false,
    REQUIRE_SPECIAL_CHARS: false,
  },
  SESSION: {
    PERSIST_SESSION: true,
    AUTO_REFRESH_TOKEN: true,
    DETECT_SESSION_IN_URL: true,
    FLOW_TYPE: 'pkce' as const,
  },
} as const;

export type PasswordRequirements = typeof AUTH_CONFIG.PASSWORD_REQUIREMENTS;

export const getRedirectUrl = (type: RedirectType): string => {
  const location = getBrowserLocation();

  if (!location) {
    return AUTH_CONFIG.REDIRECT_URLS[type];
  }

  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if (isLocalhost && type === 'PASSWORD_RESET') {
    // Placeholder for local overrides if needed in the future.
  }

  return createRedirectUrls(location)[type];
};

export const validatePassword = (
  password: string,
  overrides: Partial<PasswordRequirements> = {},
): { isValid: boolean; errors: string[] } => {
  const requirements: PasswordRequirements = {
    ...AUTH_CONFIG.PASSWORD_REQUIREMENTS,
    ...overrides,
  };

  const errors: string[] = [];

  if (password.length < requirements.MIN_LENGTH) {
    errors.push(`Le mot de passe doit contenir au moins ${requirements.MIN_LENGTH} caractères`);
  }

  if (requirements.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
  }

  if (requirements.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
  }

  if (requirements.REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  if (requirements.REQUIRE_SPECIAL_CHARS && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
