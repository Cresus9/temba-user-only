import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CaretDown } from '@phosphor-icons/react';
import PageSEO from '../../components/SEO/PageSEO';
import { CityTabs, DirectoryPage, SearchField } from '../../components/directory/DirectoryUi';
import { getCatalog, type Catalog, type CatalogArtist } from '../../services/laCatalog';
import { canonicalCity } from '../../utils/venueNames';
import { whenLabel } from '../../utils/eventDisplay';
import { eventPublicPath } from '../../utils/eventPath';
import { artistsDirectoryStructuredData } from '../../utils/artistSeo';
import { eventPricePresentation } from '../../utils/labels';

function subline(artist: CatalogArtist) {
  return [artist.genre, artist.city].filter(Boolean).join(' · ');
}

function priceText(artist: CatalogArtist) {
  const show = artist.upcoming[0];
  if (!show) return '';
  const price = eventPricePresentation(show.event);
  const soon = /vente pas encore ouverte/i.test(price.label);
  return { main: price.label.replace(/\s·\svente pas encore ouverte$/i, ''), soon };
}

function ArtistTile({ artist }: { artist: CatalogArtist }) {
  return (
    <Link to={`/artists/${artist.slug}`} className="block min-w-0">
      <span className="block aspect-square overflow-hidden rounded-lg bg-surf">
        <img src={artist.photo} alt={artist.name} className="h-full w-full object-cover object-[50%_25%]" />
      </span>
      <span className="mt-4 block font-display text-[17px] font-semibold leading-6">{artist.name}</span>
      <span className="block text-[14px] leading-5 text-ink-3">{subline(artist)}</span>
    </Link>
  );
}

