/** City-level fallbacks used only when `venues.lat` / `venues.lng` are null. */

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  ouagadougou: { lat: 12.3714, lng: -1.5197 },
  'bobo-dioulasso': { lat: 11.1771, lng: -4.2979 },
  bobodioulasso: { lat: 11.1771, lng: -4.2979 },
  abidjan: { lat: 5.36, lng: -4.0083 },
  dakar: { lat: 14.7167, lng: -17.4677 },
  "m'bour": { lat: 14.4192, lng: -16.9639 },
  mbour: { lat: 14.4192, lng: -16.9639 },
  manga: { lat: 11.6636, lng: -1.0731 },
  dédougou: { lat: 12.4634, lng: -3.4606 },
  dedougou: { lat: 12.4634, lng: -3.4606 },
  nouna: { lat: 12.7294, lng: -3.8631 },
};

export type VenueLoc = {
  id: string;
  city?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

export type ResolvedVenueCoords = {
  lat: number;
  lng: number;
  precise: boolean;
};

function cityKey(city?: string | null) {
  return (city || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

export function resolveVenueCoords(venue: VenueLoc): ResolvedVenueCoords | null {
  const lat = venue.lat != null && venue.lat !== '' ? Number(venue.lat) : NaN;
  const lng = venue.lng != null && venue.lng !== '' ? Number(venue.lng) : NaN;
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    return { lat, lng, precise: true };
  }
  const base = CITY_COORDS[cityKey(venue.city)];
  if (!base) return null;
  const h = hashId(venue.id);
  return {
    lat: base.lat + (((h % 90) - 45) * 0.00032),
    lng: base.lng + ((((h >> 8) % 90) - 45) * 0.00032),
    precise: false,
  };
}
