import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CaretLeft, CaretRight } from '@phosphor-icons/react';

const GUTTER = 'px-5 md:px-16 xl:px-20';

export default function EventRail({
  title,
  subtitle,
  href,
  linkLabel = 'Tout voir',
  children,
  count,
  empty,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  count: number;
  empty?: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(true);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => {
      const wide = window.matchMedia('(min-width: 1024px)').matches;
      setOverflow(!wide || el.scrollWidth > el.clientWidth + 8);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [count]);

  return (
    <section className="pt-10 md:pt-12">
      <div className={`mx-auto mb-4 flex max-w-[1440px] items-end justify-between gap-4 ${GUTTER}`}>
        <div>
          <h2 className="font-display text-[20px] font-bold tracking-[-0.025em] md:text-[26px]">{title}</h2>
          {subtitle ? <p className="mt-1 text-[13px] text-ink-3 md:text-[14.5px]">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {href ? (
            <Link to={href} className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-brand md:text-[14.5px]">
              {linkLabel} <ArrowRight size={15} weight="bold" />
            </Link>
          ) : null}
          {overflow && (
            <>
              <button type="button" aria-label="Précédents" onClick={() => scroller.current?.scrollBy({ left: -320, behavior: 'smooth' })} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white">
                <CaretLeft size={18} weight="bold" />
              </button>
              <button type="button" aria-label="Suivants" onClick={() => scroller.current?.scrollBy({ left: 320, behavior: 'smooth' })} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white">
                <CaretRight size={18} weight="bold" />
              </button>
            </>
          )}
        </div>
      </div>
      {count === 0 ? (
        <div className={`mx-auto max-w-[1440px] ${GUTTER}`}>{empty}</div>
      ) : (
        <div
          ref={scroller}
          className={overflow
            ? `flex gap-3 overflow-x-auto scroll-pl-5 scroll-pr-5 snap-x snap-mandatory md:gap-5 md:scroll-pl-16 xl:scroll-pl-20 ${GUTTER} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
            : `mx-auto grid max-w-[1440px] grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 xl:gap-5 ${GUTTER}`}
        >
          {children}
        </div>
      )}
    </section>
  );
}

export function PlainGrid({ children }: { children: ReactNode }) {
  return (
    <div className={`mx-auto grid max-w-[1440px] grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 xl:gap-5 ${GUTTER}`}>
      {children}
    </div>
  );
}
