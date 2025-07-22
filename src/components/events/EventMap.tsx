import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface EventMapProps {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  className?: string;
  isDisabled?: boolean;
  isModalOpen?: boolean;
}

// Custom marker icon
const customIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function EventMap({ 
  latitude, 
  longitude, 
  title, 
  address, 
  className = '', 
  isDisabled = false,
  isModalOpen = false
}: EventMapProps) {
  const handleGetDirections = () => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /android/i.test(userAgent);

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    const appleMapsUrl = `http://maps.apple.com/?daddr=${latitude},${longitude}`;
    
    if (isIOS) {
      window.open(appleMapsUrl, '_blank');
    } else if (isAndroid) {
      window.open(googleMapsUrl, '_blank');
    } else {
      window.open(googleMapsUrl, '_blank');
    }
  };

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div className="relative" style={{ height: '300px', width: '100%' }}>
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          scrollWheelZoom={!isDisabled}
          dragging={!isDisabled}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          className={isModalOpen ? 'pointer-events-none' : ''}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[latitude, longitude]} icon={customIcon}>
            <Popup>
              <div className="p-2">
                <h3 className="font-medium text-[var(--gray-900)]">{title}</h3>
                <div className="flex items-center gap-2 text-sm text-[var(--gray-600)] mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>{address}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {isModalOpen && (
          <div 
            className="absolute inset-0 bg-black/50 transition-opacity"
            style={{ pointerEvents: 'none', zIndex: 2 }}
          />
        )}
      </div>

      {!isDisabled && (
        <button
          onClick={handleGetDirections}
          className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:bg-[var(--gray-50)] text-[var(--gray-700)] font-medium"
        >
          <Navigation className="h-5 w-5" />
          Get Directions
        </button>
      )}
    </div>
  );
}
