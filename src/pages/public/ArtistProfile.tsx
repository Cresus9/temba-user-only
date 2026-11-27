import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageSEO from '../../components/SEO/PageSEO';
import { getCatalog, type Catalog } from '../../services/laCatalog';
import { artistLinks, artistSections, lineupArtists, similarArtists } from '../../utils/artistPage';
import {
  artistCanonicalUrl,
  artistFaqItems,
  artistMetaDescription,
  artistSeoTitle,
  artistStructuredData,
} from '../../utils/artistSeo';
import { ArtistHero } from '../../components/artist/ArtistHero';
import { ArtistAbout, ArtistLinks } from '../../components/artist/ArtistAbout';
import { ArtistFaq } from '../../components/artist/ArtistFaq';
import { ArtistGrid } from '../../components/artist/ArtistPeople';
import { EmptyDates, PastRow, UpcomingRow } from '../../components/artist/ArtistShows';
import { NextShowBar, NextShowCard, NoNextCard } from '../../components/artist/NextShowCard';
import { useArtistFonts } from '../../components/artist/useArtistFonts';
import { useSectionSpy } from '../../components/artist/useSectionSpy';

async function sharePage(title: string, url: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
  } catch {
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Lien copié');
  } catch {
    toast.error('Partage indisponible');
  }
}

function SectionTitle({ id, count, children }: { id: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 id={id} className="font-artist text-[24px] font-bold leading-8 tracking-[-0.02em] text-ink md:text-[28px]">{children}</h2>
      {count ? <span className="font-artist-mono text-[15px] font-medium text-ink-3">{count}</span> : null}
    </div>
  );
}

const ANCHOR = 'scroll-mt-32 lg:scroll-mt-36';

