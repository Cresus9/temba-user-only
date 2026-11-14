/**
 * Display-only venue names. The database rows stay as stored.
 * Port of the v6 handoff clean_venue / ALIAS (la_data.py).
 */

const SMALL = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'à', 'au', 'aux', 'd’', 'l’']);

const ALIAS: Record<string, string> = {
  'l’espace culturel chez komi (karpala)': 'Espace culturel Chez Komi (Karpala)',
  'espace culturel chez komi': 'Espace culturel Chez Komi (Karpala)',
  'maison de la culture': 'Maison de la Culture',
  cenasa: 'CENASA',
  'ispp kouritenga': 'ISPP Kouritenga',
  'espace fatim’s, ouaga 2000': 'Espace Fatim’s, Ouaga 2000',
  'centre culturel du faso (ex canal olympia)': 'Centre Culturel du Faso',
  'terrain de kougpeel-yaar (plateau de nagrin)': 'Terrain de Koupèel-Yaar (Plateau de Nagrin)',
  'terrain de koupèel-yaar – plateau de nagrin': 'Terrain de Koupèel-Yaar (Plateau de Nagrin)',
  'terrain de koupèel-yaar - plateau de nagrin': 'Terrain de Koupèel-Yaar (Plateau de Nagrin)',
  'patte d’oie non loin de la cite asecna': 'Patte d’Oie, près de la cité ASECNA',
  'garage non loin de la pédiatrie': 'Garage, près de la Pédiatrie',
};

const CITY_ONLY = new Set(['ouagadougou', 'kokologho']);

function fold(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('fr').replace(/'/g, '’').replace(/\s+/g, ' ').trim();
}

function isAllUpper(value: string) {
  return value.toLocaleUpperCase('fr') === value && value.toLocaleLowerCase('fr') !== value;
}

function titleCase(value: string) {
  return value
    .toLocaleLowerCase('fr')
    .split(' ')
    .map((word, index) => {
      if (index > 0 && SMALL.has(word)) return word;
      return word ? word.charAt(0).toLocaleUpperCase('fr') + word.slice(1) : word;
    })
    .join(' ');
}

export function cleanVenueName(name: string, city?: string | null) {
  let next = name.normalize('NFKC').replace(/\s+/g, ' ').trim();
  next = next.replace(/^à\s+l[’']/i, 'L’');
  next = next.replace(/\(\s*([^)]*?)\s*\)/g, '($1)');
  if (isAllUpper(next) && next.length > 4) next = titleCase(next);
  const cities = [city, 'Ouagadougou', 'Bobo-Dioulasso', 'BOBO DIOULASSO'].filter(Boolean) as string[];
  for (const place of cities) {
    const escaped = place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`\\s*\\(\\s*${escaped}\\s*\\)\\s*$`, 'i'), '');
    next = next.replace(new RegExp(`\\s+de\\s+${escaped}$`, 'i'), '');
  }
  next = next.replace(/\s*\(\s*ouaga\s*2000\s*\)/i, ', Ouaga 2000');
  next = next.replace(/'/g, '’').trim();
  return ALIAS[fold(next)] || next;
}

export function isCityOnlyVenue(name: string) {
  return CITY_ONLY.has(fold(name));
}

export function canonicalCity(city?: string | null, venueName?: string | null) {
  const raw = (city || '').replace(/\s+/g, ' ').trim();
  const blob = `${raw} ${venueName || ''}`.toLowerCase();
  if (/bobo/.test(blob) && !raw) return 'Bobo-Dioulasso';
  if (/bobo/.test(raw.toLowerCase())) return 'Bobo-Dioulasso';
  if (/ouaga/.test(raw.toLowerCase()) || (!raw && /palais des congr/.test(blob))) return 'Ouagadougou';
  if (/abidjan/.test(raw.toLowerCase())) return 'Abidjan';
  if (/dakar/.test(raw.toLowerCase())) return 'Dakar';
  return raw;
}

export function venueMergeKey(name: string, city?: string | null) {
  const place = canonicalCity(city, name);
  return `${fold(cleanVenueName(name, place))}|${fold(place)}`;
}

export function countryName(code?: string | null, city?: string | null) {
  const known: Record<string, string> = {
    BF: 'Burkina Faso',
    CI: 'Côte d’Ivoire',
    SN: 'Sénégal',
    ML: 'Mali',
    CM: 'Cameroun',
    FR: 'France',
  };
  if (code && known[code.toUpperCase()]) return known[code.toUpperCase()];
  if (/abidjan/i.test(city || '')) return 'Côte d’Ivoire';
  if (/dakar/i.test(city || '')) return 'Sénégal';
  return 'Burkina Faso';
}

export function addressIfDistinct(name: string, address?: string | null) {
  const value = (address || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  if (fold(value) === fold(name)) return '';
  return value;
}

/** Same night, including the sales-closed « Malakey en concert live » twin. */
export function eventDedupeKey(title: string, day: string) {
  const folded = title
    .normalize('NFKC')
    .toLocaleLowerCase('fr')
    .replace(/[’']/g, '')
    .replace(/\blive\b/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${folded}|${day}`;
}
