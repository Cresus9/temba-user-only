import { useState } from 'react';
import { Plus } from '@phosphor-icons/react';

export function ArtistFaq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section aria-labelledby="h-faq" className="pt-12 md:pt-16">
      <h2 id="h-faq" className="font-artist text-[24px] font-bold leading-8 tracking-[-0.02em] text-ink md:text-[28px]">Questions fréquentes</h2>
      <div className="mt-3">
        {items.map((item, i) => (
          <div key={item.q} className="border-b border-line">
            <button
              type="button"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? null : i)}
              className="flex min-h-16 w-full items-center justify-between gap-4 py-4 text-left text-[16px] font-semibold leading-6 text-ink"
            >
              {item.q}
              <Plus size={20} className={`shrink-0 text-ink-3 transition-transform ${open === i ? 'rotate-45' : ''}`} />
            </button>
            {open === i ? <p className="pb-4 text-[15px] leading-6 text-ink-3">{item.a}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
