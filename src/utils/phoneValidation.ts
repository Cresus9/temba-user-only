/**
 * Phone Number Validation and Normalization Utilities
 * Supports all international phone numbers with country code detection
 */

// Common country codes (prioritized list for Africa and common regions)
const COUNTRY_CODES: Record<string, { code: string; name: string; length: number[] }> = {
  // West Africa (primary focus)
  '226': { code: '226', name: 'Burkina Faso', length: [8] },
  '225': { code: '225', name: "Côte d'Ivoire", length: [10] },
  '233': { code: '233', name: 'Ghana', length: [9] },
  '221': { code: '221', name: 'Senegal', length: [9] },
  '223': { code: '223', name: 'Mali', length: [8] },
  '227': { code: '227', name: 'Niger', length: [8] },
  '228': { code: '228', name: 'Togo', length: [8] },
  '229': { code: '229', name: 'Benin', length: [8] },
  '234': { code: '234', name: 'Nigeria', length: [10, 11] },
  
  // Other African countries
  '212': { code: '212', name: 'Morocco', length: [9] },
  '213': { code: '213', name: 'Algeria', length: [9] },
  '216': { code: '216', name: 'Tunisia', length: [8] },
  '254': { code: '254', name: 'Kenya', length: [9] },
  '255': { code: '255', name: 'Tanzania', length: [9] },
  '256': { code: '256', name: 'Uganda', length: [9] },
  '257': { code: '257', name: 'Burundi', length: [8] },
  '250': { code: '250', name: 'Rwanda', length: [9] },
  '251': { code: '251', name: 'Ethiopia', length: [9] },
  '260': { code: '260', name: 'Zambia', length: [9] },
  '263': { code: '263', name: 'Zimbabwe', length: [9] },
  '27': { code: '27', name: 'South Africa', length: [9] },
  
  // Other common countries
  '33': { code: '33', name: 'France', length: [9] },
  '1': { code: '1', name: 'USA/Canada', length: [10] },
  '44': { code: '44', name: 'UK', length: [10] },
  '49': { code: '49', name: 'Germany', length: [10, 11] },
  '86': { code: '86', name: 'China', length: [11] },
  '91': { code: '91', name: 'India', length: [10] },
};

/**
 * Detects country code from a phone number
 * @param phone - Phone number (with or without country code)
 * @returns Detected country code or null
 */
const detectCountryCode = (phone: string): { code: string; name: string } | null => {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  const sortedCodes = Object.keys(COUNTRY_CODES).sort((a, b) => b.length - a.length);
  for (const countryCode of sortedCodes) {
    if (!digits.startsWith(countryCode)) continue;
    const localLen = digits.length - countryCode.length;
    const allowed = COUNTRY_CODES[countryCode].length;
    if (allowed.includes(localLen)) {
      return { code: countryCode, name: COUNTRY_CODES[countryCode].name };
    }
  }

  return null;
};

/** Undo a mistaken +226 prefix in front of another country (signup used to force BF). */
function stripWrongBurkinaPrefix(digits: string): string {
  if (!digits.startsWith('226') || digits.length <= 11) return digits;
  const rest = digits.slice(3);
  const inner = detectCountryCode(rest);
  if (inner && inner.code !== '226') return rest;
  return digits;
}

/**
 * Normalizes a phone number to international E.164 format.
 * Uses the selected country when provided; otherwise detects, then Burkina (+226).
 */
export const normalizePhone = (phone: string, defaultCountryCode: string = '226'): string => {
  if (!phone) return '';

  const defaultCode = (defaultCountryCode || '226').replace(/\D/g, '') || '226';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  if (!cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/^0+/, '');
  }

  let digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  digits = stripWrongBurkinaPrefix(digits);

  const detected = detectCountryCode(digits);
  if (detected) {
    return `+${digits}`;
  }

  // Selected / default country + local digits (skip if local already includes that code)
  const local = digits.replace(/^0+/, '');
  if (local.startsWith(defaultCode)) {
    return `+${local}`;
  }
  return `+${defaultCode}${local}`;
};

/**
 * Validates if a phone number is in correct international format (E.164)
 * Checks for: +[country code][number] with minimum 10 total digits
 * 
 * @param phone - Phone number to validate
 * @returns Object with isValid, normalized number, and country info
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return false;
  
  const normalized = normalizePhone(phone);
  
  // E.164 format: +[country code][number]
  // Minimum: +1234567890 (1 + country code + number)
  // Must start with + and have at least 10 total digits after +
  const e164Pattern = /^\+\d{7,15}$/; // E.164 allows 7-15 digits after country code
  
  if (!e164Pattern.test(normalized)) {
    return false;
  }
  
  // Additional check: must have reasonable length (7-15 digits after country code)
  const digitsAfterPlus = normalized.substring(1);
  return digitsAfterPlus.length >= 7 && digitsAfterPlus.length <= 15;
};

/**
 * Gets phone number information (country code, country name, formatted)
 * 
 * @param phone - Phone number
 * @returns Object with country info and formatted number
 */
export const getPhoneInfo = (phone: string): {
  normalized: string;
  countryCode?: string;
  countryName?: string;
  localNumber?: string;
} => {
  const normalized = normalizePhone(phone);
  const detected = detectCountryCode(normalized);
  
  let localNumber = '';
  if (detected) {
    const digits = normalized.substring(1); // Remove +
    localNumber = digits.substring(detected.code.length);
  }
  
  return {
    normalized,
    countryCode: detected?.code,
    countryName: detected?.name,
    localNumber: localNumber || undefined
  };
};

/**
 * Detects if an input string is a phone number or email
 * 
 * @param input - User input (email or phone)
 * @returns 'phone' | 'email' | 'unknown'
 */
export const detectInputType = (input: string): 'phone' | 'email' | 'unknown' => {
  const trimmed = input.trim();
  
  if (!trimmed) return 'unknown';
  
  // Check if it's an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(trimmed)) {
    return 'email';
  }
  
  // Check if it looks like a phone number
  // Contains digits, possibly with +, spaces, hyphens, parentheses
  const phoneRegex = /^[\d+\s\-\(\)]+$/;
  const digitCount = trimmed.replace(/\D/g, '').length;
  
  if (phoneRegex.test(trimmed) && digitCount >= 7) {
    return 'phone';
  }
  
  return 'unknown';
};

/**
 * Formats phone number for display (e.g., +226 75 58 10 26)
 * 
 * @param phone - Phone number
 * @param format - Format style ('international' | 'local')
 * @returns Formatted phone number string
 */
export const formatPhoneForDisplay = (phone: string, format: 'international' | 'local' = 'international'): string => {
  const normalized = normalizePhone(phone);
  const info = getPhoneInfo(normalized);
  
  if (format === 'local' && info.localNumber) {
    return info.localNumber;
  }
  
  // Format as +[country] [number with spaces]
  if (info.countryCode && info.localNumber) {
    // Format local number with spaces (every 2 digits for readability)
    const formattedLocal = info.localNumber.match(/.{1,2}/g)?.join(' ') || info.localNumber;
    return `+${info.countryCode} ${formattedLocal}`;
  }
  
  return normalized;
};
