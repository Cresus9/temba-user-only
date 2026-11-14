import { siFacebook, siInstagram, siSoundcloud, siYoutube } from 'simple-icons';

const PATHS = {
  instagram: siInstagram.path,
  facebook: siFacebook.path,
  youtube: siYoutube.path,
  soundcloud: siSoundcloud.path,
} as const;

export default function BrandMark({
  brand,
  size = 18,
}: {
  brand: keyof typeof PATHS;
  size?: number;
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0" aria-hidden>
      <path d={PATHS[brand]} fill="currentColor" />
    </svg>
  );
}
