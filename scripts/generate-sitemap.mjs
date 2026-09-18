import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'sitemap.xml');

async function loadEnvFile() {
  for (const file of [path.join(ROOT_DIR, '.env'), path.join(ROOT_DIR, '.env.local')]) {
    if (!existsSync(file)) continue;
    try {
      const raw = await readFile(file, 'utf-8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // ignore
    }
  }
}

function siteUrl() {
  return process.env.SITE_URL?.replace(/\/$/, '') || 'https://tembas.com';
}
function supabaseUrl() {
  return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
}
function supabaseKey() {
  return process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
}

const STATIC_ROUTES = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/events', changefreq: 'hourly', priority: 0.95 },
  { loc: '/attractions', changefreq: 'daily', priority: 0.9 },
  { loc: '/venues', changefreq: 'weekly', priority: 0.7 },
  { loc: '/organizers', changefreq: 'weekly', priority: 0.7 },
  { loc: '/artists', changefreq: 'weekly', priority: 0.65 },
  { loc: '/categories', changefreq: 'daily', priority: 0.7 },
  { loc: '/ouagadougou', changefreq: 'daily', priority: 0.85 },
  { loc: '/bobo-dioulasso', changefreq: 'daily', priority: 0.8 },
  { loc: '/abidjan', changefreq: 'daily', priority: 0.8 },
  { loc: '/dakar', changefreq: 'weekly', priority: 0.7 },
  { loc: '/blog', changefreq: 'daily', priority: 0.8 },
  { loc: '/about', changefreq: 'monthly', priority: 0.5 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.4 },
  { loc: '/support', changefreq: 'monthly', priority: 0.4 },
  { loc: '/privacy', changefreq: 'yearly', priority: 0.2 },
  { loc: '/terms', changefreq: 'yearly', priority: 0.2 },
  { loc: '/cookies', changefreq: 'yearly', priority: 0.1 },
];

const formatDate = (dateString) => {
  if (!dateString) return new Date().toISOString().slice(0, 10);
  try {
    return new Date(dateString).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

async function rest(tableQuery) {
  const base = supabaseUrl();
  const key = supabaseKey();
  if (!base || !key) return [];
  const url = `${base}/rest/v1/${tableQuery}`;
  try {
    const response = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (!response.ok) {
      console.warn(`[sitemap] ${tableQuery} failed (${response.status})`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[sitemap] fetch error:', error);
    return [];
  }
}

async function fetchPublishedEvents() {
  const data = await rest(
    'events?select=id,slug,updated_at,status,deleted_at&status=eq.PUBLISHED&deleted_at=is.null'
  );
  return data
    .filter((event) => event?.id)
    .map((event) => ({
      loc: `/e/${event.slug || event.id}`,
      lastmod: formatDate(event.updated_at),
      changefreq: 'daily',
      priority: 0.8,
    }));
}

async function fetchSlugPages(table, prefix) {
  const data = await rest(`${table}?select=slug,updated_at&slug=not.is.null`);
  return data
    .filter((row) => row?.slug)
    .map((row) => ({
      loc: `${prefix}/${row.slug}`,
      lastmod: formatDate(row.updated_at),
      changefreq: 'weekly',
      priority: 0.6,
    }));
}

async function fetchCategoryPages() {
  const data = await rest('categories?select=id,slug,name,updated_at');
  return data
    .filter((row) => row?.slug || row?.name || row?.id)
    .map((row) => {
      const name = String(row.name || '');
      const folded = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      let slug = row.slug || '';
      if (slug === 'music-concerts' || folded.includes('music concert') || folded.includes('concerts de musique')) {
        slug = 'concerts-de-musique';
      } else if (slug === 'sports' || folded === 'sports' || folded === 'sport') {
        slug = 'sport';
      } else if (!slug && name) {
        slug = folded.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      }
      return {
        loc: `/categories/${slug || row.id}`,
        lastmod: formatDate(row.updated_at),
        changefreq: 'weekly',
        priority: 0.65,
      };
    });
}

function buildXml(urlEntries) {
  const urls = urlEntries
    .map((entry) => {
      const loc = `${siteUrl()}${entry.loc}`;
      const lastmod = formatDate(entry.lastmod);
      const changefreq = entry.changefreq ?? 'weekly';
      const priority =
        Number.isFinite(entry.priority) && entry.priority >= 0 && entry.priority <= 1
          ? entry.priority.toFixed(1)
          : '0.5';

      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

async function main() {
  await loadEnvFile();
  console.log('[sitemap] Generating sitemap...');
  if (!supabaseUrl() || !supabaseKey()) {
    console.warn('[sitemap] SUPABASE credentials missing. Static routes only.');
  }

  const [events, venues, organizers, artists, categories, tags] = await Promise.all([
    fetchPublishedEvents(),
    fetchSlugPages('venues', '/venues'),
    fetchSlugPages('organizer_profiles', '/organizers'),
    fetchSlugPages('artists', '/artists'),
    fetchCategoryPages(),
    fetchSlugPages('tags', '/tags'),
  ]);

  const urls = [
    ...STATIC_ROUTES,
    ...events,
    ...venues,
    ...organizers,
    ...artists,
    ...categories,
    ...tags,
  ];
  const xml = buildXml(urls);

  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, xml, 'utf8');

  console.log(
    `[sitemap] ${urls.length} URLs (${events.length} events, ${venues.length} venues, ${organizers.length} organizers, ${artists.length} artists, ${categories.length} categories, ${tags.length} tags)`
  );
}

main().catch((error) => {
  console.error('[sitemap] Failed to generate sitemap:', error);
  process.exitCode = 1;
});
