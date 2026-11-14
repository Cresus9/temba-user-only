import type { ReactNode } from 'react';
import { CaretDown, CalendarBlank, MapPin, Moon } from '@phosphor-icons/react';
import { SHOW_FREE_FROM_ZERO_PRICE } from '../../utils/labels';

export interface QuickFilterState {
  city: string;
  tonight: boolean;
  weekend: boolean;
  free: boolean;
}

export const HOME_CITIES = ['Ouagadougou', 'Bobo-Dioulasso', 'Abidjan', 'Toutes les villes'];

function Chip({
  on,
  children,
  onClick,
}: {
  on?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink'}`}
    >
      {children}
    </button>
  );
}

export default function QuickFilters({
  value,
  onChange,
  cities = HOME_CITIES,
  align = 'wide',
}: {
  value: QuickFilterState;
  onChange: (next: QuickFilterState) => void;
  cities?: string[];
  align?: 'home' | 'wide';
}) {
  const row = align === 'home'
    ? 'mx-auto w-full max-w-[1200px] px-5 md:px-10'
    : 'mx-auto max-w-[1440px] px-5 md:px-16 xl:px-20';
  return (
    <div className="border-b border-line bg-white">
      <div className={`flex items-center gap-2.5 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${row}`}>
        <label className="inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-[10px] border border-line bg-white px-3 text-[14.5px] font-semibold">
          <MapPin size={17} weight="fill" />
          <select
            aria-label="Ville"
            value={value.city}
            onChange={(event) => onChange({ ...value, city: event.target.value })}
            className="appearance-none bg-transparent pr-1 focus:outline-none"
          >
            {cities.map((city) => <option key={city}>{city}</option>)}
          </select>
          <CaretDown size={13} weight="bold" />
        </label>
        <span className="h-7 w-px shrink-0 bg-line" />
        <Chip on={value.tonight} onClick={() => onChange({ ...value, tonight: !value.tonight, weekend: value.tonight ? value.weekend : false })}>
          <Moon size={17} /> Ce soir
        </Chip>
        <Chip on={value.weekend} onClick={() => onChange({ ...value, weekend: !value.weekend, tonight: value.weekend ? value.tonight : false })}>
          <CalendarBlank size={17} /> Ce week-end
        </Chip>
        {SHOW_FREE_FROM_ZERO_PRICE && (
          <Chip on={value.free} onClick={() => onChange({ ...value, free: !value.free })}>
            Gratuit
          </Chip>
        )}
      </div>
    </div>
  );
}
