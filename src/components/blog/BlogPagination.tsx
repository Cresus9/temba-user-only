import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export default function BlogPagination({
  currentPage,
  totalPages,
  onPageChange,
}: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const navBtn =
    'inline-flex items-center justify-center h-10 px-3 rounded-lg text-[13px] font-semibold transition-colors';
  const numBtn =
    'inline-flex items-center justify-center w-10 h-10 rounded-lg text-[13px] font-bold tabular-nums transition-colors';

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-2 mt-10"
    >
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Page précédente"
        className={`${navBtn} bg-paper border border-line text-ink hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-line disabled:hover:text-ink`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Numbers */}
      <div className="flex items-center gap-1.5">
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span
                className="w-10 h-10 inline-flex items-center justify-center text-[13px] text-ink-mute tabular-nums"
                style={{ fontFamily: monoFamily }}
              >
                …
              </span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                aria-label={`Aller à la page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
                className={`${numBtn} ${
                  currentPage === page
                    ? 'bg-brand text-paper shadow-card'
                    : 'bg-paper border border-line text-ink hover:border-brand hover:text-brand'
                }`}
                style={{ fontFamily: monoFamily }}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Page suivante"
        className={`${navBtn} bg-paper border border-line text-ink hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-line disabled:hover:text-ink`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
