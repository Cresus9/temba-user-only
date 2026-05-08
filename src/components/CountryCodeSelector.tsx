import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

// Comprehensive list of countries with flags and dial codes
const COUNTRIES: Country[] = [
  // West Africa (prioritized)
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '+225' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', dialCode: '+227' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', dialCode: '+228' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', dialCode: '+229' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  
  // Other African countries
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', dialCode: '+212' },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿', dialCode: '+213' },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳', dialCode: '+216' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿', dialCode: '+255' },
  { code: 'UG', name: 'Ouganda', flag: '🇺🇬', dialCode: '+256' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', dialCode: '+257' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
  { code: 'ET', name: 'Éthiopie', flag: '🇪🇹', dialCode: '+251' },
  { code: 'ZM', name: 'Zambie', flag: '🇿🇲', dialCode: '+260' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', dialCode: '+263' },
  { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', dialCode: '+27' },
  
  // Other common countries
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸', dialCode: '+1' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dialCode: '+44' },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪', dialCode: '+49' },
  { code: 'CN', name: 'Chine', flag: '🇨🇳', dialCode: '+86' },
  { code: 'IN', name: 'Inde', flag: '🇮🇳', dialCode: '+91' },
];

interface CountryCodeSelectorProps {
  value: string; // Selected country code (e.g., '+226')
  onChange: (dialCode: string) => void;
  className?: string;
}

export default function CountryCodeSelector({ value, onChange, className = '' }: CountryCodeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find selected country
  const selectedCountry = COUNTRIES.find(c => c.dialCode === value) || COUNTRIES[0]; // Default to Burkina Faso

  // Filter countries based on search
  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (country: Country) => {
    onChange(country.dialCode);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Country Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2.5 border border-line border-r-0 rounded-l-xl2 bg-paper hover:bg-cream focus:outline-none focus:ring-2 focus:ring-brand focus:z-10 transition-colors"
      >
        <span className="text-lg leading-none">{selectedCountry.flag}</span>
        <span className="text-[13px] font-bold text-ink tabular-nums" style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace' }}>
          {selectedCountry.dialCode}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-ink-mute transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-paper border border-line rounded-xl2 shadow-pop z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="p-3 border-b border-line">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un pays..."
                className="w-full pl-10 pr-4 py-2 border border-line rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-brand focus:bg-paper text-[13px] text-ink placeholder:text-ink-mute"
              />
            </div>
          </div>

          {/* Country List */}
          <div className="overflow-y-auto max-h-64">
            {filteredCountries.length > 0 ? (
              <div className="py-1">
                {filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleSelect(country)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cream transition-colors ${
                      selectedCountry.code === country.code ? 'bg-brand-50' : ''
                    }`}
                  >
                    <span className="text-xl leading-none">{country.flag}</span>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-[13px] font-bold text-ink truncate">{country.name}</div>
                      <div className="text-[11px] text-ink-mute tabular-nums" style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace' }}>
                        {country.dialCode}
                      </div>
                    </div>
                    {selectedCountry.code === country.code && (
                      <span className="text-brand text-sm font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-[13px] text-ink-mute">
                Aucun pays trouvé
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

