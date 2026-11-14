import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CaretRight, MagnifyingGlass, Plus } from '@phosphor-icons/react';

export function DirectoryPage({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-[1200px] px-5 pb-24 md:px-10">{children}</div>
    </div>
  );
}

export function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="hidden items-center gap-2 pt-8 text-[14px] font-medium text-ink-3 md:flex">
      {items.map((item, index) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          {index > 0 ? <CaretRight size={16} className="text-ink-4" /> : null}
          {item.to && index < items.length - 1 ? <Link to={item.to}>{item.label}</Link> : <b className="font-medium text-ink">{item.label}</b>}
        </span>
      ))}
    </nav>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="mt-6 flex h-12 w-full items-center gap-2 rounded-lg border border-line px-4 text-[16px] text-ink md:mt-0 md:w-[360px] md:shrink-0">
      <MagnifyingGlass size={20} className="text-ink-3" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent outline-none placeholder:text-ink-3"
      />
    </label>
  );
}

export function CityTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; count: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="-mr-5 overflow-x-auto md:mr-0">
      <div className="flex w-max gap-6 border-b border-line pr-5 md:w-auto md:gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex h-12 items-center gap-2 whitespace-nowrap text-[15px] font-medium md:text-[16px] ${tab.id === value ? 'text-ink shadow-[inset_0_-2px_0_var(--ink)]' : 'text-ink-3'}`}
          >
            {tab.label}
            <span className={tab.id === value ? 'text-ink-3' : 'text-ink-4'}>{tab.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="mt-16 md:mt-24">
      <h2 className="!mb-4 !text-[24px] !font-semibold !leading-8 md:!text-[28px] md:!leading-8">Questions fréquentes</h2>
      {items.map((item, index) => (
        <div key={item.q} className="border-b border-line">
          <button
            type="button"
            className="flex min-h-16 w-full items-center justify-between gap-4 py-4 text-left text-[16px] font-medium"
            onClick={() => setOpen(open === index ? null : index)}
          >
            {item.q}
            <Plus size={20} className={`shrink-0 text-ink-3 transition-transform ${open === index ? 'rotate-45' : ''}`} />
          </button>
          {open === index ? <p className="pb-4 text-[15px] leading-6 text-ink-3">{item.a}</p> : null}
        </div>
      ))}
    </section>
  );
}

export function EmptyBlock({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#C9CBD8] p-6 md:p-8">
      <p className="font-display text-[20px] font-semibold leading-6">{title}</p>
      {text ? <p className="mt-2 text-[16px] leading-6 text-ink-3">{text}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