export default function ArtistProfile() {
  useArtistFonts();
  const { slug = '' } = useParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => setFailed(true));
  }, [slug]);

  const artist = catalog?.artists.find((item) => item.slug === slug) || null;
  const peers = useMemo(() => (catalog && artist ? similarArtists(artist, catalog.artists) : []), [catalog, artist]);
  const lineup = useMemo(() => (catalog && artist ? lineupArtists(artist, catalog.artists) : []), [catalog, artist]);
  const links = useMemo(() => (artist ? artistLinks(artist.social) : []), [artist]);
  const sections = artistSections({
    hasPast: Boolean(artist?.past.length),
    hasLinks: links.length > 0,
    hasLineup: lineup.length > 0,
    hasSimilar: peers.length > 0,
  });
  const active = useSectionSpy(sections.map((s) => s.id));

  if (!catalog && !failed) {
    return (
      // Same height as the finished page's first screen, so the footer does not jump when data arrives.
      <div className="min-h-[100svh]" role="status" aria-label="Chargement">
        <div className="flex h-[520px] items-center justify-center bg-ink md:h-[480px]">
          <div className="h-8 w-8 animate-spin rounded-full border border-white/20 border-t-white" />
        </div>
      </div>
    );
  }
  if (!artist) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 pb-24 md:px-10">
        <PageSEO title="Artiste introuvable" description="Cette fiche artiste n’existe pas sur Temba." canonicalUrl="https://tembas.com/artists" robots="noindex, follow" />
        <div className="py-24 text-center">
          <h1 className="!text-[28px]">Artiste introuvable</h1>
          <Link to="/artists" className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand px-4 text-[15px] font-semibold text-white">Voir tous les artistes</Link>
        </div>
      </div>
    );
  }

  const next = artist.upcoming[0];
  const pageUrl = artistCanonicalUrl(artist.slug);
  const seoShow = (show: NonNullable<typeof next>, location: string) => ({
    id: show.event.id,
    title: show.event.title,
    date: show.span.min || show.event.date,
    location,
    slug: show.event.slug,
  });
  const faq = artistFaqItems({
    name: artist.name,
    city: artist.city,
    nextShow: next ? seoShow(next, `${next.venueName}${next.city ? `, ${next.city}` : ''}`) : null,
  });

  return (
    <div className="font-artist text-ink">
      <PageSEO
        title={artistSeoTitle(artist.name, { hasUpcoming: Boolean(next), nextCity: next?.city, nextLocation: next?.venueName })}
        description={artistMetaDescription({
          name: artist.name,
          bio: artist.bio,
          genre: artist.genre,
          city: artist.city,
          nextShow: next ? seoShow(next, next.venueName) : null,
        })}
        canonicalUrl={pageUrl}
        ogImage={artist.photo || undefined}
        keywords={[artist.name, artist.genre, artist.city, 'billets Temba'].filter(Boolean) as string[]}
        structuredData={artistStructuredData({
          name: artist.name,
          slug: artist.slug,
          bio: artist.bio,
          genre: artist.genre,
          city: artist.city,
          countryCode: artist.countryCode,
          image: artist.photo,
          social: artist.social,
          shows: artist.upcoming.map((show) => seoShow(show, show.venueName)),
        })}
      />

      <ArtistHero artist={artist} next={next} onShare={() => sharePage(artist.name, pageUrl)} />

      <nav aria-label="Sections de la fiche" className="sticky top-14 z-30 border-b border-line bg-white lg:top-[72px]">
        <div className="mx-auto flex max-w-[1200px] gap-6 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-8 md:px-10">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={active === s.id ? 'true' : undefined}
              className={`flex h-14 shrink-0 items-center text-[14px] font-semibold ${active === s.id ? 'text-ink shadow-[inset_0_-2px_0_#3D3FE2]' : 'text-ink-3'}`}
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-[1200px] px-5 pb-24 md:px-10">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-14">
          <div className="min-w-0">
            <section id="dates" aria-labelledby="h-dates" className={`${ANCHOR} pt-10 md:pt-14`}>
              <SectionTitle id="h-dates" count={artist.upcoming.length || undefined}>Dates à venir</SectionTitle>
              {artist.upcoming.length ? (
                <ol className="mt-4 divide-y divide-line border-y border-line">
                  {artist.upcoming.map((show) => <UpcomingRow key={`${show.event.id}-${show.role || ''}`} show={show} />)}
                </ol>
              ) : (
                <EmptyDates artist={artist} />
              )}
            </section>

            {artist.past.length ? (
              <section id="passe" aria-labelledby="h-passe" className={`${ANCHOR} pt-12 md:pt-16`}>
                <SectionTitle id="h-passe" count={artist.past.length}>Déjà passé sur Temba</SectionTitle>
                <ol className="mt-4 divide-y divide-line border-y border-line">
                  {artist.past.map((show) => <PastRow key={`${show.event.id}-${show.role || ''}`} show={show} />)}
                </ol>
              </section>
            ) : null}

            <section id="a-propos" aria-labelledby="h-about" className={`${ANCHOR} pt-12 md:pt-16`}>
              <SectionTitle id="h-about">À propos de {artist.name}</SectionTitle>
              <ArtistAbout artist={artist} />
            </section>

            {links.length ? (
              <section id="liens" aria-labelledby="h-liens" className={`${ANCHOR} pt-12 md:pt-16`}>
                <SectionTitle id="h-liens">Écouter et suivre</SectionTitle>
                <ArtistLinks links={links} />
              </section>
            ) : null}

            {lineup.length ? (
              <section id="meme-affiche" aria-labelledby="h-lineup" className={`${ANCHOR} pt-12 md:pt-16`}>
                <SectionTitle id="h-lineup">Sur les mêmes affiches</SectionTitle>
                <p className="mt-2 text-[15px] leading-6 text-ink-3">Artistes programmés avec {artist.name} sur Temba.</p>
                <ArtistGrid artists={lineup} />
              </section>
            ) : null}

            {peers.length ? (
              <section id="similaires" aria-labelledby="h-peers" className={`${ANCHOR} pt-12 md:pt-16`}>
                <SectionTitle id="h-peers">Artistes similaires</SectionTitle>
                <ArtistGrid artists={peers} />
              </section>
            ) : null}

            <ArtistFaq items={faq} />
          </div>

          <aside aria-label="Prochain concert" className="hidden lg:block">
            <div className="sticky top-[144px] pt-14">
              {next ? <NextShowCard show={next} /> : <NoNextCard artist={artist} />}
            </div>
          </aside>
        </div>
      </div>

      {next ? <NextShowBar show={next} /> : null}
    </div>
  );
}
