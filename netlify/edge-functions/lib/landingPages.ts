/**
 * Search landing pages ("que faire ce week-end", "concert ouagadougou").
 * Shared by the SPA (SeoLanding page) and the crawler HTML in og-tags, so the
 * text and the event selection are the same for people and for Google.
 * Plain TypeScript: no Deno, Node or DOM APIs.
 */

export type LandingCity = 'Ouagadougou' | 'Bobo-Dioulasso';

export type LandingPage = {
  path: string;
  /** Short name for breadcrumbs and links. */
  label: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  city?: LandingCity;
  concertsOnly?: boolean;
  weekend?: boolean;
};

export const LANDING_PAGES: LandingPage[] = [
  {
    path: '/ce-weekend',
    label: 'Ce week-end',
    h1: 'Que faire ce week-end ?',
    title: 'Que faire ce week-end ? Concerts, festivals et sorties',
    description:
      'Concerts, festivals et sorties de ce samedi et de ce dimanche à Ouagadougou, Bobo-Dioulasso et Abidjan. Réservez vos billets en ligne sur Temba et payez en FCFA.',
    intro:
      'Tout ce qui se passe ce samedi et ce dimanche. Choisissez votre sortie, réservez votre billet en ligne et présentez le QR code à l’entrée.',
    weekend: true,
  },
  {
    path: '/ouagadougou/concerts',
    label: 'Concerts à Ouagadougou',
    h1: 'Concerts à Ouagadougou',
    title: 'Concerts à Ouagadougou — agenda et billets',
    description:
      'Les prochains concerts à Ouagadougou : dates, salles et billets en FCFA. Payez avec Orange Money, Moov Money ou par carte et recevez votre billet QR sur votre téléphone.',
    intro:
      'Les prochains concerts à Ouaga, du plus proche au plus lointain. Réservez votre place en ligne et gardez votre billet QR sur votre téléphone.',
    city: 'Ouagadougou',
    concertsOnly: true,
  },
  {
    path: '/bobo-dioulasso/concerts',
    label: 'Concerts à Bobo-Dioulasso',
    h1: 'Concerts à Bobo-Dioulasso',
    title: 'Concerts à Bobo-Dioulasso — agenda et billets',
    description:
      'Les prochains concerts à Bobo-Dioulasso : dates, salles et billets en FCFA. Payez avec Orange Money, Moov Money ou par carte et recevez votre billet QR sur votre téléphone.',
    intro:
      'Les prochains concerts à Bobo, du plus proche au plus lointain. Réservez votre place en ligne et gardez votre billet QR sur votre téléphone.',
    city: 'Bobo-Dioulasso',
    concertsOnly: true,
  },
];

export function landingByPath(pathname: string): LandingPage | undefined {
  const path = `/${pathname.replace(/^\/+|\/+$/g, '').toLowerCase()}`;
  return LANDING_PAGES.find((page) => page.path === path);
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Saturday and Sunday around `today` (YYYY-MM-DD, Ouagadougou calendar). Same rule as the events page. */
export function weekendRange(today: string): { start: string; end: string } {
  const [y, m, d] = today.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const toSat = dow === 6 ? 0 : dow === 0 ? -1 : 6 - dow;
  const start = addDays(today, toSat);
  return { start, end: addDays(start, 1) };
}

/** Same city rule as the events page filters (cityKey in src/utils/eventDisplay.ts). */
export function landingCityOf(event: { city?: string | null; location?: string | null }): LandingCity | null {
  const blob = `${event.city ?? ''} ${event.location ?? ''}`.toLowerCase();
  if (blob.includes('abidjan')) return null;
  if (blob.includes('bobo')) return 'Bobo-Dioulasso';
  if (blob.includes('ouaga') || blob.includes('palais des congr')) return 'Ouagadougou';
  return null;
}

export function isConcertCategory(name?: string | null): boolean {
  const n = (name || '').toLowerCase();
  return n.includes('concert') || n.includes('music');
}

export type LandingEvent = {
  id: string;
  date?: string | null;
  city?: string | null;
  location?: string | null;
  is_permanent?: boolean | null;
};

/**
 * Events for a landing page, for the crawler HTML.
 * `dates` = every day the event runs (event.date and event_dates rows),
 * `concertIds` = events linked to a concert/music category.
 */
export function selectLandingEvents<T extends LandingEvent>(
  page: LandingPage,
  events: T[],
  opts: { today: string; dates: Map<string, string[]>; concertIds: Set<string> },
): T[] {
  const weekend = weekendRange(opts.today);
  const daysOf = (event: T) => {
    const own = String(event.date || '').slice(0, 10);
    return [...new Set([own, ...(opts.dates.get(event.id) ?? [])].filter(Boolean))].sort();
  };
  return events.filter((event) => {
    if (event.is_permanent) return false;
    const days = daysOf(event);
    // Same list as the app, which only loads events starting today or later.
    if (!days.length || String(event.date || '').slice(0, 10) < opts.today) return false;
    if (page.city && landingCityOf(event) !== page.city) return false;
    if (page.concertsOnly && !opts.concertIds.has(event.id)) return false;
    if (page.weekend) {
      const min = days[0];
      const max = days[days.length - 1];
      const hit = days.some((day) => day >= weekend.start && day <= weekend.end) || (min <= weekend.end && max >= weekend.start);
      if (!hit) return false;
    }
    return true;
  });
}
