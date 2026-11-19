import { AppleLogo, GooglePlayLogo } from '@phosphor-icons/react';
import { APP_STORE_URL, ONELINK_BASE, PLAY_STORE_URL } from '../../config/appLinks';

export const APP_ONELINK = ONELINK_BASE;

export default function StoreBadges({
  dark = false,
  stacked = false,
}: {
  dark?: boolean;
  stacked?: boolean;
}) {
  const cls = dark
    ? 'bg-ink text-white [&_small]:text-white/60'
    : 'bg-white text-ink [&_small]:text-ink-3';
  return (
    <div className={`flex gap-2.5 ${stacked ? 'flex-col items-start' : 'flex-row flex-wrap'}`}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex h-11 items-center gap-2 rounded-lg px-3.5 ${cls}`}
      >
        <AppleLogo size={22} weight="fill" />
        <span className="whitespace-nowrap text-left leading-tight">
          <small className="block text-[10px] font-medium">Télécharger sur</small>
          <span className="text-[14px] font-semibold">App Store</span>
        </span>
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex h-11 items-center gap-2 rounded-lg px-3.5 ${cls}`}
      >
        <GooglePlayLogo size={20} weight="fill" />
        <span className="whitespace-nowrap text-left leading-tight">
          <small className="block text-[10px] font-medium">Disponible sur</small>
          <span className="text-[14px] font-semibold">Google Play</span>
        </span>
      </a>
    </div>
  );
}
