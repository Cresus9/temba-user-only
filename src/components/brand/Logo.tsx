import logoPurpleBlack from '../../assets/brand/Logo-Purple-Black-noR.svg';
import logoPurpleWhite from '../../assets/brand/Logo-Purple-White-noR.svg';
import logoWhite from '../../assets/brand/Logo-White-noR.svg';
import symbolPurple from '../../assets/brand/Symbol-Purple.svg';
import symbolWhite from '../../assets/brand/Symbol-White.svg';

interface LogoProps {
  /**
   * - `auto`: Logo-Purple-Black-noR, light surfaces.
   * - `light` / `onBlue`: Logo-White-noR, Temba blue.
   * - `onInk`: Logo-Purple-White-noR, near-black.
   * - `mark`: Symbol-Purple. `markLight`: Symbol-White.
   */
  variant?: 'auto' | 'light' | 'onBlue' | 'onInk' | 'mark' | 'markLight';
  size?: number;
  className?: string;
}

const LOCKUP = { width: 2180, height: 500 };

const sources = {
  auto: logoPurpleBlack,
  light: logoWhite,
  onBlue: logoWhite,
  onInk: logoPurpleWhite,
  mark: symbolPurple,
  markLight: symbolWhite,
} as const;

/** Official Temba lockup. The SVG files are used as-is — never redrawn. */
export default function Logo({
  variant = 'auto',
  size = 32,
  className = '',
}: LogoProps) {
  const mark = variant === 'mark' || variant === 'markLight';
  const height = size;
  const width = mark ? size : Math.round((size * LOCKUP.width) / LOCKUP.height);

  return (
    <img
      src={sources[variant]}
      alt={mark ? '' : 'Temba'}
      width={width}
      height={height}
      draggable={false}
      className={`inline-block max-w-none shrink-0 ${className}`}
      style={{ width, height }}
    />
  );
}
