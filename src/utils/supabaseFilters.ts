const DEFAULT_MAX_LENGTH = 120;

/**
 * Normalizes user-provided search terms before using them inside Supabase filter strings.
 * Removes potentially dangerous characters that could break the filter syntax while
 * preserving useful unicode characters for legitimate searches.
 */
export function sanitizeTextSearchTerm(rawTerm: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
  if (!rawTerm) {
    return '';
  }

  const normalized = rawTerm
    .normalize('NFKC')
    // Replace characters that have special meaning inside filter expressions
    // or that may cause parsing issues.
    .replace(/["'`%\\]/g, ' ')
    // Replace parentheses, semicolons and equal signs to avoid expression injection.
    .replace(/[()\[\];=]/g, ' ');

  const filtered = normalized
    // Allow letters (including diacritics), numbers, spaces and a handful of safe symbols.
    .replace(/[^\p{L}\p{N}\s\-_.]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!filtered) {
    return '';
  }

  return filtered.slice(0, maxLength);
}

/**
 * Builds a safe `or` filter segment for Supabase text search using `ilike`.
 * Returns `null` when the sanitized term is empty.
 */
export function buildTextSearchFilter(columns: string[], rawTerm: string): string | null {
  const sanitized = sanitizeTextSearchTerm(rawTerm);
  if (!sanitized) {
    return null;
  }

  const pattern = `%${sanitized}%`;
  const escapedPattern = pattern.replace(/,/g, '\\,');

  return columns.map(column => `${column}.ilike.${escapedPattern}`).join(',');
}
