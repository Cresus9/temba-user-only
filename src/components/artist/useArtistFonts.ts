import { useEffect } from 'react';

const FONT_LINK_ID = 'temba-artist-fonts';
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Montserrat:wght@400;500;600;700;800&display=swap';

/**
 * Loads Montserrat and IBM Plex Mono for the artist page only.
 * The stylesheet is added when the page mounts and removed when it unmounts,
 * so the rest of the site keeps using Inter and is never affected.
 */
export function useArtistFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return undefined;
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);
}
