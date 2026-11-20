/**
 * Which venue pages are real, and which slug is canonical.
 *
 * Mirrors src/services/laCatalog.ts (the SPA): a venue page exists only when
 * the venue row has at least one PUBLISHED, non-deleted event, is not a bare
 * city name, and has a slug. Duplicate rows of the same place (same merge key)
 * share one page; the slug with the most events is canonical.
 *
 * Everything else (test rows such as "dfyguh", venues with no event) is not a
 * page: crawlers get a 404 with noindex, and the sitemap leaves it out.
 * Database rows are never changed.
 */
import { canonicalCity, cleanVenueName, isCityOnlyVenue, venueMergeKey } from "../../../src/utils/venueNames.ts";

export type VenueRowLite = {
  id: string;
  name?: string | null;
  slug?: string | null;
  city?: string | null;
  address?: string | null;
  country_code?: string | null;
  updated_at?: string | null;
};

export type EventVenueLink = { id: string; venue_id?: string | null; deleted_at?: string | null };

export type VenuePage = {
  key: string;
  name: string;
  city: string;
  primarySlug: string;
  slugs: string[];
  ids: string[];
  eventCount: number;
  updatedAt: string | null;
};

export function buildVenueIndex(venues: VenueRowLite[], events: EventVenueLink[]) {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (!e.venue_id || e.deleted_at) continue;
    counts.set(e.venue_id, (counts.get(e.venue_id) ?? 0) + 1);
  }
  const groups = new Map<string, VenuePage & { score: Map<string, number> }>();
  for (const v of venues) {
    if (!v.name || isCityOnlyVenue(v.name)) continue;
    const city = canonicalCity(v.city, v.name);
    const key = venueMergeKey(v.name, city);
    const g = groups.get(key) ?? {
      key,
      name: cleanVenueName(v.name, city),
      city,
      primarySlug: "",
      slugs: [],
      ids: [],
      eventCount: 0,
      updatedAt: null,
      score: new Map<string, number>(),
    };
    g.ids.push(v.id);
    const n = counts.get(v.id) ?? 0;
    g.eventCount += n;
    if (v.slug) {
      g.slugs.push(v.slug);
      g.score.set(v.slug, n);
    }
    if (v.updated_at && (!g.updatedAt || v.updated_at > g.updatedAt)) g.updatedAt = v.updated_at;
    groups.set(key, g);
  }
  const bySlug = new Map<string, VenuePage>();
  const pages: VenuePage[] = [];
  for (const g of groups.values()) {
    if (!g.eventCount || !g.slugs.length) continue;
    g.primarySlug = [...g.slugs].sort((a, b) => (g.score.get(b) ?? 0) - (g.score.get(a) ?? 0))[0];
    const { score: _score, ...page } = g;
    pages.push(page);
    for (const s of g.slugs) bySlug.set(s, page);
  }
  pages.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return { pages, bySlug };
}
