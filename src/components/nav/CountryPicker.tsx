import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useEvents } from '../../context/EventContext';
import { SUPPORTED_COUNTRIES, CountryMeta } from '../../utils/eventGeo';

interface CountryPickerProps {
  /** 'nav' = compact horizontal pill; 'mobile' = full-width row in mobile drawer */
  variant?: 'nav' | 'mobile';
  onSelect?: () => void;
}

export default function CountryPicker({ variant = 'nav', onSelect }: CountryPickerProps) {
  const { activeCountry, setActiveCountry, activeCountries } = useEvents();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click — must be declared before any early return
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Countries that actually have published events
  const options: CountryMeta[] = SUPPORTED_COUNTRIES.filter(c =>
    activeCountries.includes(c.code)
  );

  // Only render when ≥2 countries have events
  if (options.length < 2) return null;

  const active = options.find(c => c.code === activeCountry) ?? null;

  const handleSelect = (code: string | null) => {
    setActiveCountry(code);
    setOpen(false);
    onSelect?.();

    const params = new URLSearchParams(location.search);
    if (code) params.set('country', code);
    else params.delete('country');

    if (location.pathname === '/events') {
      navigate(`/events?${params.toString()}`, { replace: true });
    }
  };

  if (variant === 'mobile') {
    return (
      <div className="px-2 py-1">
        <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mute px-1 mb-1">
          Pays / Région
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSelect(null)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
              !activeCountry
                ? 'bg-brand text-paper border-brand'
                : 'bg-paper text-ink border-line hover:border-brand hover:text-brand'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Tous
          </button>
          {options.map(c => (
            <button
              key={c.code}
              onClick={() => handleSelect(c.code)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                activeCountry === c.code
                  ? 'bg-brand text-paper border-brand'
                  : 'bg-paper text-ink border-line hover:border-brand hover:text-brand'
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.nameFr}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop nav variant — compact pill with dropdown
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[13px] font-medium border transition-colors ${
          activeCountry
            ? 'bg-brand-50 text-brand border-brand/30 hover:bg-brand-100'
            : 'bg-transparent text-ink-mute border-line hover:text-ink hover:border-ink-mute'
        }`}
        aria-label="Choisir un pays"
        aria-expanded={open}
      >
        {active ? (
          <>
            <span className="text-[15px] leading-none">{active.flag}</span>
            <span className="hidden lg:inline">{active.nameFr}</span>
          </>
        ) : (
          <>
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Tous les pays</span>
          </>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-paper rounded-xl2 shadow-pop border border-line py-1.5 z-50 overflow-hidden">
          {/* All countries option */}
          <button
            onClick={() => handleSelect(null)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink hover:bg-cream transition-colors"
          >
            <Globe className="h-4 w-4 text-ink-mute flex-shrink-0" />
            <span className="flex-1 text-left">Tous les pays</span>
            {!activeCountry && <Check className="h-3.5 w-3.5 text-brand flex-shrink-0" />}
          </button>

          <div className="my-1 h-px bg-line" />

          {options.map(c => (
            <button
              key={c.code}
              onClick={() => handleSelect(c.code)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink hover:bg-cream transition-colors"
            >
              <span className="text-[16px] leading-none flex-shrink-0">{c.flag}</span>
              <span className="flex-1 text-left">{c.nameFr}</span>
              {activeCountry === c.code && (
                <Check className="h-3.5 w-3.5 text-brand flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
