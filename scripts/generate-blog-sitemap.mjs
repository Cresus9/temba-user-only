import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'blog-sitemap.xml');

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

function formatDate(dateString) {
  if (!dateString) return new Date().toISOString().slice(0, 10);
  try {
    return new Date(dateString).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function rest(tableQuery) {
  const base = supabaseUrl();
  const key = supabaseKey();
  if (!base || !key) return [];
  try {
    const response = await fetch(`${base}/rest/v1/${tableQuery}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (!response.ok) {
      console.warn(`[blog-sitemap] ${tableQuery} failed (${response.status})`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[blog-sitemap] fetch error:', error);
    return [];
  }
}

function urlXml(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${siteUrl()}${loc}</loc>
    <lastmod>${formatDate(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function main() {
  await loadEnvFile();
  console.log('[blog-sitemap] Generating blog-sitemap.xml...');

  const [posts, categories, tags] = await Promise.all([
    rest(
      'blog_posts?select=slug,updated_at,published_at,created_at,status&status=eq.PUBLISHED'
    ),
    rest('blog_categories?select=slug,updated_at'),
    rest('blog_tags?select=slug,updated_at'),
  ]);

  const entries = [
    urlXml('/blog', new Date().toISOString(), 'daily', '0.8'),
    ...categories
      .filter((row) => row?.slug)
      .map((row) => urlXml(`/blog/category/${row.slug}`, row.updated_at, 'weekly', '0.6')),
    ...tags
      .filter((row) => row?.slug)
      .map((row) => urlXml(`/blog/tag/${row.slug}`, row.updated_at, 'weekly', '0.5')),
    ...posts
      .filter((row) => row?.slug)
      .map((row) =>
        urlXml(
          `/blog/post/${row.slug}`,
          row.updated_at || row.published_at || row.created_at,
          'weekly',
          '0.7'
        )
      ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, xml, 'utf8');
  console.log(
    `[blog-sitemap] ${entries.length} URLs (${posts.length} posts, ${categories.length} categories, ${tags.length} tags)`
  );
}

main().catch((error) => {
  console.error('[blog-sitemap] Failed:', error);
  process.exitCode = 1;
});
