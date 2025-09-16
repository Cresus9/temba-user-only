// Authentication configuration
export const AUTH_CONFIG = {
  // Base URL for the application
  BASE_URL: window.location.origin,
  
  // Redirect URLs for different authentication flows
  REDIRECT_URLS: {
    // Password reset redirect URL
    PASSWORD_RESET: `${window.location.origin}/reset-password`,
    
    // Email confirmation redirect URL (if needed)
    EMAIL_CONFIRMATION: `${window.location.origin}/login`,
    
    // OAuth redirect URL (if needed)
    OAUTH_REDIRECT: `${window.location.origin}/dashboard`,
  },
  
  // Password requirements
  PASSWORD_REQUIREMENTS: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBERS: false,
    REQUIRE_SPECIAL_CHARS: false,
  },
  
  // Session configuration
  SESSION: {
    PERSIST_SESSION: true,
    AUTO_REFRESH_TOKEN: true,
    DETECT_SESSION_IN_URL: true,
    FLOW_TYPE: 'pkce' as const,
  },
};

// Helper function to get the appropriate redirect URL based on environment
export const getRedirectUrl = (type: keyof typeof AUTH_CONFIG.REDIRECT_URLS): string => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // For localhost, you might want to use a different URL for testing
  if (isLocalhost && type === 'PASSWORD_RESET') {
    // You can uncomment and modify this line if you want to use a different URL for localhost
    // return 'https://your-production-domain.com/reset-password';
  }
  
  return AUTH_CONFIG.REDIRECT_URLS[type];
};

// Helper function to validate password strength
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const {
    MIN_LENGTH,
    REQUIRE_UPPERCASE,
    REQUIRE_LOWERCASE,
    REQUIRE_NUMBERS,
    REQUIRE_SPECIAL_CHARS,
  } = AUTH_CONFIG.PASSWORD_REQUIREMENTS;

  if (password.length < MIN_LENGTH) {
    errors.push(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères`);
  }

  if (REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
  }

  if (REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
  }

  if (REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  if (REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>\[\];'`~\/\\+\-=_]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};