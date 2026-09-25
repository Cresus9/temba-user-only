import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { resolveVenueCoords } from '../../utils/venueCoords';

export type MappableVenue = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  photos?: string[] | null;
  event_count?: number;
  lat?: number | string | null;
  lng?: number | string | null;
};

type VenuesMapProps = {
  venues: MappableVenue[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  showPreview?: boolean;
  className?: string;
};

const display = '"Plus Jakarta Sans", Inter, sans-serif';

function pinIcon(selected: boolean) {
  return new DivIcon({
    className: 'temba-venue-pin',
    iconSize: selected ? [22, 22] : [16, 16],
    iconAnchor: selected ? [11, 11] : [8, 8],
    html: `<span style="
      display:block;width:100%;height:100%;border-radius:999px;
      background:${selected ? '#C68A1F' : '#3D3FE2'};
      border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);pointer-events:none;
      ${selected ? 'transform:scale(1.05);' : ''}
    "></span>`,
  });
}

const PIN = pinIcon(false);
const PIN_ON = pinIcon(true);

function FitPins({
  boundsKey,
  points,
}: {
  boundsKey: string;
  points: { lat: number; lng: number }[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) {
      map.setView([12.3714, -1.5197], 6);
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);
    if (latSpan > 3 || lngSpan > 3) {
      map.setView([12.3714, -1.5197], 11);
      return;
    }
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [28, 28], maxZoom: 12 }
    );
  }, [map, boundsKey]);
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.45 });
  }, [map, lat, lng]);
  return null;
}

function MapBlankClick({ onClear }: { onClear: () => void }) {
  useMapEvents({
    click: () => onClear(),
  });
  return null;
}

export default function VenuesMap({
  venues,
  selectedId,
  onSelect,
  showPreview = true,
  className = '',
}: VenuesMapProps) {
  const pins = useMemo(
    () =>
      venues
        .map((v) => {
          const coords = resolveVenueCoords(v);
          return coords ? { venue: v, ...coords } : null;
        })
        .filter((p): p is { venue: MappableVenue; lat: number; lng: number; precise: boolean } => Boolean(p)),
    [venues]
  );

  const selected = pins.find((p) => p.venue.id === selectedId) || null;
  const photo = selected && Array.isArray(selected.venue.photos) ? selected.venue.photos[0] : '';
  const boundsKey = pins.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);

  if (pins.length === 0) return null;

  return (
    <div className={`relative overflow-hidden rounded-xl2 border border-line bg-ink ${className}`}>
      <MapContainer
        center={[12.3714, -1.5197]}
        zoom={6}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: '100%', width: '100%', background: '#0b0b0b' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitPins boundsKey={boundsKey} points={pins} />
        {flyTo && <FlyTo lat={flyTo.lat} lng={flyTo.lng} />}
        {onSelect && <MapBlankClick onClear={() => onSelect(null)} />}
        {pins.map((p) => (
          <Marker
            key={p.venue.id}
            position={[p.lat, p.lng]}
            icon={p.venue.id === selectedId ? PIN_ON : PIN}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                const next = p.venue.id === selectedId ? null : p.venue.id;
                if (next) setFlyTo({ lat: p.lat, lng: p.lng });
                onSelect?.(next);
              },
            }}
          />
        ))}
      </MapContainer>

      {showPreview && selected && (
        <div className="absolute left-3 right-3 bottom-3 z-[5] sm:left-auto sm:w-[280px]">
          {selected.venue.slug ? (
            <Link
              to={`/venues/${selected.venue.slug}`}
              className="flex gap-3 overflow-hidden rounded-xl bg-paper/95 backdrop-blur-sm shadow-card ring-1 ring-line"
            >
              <div className="w-16 h-16 flex-shrink-0 bg-ink">
                {photo ? (
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <MapPin className="w-4 h-4 text-accent" />
                  </div>
                )}
              </div>
              <div className="min-w-0 py-2 pr-3">
                <p className="text-[13px] font-semibold text-ink truncate tracking-tight" style={{ fontFamily: display }}>
                  {selected.venue.name}
                </p>
                <p className="text-[11px] text-ink-mute truncate mt-0.5">
                  {selected.venue.city || (selected.precise ? 'Position exacte' : 'Ville approximative')}
                </p>
                <p className="text-[11px] font-semibold text-accent mt-1">Voir la fiche →</p>
              </div>
            </Link>
          ) : (
            <div className="rounded-xl bg-paper/95 px-3 py-2 text-[13px] font-semibold text-ink">
              {selected.venue.name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
