import React, { useEffect, useMemo, useState } from 'react';
import { List } from 'lucide-react';
import { extractBlogHeadings } from './BlogPostContent';

interface TableOfContentsProps {
  content: string;
  /** Optional className override for the outer card */
  className?: string;
  /** Compact = collapses to a disclosure on mobile */
  variant?: 'sidebar' | 'disclosure';
}

const monoFamily =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

export default function TableOfContents({
  content,
  className = '',
  variant = 'sidebar',
}: TableOfContentsProps) {
  const items = useMemo(() => extractBlogHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string>('');
  const [open, setOpen] = useState(false);

  // Scroll-spy
  useEffect(() => {
    if (items.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;
      let current = items[0]?.id || '';
      for (let i = 0; i < items.length; i++) {
        const el = document.getElementById(items[i].id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= scrollPosition) {
          current = items[i].id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [items]);

  if (items.length === 0) return null;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: 'smooth' });
    setOpen(false);
  };

  // ── Disclosure (mobile) ──
  if (variant === 'disclosure') {
    return (
      <div
        className={`bg-paper rounded-xl2 border border-line shadow-card overflow-hidden ${className}`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
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
              · {items.length}
            </span>
          </span>
          <svg
            className={`w-3.5 h-3.5 text-ink-mute transition-transform ${
              open ? 'rotate-180' : ''
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
        {open && (
          <nav className="border-t border-line px-2 py-2 max-h-[60vh] overflow-y-auto">
            <TocList items={items} activeId={activeId} onClick={scrollTo} />
          </nav>
        )}
      </div>
    );
  }

  // ── Sidebar (desktop) ──
  return (
    <aside
      className={`bg-paper rounded-xl2 border border-line shadow-card p-4 ${className}`}
    >
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
          {items.length} section{items.length !== 1 ? 's' : ''}
        </span>
      </div>
      <h3
        className="text-[14px] font-bold text-ink mb-3 tracking-tight"
        style={{ fontFamily: displayFamily }}
      >
        Dans cet article
      </h3>
      <nav>
        <TocList items={items} activeId={activeId} onClick={scrollTo} />
      </nav>
    </aside>
  );
}

/* ── List item rendering ── */
interface TocListProps {
  items: { id: string; text: string; level: 2 | 3 }[];
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
              className={`group w-full text-left flex items-start gap-2.5 py-1.5 pr-2 rounded transition-colors ${
                item.level === 3 ? 'pl-7' : 'pl-3'
              } ${
                isActive
                  ? 'text-brand'
                  : 'text-ink-mute hover:text-ink'
              }`}
            >
              {item.level === 2 && (
                <span
                  aria-hidden
                  className={`mt-1.5 w-0.5 self-stretch rounded-full transition-all ${
                    isActive ? 'bg-brand' : 'bg-line group-hover:bg-ink-mute'
                  }`}
                />
              )}
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
