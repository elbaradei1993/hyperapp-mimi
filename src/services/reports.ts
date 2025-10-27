import { supabase } from '../lib/supabase';
import type { Report, Vibe, SOS, VibeType } from '../types';

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
          last_name
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
      profile: item.users ? {
        username: item.users.username,
        first_name: item.users.first_name,
        last_name: item.users.last_name
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
    return this.getReports({ ...options, emergency: false });
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
    return this.getReports({ ...options, emergency: true });
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
    emergency?: boolean;
  }): Promise<Report> {
    const { data, error } = await supabase
      .from('reports')
      .insert([{
        vibe_type: reportData.vibe_type,
        latitude: reportData.latitude,
        longitude: reportData.longitude,
        notes: reportData.notes,
        location: reportData.location,
        emergency: reportData.emergency || false,
        upvotes: 0,
        downvotes: 0
      }])
      .select(`
        *,
        users:user_id (
          username,
          first_name,
          last_name
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
      profile: data.users ? {
        username: data.users.username,
        first_name: data.users.first_name,
        last_name: data.users.last_name
      } : undefined
    };
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
          // Fetch the complete report with user data
          const { data, error } = await supabase
            .from('reports')
            .select(`
              *,
              users:user_id (
                username,
                first_name,
                last_name
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
              profile: data.users ? {
                username: data.users.username,
                first_name: data.users.first_name,
                last_name: data.users.last_name
              } : undefined
            };
            callback(report);
          }
        }
      )
      .subscribe();
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
}

// Export singleton instance
export const reportsService = new ReportsService();
export default reportsService;
