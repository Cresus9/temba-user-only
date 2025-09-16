import { describe, it, expect } from 'vitest';
import {
  coerceToBoolean,
  parsePriority,
  sanitizeActionText,
  sanitizeActionUrl,
  sanitizeMetadata,
  sanitizePreferenceTypes,
  sanitizeTitle,
} from '../notificationSanitizers';

describe('notificationSanitizers', () => {
  it('coerces various values to booleans safely', () => {
    expect(coerceToBoolean(true)).toBe(true);
    expect(coerceToBoolean('true')).toBe(true);
    expect(coerceToBoolean('YES')).toBe(true);
    expect(coerceToBoolean('false')).toBe(false);
    expect(coerceToBoolean(0)).toBe(false);
    expect(coerceToBoolean(undefined)).toBe(false);
  });

  it('sanitizes action urls to safe http(s) or relative values', () => {
    expect(sanitizeActionUrl('/events/123')).toBe('/events/123');
    expect(sanitizeActionUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(sanitizeActionUrl('   javascript:alert(1)   ')).toBeNull();
    expect(sanitizeActionUrl('ftp://example.com')).toBeNull();
  });

  it('sanitizes metadata values and strips unsupported entries', () => {
    const sanitized = sanitizeMetadata({
      action_url: 'javascript:alert(1)',
      action_text: '  View ',
      count: 2,
      nested: { bad: true },
      description: '   Something happened   ',
    });

    expect(sanitized).toEqual({
      action_text: 'View',
      count: 2,
      description: 'Something happened',
    });
  });

  it('sanitizes preference types by trimming, deduping, and limiting entries', () => {
    const types = sanitizePreferenceTypes([' EVENT ', 'event', 'ALERT', 42 as unknown as string]);
    expect(types).toEqual(['EVENT', 'ALERT']);
  });

  it('parses notification priority with a safe fallback', () => {
    expect(parsePriority('high')).toBe('high');
    expect(parsePriority('invalid')).toBe('normal');
  });

  it('sanitizes action text and titles with fallbacks', () => {
    expect(sanitizeActionText('  Voir  ')).toBe('Voir');
    expect(sanitizeActionText('   ')).toBeNull();
    expect(sanitizeTitle('   ')).toBe('Notification');
  });
});
