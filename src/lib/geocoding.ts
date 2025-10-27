// Geocoding utilities for converting coordinates to addresses

export interface GeocodeResult {
  address: string;
  coordinates: [number, number];
}

/**
 * Reverse geocode coordinates to get a human-readable address
 * Uses OpenStreetMap Nominatim API for real geocoding
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    // Use OpenStreetMap Nominatim API (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'HyperApp/1.0 (https://github.com/elbaradei1993/hyperapp-mimi)' // Required by Nominatim
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract address components
    if (data && data.display_name) {
      // Parse the address into a more readable format
      const address = parseNominatimAddress(data);
      return address;
    }

    throw new Error('No address found in API response');

  } catch (error) {
    console.warn('Real geocoding failed:', error);
    // Fallback to user-friendly message instead of coordinates
    return 'Address not available';
  }
}

/**
 * Parse Nominatim API response into a clean, readable address
 */
function parseNominatimAddress(data: any): string {
  const address = data.address || {};

  // Build address components in order of specificity
  const components = [];

  // Street address
  if (address.house_number && address.road) {
    components.push(`${address.house_number} ${address.road}`);
  } else if (address.road) {
    components.push(address.road);
  } else if (address.footway) {
    components.push(address.footway);
  } else if (address.pedestrian) {
    components.push(address.pedestrian);
  }

  // Neighborhood/Suburb
  if (address.neighbourhood) {
    components.push(address.neighbourhood);
  } else if (address.suburb) {
    components.push(address.suburb);
  }

  // City/District
  if (address.city) {
    components.push(address.city);
  } else if (address.town) {
    components.push(address.town);
  } else if (address.village) {
    components.push(address.village);
  } else if (address.municipality) {
    components.push(address.municipality);
  }

  // State/Province
  if (address.state) {
    components.push(address.state);
  }

  // Country
  if (address.country) {
    components.push(address.country);
  }

  // If we have components, join them
  if (components.length > 0) {
    return components.join(', ');
  }

  // Fallback to display_name if parsing fails
  if (data.display_name) {
    // Clean up the display_name by removing some redundant parts
    return data.display_name
      .split(', ')
      .slice(0, 4) // Limit to first 4 components to avoid too long addresses
      .join(', ');
  }

  // Final fallback
  return 'Unknown Location';
}

/**
 * Generate a mock address for demonstration purposes
 * In production, replace with real geocoding service
 */
function generateMockAddress(latitude: number, longitude: number): string {
  // This is a simplified mock - in reality you'd call a geocoding API
  // For Cairo area (approximate coordinates)
  if (latitude >= 30.0 && latitude <= 30.2 && longitude >= 31.2 && longitude <= 31.4) {
    const streets = ['Tahrir Square', 'Corniche Road', 'Pyramids Road', 'Zamalek Island', 'Garden City'];
    const areas = ['Downtown Cairo', 'Zamalek', 'Maadi', 'Heliopolis', 'Nasr City'];
    const randomStreet = streets[Math.floor(Math.random() * streets.length)];
    const randomArea = areas[Math.floor(Math.random() * areas.length)];
    return `${randomStreet}, ${randomArea}, Cairo, Egypt`;
  }

  // For other locations, return a generic format
  return `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/**
 * Forward geocode an address to coordinates
 * This would typically use a geocoding service
 */
export async function forwardGeocode(address: string): Promise<[number, number] | null> {
  // This is a placeholder - in production you'd use a real geocoding service
  // For now, return null to indicate we can't geocode addresses
  console.warn('Forward geocoding not implemented - using manual coordinates only');
  return null;
}

/**
 * Format coordinates as a clean string
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

/**
 * Check if a string looks like coordinates
 */
export function isCoordinatesString(str: string): boolean {
  const coordsRegex = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;
  return coordsRegex.test(str.trim());
}
