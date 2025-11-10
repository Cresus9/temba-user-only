import { useEffect } from 'react';

type JsonLd = Record<string, unknown>;

interface PageSEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  ogLocale?: string;
  structuredData?: JsonLd | JsonLd[];
  keywords?: string[];
}

const DEFAULTS = {
  title: 'Temba – Billetterie d’événements en Afrique de l’Ouest',
  description:
    'Découvrez, achetez et transférez des billets pour les meilleurs concerts, festivals et événements culturels au Burkina Faso et en Afrique de l’Ouest.',
  canonical: 'https://tembas.com/',
  ogImage: 'https://tembas.com/temba-app.png',
  locale: 'fr_BF',
};

const setMetaTag = (attr: 'name' | 'property', value: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${value}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, value);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
};

const setCanonicalLink = (href: string) => {
  let canonicalEl = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }

  canonicalEl.setAttribute('href', href);
};

const setStructuredData = (data?: JsonLd | JsonLd[]) => {
  const scriptId = 'page-structured-data';
  const existingScript = document.getElementById(scriptId);

  if (!data) {
    if (existingScript?.parentElement) {
      existingScript.parentElement.removeChild(existingScript);
    }
    return;
  }

  const scriptElement =
    existingScript instanceof HTMLScriptElement ? existingScript : document.createElement('script');

  scriptElement.type = 'application/ld+json';
  scriptElement.id = scriptId;
  scriptElement.textContent = JSON.stringify(data);

  if (!existingScript) {
    document.head.appendChild(scriptElement);
  }
};

export function PageSEO({
  title,
  description,
  canonicalUrl,
  ogType = 'website',
  ogImage,
  ogLocale,
  structuredData,
  keywords,
}: PageSEOProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const resolvedTitle = title ? `${title} | Temba` : DEFAULTS.title;
    const resolvedDescription = description ?? DEFAULTS.description;
    const resolvedCanonical =
      canonicalUrl ??
      (typeof window !== 'undefined' ? window.location.href : DEFAULTS.canonical);
    const resolvedOgImage = ogImage ?? DEFAULTS.ogImage;
    const resolvedLocale = ogLocale ?? DEFAULTS.locale;

    document.title = resolvedTitle;

    setMetaTag('name', 'description', resolvedDescription);
    setMetaTag('property', 'og:title', resolvedTitle);
    setMetaTag('property', 'og:description', resolvedDescription);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:image', resolvedOgImage);
    setMetaTag('property', 'og:url', resolvedCanonical);
    setMetaTag('property', 'og:locale', resolvedLocale);
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', resolvedTitle);
    setMetaTag('name', 'twitter:description', resolvedDescription);
    setMetaTag('name', 'twitter:image', resolvedOgImage);

    if (keywords?.length) {
      setMetaTag('name', 'keywords', keywords.join(', '));
    } else {
      const keywordsMeta = document.head.querySelector('meta[name="keywords"]');
      if (keywordsMeta?.parentElement) {
        keywordsMeta.parentElement.removeChild(keywordsMeta);
      }
    }

    setCanonicalLink(resolvedCanonical);
    setStructuredData(structuredData);

    return () => {
      if (!structuredData) return;
      setStructuredData(undefined);
    };
  }, [title, description, canonicalUrl, ogType, ogImage, ogLocale, structuredData, keywords]);

  return null;
}

export default PageSEO;

