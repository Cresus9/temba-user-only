import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Calendar,
  Hash,
  ArrowUp,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  List,
} from 'lucide-react';

interface LegalShellProps {
  /** Short label printed above the title (e.g. "Document légal"). */
  eyebrow: string;
  /** Document title. */
  title: string;
  /** Subtitle / lead paragraph under the title. */
  subtitle?: React.ReactNode;
  /** "Last updated" date (rendered verbatim). */
  lastUpdated?: string;
  /** Optional effective date. */
  effectiveDate?: string;
  /** Optional app version. */
  appVersion?: string;
  /** Legal entity name (rendered in the side card). */
  legalEntity?: string;
  /** Children = the actual document content. */
  children: React.ReactNode;
}

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

const slugify = (raw: string): string =>
  raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);

/* Editorial typography for legal docs.
   Scoped to .legal-content. Pure CSS, no DOM mutation. */
const LEGAL_CSS = `
.legal-content {
  color: #14172A;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 16px;
  line-height: 1.72;
  letter-spacing: -0.003em;
}
.legal-content > * + * { margin-top: 1.1em; }

/* H2 — section heading */
.legal-content h2 {
  font-family: "Plus Jakarta Sans", Inter, sans-serif;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.2;
  color: #14172A;
  letter-spacing: -0.02em;
  margin-top: 2.6em;
  margin-bottom: 0.7em;
  scroll-margin-top: 96px;
  padding-top: 0.6em;
  position: relative;
}
.legal-content h2:first-child { margin-top: 0; padding-top: 0; }
.legal-content h2::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 56px;
  height: 3px;
  border-radius: 2px;
  background: #3D3FE2;
}
.legal-content h2:first-child::before { display: none; }

/* H3 */
.legal-content h3 {
  font-family: "Plus Jakarta Sans", Inter, sans-serif;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
  color: #14172A;
  margin-top: 1.8em;
  margin-bottom: 0.5em;
  scroll-margin-top: 96px;
  letter-spacing: -0.01em;
}

/* H4 */
.legal-content h4 {
  font-family: "Plus Jakarta Sans", Inter, sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #2A3147;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

/* Paragraphs */
.legal-content p {
  font-size: 16px;
  line-height: 1.72;
  color: #1A1F36;
  margin: 0;
}
.legal-content p + p { margin-top: 0.9em; }

/* Strong & em */
.legal-content strong { color: #14172A; font-weight: 700; }
.legal-content em { font-style: italic; color: #1A1F36; }

/* Links */
.legal-content a {
  color: #3D3FE2;
  font-weight: 600;
  text-decoration: none;
  background-image: linear-gradient(transparent calc(100% - 1px), #3D3FE2 1px);
  background-size: 100% 100%;
  background-repeat: no-repeat;
  transition: color 0.15s ease, background-image 0.15s ease;
}
.legal-content a:hover {
  color: #2F31C9;
  background-image: linear-gradient(transparent calc(100% - 2px), #2F31C9 2px);
}

/* Lists */
.legal-content ul,
.legal-content ol {
  padding-left: 0;
  margin: 0.75em 0 1em;
}
.legal-content li {
  font-size: 16px;
  line-height: 1.7;
  color: #1A1F36;
  position: relative;
  padding-left: 1.4em;
  margin-top: 0.35em;
}
.legal-content ul > li::before {
  content: "";
  position: absolute;
  left: 0.2em;
  top: 0.7em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3D3FE2;
}
.legal-content ol { counter-reset: legal-ol; }
.legal-content ol > li {
  counter-increment: legal-ol;
}
.legal-content ol > li::before {
  content: counter(legal-ol) ".";
  position: absolute;
  left: 0;
  top: 0;
  font-family: ${monoFamily.replace(/"/g, "'")};
  font-weight: 700;
  color: #3D3FE2;
  font-variant-numeric: tabular-nums;
}

/* Callout — info, warning, danger */
.legal-content .callout {
  margin: 1.5em 0;
  padding: 1em 1.25em;
  border-radius: 14px;
  border: 1px solid #DEE3EB;
  background: #FAF7F2;
  font-size: 15px;
  line-height: 1.6;
  color: #1A1F36;
  display: flex;
  gap: 0.85em;
}
.legal-content .callout > svg { flex-shrink: 0; margin-top: 0.15em; }
.legal-content .callout-info {
  background: #ECEBFB;
  border-color: rgba(61, 63, 226, 0.18);
}
.legal-content .callout-warning {
  background: #FBF1DD;
  border-color: rgba(198, 138, 31, 0.25);
}
.legal-content .callout-danger {
  background: #FEF2F2;
  border-color: rgba(220, 38, 38, 0.2);
  color: #7F1D1D;
}
.legal-content .callout-danger strong { color: #7F1D1D; }
.legal-content .callout p { margin: 0; }
.legal-content .callout p + p { margin-top: 0.4em; }

/* Definition lists for the meta block */
.legal-content dl.legal-meta {
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 1.2em;
  row-gap: 0.4em;
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  background: #FAF7F2;
  border: 1px solid #DEE3EB;
  border-radius: 14px;
  padding: 1em 1.25em;
}
.legal-content dl.legal-meta dt {
  color: #7E8B9F;
  font-weight: 600;
}
.legal-content dl.legal-meta dd {
  color: #14172A;
  margin: 0;
  font-weight: 500;
}

/* Horizontal rule */
.legal-content hr {
  margin: 2.4em 0;
  border: 0;
  height: 1px;
  background-image: linear-gradient(to right, transparent, #DEE3EB 30%, #DEE3EB 70%, transparent);
  position: relative;
}

@media (max-width: 640px) {
  .legal-content { font-size: 15.5px; line-height: 1.7; }
  .legal-content p, .legal-content li { font-size: 15.5px; line-height: 1.7; }
  .legal-content h2 { font-size: 22px; }
  .legal-content h3 { font-size: 16px; }
  .legal-content dl.legal-meta {
    grid-template-columns: 1fr;
    row-gap: 0.6em;
  }
  .legal-content dl.legal-meta dt { color: #7E8B9F; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: -0.3em; }
}
`;

