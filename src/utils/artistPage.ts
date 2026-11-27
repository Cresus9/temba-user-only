/**
 * Pure helpers for the artist page (/artists/:slug). No React, no network.
 * Prices are "5 000 F CFA"; a price of 0 or a sale that is not open is never "Gratuit".
 */
import { parseLocalDate } from './formatters';
import { artistSocialHref } from './artistSeo';
import { genreTokens } from './artistDisplay';
import type { CatalogArtist, CatalogShow } from '../services/laCatalog';

const FR_NUMBER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** "5 000 F CFA" with a narrow no-break space in the thousands and no-break spaces before F CFA. */
export function fcfa(amount: number): string {
  const digits = FR_NUMBER.format(Math.round(amount)).replace(/[\u00a0\u202f ]/g, '\u202f');
  return `${digits}\u00a0F\u00a0CFA`;
}

export interface PriceLine {
  label: string;
  /** True when no ticket is on sale yet: show "Vente pas encore ouverte". */
  soon: boolean;
}

export function showPriceLine(show: Pick<CatalogShow, 'event'>): PriceLine {
  const tickets = show.event.ticket_types ?? [];
  const open = tickets.filter((t) => t.sales_enabled === true && Number(t.price) > 0).map((t) => Number(t.price));
  if (open.length) {
    const min = Math.min(...open);
    return { label: new Set(open).size > 1 ? `Dès ${fcfa(min)}` : fcfa(min), soon: false };
  }
  const announced = tickets.map((t) => Number(t.price)).filter((p) => p > 0);
  if (announced.length) return { label: `Dès ${fcfa(Math.min(...announced))}`, soon: true };
  return { label: 'Tarifs à venir', soon: true };
}

export interface TierLine {
  name: string;
  price: string;
  open: boolean;
}

/** One line per ticket type, cheapest first. Unnamed types are listed as "Billet". */
export function showTiers(show: Pick<CatalogShow, 'event'>, label: (name: string) => string = (n) => n): TierLine[] {
  return (show.event.ticket_types ?? [])
    .map((t) => ({
      name: label((t.name || '').trim()) || 'Billet',
      amount: Number(t.price) || 0,
      open: t.sales_enabled === true && Number(t.price) > 0,
    }))
    .sort((a, b) => a.amount - b.amount)
    .map((t) => ({ name: t.name, price: t.amount > 0 ? fcfa(t.amount) : 'Tarif à venir', open: t.open }));
}

/** Local calendar pieces for a YYYY-MM-DD day, built with parseLocalDate (never new Date('YYYY-MM-DD')). */
export function dayParts(iso: string) {
  const d = parseLocalDate(iso);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', o).format(d);
  return {
    day: String(d.getDate()),
    month: fmt({ month: 'short' }).replace('.', ''),
    weekday: fmt({ weekday: 'short' }),
    long: fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    short: fmt({ weekday: 'short', day: 'numeric', month: 'short' }),
    year: String(d.getFullYear()),
  };
}

export function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0] ?? '')
    .join('')
    .toLocaleUpperCase('fr');
}

export function genreChips(genre: string): string[] {
  return genre
    .split('/')
    .map((g) => g.trim())
    .filter(Boolean);
}

export function countryLabel(code: string | null | undefined): string {
  if (code === 'CI') return 'Côte d’Ivoire';
  if (code === 'SN') return 'Sénégal';
  return 'Burkina Faso';
}

export interface ArtistLink {
  kind: 'instagram' | 'facebook' | 'youtube' | 'soundcloud' | 'website';
  label: string;
  href: string;
}

/** Links that exist in `artists.social_links`. Nothing is invented. */
export function artistLinks(social: CatalogArtist['social']): ArtistLink[] {
  const out: ArtistLink[] = [];
  if (social.instagram) out.push({ kind: 'instagram', label: 'Instagram', href: artistSocialHref('instagram', social.instagram) });
  if (social.facebook) out.push({ kind: 'facebook', label: 'Facebook', href: artistSocialHref('facebook', social.facebook) });
  if (social.youtube) out.push({ kind: 'youtube', label: 'YouTube', href: artistSocialHref('youtube', social.youtube) });
  if (social.website) {
    const soundcloud = /soundcloud/i.test(social.website);
    out.push({
      kind: soundcloud ? 'soundcloud' : 'website',
      label: soundcloud ? 'SoundCloud' : 'Site officiel',
      href: artistSocialHref('website', social.website),
    });
  }
  return out;
}

/** Artists with a similar genre (same rule as before: shared genre tokens, then name), photo required. */
export function similarArtists(artist: CatalogArtist, all: CatalogArtist[], limit = 6): CatalogArtist[] {
  const tokens = new Set(genreTokens(artist.genre));
  return all
    .filter((item) => item.id !== artist.id && item.photo)
    .map((item) => ({ item, score: genreTokens(item.genre).filter((t) => tokens.has(t)).length }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'fr'))
    .slice(0, limit)
    .map((row) => row.item);
}

/** Artists billed with this one on a published event, with a photo first, then by name. */
export function lineupArtists(artist: CatalogArtist, all: CatalogArtist[], limit = 8): CatalogArtist[] {
  const ids = new Set(artist.coArtistIds);
  return all
    .filter((item) => ids.has(item.id))
    .sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)) || a.name.localeCompare(b.name, 'fr'))
    .slice(0, limit);
}

export interface SectionLink {
  id: string;
  label: string;
}

export function artistSections(opts: { hasPast: boolean; hasLinks: boolean; hasLineup: boolean; hasSimilar: boolean }): SectionLink[] {
  return [
    { id: 'dates', label: 'Dates' },
    opts.hasPast ? { id: 'passe', label: 'Déjà passé' } : null,
    { id: 'a-propos', label: 'À propos' },
    opts.hasLinks ? { id: 'liens', label: 'Écouter et suivre' } : null,
    opts.hasLineup ? { id: 'meme-affiche', label: 'Sur les mêmes affiches' } : null,
    opts.hasSimilar ? { id: 'similaires', label: 'Similaires' } : null,
  ].filter(Boolean) as SectionLink[];
}
