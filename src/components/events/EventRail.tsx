import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CaretLeft, CaretRight } from '@phosphor-icons/react';

/** Same left edge as the home hero (max 1200px, 20px / 40px padding). The track itself runs to the screen edge. */
const ALIGN = 'pl-5 min-[1280px]:pl-16 min-[1440px]:pl-20';
const TITLE = 'w-full px-5 min-[1280px]:px-16 min-[1440px]:px-20';

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
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setOverflow(el.scrollWidth > el.clientWidth + 8);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [count]);

  return (
    <section className="max-w-full overflow-x-clip pt-10 md:pt-12">
      <div className={`mb-4 flex items-end justify-between gap-4 ${TITLE}`}>
        <div className="min-w-0">
          <h2 className="font-display text-[20px] font-bold tracking-[-0.025em] md:text-[26px]">{title}</h2>
          {subtitle ? <p className="mt-1 text-[13px] text-ink-3 md:text-[14.5px]">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {href ? (
            <Link to={href} className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-brand md:text-[14.5px]">
              {linkLabel} <ArrowRight size={15} weight="bold" />
            </Link>
          ) : null}
          {overflow && count > 0 && (
            <>
              <button type="button" aria-label="Précédents" onClick={() => scroller.current?.scrollBy({ left: -320, behavior: 'smooth' })} className="hidden h-10 w-10 place-items-center rounded-full border border-line bg-white md:grid">
                <CaretLeft size={18} weight="bold" />
              </button>
              <button type="button" aria-label="Suivants" onClick={() => scroller.current?.scrollBy({ left: 320, behavior: 'smooth' })} className="hidden h-10 w-10 place-items-center rounded-full border border-line bg-white md:grid">
                <CaretRight size={18} weight="bold" />
              </button>
            </>
          )}
        </div>
      </div>
      {count === 0 ? (
        <div className={TITLE}>{empty}</div>
      ) : (
        <div
          ref={scroller}
          className={`flex w-full max-w-full snap-x snap-mandatory gap-5 overflow-x-auto overflow-y-hidden pr-5 scroll-pl-5 min-[1280px]:scroll-pl-16 min-[1440px]:scroll-pl-20 ${ALIGN} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
        >
          {children}
        </div>
      )}
    </section>
  );
}
