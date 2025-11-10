import { writeFile, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'sitemap.xml');

const SITE_URL = process.env.SITE_URL?.replace(/\/$/, '') || 'https://tembas.com';
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY;

const STATIC_ROUTES = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/events', changefreq: 'hourly', priority: 0.9 },
  { loc: '/categories', changefreq: 'daily', priority: 0.7 },
  { loc: '/profile/my-tickets', changefreq: 'weekly', priority: 0.4 },
  { loc: '/support', changefreq: 'monthly', priority: 0.3 },
  { loc: '/about', changefreq: 'monthly', priority: 0.2 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.2 },
  { loc: '/privacy', changefreq: 'yearly', priority: 0.1 },
  { loc: '/terms', changefreq: 'yearly', priority: 0.1 },
];

const formatDate = (dateString) => {
  if (!dateString) return new Date().toISOString();
  try {
    return new Date(dateString).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

async function fetchPublishedEvents() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      '[sitemap] SUPABASE credentials missing. Skipping dynamic event URLs.'
    );
    return [];
  }

  const url = new URL('/rest/v1/events', SUPABASE_URL);
  url.searchParams.set('select', 'id,updated_at,status');
  url.searchParams.set('status', 'eq.PUBLISHED');

  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      console.warn(
        `[sitemap] Failed to fetch events (${response.status} ${response.statusText}).`
      );
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((event) => event?.id)
      .map((event) => ({
        loc: `/events/${event.id}`,
        lastmod: formatDate(event.updated_at),
        changefreq: 'daily',
        priority: 0.8,
      }));
  } catch (error) {
    console.error('[sitemap] Error fetching events:', error);
    return [];
  }
}

function buildXml(urlEntries) {
  const urls = urlEntries
    .map((entry) => {
      const loc = `${SITE_URL}${entry.loc}`;
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
  console.log('[sitemap] Generating sitemap...');
  const events = await fetchPublishedEvents();
  const urls = [...STATIC_ROUTES, ...events];

  if (!urls.length) {
    throw new Error('No URLs available for sitemap generation.');
  }

  const xml = buildXml(urls);

  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, xml, 'utf8');

  console.log(`[sitemap] Sitemap generated with ${urls.length} URLs at ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error('[sitemap] Failed to generate sitemap:', error);
  process.exitCode = 1;
});