export default function LegalShell({
  eyebrow,
  title,
  subtitle,
  lastUpdated,
  effectiveDate,
  appVersion,
  legalEntity = 'EZSTAY LLC',
  children,
}: LegalShellProps) {
  const articleRef = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  /* Auto-extract h2 headings from rendered children, slugify
     them, and assign deterministic IDs so anchors work. */
  useEffect(() => {
    if (!articleRef.current) return;
    const h2s = articleRef.current.querySelectorAll('h2');
    const seen = new Map<string, number>();
    const list: { id: string; text: string }[] = [];
    h2s.forEach((h, idx) => {
      const text = (h.textContent || '').trim();
      let id = slugify(text);
      if (!id) id = `section-${idx + 1}`;
      const count = seen.get(id) ?? 0;
      if (count > 0) id = `${id}-${count + 1}`;
      seen.set(id, count + 1);
      h.id = id;
      list.push({ id, text });
    });
    setHeadings(list);
  }, [children]);

  /* Scroll-spy + back-to-top */
  useEffect(() => {
    if (headings.length === 0) return;
    const onScroll = () => {
      setShowTopBtn(window.scrollY > 720);
      const scrollPosition = window.scrollY + 140;
      let current = headings[0]?.id || '';
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (
          el &&
          el.getBoundingClientRect().top + window.scrollY <= scrollPosition
        ) {
          current = h.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: 'smooth' });
    setTocOpen(false);
  };

  const metaItems = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    if (legalEntity) items.push({ label: 'Entreprise', value: legalEntity });
    if (effectiveDate)
      items.push({ label: "Date d'effet", value: effectiveDate });
    if (appVersion) items.push({ label: 'Version', value: appVersion });
    return items;
  }, [legalEntity, effectiveDate, appVersion]);

  return (
    <div className="min-h-screen bg-paper">
      <style>{LEGAL_CSS}</style>

      {/* — Breadcrumb — */}
      <div className="border-b border-line bg-cream/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-1.5 text-[12px] text-ink-mute"
          >
            <Link to="/" className="hover:text-ink transition-colors">
              Accueil
            </Link>
            <ChevronRight className="w-3 h-3 text-ink-mute/50" />
            <span className="text-ink font-semibold truncate">{title}</span>
          </nav>
        </div>
      </div>

      {/* — Hero — */}
      <section className="relative bg-cream bg-grain border-b border-line overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-brand-50 blur-3xl opacity-70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-32 -left-32 w-[300px] h-[300px] rounded-full bg-accent-50 blur-3xl opacity-60"
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-mute hover:text-brand transition-colors mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à l'accueil
          </Link>

          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand mb-3"
            style={{ fontFamily: monoFamily }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
            {eyebrow}
          </p>
          <h1
            className="text-[clamp(28px,4.4vw,42px)] font-bold text-ink leading-[1.05] tracking-tight max-w-3xl"
            style={{ fontFamily: displayFamily }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 text-[15px] sm:text-[16px] text-ink-mute leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}

          {(lastUpdated || effectiveDate || appVersion) && (
            <div
              className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-mute"
              style={{ fontFamily: monoFamily }}
            >
              {lastUpdated && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-brand" strokeWidth={2.5} />
                  Mise à jour · {lastUpdated}
                </span>
              )}
              {effectiveDate && (
                <>
                  <span className="text-ink-mute/40">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    Effet · {effectiveDate}
                  </span>
                </>
              )}
              {appVersion && (
                <>
                  <span className="text-ink-mute/40">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Hash className="w-3 h-3 text-brand" strokeWidth={2.5} />
                    v{appVersion}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* — Body grid — */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] gap-8 lg:gap-12">
          {/* Article */}
          <div className="min-w-0">
            {/* Mobile TOC disclosure */}
            {headings.length > 1 && (
              <div className="lg:hidden mb-6 bg-paper rounded-xl2 border border-line shadow-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setTocOpen((o) => !o)}
                  aria-expanded={tocOpen}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-cream/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <List className="w-4 h-4 text-brand" strokeWidth={2.5} />
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink"
                      style={{ fontFamily: monoFamily }}
                    >
                      Table des matières
                    </span>
                    <span
                      className="text-[11px] font-bold tabular-nums text-ink-mute ml-1"
                      style={{ fontFamily: monoFamily }}
                    >
                      · {headings.length}
                    </span>
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-ink-mute transition-transform ${
                      tocOpen ? 'rotate-180' : ''
                    }`}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m4 6 4 4 4-4" />
                  </svg>
                </button>
                {tocOpen && (
                  <nav className="border-t border-line px-2 py-2 max-h-[60vh] overflow-y-auto">
                    <TocList items={headings} activeId={activeId} onClick={scrollTo} />
                  </nav>
                )}
              </div>
            )}

            <div ref={articleRef} className="legal-content max-w-[760px]">
              {children}
            </div>

            {/* Footer / contact strip */}
            <div className="mt-12 pt-8 border-t border-line">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-mute mb-3"
                style={{ fontFamily: monoFamily }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
                Une question sur ce document ?
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-mute">
                <a
                  href="mailto:info@tembas.com"
                  className="inline-flex items-center gap-1.5 text-ink hover:text-brand transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-brand" strokeWidth={2.2} />
                  info@tembas.com
                </a>
                <span aria-hidden className="w-px h-4 bg-line" />
                <a
                  href="tel:+22674750815"
                  className="inline-flex items-center gap-1.5 text-ink hover:text-brand transition-colors"
                  style={{ fontFamily: monoFamily }}
                >
                  <Phone className="w-3.5 h-3.5 text-brand" strokeWidth={2.2} />
                  +226 74 75 08 15
                </a>
                <span aria-hidden className="w-px h-4 bg-line" />
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand" strokeWidth={2.2} />
                  Ouagadougou, BF
                </span>
              </div>
            </div>
          </div>

          {/* — Sidebar — */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              {/* Meta card */}
              {metaItems.length > 0 && (
                <div className="bg-cream rounded-xl2 border border-line shadow-card p-4">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-3"
                    style={{ fontFamily: monoFamily }}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
                    Document
                  </p>
                  <dl className="space-y-2.5">
                    {metaItems.map((item) => (
                      <div key={item.label}>
                        <dt
                          className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                          style={{ fontFamily: monoFamily }}
                        >
                          {item.label}
                        </dt>
                        <dd className="text-[13px] font-semibold text-ink">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                    {lastUpdated && (
                      <div>
                        <dt
                          className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                          style={{ fontFamily: monoFamily }}
                        >
                          Mise à jour
                        </dt>
                        <dd
                          className="text-[13px] font-semibold text-ink tabular-nums"
                          style={{ fontFamily: monoFamily }}
                        >
                          {lastUpdated}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* TOC */}
              {headings.length > 1 && (
                <div className="bg-paper rounded-xl2 border border-line shadow-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand inline-flex items-center gap-2"
                      style={{ fontFamily: monoFamily }}
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                      Sommaire
                    </p>
                    <span
                      className="text-[10px] font-bold tabular-nums text-ink-mute"
                      style={{ fontFamily: monoFamily }}
                    >
                      {headings.length} sections
                    </span>
                  </div>
                  <nav>
                    <TocList items={headings} activeId={activeId} onClick={scrollTo} />
                  </nav>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Floating back-to-top */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Remonter en haut"
        className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-ink text-paper grid place-items-center shadow-pop hover:bg-brand transition-all ${
          showTopBtn
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ── TOC list ── */
interface TocListProps {
  items: { id: string; text: string }[];
  activeId: string;
  onClick: (id: string) => void;
}

function TocList({ items, activeId, onClick }: TocListProps) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onClick(item.id)}
              className={`group w-full text-left flex items-start gap-2.5 py-1.5 pl-3 pr-2 rounded transition-colors ${
                isActive ? 'text-brand' : 'text-ink-mute hover:text-ink'
              }`}
            >
              <span
                aria-hidden
                className={`mt-1.5 w-0.5 self-stretch rounded-full transition-all ${
                  isActive ? 'bg-brand' : 'bg-line group-hover:bg-ink-mute'
                }`}
              />
              <span
                className={`flex-1 text-[13px] leading-snug ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.text}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