export default function ArtistsDirectory() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('all');
  const [style, setStyle] = useState('');
  const [morePhotos, setMorePhotos] = useState(false);
  const [moreNames, setMoreNames] = useState(false);

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => setFailed(true));
  }, []);

  const artists = catalog?.artists ?? [];
  const tabs = useMemo(() => {
    const count = (id: string) => artists.filter((artist) => (id === 'all' ? true : canonicalCity(artist.city) === id)).length;
    return [
      { id: 'all', label: 'Toutes les villes', count: artists.length },
      { id: 'Ouagadougou', label: 'Ouagadougou', count: count('Ouagadougou') },
      { id: 'Bobo-Dioulasso', label: 'Bobo-Dioulasso', count: count('Bobo-Dioulasso') },
      { id: 'Abidjan', label: 'Abidjan', count: count('Abidjan') },
    ].filter((tab) => tab.id === 'all' || tab.count > 0);
  }, [artists]);

  const styles = useMemo(() => {
    const map = new Map<string, string>();
    artists.forEach((artist) => {
      if (artist.genreKey && !map.has(artist.genreKey)) map.set(artist.genreKey, artist.genre);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [artists]);

  const filtered = artists.filter((artist) => {
    if (city !== 'all' && canonicalCity(artist.city) !== city) return false;
    if (style && artist.genreKey !== style) return false;
    if (search && !artist.name.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))) return false;
    return true;
  });
  const soon = filtered.filter((artist) => artist.photo && artist.upcoming.length > 0);
  const withPhoto = [...filtered.filter((artist) => artist.photo)].sort((a, b) => {
    const rank = (artist: CatalogArtist) => (artist.upcoming.length ? 0 : artist.past.length ? 1 : 2);
    return rank(a) - rank(b) || a.name.localeCompare(b.name, 'fr');
  });
  const withoutPhoto = filtered.filter((artist) => !artist.photo).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const photoLimit = morePhotos ? withPhoto.length : 24;
  const nameLimit = moreNames ? withoutPhoto.length : 80;

  return (
    <DirectoryPage>
      <PageSEO
        title="Artistes — concerts et billets Burkina Faso"
        description="Les artistes programmés sur Temba. Leurs dates apparaissent sur leur fiche dès qu’un concert est mis en ligne."
        canonicalUrl="https://tembas.com/artists"
        keywords={['artistes Burkina Faso', 'concerts Ouagadougou', 'billets concert Burkina', 'artistes Temba']}
        structuredData={artistsDirectoryStructuredData(artists.map((artist) => ({ name: artist.name, slug: artist.slug })))}
      />
      <section className="flex flex-col py-8 md:flex-row md:items-end md:justify-between md:gap-12 md:py-16">
        <div>
          <h1 className="!text-[32px] !font-semibold !leading-10 md:!text-[48px] md:!leading-[56px]">Artistes</h1>
          <p className="mt-2 max-w-xl text-[16px] leading-6 text-ink-2 md:mt-4 md:text-[18px] md:leading-7">
            Les artistes programmés sur Temba. Leurs dates apparaissent sur leur fiche dès qu’un concert est mis en ligne.
          </p>
        </div>
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher un artiste" />
      </section>

      <div className="md:flex md:items-end md:justify-between">
        <CityTabs tabs={tabs} value={city} onChange={setCity} />
        <label className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-[15px] font-medium md:mb-1 md:mt-0">
          <select value={style} onChange={(event) => setStyle(event.target.value)} className="appearance-none bg-transparent pr-1 outline-none">
            <option value="">Tous les styles</option>
            {styles.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <CaretDown size={16} />
        </label>
      </div>

      {!catalog && !failed ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border border-ink/20 border-t-ink" /></div>
      ) : failed ? (
        <p className="py-16 text-[16px] text-ink-3">Les artistes ne se sont pas chargés. Rechargez la page.</p>
      ) : (
        <>
          {soon.length ? (
            <section className="pt-12 md:pt-16">
              <div className="mb-6 flex items-baseline gap-4">
                <h2 className="!text-[24px] !font-semibold !leading-8 md:!text-[28px]">En concert bientôt</h2>
                <span className="text-[16px] text-ink-4">{soon.length}</span>
              </div>
              <div className="flex flex-col gap-4">
                {soon.map((artist) => {
                  const show = artist.upcoming[0];
                  const price = priceText(artist);
                  return (
                    <div key={artist.id} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-line p-4 md:grid-cols-[120px_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:gap-8 md:p-6">
                      <Link to={`/artists/${artist.slug}`} className="block aspect-square overflow-hidden rounded-lg bg-surf">
                        <img src={artist.photo} alt={artist.name} className="h-full w-full object-cover object-[50%_25%]" />
                      </Link>
                      <Link to={`/artists/${artist.slug}`} className="min-w-0">
                        <span className="block font-display text-[20px] font-semibold leading-6 md:text-[28px] md:leading-8">{artist.name}</span>
                        <span className="mt-2 block text-[15px] text-ink-3">{subline(artist)}</span>
                      </Link>
                      <div className="col-span-2 border-t border-line pt-4 md:col-span-1 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                        <div className="text-[14px] font-semibold text-brand">{whenLabel(show.event, show.span)}</div>
                        <div className="mt-1 text-[16px] font-medium">{show.venueName}{show.city ? ` · ${show.city}` : ''}</div>
                        <div className="mt-2 text-[15px] font-semibold">{price && typeof price === 'object' ? price.main : ''}</div>
                        {price && typeof price === 'object' && price.soon ? <div className="text-[13px] font-medium text-ink-3">Vente pas encore ouverte</div> : null}
                      </div>
                      <Link to={eventPublicPath(show.event)} className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-semibold text-white md:col-span-1 md:px-4">
                        Voir l’événement <ArrowRight size={18} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="pt-12 md:pt-16">
            <h2 className="!text-[24px] !font-semibold !leading-8 md:!text-[28px]">Tous les artistes</h2>
            <p className="mt-2 text-[16px] leading-6 text-ink-3">D’abord ceux déjà programmés sur Temba, puis par ordre alphabétique.</p>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-6 md:gap-x-6 md:gap-y-8">
              {withPhoto.slice(0, photoLimit).map((artist) => <ArtistTile key={artist.id} artist={artist} />)}
            </div>
            {withPhoto.length > photoLimit ? (
              <div className="mt-12 flex justify-center">
                <button type="button" onClick={() => setMorePhotos(true)} className="inline-flex h-12 items-center gap-2 rounded-lg border border-line px-4 text-[15px] font-semibold">
                  Afficher les {withPhoto.length - photoLimit} autres <CaretDown size={18} />
                </button>
              </div>
            ) : null}

            <h3 className="!mt-12 !text-[20px] !font-semibold !leading-6 md:!mt-16">De A à Z</h3>
            <p className="mt-2 text-[16px] text-ink-3">{withoutPhoto.length} artiste{withoutPhoto.length > 1 ? 's' : ''} sans photo pour l’instant.</p>
            <div className="mt-2 border-t border-line md:grid md:grid-cols-4 md:gap-x-8">
              {withoutPhoto.slice(0, nameLimit).map((artist) => (
                <Link key={artist.id} to={`/artists/${artist.slug}`} className="flex flex-col border-b border-line py-4">
                  <span className="text-[16px] font-medium">{artist.name}</span>
                  <small className="text-[14px] text-ink-3">{subline(artist)}</small>
                </Link>
              ))}
            </div>
            {withoutPhoto.length > nameLimit ? (
              <button type="button" onClick={() => setMoreNames(true)} className="mt-2 flex h-12 w-full items-center justify-center gap-2 text-[15px] font-semibold text-brand">
                Voir les {withoutPhoto.length} noms <CaretDown size={18} />
              </button>
            ) : null}
          </section>
        </>
      )}
    </DirectoryPage>
  );
}
