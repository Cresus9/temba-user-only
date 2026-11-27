import { useEffect, useState } from 'react';

/** Highlights the section currently under the sticky menu. One observer, no scroll listener. */
export function useSectionSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '');
  const key = ids.join('|');

  useEffect(() => {
    const nodes = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!nodes.length || typeof IntersectionObserver === 'undefined') return undefined;
    const seen = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) seen.set(entry.target.id, entry.boundingClientRect.top);
          else seen.delete(entry.target.id);
        });
        const first = [...seen.entries()].sort((a, b) => a[1] - b[1])[0];
        // Nothing under the menu line (page top, or between sections): keep the nearest, default to the first.
        if (first) setActive(first[0]);
        else if (window.scrollY < 200) setActive(ids[0] ?? '');
      },
      { rootMargin: '-140px 0px -55% 0px', threshold: 0 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return active;
}
