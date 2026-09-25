import type { Context } from "https://edge.netlify.com";

/**
 * Live sitemap for Googlebot: every PUBLISHED event (and slug pages) from
 * Postgres, not the last Netlify build. Google has no bulk “force index”
 * API for ticketing URLs — this is the supported discovery feed.
 */

const SITE = "https://tembas.com";
const PAGE = 1000;

const STATIC_ROUTES: { loc: string; changefreq: string; priority: string }[] = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/events", changefreq: "hourly", priority: "0.95" },
  { loc: "/attractions", changefreq: "daily", priority: "0.9" },
  { loc: "/venues", changefreq: "weekly", priority: "0.7" },
  { loc: "/organizers", changefreq: "weekly", priority: "0.7" },
  { loc: "/artists", changefreq: "daily", priority: "0.8" },
  { loc: "/categories", changefreq: "daily", priority: "0.7" },
  { loc: "/ouagadougou", changefreq: "daily", priority: "0.85" },
  { loc: "/bobo-dioulasso", changefreq: "daily", priority: "0.8" },
  { loc: "/abidjan", changefreq: "daily", priority: "0.8" },
  { loc: "/dakar", changefreq: "weekly", priority: "0.7" },
  { loc: "/blog", changefreq: "daily", priority: "0.8" },
  { loc: "/about", changefreq: "monthly", priority: "0.5" },
  { loc: "/contact", changefreq: "monthly", priority: "0.4" },
  { loc: "/support", changefreq: "monthly", priority: "0.4" },
  { loc: "/privacy", changefreq: "yearly", priority: "0.2" },
  { loc: "/terms", changefreq: "yearly", priority: "0.2" },
  { loc: "/cookies", changefreq: "yearly", priority: "0.1" },
];

function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_ANON_KEY") ?? "";
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function ymd(value?: string | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : new Date().toISOString().slice(0, 10);
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function restAll(path: string): Promise<Record<string, unknown>[]> {
  const cfg = supabaseConfig();
  if (!cfg) return [];
  const out: Record<string, unknown>[] = [];
  for (let from = 0; from < 20_000; from += PAGE) {
    const joiner = path.includes("?") ? "&" : "?";
    const url = `${cfg.url}/rest/v1/${path}${joiner}limit=${PAGE}&offset=${from}`;
    const response = await fetch(url, {
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
      },
    });
    if (!response.ok) break;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

function frenchCategorySlug(row: { slug?: string; name?: string; id?: string }): string {
  const slug = String(row.slug || "").toLowerCase();
  const folded = String(row.name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (
    slug === "music-concerts" ||
    folded.includes("music concert") ||
    folded.includes("concerts de musique")
  ) {
    return "concerts-de-musique";
  }
  if (slug === "sports" || folded === "sports" || folded === "sport") return "sport";
  if (slug) return slug;
  if (folded) return folded.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return String(row.id || "");
}

type UrlRow = { loc: string; lastmod: string; changefreq: string; priority: string };

function urlXml(entry: UrlRow): string {
  return `  <url>
    <loc>${xmlEscape(SITE + entry.loc)}</loc>
    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
}

async function buildSitemap(): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  const [events, venues, organizers, artists, categories, tags] = await Promise.all([
    restAll(
      "events?select=id,slug,updated_at&status=eq.PUBLISHED&deleted_at=is.null"
    ),
    restAll("venues?select=slug,updated_at&slug=not.is.null"),
    restAll("organizer_profiles?select=slug,updated_at&slug=not.is.null"),
    restAll("artists?select=slug,updated_at&slug=not.is.null"),
    restAll("categories?select=id,slug,name,updated_at"),
    restAll("tags?select=slug,updated_at&slug=not.is.null"),
  ]);

  if (!events.length && !artists.length) return null;

  const urls: UrlRow[] = [
    ...STATIC_ROUTES.map((r) => ({ ...r, lastmod: today })),
    ...events
      .filter((e) => e.id)
      .map((e) => ({
        loc: `/e/${String(e.slug || e.id).trim()}`,
        lastmod: ymd(String(e.updated_at || "")),
        changefreq: "daily",
        priority: "0.8",
      })),
    ...venues
      .filter((r) => r.slug)
      .map((r) => ({
        loc: `/venues/${r.slug}`,
        lastmod: ymd(String(r.updated_at || "")),
        changefreq: "weekly",
        priority: "0.6",
      })),
    ...organizers
      .filter((r) => r.slug)
      .map((r) => ({
        loc: `/organizers/${r.slug}`,
        lastmod: ymd(String(r.updated_at || "")),
        changefreq: "weekly",
        priority: "0.6",
      })),
    ...artists
      .filter((r) => r.slug)
      .map((r) => ({
        loc: `/artists/${r.slug}`,
        lastmod: ymd(String(r.updated_at || "")),
        changefreq: "daily",
        priority: "0.75",
      })),
    ...categories
      .filter((r) => r.slug || r.name || r.id)
      .map((r) => ({
        loc: `/categories/${frenchCategorySlug(r)}`,
        lastmod: ymd(String(r.updated_at || "")),
        changefreq: "weekly",
        priority: "0.65",
      })),
    ...tags
      .filter((r) => r.slug)
      .map((r) => ({
        loc: `/tags/${r.slug}`,
        lastmod: ymd(String(r.updated_at || "")),
        changefreq: "weekly",
        priority: "0.5",
      })),
  ];

  const seen = new Set<string>();
  const unique = urls.filter((u) => {
    if (seen.has(u.loc)) return false;
    seen.add(u.loc);
    return true;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${unique.map(urlXml).join("\n")}
</urlset>
`;
}

export default async function handler(_request: Request, context: Context) {
  try {
    const xml = await buildSitemap();
    if (!xml) return context.next();
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch (error) {
    console.error("sitemap edge error:", error);
    return context.next();
  }
}
