/**
 * Validate Temba artist rows (Burkinabè + photo).
 *
 * Usage:
 *   node scripts/validate-artists.mjs                  # live table via Supabase
 *   node scripts/validate-artists.mjs path/to.json     # collector JSON (array or { artists: [] })
 *
 * Exit 1 if any ready-blocking fail.
 */
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const ALLOWED_COUNTRIES = new Set(['BF']);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FRENCH_HINT = /[àâäéèêëïîôùûüçœæ]|le |la |les |de |du |des |une |un |né |née |chanteur|chanteuse|rappeur|groupe |burkinab/i;

const BANNED_PHOTO_HOSTS = [
  'images.pexels.com',
  'images.unsplash.com',
  'pexels.com',
  'unsplash.com',
  'cdn-images.dzcdn.net',
  'e-cdns-images.dzcdn.net',
  'lastfm.freetls.fastly.net',
  'i.scdn.co',
  'is1-ssl.mzstatic.com',
  'scontent.cdninstagram.com',
  'instagram.com',
];

const OK_PHOTO_HOSTS = [
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'wlyncuwbzhzjafmqozcm.supabase.co',
];

const ALIASES = [
  ['alif naaba', 'alif naâba', 'alif naaba prince aux pieds nus'],
  ['hawa boussim', 'awa boussim'],
  ['amity meria', 'amety meria', 'amity méria'],
  ['sams k le jah', "sams'k le jah", 'samsk le jah', 'karim sama'],
  ['donsharp de batoro', 'don sharp', 'donsharp'],
  ['miss tanya', 'tanya', 'tani bikienga'],
];

