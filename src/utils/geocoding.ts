import { z } from 'zod';

interface GeocodingResult {
  latitude: number;
  longitude: number;
}

// Cache geocoding results
const geocodingCache = new Map<string, GeocodingResult>();

// Schema for validating geocoding response
const geocodingResponseSchema = z.array(z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string()
}));

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  // Check cache first
  if (geocodingCache.has(address)) {
    return geocodingCache.get(address)!;
  }

  try {
    // Use OpenStreetMap Nominatim API for geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }

    const data = await response.json();

    const parsed = geocodingResponseSchema.safeParse(data);

    if (!parsed.success || parsed.data.length === 0) {
      console.warn('Geocoding: no results for address', address, parsed.success ? parsed.data : parsed.error.issues);
      throw new Error('No geocoding results');
    }

    const firstResult = parsed.data[0];
    const result = {
      latitude: parseFloat(firstResult.lat),
      longitude: parseFloat(firstResult.lon)
    };

    // Cache the result
    geocodingCache.set(address, result);
    return result;
  } catch (error) {
    console.error('Geocoding error:', { address, error });
    // Return default coordinates for Ouagadougou
    return { latitude: 12.3714, longitude: -1.5197 };
  }
}

// Function to get coordinates from browser
export async function getCurrentLocation(): Promise<GeocodingResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        // Default to Ouagadougou coordinates
        resolve({ latitude: 12.3714, longitude: -1.5197 });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
}