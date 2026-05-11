import React, { useEffect, useState } from 'react';

interface ReadingProgressBarProps {
  /**
   * Optional ref to the article element. If provided, progress is
   * computed across the article only (more accurate for long pages
   * with comments + related posts below).
   */
  targetRef?: React.RefObject<HTMLElement>;
}

export default function ReadingProgressBar({ targetRef }: ReadingProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;

    const compute = () => {
      let pct = 0;
      const target = targetRef?.current;

      if (target) {
        const rect = target.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const passed = -rect.top;
        pct = total > 0 ? (passed / total) * 100 : 0;
      } else {
        const total =
          document.documentElement.scrollHeight - window.innerHeight;
        pct = total > 0 ? (window.scrollY / total) * 100 : 0;
      }

      setProgress(Math.min(100, Math.max(0, pct)));
    };

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', compute);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [targetRef]);

  // Hide entirely while at the very top of the page
  const visible = progress > 0.5;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none"
    >
      <div
        className="h-full transition-opacity duration-200"
        style={{
          width: `${progress}%`,
          background:
            'linear-gradient(90deg, #3D3FE2 0%, #4D4FE6 60%, #C68A1F 100%)',
          opacity: visible ? 1 : 0,
          boxShadow: '0 0 12px rgba(61, 63, 226, 0.45)',
        }}
      />
    </div>
  );
}
