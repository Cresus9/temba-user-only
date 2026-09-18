/** Accent-fold + URL slug in French (no English tokens in paths we control). */

export function foldAscii(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugifyFr(value: string): string {
  return foldAscii(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
