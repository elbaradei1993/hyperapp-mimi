// OpenStreetMap Nominatim geocoding service - no API key required
class GeocodingService {
  private readonly NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      const nominatimUrl = `${this.NOMINATIM_BASE}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`;

      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'HyperApp/1.0 (https://hyperapp-mimi.com)' // Required by Nominatim
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.display_name) {
        return this.formatAddress(data);
      }

      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  }

  async searchPlaces(query: string, latitude?: number, longitude?: number, limit: number = 5): Promise<Array<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    type: string;
  }>> {
    try {
      const allResults: Array<{
        name: string;
        address: string;
        latitude: number;
        longitude: number;
        type: string;
        distance: number;
      }> = [];

      // Multi-level search strategy for city-wide coverage
      const searchRadii = [25, 50]; // City-wide, then regional
      let currentLimit = limit;

      // Try each radius level
      for (const radiusKm of searchRadii) {
        if (allResults.length >= limit) break;

        let url = `${this.NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=${currentLimit * 3}&addressdetails=1`;

        // Create bounding box for current radius
        if (latitude !== undefined && longitude !== undefined) {
          const latOffset = radiusKm / 111; // 1 degree latitude ≈ 111km
          const lonOffset = radiusKm / (111 * Math.cos(latitude * Math.PI / 180)); // Adjust for longitude

          const minLat = latitude - latOffset;
          const maxLat = latitude + latOffset;
          const minLon = longitude - lonOffset;
          const maxLon = longitude + lonOffset;

          // Use viewbox with bounded=1 to restrict results to the area
          url += `&viewbox=${minLon},${minLat},${maxLon},${maxLat}&bounded=1`;
        }

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'HyperApp/1.0 (https://hyperapp-mimi.com)'
          }
        });

        if (!response.ok) {
          console.warn(`Places search API error for ${radiusKm}km radius: ${response.status}`);
          continue;
        }

        const data = await response.json();

        // Process results and calculate distances
        const levelResults = data.map((place: any) => ({
          name: place.display_name.split(',')[0] || place.display_name,
          address: place.display_name,
          latitude: parseFloat(place.lat),
          longitude: parseFloat(place.lon),
          type: place.type || 'unknown',
          distance: latitude && longitude ? this.calculateDistance(latitude, longitude, parseFloat(place.lat), parseFloat(place.lon)) : 0
        }));

        // Add to all results, avoiding duplicates
        for (const result of levelResults) {
          const isDuplicate = allResults.some(existing =>
            existing.name === result.name &&
            Math.abs(existing.latitude - result.latitude) < 0.001 &&
            Math.abs(existing.longitude - result.longitude) < 0.001
          );

          if (!isDuplicate) {
            allResults.push(result);
          }
        }

        // Reduce limit for next level to avoid over-fetching
        currentLimit = Math.max(3, limit - allResults.length);
      }

      // If we still don't have enough results, try a global search as fallback
      if (allResults.length < limit) {
        const globalUrl = `${this.NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=${limit - allResults.length}&addressdetails=1`;

        try {
          const globalResponse = await fetch(globalUrl, {
            headers: {
              'User-Agent': 'HyperApp/1.0 (https://hyperapp-mimi.com)'
            }
          });

          if (globalResponse.ok) {
            const globalData = await globalResponse.json();

            const globalResults = globalData.map((place: any) => ({
              name: place.display_name.split(',')[0] || place.display_name,
              address: place.display_name,
              latitude: parseFloat(place.lat),
              longitude: parseFloat(place.lon),
              type: place.type || 'unknown',
              distance: latitude && longitude ? this.calculateDistance(latitude, longitude, parseFloat(place.lat), parseFloat(place.lon)) : 999999
            }));

            // Add global results, avoiding duplicates
            for (const result of globalResults) {
              const isDuplicate = allResults.some(existing =>
                existing.name === result.name &&
                Math.abs(existing.latitude - result.latitude) < 0.001 &&
                Math.abs(existing.longitude - result.longitude) < 0.001
              );

              if (!isDuplicate) {
                allResults.push(result);
              }
            }
          }
        } catch (error) {
          console.warn('Global search fallback failed:', error);
        }
      }

      // Sort all results by distance (prioritize local results)
      if (latitude && longitude) {
        allResults.sort((a, b) => a.distance - b.distance);
      }

      // Return top results
      return allResults.slice(0, limit);
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const nominatimUrl = `${this.NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'HyperApp/1.0 (https://hyperapp-mimi.com)'
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }

      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  private formatAddress(data: any): string {
    const address = data.address || {};

    // Try different combinations for a clean, readable address
    const parts = [];

    // Primary location name
    if (address.road) {
      parts.push(address.road);
    } else if (data.display_name) {
      // Fallback to first part of display name
      const displayParts = data.display_name.split(',');
      if (displayParts.length > 0) {
        parts.push(displayParts[0].trim());
      }
    }

    // Add neighborhood or suburb if available
    if (address.neighbourhood) {
      parts.push(address.neighbourhood);
    } else if (address.suburb) {
      parts.push(address.suburb);
    }

    // Add city/district
    if (address.city) {
      parts.push(address.city);
    } else if (address.town) {
      parts.push(address.town);
    } else if (address.village) {
      parts.push(address.village);
    } else if (address.county) {
      parts.push(address.county);
    }

    // If we don't have a good address, use the full display name but truncate it
    if (parts.length === 0 && data.display_name) {
      const displayParts = data.display_name.split(',');
      return displayParts.slice(0, 3).join(', ').trim();
    }

    return parts.slice(0, 3).join(', ').trim();
  }

  // Get nearby points of interest
  async getNearbyPOI(latitude: number, longitude: number, radius: number = 1000): Promise<Array<{
    name: string;
    type: string;
    latitude: number;
    longitude: number;
    distance: number;
  }>> {
    try {
      // Use Overpass API for more detailed POI data
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"](around:${radius},${latitude},${longitude});
          way["amenity"](around:${radius},${latitude},${longitude});
          relation["amenity"](around:${radius},${latitude},${longitude});
        );
        out center meta;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();

      return data.elements
        .filter((element: any) => element.tags && element.tags.name)
        .map((element: any) => {
          const lat = element.lat || (element.center && element.center.lat);
          const lon = element.lon || (element.center && element.center.lon);

          if (!lat || !lon) return null;

          // Calculate distance using Haversine formula
          const distance = this.calculateDistance(latitude, longitude, lat, lon);

          return {
            name: element.tags.name,
            type: element.tags.amenity || 'poi',
            latitude: lat,
            longitude: lon,
            distance: Math.round(distance)
          };
        })
        .filter((poi: any) => poi !== null)
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 10); // Return top 10 closest
    } catch (error) {
      console.error('Error fetching nearby POI:', error);
      return [];
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Return distance in meters
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const geocodingService = new GeocodingService();
