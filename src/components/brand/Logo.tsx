import React from 'react';

interface LogoProps {
  /**
   * Visual variant.
   * - `auto` (default): purple symbol + ink wordmark, for light surfaces.
   * - `light`: purple symbol + white wordmark, for dark surfaces.
   * - `mark`: the symbol alone.
   */
  variant?: 'auto' | 'light' | 'mark';
  /** Height of the lockup or mark, in px. */
  size?: number;
  className?: string;
}

const LOCKUP = { width: 2282, height: 500 };

const sources = {
  auto: '/brand/temba-lockup.svg',
  light: '/brand/temba-lockup-on-ink.svg',
  mark: '/brand/temba-symbol.svg',
} as const;

/**
 * Official Temba lockup from the brand guidelines: ticket-stub symbol and wordmark.
 */
export default function Logo({
  variant = 'auto',
  size = 32,
  className = '',
}: LogoProps) {
  const height = size;
  const width =
    variant === 'mark' ? size : Math.round((size * LOCKUP.width) / LOCKUP.height);

  return (
    <img
      src={sources[variant]}
      alt="Temba"
      width={width}
      height={height}
      draggable={false}
      className={`inline-block max-w-none shrink-0 ${className}`}
      style={{ width, height }}
    />
  );
}
