import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase-client';
import toast from 'react-hot-toast';

interface Translations {
  [key: string]: {
    [locale: string]: string;
  };
}

interface TranslationContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: { default: string; [key: string]: string | number }) => string;
  loading: boolean;
  availableLocales: string[];
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale] = useState('fr');
  const [translations, setTranslations] = useState<Translations>({});
  const [loading, setLoading] = useState(true);
  const [availableLocales] = useState(['fr']);

  useEffect(() => {
    localStorage.setItem('locale', locale);
    fetchTranslations();
  }, [locale]);

  const fetchTranslations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('translations')
        .select('key, locale, content')
        .eq('locale', 'fr');

      if (error) throw error;

      // Organize translations by key and locale
      const translationsMap = (data || []).reduce((acc, { key, locale, content }) => {
        if (!acc[key]) acc[key] = {};
        acc[key][locale] = content;
        return acc;
      }, {} as Translations);

      setTranslations(translationsMap);
    } catch (error) {
      console.error('Erreur lors du chargement des traductions:', error);
      toast.error('Échec du chargement des traductions');
    } finally {
      setLoading(false);
    }
  };

  const t = (key: string, params?: { default: string; [key: string]: string | number }): string => {
    // Get translation for current locale
    let translation = translations[key]?.[locale];

    // If no translation found, use default or key
    if (!translation) {
      translation = params?.default || key;
    }
    
    // Replace parameters if provided
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        if (param !== 'default') {
          translation = translation.replace(`{${param}}`, String(value));
        }
      });
    }
    
    return translation;
  };

  const setLocale = () => {
    // Cette fonction ne fait rien car nous n'avons qu'une seule langue
    return;
  };

  return (
    <TranslationContext.Provider 
      value={{ 
        locale, 
        setLocale, 
        t, 
        loading,
        availableLocales 
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation doit être utilisé à l\'intérieur d\'un TranslationProvider');
  }
  return context;
}