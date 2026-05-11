import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface BlogPostContentProps {
  content: string;
}

/* ──────────────────────────────────────────────────────────────
   Shared prepare(): Markdown-lite → sanitized HTML with stable
   heading IDs so the Table of Contents and the rendered article
   share the same anchors.
   ────────────────────────────────────────────────────────────── */

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'em', 'u', 's', 'strike',
  'a', 'img', 'figure', 'figcaption',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code', 'kbd',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel',
  'src', 'alt', 'title', 'width', 'height',
  'class', 'id', 'style', 'data-id',
];

const slugify = (raw: string): string =>
  raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);

/**
 * Markdown-lite block processor.
 * Walks the source line-by-line and groups lines into proper
 * blocks (headings, paragraphs, ordered/unordered lists,
 * blockquotes, HR). Returns a string of HTML that has not been
 * sanitized yet.
 */
function blocksToHtml(raw: string): string {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  const isBlockBoundary = (s: string): boolean =>
    /^(#{1,6}\s|>\s|[-*]\s|\d+\.\s|---|\*\*\*|___)/.test(s);

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Skip blank lines (used as block separators)
    if (!trimmed) {
      i++;
      continue;
    }

    // Headings
    let m = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const level = Math.min(m[1].length, 4); // cap at h4
      const tag = level <= 1 ? 'h2' : `h${level}`; // promote h1 → h2 (we own h1)
      out.push(`<${tag}>${m[2].trim()}</${tag}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)\s*$/.test(trimmed)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // Blockquote — collect contiguous "> " lines
    if (/^>\s?/.test(trimmed)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote><p>${buf.join(' ')}</p></blockquote>`);
      continue;
    }

    // Unordered list — collect contiguous "- " or "* " lines
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const li = lines[i].trim().match(/^[-*]\s+(.+)$/);
        if (!li) break;
        items.push(li[1].trim());
        i++;
      }
      out.push(`<ul>${items.map((it) => `<li>${it}</li>`).join('')}</ul>`);
      continue;
    }

    // Ordered list — collect contiguous "N. " lines
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const li = lines[i].trim().match(/^\d+\.\s+(.+)$/);
        if (!li) break;
        items.push(li[1].trim());
        i++;
      }
      out.push(`<ol>${items.map((it) => `<li>${it}</li>`).join('')}</ol>`);
      continue;
    }

    // Already-HTML block — pass through until blank line
    if (trimmed.startsWith('<')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        buf.push(lines[i]);
        i++;
      }
      out.push(buf.join('\n'));
      continue;
    }

    // Paragraph — take non-blank, non-block-boundary lines and
    // join with a space (markdown-style soft wrap)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !isBlockBoundary(lines[i].trim())
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    if (buf.length) {
      out.push(`<p>${buf.join(' ')}</p>`);
    }
  }

  return out.join('\n');
}

/** Apply inline markdown — bold, italic, links — without
 * touching content already inside HTML tags. */
function applyInlineMarkdown(html: string): string {
  let s = html;
  // [label](url) → <a>
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  // **bold**
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // _italic_ (avoid touching mid-word underscores like file_name)
  s = s.replace(/(^|[\s>(])_([^_\n]+)_(?=$|[\s.,;:)!?])/g, '$1<em>$2</em>');
  // strip stray orphan single asterisks
  s = s.replace(/(?<!\*)\*(?!\*)/g, '');
  return s;
}

const METADATA_LEAD_RE =
  /^\s*<p>\s*(?:publi[ée]\s+(?:le|par)|posté\s+le|par\s+\S+,?\s+le|written\s+by)\b[^<]{0,120}<\/p>\s*/i;

/**
 * Public entry point: markdown-lite → sanitized HTML with
 * stable heading IDs for TOC anchors and a drop-cap class on
 * the first qualifying prose paragraph.
 */
export function prepareBlogContent(raw: string): string {
  if (!raw) return '';

  let html = blocksToHtml(raw);
  html = applyInlineMarkdown(html);

  // Strip a leading metadata byline paragraph if present —
  // the date and author already appear in the article hero,
  // so duplicating them at the top of the body is just noise.
  html = html.replace(METADATA_LEAD_RE, '');

  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });

  if (typeof window === 'undefined') return sanitized;

  const doc = new DOMParser().parseFromString(sanitized, 'text/html');

  // Inject deterministic IDs into h2/h3 for TOC anchors
  const headings = doc.body.querySelectorAll('h2, h3');
  const seen = new Map<string, number>();
  headings.forEach((h, idx) => {
    const text = (h.textContent || '').trim();
    let id = slugify(text);
    if (!id) id = `section-${idx + 1}`;
    const count = seen.get(id) ?? 0;
    if (count > 0) id = `${id}-${count + 1}`;
    seen.set(id, count + 1);
    h.id = id;
  });

  // Drop-cap heuristic: tag the first paragraph that is
  // "real prose" (≥ 100 chars, starts with a letter). This
  // skips short metadata lines and avoids the giant-letter
  // bug seen on bylines like "Publié le 22 décembre 2024".
  const firstBlock = doc.body.firstElementChild;
  if (firstBlock && firstBlock.tagName === 'P') {
    const text = (firstBlock.textContent || '').trim();
    if (text.length >= 100 && /^[A-Za-zÀ-ÿ"«]/u.test(text)) {
      firstBlock.classList.add('has-drop-cap');
    }
  }

  return doc.body.innerHTML;
}

