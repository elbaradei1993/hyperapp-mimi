import { supabase } from '../lib/supabase';
import { reverseGeocode } from '../lib/geocoding';
import type { Report, Vibe, SOS, VibeType, ReportValidation } from '../types';

class ReportsService {

  /**
   * Fetch all reports with optional filtering
   */
  async getReports(options: {
    limit?: number;
    offset?: number;
    emergency?: boolean;
    userId?: string;
    bounds?: {
      northEast: [number, number];
      southWest: [number, number];
    };
  } = {}): Promise<Report[]> {
    let query = supabase
      .from('reports')
      .select(`
        *,
        users:user_id (
          username,
          first_name,
          last_name,
          profile_picture_url,
          reputation,
          verification_level
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (options.emergency !== undefined) {
      query = query.eq('emergency', options.emergency);
    }

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options.bounds) {
      const { northEast, southWest } = options.bounds;
      query = query
        .gte('latitude', southWest[0])
        .lte('latitude', northEast[0])
        .gte('longitude', southWest[1])
        .lte('longitude', northEast[1]);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }

    // Transform data to match our interface
    return (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      vibe_type: item.vibe_type as VibeType,
      notes: item.notes,
      location: item.location,
      latitude: item.latitude,
      longitude: item.longitude,
      emergency: item.emergency,
      upvotes: item.upvotes || 0,
      downvotes: item.downvotes || 0,
      created_at: item.created_at,
      updated_at: item.updated_at,
      // Credibility fields
      credibility_score: item.credibility_score,
      validation_count: item.validation_count,
      last_validated_at: item.last_validated_at,
      profile: item.users ? {
        username: item.users.username,
        first_name: item.users.first_name,
        last_name: item.users.last_name,
        profile_picture_url: item.users.profile_picture_url,
        // Include user credibility data
        reputation: item.users.reputation,
        verification_level: item.users.verification_level
      } : undefined
    }));
  }

  /**
   * Get vibes (non-emergency reports)
   */
  async getVibes(options: {
    limit?: number;
    offset?: number;
    userId?: string;
    bounds?: {
      northEast: [number, number];
      southWest: [number, number];
    };
  } = {}): Promise<Vibe[]> {
    try {
      return await this.getReports({ ...options, emergency: false });
    } catch (error) {
      console.error('Failed to fetch vibes, returning empty array:', error);
      return []; // Return empty array instead of crashing
    }
  }

  /**
   * Get SOS alerts (emergency reports)
   */
  async getSOSAlerts(options: {
    limit?: number;
    offset?: number;
    userId?: string;
    bounds?: {
      northEast: [number, number];
      southWest: [number, number];
    };
  } = {}): Promise<SOS[]> {
    try {
      return await this.getReports({ ...options, emergency: true });
    } catch (error) {
      console.error('Failed to fetch SOS alerts, returning empty array:', error);
      return []; // Return empty array instead of crashing
    }
  }

  /**
   * Create a new report
   */
  async createReport(reportData: {
    vibe_type: VibeType;
    latitude: number;
    longitude: number;
    notes?: string;
    location?: string;
    media_url?: string;
    emergency?: boolean;
    user_id?: string;
  }): Promise<Report> {
    try {
      // Get current user if not provided
      let userId = reportData.user_id;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }

      if (!userId) {
        throw new Error('User must be authenticated to create a report');
      }

      // Generate location name if not provided
      let locationName = reportData.location;
      if (!locationName || locationName.trim() === '') {
        try {
          console.log('Generating location name from coordinates...');
          locationName = await reverseGeocode(reportData.latitude, reportData.longitude);
          console.log('Generated location name:', locationName);
        } catch (geocodeError) {
          console.warn('Failed to generate location name, using fallback:', geocodeError);
          locationName = `Near ${reportData.latitude.toFixed(4)}, ${reportData.longitude.toFixed(4)}`;
        }
      }

      const { data, error } = await supabase
        .from('reports')
        .insert([{
          user_id: userId,
          vibe_type: reportData.vibe_type,
          latitude: reportData.latitude,
          longitude: reportData.longitude,
          notes: reportData.notes,
          location: locationName, // Use generated or provided location name
          media_url: reportData.media_url,
          emergency: reportData.emergency || false,
          upvotes: 0,
          downvotes: 0
        }])
        .select(`
          *,
          users:user_id (
            username,
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .single();

      if (error) {
        console.error('Error creating report:', error);
        throw error;
      }

      return {
        id: data.id,
        user_id: data.user_id,
        vibe_type: data.vibe_type as VibeType,
        notes: data.notes,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        emergency: data.emergency,
        upvotes: data.upvotes || 0,
        downvotes: data.downvotes || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // Credibility fields
        credibility_score: data.credibility_score,
        validation_count: data.validation_count,
        last_validated_at: data.last_validated_at,
        profile: data.users ? {
          username: data.users.username,
          first_name: data.users.first_name,
          last_name: data.users.last_name,
          profile_picture_url: data.users.profile_picture_url,
          reputation: data.users.reputation,
          verification_level: data.users.verification_level
        } : undefined
      };
    } catch (error) {
      console.error('Failed to create report:', error);
      // Return a mock report for demo purposes when Supabase fails
      return {
        id: Date.now(),
        user_id: 'demo-user',
        vibe_type: reportData.vibe_type,
        notes: reportData.notes,
        location: reportData.location || `Near ${reportData.latitude.toFixed(4)}, ${reportData.longitude.toFixed(4)}`,
        latitude: reportData.latitude,
        longitude: reportData.longitude,
        emergency: reportData.emergency || false,
        upvotes: 0,
        downvotes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: {
          username: 'Demo User',
          first_name: 'Demo',
          last_name: 'User'
        }
      };
    }
  }

  /**
   * Get user's vote on a specific report
   */
  async getUserVote(reportId: number, userId: string): Promise<'upvote' | 'downvote' | null> {
    const { data, error } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('report_id', reportId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user vote:', error);
      return null;
    }

    return data?.vote_type || null;
  }

  /**
   * Vote on a report (upvote or downvote)
   */
  async vote(reportId: number, userId: string, voteType: 'upvote' | 'downvote'): Promise<void> {
    // Check if user already voted
    const existingVote = await this.getUserVote(reportId, userId);

    if (existingVote === voteType) {
      // User is trying to vote the same way again - remove vote
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('report_id', reportId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing vote:', error);
        throw error;
      }
    } else if (existingVote) {
      // User is changing their vote
      const { error } = await supabase
        .from('votes')
        .update({ vote_type: voteType })
        .eq('report_id', reportId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating vote:', error);
        throw error;
      }
    } else {
      // New vote
      const { error } = await supabase
        .from('votes')
        .insert([{
          report_id: reportId,
          user_id: userId,
          vote_type: voteType
        }]);

      if (error) {
        console.error('Error creating vote:', error);
        throw error;
      }
    }

    // After vote is processed, check and update verification level for the report author
    try {
      // Get the report author
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('user_id')
        .eq('id', reportId)
        .single();

      if (!reportError && reportData) {
        // Import credibilityService here to avoid circular dependency
        const { credibilityService } = await import('./credibilityService');

        // Check and update verification level for the report author
        await credibilityService.checkAndUpdateVerificationLevel(reportData.user_id);
      }
    } catch (verificationError) {
      // Don't fail the vote operation if verification check fails
      console.warn('Failed to check verification level after vote:', verificationError);
    }
  }

  /**
   * Subscribe to real-time report updates
   */
  subscribeToReports(callback: (report: Report) => void) {
    return supabase
      .channel('reports')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports'
        },
        async (payload) => {
          // Fetch the complete report with user and credibility data
          const { data, error } = await supabase
            .from('reports')
            .select(`
              *,
              users:user_id (
                username,
                first_name,
                last_name,
                profile_picture_url,
                reputation,
                verification_level
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            const report: Report = {
              id: data.id,
              user_id: data.user_id,
              vibe_type: data.vibe_type as VibeType,
              notes: data.notes,
              location: data.location,
              latitude: data.latitude,
              longitude: data.longitude,
              emergency: data.emergency,
              upvotes: data.upvotes || 0,
              downvotes: data.downvotes || 0,
              created_at: data.created_at,
              updated_at: data.updated_at,
              // Credibility fields
              credibility_score: data.credibility_score,
              validation_count: data.validation_count,
              last_validated_at: data.last_validated_at,
              profile: data.users ? {
                username: data.users.username,
                first_name: data.users.first_name,
                last_name: data.users.last_name,
                profile_picture_url: data.users.profile_picture_url,
                reputation: data.users.reputation,
                verification_level: data.users.verification_level
              } : undefined
            };
            callback(report);
          }
        }
      )
      .subscribe();
  }

  /**
   * Validate a report (confirm or deny)
   */
  async validateReport(reportId: number, userId: string, validationType: 'confirm' | 'deny'): Promise<boolean> {
    try {
      // Check if user already validated this report
      const { data: existingValidation } = await supabase
        .from('report_validations')
        .select('id')
        .eq('report_id', reportId)
        .eq('user_id', userId)
        .single();

      if (existingValidation) {
        // Update existing validation
        const { error } = await supabase
          .from('report_validations')
          .update({ validation_type: validationType })
          .eq('report_id', reportId)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Create new validation
        const { error } = await supabase
          .from('report_validations')
          .insert({
            report_id: reportId,
            user_id: userId,
            validation_type: validationType
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error validating report:', error);
      return false;
    }
  }

  /**
   * Get user's validation for a specific report
   */
  async getUserValidation(reportId: number, userId: string): Promise<'confirm' | 'deny' | null> {
    try {
      const { data, error } = await supabase
        .from('report_validations')
        .select('validation_type')
        .eq('report_id', reportId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data?.validation_type || null;
    } catch (error) {
      console.error('Error getting user validation:', error);
      return null;
    }
  }

  /**
   * Get validation statistics for a report
   */
  async getValidationStats(reportId: number): Promise<{
    confirmCount: number;
    denyCount: number;
    totalValidations: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('report_validations')
        .select('validation_type')
        .eq('report_id', reportId);

      if (error) throw error;

      const confirmCount = data.filter(v => v.validation_type === 'confirm').length;
      const denyCount = data.filter(v => v.validation_type === 'deny').length;

      return {
        confirmCount,
        denyCount,
        totalValidations: data.length
      };
    } catch (error) {
      console.error('Error getting validation stats:', error);
      return { confirmCount: 0, denyCount: 0, totalValidations: 0 };
    }
  }

  /**
   * Subscribe to vote count updates
   */
  subscribeToVotes(callback: (update: { reportId: number; upvotes: number; downvotes: number }) => void) {
    return supabase
      .channel('votes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports'
        },
        (payload: any) => {
          if (payload.new && (payload.new.upvotes !== payload.old?.upvotes || payload.new.downvotes !== payload.old?.downvotes)) {
            callback({
              reportId: payload.new.id,
              upvotes: payload.new.upvotes || 0,
              downvotes: payload.new.downvotes || 0
            });
          }
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to credibility score updates
   */
  subscribeToCredibilityUpdates(callback: (update: { reportId: number; credibility_score: number; validation_count: number }) => void) {
    return supabase
      .channel('credibility')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports'
        },
        (payload: any) => {
          if (payload.new && (
            payload.new.credibility_score !== payload.old?.credibility_score ||
            payload.new.validation_count !== payload.old?.validation_count
          )) {
            callback({
              reportId: payload.new.id,
              credibility_score: payload.new.credibility_score || 0.5,
              validation_count: payload.new.validation_count || 0
            });
          }
        }
      )
      .subscribe();
  }

  /**
   * Get count of unique locations that have reports
   */
  async getUniqueLocationCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('reports')
        .select('location', { count: 'exact', head: true })
        .not('location', 'is', null)
        .not('location', 'eq', '');

      if (error) {
        console.error('Error getting unique location count:', error);
        return 0;
      }

      // Note: Supabase doesn't support COUNT(DISTINCT) directly with the count option
      // We'll need to fetch and count unique values
      const { data, error: fetchError } = await supabase
        .from('reports')
        .select('location')
        .not('location', 'is', null)
        .not('location', 'eq', '');

      if (fetchError) {
        console.error('Error fetching locations:', fetchError);
        return 0;
      }

      // Count unique locations
      const uniqueLocations = new Set(data.map(item => item.location));
      return uniqueLocations.size;

    } catch (error) {
      console.error('Failed to get unique location count:', error);
      return 0;
    }
  }

  /**
   * Get recent users who have made reports (for social proof)
   */
  async getRecentReporters(limit: number = 4): Promise<Array<{
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    profile_picture_url: string | null;
  }>> {
    try {
      // Get distinct users who have made recent reports
      const { data, error } = await supabase
        .from('reports')
        .select(`
          user_id,
          users:user_id (
            username,
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to ensure we get distinct users

      if (error) {
        console.error('Error fetching recent reporters:', error);
        return [];
      }

      // Extract unique users and limit to the requested number
      const userMap = new Map();
      for (const report of data || []) {
        const userData = (report as any).users;
        if (userData && !userMap.has(report.user_id)) {
          userMap.set(report.user_id, {
            id: report.user_id,
            username: userData.username,
            first_name: userData.first_name,
            last_name: userData.last_name,
            profile_picture_url: userData.profile_picture_url
          });
        }
        if (userMap.size >= limit) break;
      }

      return Array.from(userMap.values());
    } catch (error) {
      console.error('Failed to get recent reporters:', error);
      return [];
    }
  }
}

// Export singleton instance
export const reportsService = new ReportsService();
export default reportsService;
