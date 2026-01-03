import { supabase } from '../lib/supabase';

export interface NearbyUser {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  latitude: number;
  longitude: number;
  distance: number; // in kilometers
  last_updated: string;
}

class UserLocationService {
  private static instance: UserLocationService;

  private constructor() {}

  static getInstance(): UserLocationService {
    if (!UserLocationService.instance) {
      UserLocationService.instance = new UserLocationService();
    }
    return UserLocationService.instance;
  }

  /**
   * Find nearby users within a specified radius
   * Note: PostGIS functions not available, so this returns empty array
   */
  async findNearbyUsers(
    centerLat: number,
    centerLng: number,
    radiusKm: number = 10,
    excludeUserId?: string,
    limit: number = 50
  ): Promise<NearbyUser[]> {
    // PostGIS not available in this Supabase instance
    // Nearby users feature is disabled to prevent errors
    console.log('Nearby users search disabled - PostGIS not available');
    return [];
  }

  /**
   * Update user's location using the database function
   */
  async updateUserLocation(
    userId: string,
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_user_location', {
        p_user_id: userId,
        p_latitude: latitude,
        p_longitude: longitude,
        p_accuracy: accuracy,
        p_heading: null,
        p_speed: null,
        p_altitude: null,
        p_location_source: 'manual'
      });

      if (error) {
        console.error('Error updating user location:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update user location:', error);
      return false;
    }
  }

  /**
   * Refresh nearby users for a given location (used for periodic updates)
   */
  async refreshNearbyUsers(
    centerLat: number,
    centerLng: number,
    radiusKm: number = 10,
    excludeUserId?: string,
    limit: number = 50
  ): Promise<NearbyUser[]> {
    // This is essentially the same as findNearbyUsers but can be optimized for frequent calls
    return this.findNearbyUsers(centerLat, centerLng, radiusKm, excludeUserId, limit);
  }
}

// Export singleton instance
export const userLocationService = UserLocationService.getInstance();
export default userLocationService;
