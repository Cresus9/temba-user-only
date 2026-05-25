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
  /** Set to "noindex, nofollow" for private/auth pages */
  robots?: string;
}

const DEFAULTS = {
  title: "Temba \u2013 N\u00b01 Billetterie Burkina Faso | Concerts, Festivals & \u00c9v\u00e9nements",
  description:
    "Achetez vos billets en ligne pour les meilleurs concerts, festivals et \u00e9v\u00e9nements culturels au Burkina Faso. Paiement s\u00e9curis\u00e9 en FCFA, billets sur mobile.",
  canonical: 'https://tembas.com/',
  ogImage: 'https://tembas.com/temba-wordmark-dark.jpg',
  locale: 'fr_BF',
  siteName: 'Temba',
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

const removeMetaTag = (attr: 'name' | 'property', value: string) => {
  const el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${value}"]`);
  if (el?.parentElement) el.parentElement.removeChild(el);
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
  robots,
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

    // robots (noindex for private pages)
    if (robots) {
      setMetaTag('name', 'robots', robots);
    } else {
      removeMetaTag('name', 'robots');
    }

    // Open Graph
    setMetaTag('property', 'og:site_name', DEFAULTS.siteName);
    setMetaTag('property', 'og:title', resolvedTitle);
    setMetaTag('property', 'og:description', resolvedDescription);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:image', resolvedOgImage);
    setMetaTag('property', 'og:image:width', '1200');
    setMetaTag('property', 'og:image:height', '630');
    setMetaTag('property', 'og:url', resolvedCanonical);
    setMetaTag('property', 'og:locale', resolvedLocale);

    // Twitter
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:site', '@temba_bf');
    setMetaTag('name', 'twitter:title', resolvedTitle);
    setMetaTag('name', 'twitter:description', resolvedDescription);
    setMetaTag('name', 'twitter:image', resolvedOgImage);

    if (keywords?.length) {
      setMetaTag('name', 'keywords', keywords.join(', '));
    } else {
      removeMetaTag('name', 'keywords');
    }

    setCanonicalLink(resolvedCanonical);
    setStructuredData(structuredData);

    return () => {
      if (!structuredData) return;
      setStructuredData(undefined);
    };
  }, [title, description, canonicalUrl, ogType, ogImage, ogLocale, structuredData, keywords, robots]);

  return null;
}

export default PageSEO;