function fold(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugifyFr(value) {
  return fold(value).replace(/\s+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function aliasKey(name) {
  const n = fold(name);
  for (const group of ALIASES) {
    if (group.some((a) => fold(a) === n)) return group[0];
  }
  return n;
}

async function loadEnv() {
  for (const file of [path.join(ROOT, '.env'), path.join(ROOT, '.env.local')]) {
    if (!existsSync(file)) continue;
    const raw = await readFile(file, 'utf-8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const key = t.slice(0, i).trim();
      const val = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  }
}

function supabaseUrl() {
  return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
}
function supabaseKey() {
  return process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
}

async function fetchLiveArtists() {
  const base = supabaseUrl();
  const key = supabaseKey();
  if (!base || !key) return [];
  const res = await fetch(
    `${base}/rest/v1/artists?select=id,name,slug,bio,genre,photo_url,cover_image_url,country_code,city,social_links,verified&order=name`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) throw new Error(`Supabase artists ${res.status}`);
  return res.json();
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function photoHostFail(url) {
  const host = hostOf(url);
  if (!host) return 'photo_url invalide';
  if (BANNED_PHOTO_HOSTS.some((b) => host === b || host.endsWith(`.${b}`))) {
    return `photo interdite (${host}) — pas Pexels/Unsplash/Deezer/Last.fm/Spotify/IG CDN`;
  }
  return null;
}

async function photoLoads(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    if (res.status === 405 || res.status === 403 || res.status === 400) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { Range: 'bytes=0-64' },
      });
    }
    if (!res.ok) return `photo HTTP ${res.status}`;
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (type && !type.startsWith('image/') && !type.includes('octet-stream')) {
      return `photo content-type ${type}`;
    }
    return null;
  } catch (e) {
    return `photo injoignable (${e.cause?.code || e.message})`;
  } finally {
    clearTimeout(t);
  }
}

function looksEnglishOnly(bio) {
  if (!bio) return true;
  if (FRENCH_HINT.test(bio)) return false;
  return /\b(the|and|born|singer|rapper|from)\b/i.test(bio);
}

function validateRow(row, { liveSlugs, liveAliasKeys, skipLiveDup }) {
  const fails = [];
  const warns = [];
  const name = String(row.name ?? '').trim();
  const slug = String(row.slug ?? '').trim();
  const bio = String(row.bio ?? '').trim();
  const cc = String(row.country_code ?? '').trim().toUpperCase();
  const photo = String(row.photo_url ?? '').trim();
  const cover = String(row.cover_image_url ?? '').trim();

  if (!name) fails.push('name manquant');
  if (!slug || !SLUG_RE.test(slug)) fails.push(`slug invalide (${slug || 'vide'})`);
  else if (name && slugifyFr(name) !== slug && !slug.startsWith(slugifyFr(name))) {
    warns.push(`slug « ${slug} » ≠ nom plié « ${slugifyFr(name)} »`);
  }

  if (!ALLOWED_COUNTRIES.has(cc)) {
    fails.push(`pas burkinabè (country_code=${cc || 'vide'} — exigé BF)`);
  }

  if (!bio || bio.length < 40) fails.push('bio trop courte');
  else if (looksEnglishOnly(bio)) fails.push('bio pas en français');

  if (row.verified === true) warns.push('verified=true : réservé au staff Temba');

  if (!skipLiveDup && liveSlugs.has(slug)) fails.push('slug déjà sur Temba');
  const key = aliasKey(name);
  if (!skipLiveDup && name && liveAliasKeys.has(key) && !liveSlugs.has(slug)) {
    fails.push(`doublon probable (${key})`);
  }

  if (!photo) {
    fails.push('photo_url manquante');
  } else {
    const banned = photoHostFail(photo);
    if (banned) fails.push(banned);
    else if (!OK_PHOTO_HOSTS.some((h) => hostOf(photo) === h || hostOf(photo).endsWith(`.${h}`))) {
      warns.push(`hôte photo non listé (${hostOf(photo)}) — licence à vérifier`);
    }
    if (!row.image_licence && hostOf(photo).includes('wikimedia')) {
      warns.push('image Wikimedia sans image_licence');
    }
  }

  if (cover) {
    const bannedCover = photoHostFail(cover);
    if (bannedCover) fails.push(bannedCover.replace('photo_url', 'cover'));
  }

  return { name, slug, fails, warns };
}

async function main() {
  await loadEnv();
  const fileArg = process.argv[2];
  let rows = [];
  let skipLiveDup = false;

  if (fileArg) {
    const raw = JSON.parse(await readFile(path.resolve(fileArg), 'utf-8'));
    rows = Array.isArray(raw) ? raw : raw.artists || raw.candidates || [];
    skipLiveDup = false;
  } else {
    rows = await fetchLiveArtists();
    skipLiveDup = true;
    if (!rows.length) {
      console.error('Aucune fiche live. Passez un JSON: node scripts/validate-artists.mjs artists.json');
      process.exit(2);
    }
  }

  let live = [];
  try {
    live = await fetchLiveArtists();
  } catch (e) {
    console.warn('Live Temba inaccessible:', e.message);
  }
  const liveSlugs = new Set(live.map((a) => a.slug));
  const liveAliasKeys = new Set(live.map((a) => aliasKey(a.name)));

  const report = [];
  for (const row of rows) {
    const base = validateRow(row, { liveSlugs, liveAliasKeys, skipLiveDup });
    if (row.photo_url && !base.fails.some((f) => f.startsWith('photo interdite') || f === 'photo_url manquante' || f.startsWith('photo_url invalide'))) {
      const load = await photoLoads(row.photo_url);
      if (load) base.fails.push(load);
    }
    const status = base.fails.length ? 'fail' : base.warns.length ? 'warn' : 'pass';
    report.push({ ...base, status });
  }

  const pass = report.filter((r) => r.status === 'pass');
  const warn = report.filter((r) => r.status === 'warn');
  const fail = report.filter((r) => r.status === 'fail');

  console.log(`Artistes: ${report.length}  pass=${pass.length}  warn=${warn.length}  fail=${fail.length}`);
  console.log('Règle: country_code=BF, slug FR, bio FR, photo réelle (pas stock/Deezer).\n');

  for (const r of report) {
    if (r.status === 'pass') continue;
    console.log(`${r.status.toUpperCase()}  ${r.slug || '—'}  (${r.name || '?'})`);
    for (const f of r.fails) console.log(`    ✕ ${f}`);
    for (const w of r.warns) console.log(`    ! ${w}`);
  }

  if (fail.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
