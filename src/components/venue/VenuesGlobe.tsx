import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Globe3D, type GlobeMarker } from '../ui/3d-globe';
import { resolveVenueCoords } from '../../utils/venueCoords';
import VenuesMap, { type MappableVenue } from './VenuesMap';

const FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=128&h=128&fit=crop';

type VenuesGlobeProps = {
  venues: MappableVenue[];
  className?: string;
};

export default function VenuesGlobe({ venues, className = '' }: VenuesGlobeProps) {
  const navigate = useNavigate();

  const markers = useMemo<GlobeMarker[]>(() => {
    const withCoords = venues
      .map((v) => {
        const coords = resolveVenueCoords(v);
        if (!coords || !v.slug) return null;
        const photo = Array.isArray(v.photos) && v.photos[0] ? v.photos[0] : FALLBACK_PHOTO;
        return {
          lat: coords.lat,
          lng: coords.lng,
          src: photo,
          label: v.slug,
        } satisfies GlobeMarker & { name?: string };
      })
      .filter((m): m is GlobeMarker => Boolean(m));

    const withPhoto = withCoords.filter((m) => m.src !== FALLBACK_PHOTO);
    const pool = withPhoto.length >= 8 ? withPhoto : withCoords;
    return pool.slice(0, 36);
  }, [venues]);

  if (markers.length === 0) return null;

  return (
    <ErrorBoundary fallback={<VenuesMap venues={venues} className={className} />}>
    <div className={`overflow-hidden rounded-xl2 border border-line bg-ink ${className}`}>
      <Globe3D
        className="h-full w-full"
        markers={markers}
        config={{
          showAtmosphere: true,
          atmosphereColor: '#3D3FE2',
          atmosphereIntensity: 0.55,
          atmosphereBlur: 2,
          bumpScale: 2,
          autoRotateSpeed: 0.35,
          enableZoom: true,
          ambientIntensity: 1.15,
          pointLightIntensity: 1.8,
          backgroundColor: '#000000',
        }}
        onMarkerClick={(marker) => {
          if (marker.label) navigate(`/venues/${marker.label}`);
        }}
      />
    </div>
    </ErrorBoundary>
  );
}
