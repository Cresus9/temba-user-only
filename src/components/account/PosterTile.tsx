import { useState } from 'react';
import DomePattern from '../design/DomePattern';
import Logo from '../brand/Logo';

/** Event poster, or the blue dome tile when the photo is missing. */
export default function PosterTile({
  src,
  alt,
  className = '',
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const show = Boolean(src) && !broken;

  if (!show) {
    return (
      <div className={`relative overflow-hidden bg-brand ${className}`} aria-hidden={!alt}>
        <DomePattern variant="tile" />
        <Logo variant="markLight" size={28} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
    );
  }

  return (
    <img
      src={src || ''}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setBroken(true)}
    />
  );
}
