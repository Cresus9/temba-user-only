/** Display rules for artist photos, genres and roles. Nothing is written back. */

/** Deezer’s missing-artist image is an empty id (`/artist//`), not the size suffix every portrait uses. */
const DEEZER_BLANK = /images\/artist\/\/|\/artist\/0{8,}\//i;

export function hasArtistPhoto(url?: string | null, slug?: string | null) {
  const photo = url?.trim() || '';
  if (!photo) return false;
  if (slug === 'imilo-lechanceux') return false;
  if (DEEZER_BLANK.test(photo)) return false;
  return true;
}

export function genreLabel(raw?: string | null) {
  if (!raw?.trim()) return '';
  return raw
    .split('/')
    .map((part) => {
      const text = part.trim();
      if (!text) return '';
      return text.charAt(0).toLocaleUpperCase('fr') + text.slice(1);
    })
    .filter(Boolean)
    .join(' / ');
}

export function genreKey(raw?: string | null) {
  return (raw || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('fr')
    .replace(/\s+/g, ' ')
    .trim();
}

export function genreTokens(raw?: string | null) {
  return genreKey(raw)
    .split(/[/·,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
}

export const ARTIST_ROLE_BADGE: Record<string, string> = {
  headliner: 'Tête d’affiche',
  performer: 'Artiste',
  special_guest: 'Invité spécial',
};

export function roleBadge(role?: string | null) {
  if (!role) return '';
  return ARTIST_ROLE_BADGE[role] || '';
}
