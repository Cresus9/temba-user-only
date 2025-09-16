import { z } from 'zod';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

const TRUE_VALUES = new Set(['true', 't', '1', 'yes', 'y']);
const FALSE_VALUES = new Set(['false', 'f', '0', 'no', 'n']);
const MAX_METADATA_KEYS = 25;
const MAX_TEXT_LENGTH = 1024;
const MAX_ACTION_TEXT_LENGTH = 120;
const MAX_TITLE_LENGTH = 255;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_URL_LENGTH = 2048;

const metadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

type MetadataRecord = Record<string, unknown>;

export const coerceToBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
  }
  return false;
};

export const parsePriority = (value: unknown): NotificationPriority => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'low' || normalized === 'normal' || normalized === 'high' || normalized === 'urgent') {
      return normalized;
    }
  }
  return 'normal';
};

export const sanitizeText = (value: unknown, fallback: string, maxLength = MAX_TEXT_LENGTH): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.slice(0, Math.max(1, maxLength));
};

export const sanitizeActionText = (value: unknown): string | null => {
  const sanitized = sanitizeText(value, '', MAX_ACTION_TEXT_LENGTH);
  return sanitized ? sanitized : null;
};

export const sanitizeActionUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
    return null;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch (error) {
    return null;
  }

  return null;
};

export const sanitizeMetadata = (value: unknown): MetadataRecord | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const entries: [string, unknown][] = [];
  for (const [key, raw] of Object.entries(value)) {
    if (entries.length >= MAX_METADATA_KEYS) {
      break;
    }

    if (typeof key !== 'string') {
      continue;
    }

    const sanitizedKey = key.trim().slice(0, 64);
    if (!sanitizedKey) {
      continue;
    }

    if (!metadataValueSchema.safeParse(raw).success) {
      continue;
    }

    if (sanitizedKey === 'action_url') {
      const url = sanitizeActionUrl(raw);
      if (url) {
        entries.push([sanitizedKey, url]);
      }
      continue;
    }

    if (sanitizedKey === 'action_text') {
      const actionText = sanitizeActionText(raw);
      if (actionText) {
        entries.push([sanitizedKey, actionText]);
      }
      continue;
    }

    if (typeof raw === 'string') {
      entries.push([sanitizedKey, raw.trim().slice(0, MAX_TEXT_LENGTH)]);
      continue;
    }

    entries.push([sanitizedKey, raw]);
  }

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

export const sanitizePreferenceTypes = (value: unknown, limit = 20): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const sanitized: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue;
    }

    const normalized = entry.trim().slice(0, 64);
    if (!normalized) {
      continue;
    }

    const key = normalized.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      sanitized.push(key);
    }

    if (sanitized.length >= limit) {
      break;
    }
  }

  return sanitized;
};

export const sanitizeTitle = (value: unknown): string => sanitizeText(value, 'Notification', MAX_TITLE_LENGTH);

export const sanitizeMessage = (value: unknown, fallbackTitle: string): string =>
  sanitizeText(value, `Nouvelle notification : ${fallbackTitle}`, MAX_MESSAGE_LENGTH);