/**
 * Returns the headings (h2/h3) in source order so the TOC can
 * render them with the same IDs as the article.
 */
export function extractBlogHeadings(
  raw: string
): { id: string; text: string; level: 2 | 3 }[] {
  if (typeof window === 'undefined') return [];
  const html = prepareBlogContent(raw);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const headings = doc.body.querySelectorAll('h2, h3');
  return Array.from(headings).map((h) => ({
    id: h.id,
    text: (h.textContent || '').trim(),
    level: (h.tagName === 'H2' ? 2 : 3) as 2 | 3,
  }));
}

/* ──────────────────────────────────────────────────────────────
   Article styles — scoped to .blog-content. Pure CSS, no
   imperative DOM mutation.
   ────────────────────────────────────────────────────────────── */

const CONTENT_CSS = `
.blog-content {
  color: #14172A;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 18px;
  line-height: 1.75;
  letter-spacing: -0.005em;
  font-feature-settings: "kern", "liga", "calt";
  word-wrap: break-word;
}

.blog-content > * + * { margin-top: 1.4em; }

/* Paragraphs */
.blog-content p {
  color: #1A1F36;
  font-size: 18px;
  line-height: 1.75;
  margin: 0;
}
.blog-content p + p { margin-top: 1.25em; }

/* Drop cap — applied only to the first qualifying prose
   paragraph (≥100 chars, starts with a letter). Tagged
   server-side so short metadata lines never get capped. */
.blog-content > p.has-drop-cap::first-letter {
  font-family: "Plus Jakarta Sans", Inter, sans-serif;
  font-weight: 800;
  float: left;
  font-size: 4.4em;
  line-height: 0.88;
  margin: 0.08em 0.12em 0 -0.04em;
  color: #3D3FE2;
  letter-spacing: -0.04em;
}

/* Headings */
.blog-content h2,
.blog-content h3,
.blog-content h4 {
  font-family: "Plus Jakarta Sans", Inter, sans-serif;
  color: #14172A;
  letter-spacing: -0.02em;
  scroll-margin-top: 96px;
}
.blog-content h2 {
  font-size: 30px;
  line-height: 1.18;
  font-weight: 800;
  margin-top: 2.4em;
  margin-bottom: 0.7em;
  position: relative;
  padding-top: 0.6em;
}
.blog-content h2::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 56px;
  height: 3px;
  border-radius: 2px;
  background: #3D3FE2;
}
.blog-content h3 {
  font-size: 22px;
  line-height: 1.25;
  font-weight: 700;
  margin-top: 2em;
  margin-bottom: 0.6em;
}
.blog-content h4 {
  font-size: 18px;
  line-height: 1.35;
  font-weight: 700;
  margin-top: 1.6em;
  margin-bottom: 0.5em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #2A3147;
  font-size: 14px;
}

/* Strong & em */
.blog-content strong { color: #14172A; font-weight: 700; }
.blog-content em { font-style: italic; color: #1A1F36; }

/* Links */
.blog-content a {
  color: #3D3FE2;
  font-weight: 600;
  text-decoration: none;
  background-image: linear-gradient(transparent calc(100% - 2px), #3D3FE2 2px);
  background-size: 100% 100%;
  background-repeat: no-repeat;
  transition: color 0.15s ease, background-image 0.15s ease;
  padding-bottom: 1px;
}
.blog-content a:hover {
  color: #2F31C9;
  background-image: linear-gradient(transparent calc(100% - 2px), #2F31C9 2px);
}

/* Blockquote — pull quote */
.blog-content blockquote {
  margin: 2em 0;
  padding: 1.25em 1.5em 1.25em 1.75em;
  background: #FAF7F2;
  border-left: 4px solid #3D3FE2;
  border-radius: 0 14px 14px 0;
  font-family: "Plus Jakarta Sans", Inter, sans-serif;
  font-size: 21px;
  line-height: 1.45;
  color: #14172A;
  font-style: italic;
  font-weight: 500;
  position: relative;
}
.blog-content blockquote p { margin: 0; font-size: inherit; line-height: inherit; color: inherit; font-style: inherit; }
.blog-content blockquote p + p { margin-top: 0.6em; }
.blog-content blockquote::before {
  content: "\\201C";
  position: absolute;
  top: 8px;
  left: 12px;
  font-family: Georgia, serif;
  font-size: 48px;
  line-height: 1;
  color: rgba(61, 63, 226, 0.18);
  font-style: normal;
}

/* Lists */
.blog-content ul,
.blog-content ol {
  padding-left: 0;
  margin: 1.25em 0;
}
.blog-content li {
  font-size: 18px;
  line-height: 1.75;
  color: #1A1F36;
  position: relative;
  padding-left: 1.6em;
  margin-top: 0.4em;
}
.blog-content ul > li::before {
  content: "";
  position: absolute;
  left: 0.15em;
  top: 0.7em;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3D3FE2;
}
.blog-content ol { counter-reset: blog-ol; }
.blog-content ol > li {
  counter-increment: blog-ol;
}
.blog-content ol > li::before {
  content: counter(blog-ol) ".";
  position: absolute;
  left: 0;
  top: 0;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-weight: 700;
  color: #3D3FE2;
  font-variant-numeric: tabular-nums;
}
.blog-content li > ul,
.blog-content li > ol { margin: 0.4em 0; }

/* Inline code */
.blog-content :not(pre) > code {
  background: #ECEBFB;
  color: #2629A5;
  padding: 0.15em 0.4em;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 0.9em;
  font-weight: 600;
  border: 1px solid rgba(38, 41, 165, 0.08);
}

/* Code blocks */
.blog-content pre {
  margin: 1.6em 0;
  padding: 1.25em 1.4em;
  background: #0E1020;
  color: #ECEFF4;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 14px;
  line-height: 1.6;
  box-shadow: 0 12px 32px rgba(20, 23, 42, 0.18);
}
.blog-content pre code {
  background: transparent;
  color: inherit;
  padding: 0;
  border: 0;
  font-weight: 400;
}

/* Images & figures */
.blog-content img {
  display: block;
  width: 100%;
  height: auto;
  margin: 2em 0;
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(20, 23, 42, 0.04), 0 14px 28px rgba(20, 23, 42, 0.08);
}
.blog-content figure { margin: 2em 0; }
.blog-content figure img { margin: 0; }
.blog-content figcaption {
  margin-top: 0.6em;
  text-align: center;
  font-size: 13px;
  color: #7E8B9F;
  font-style: italic;
}

/* Tables */
.blog-content table {
  width: 100%;
  margin: 1.6em 0;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #DEE3EB;
  border-radius: 14px;
  overflow: hidden;
  font-size: 14px;
}
.blog-content thead {
  background: #FAF7F2;
}
.blog-content th {
  text-align: left;
  padding: 0.75em 1em;
  font-weight: 700;
  color: #14172A;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-bottom: 1px solid #DEE3EB;
}
.blog-content td {
  padding: 0.75em 1em;
  border-bottom: 1px solid #ECEFF4;
  color: #1A1F36;
}
.blog-content tr:last-child td { border-bottom: 0; }

/* Horizontal rule */
.blog-content hr {
  margin: 3em 0;
  border: 0;
  height: 1px;
  background-image: linear-gradient(to right, transparent, #DEE3EB 30%, #DEE3EB 70%, transparent);
  position: relative;
}
.blog-content hr::after {
  content: "·";
  position: absolute;
  top: -0.7em;
  left: 50%;
  transform: translateX(-50%);
  font-size: 22px;
  color: #C68A1F;
  background: #FFFFFF;
  padding: 0 0.5em;
  line-height: 1;
}

/* Keyboard */
.blog-content kbd {
  display: inline-block;
  padding: 0.15em 0.5em;
  background: #FFFFFF;
  border: 1px solid #DEE3EB;
  border-bottom-width: 2px;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 0.85em;
  color: #14172A;
}

/* Small screens — keep things readable on phones */
@media (max-width: 640px) {
  .blog-content { font-size: 17px; line-height: 1.7; }
  .blog-content p, .blog-content li { font-size: 17px; line-height: 1.7; }
  .blog-content h2 { font-size: 26px; }
  .blog-content h3 { font-size: 20px; }
  .blog-content > p.has-drop-cap::first-letter { font-size: 3.6em; }
  .blog-content blockquote { padding: 1em 1em 1em 1.25em; font-size: 18px; }
}
`;

export default function BlogPostContent({ content }: BlogPostContentProps) {
  const html = useMemo(() => prepareBlogContent(content), [content]);

  return (
    <>
      <style>{CONTENT_CSS}</style>
      <div className="blog-content" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
