import React from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { Globe } from 'lucide-react';

const LANGUAGE_NAMES = {
  en: 'English',
  fr: 'Français'
};

export default function LanguageSelector() {
  const { locale, setLocale, availableLocales } = useTranslation();

  return (
    <div className="relative inline-block">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-gray-400" />
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="appearance-none bg-transparent border border-gray-200 rounded-lg py-1 pl-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {availableLocales.map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_NAMES[code as keyof typeof LANGUAGE_NAMES]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}