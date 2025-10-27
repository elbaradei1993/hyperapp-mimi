import { AuthResponse, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User as AppUser, OnboardingData } from '../types';

class AuthService {

  // Authentication methods
  async signUp(email: string, password: string, username: string): Promise<AuthResponse> {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          reputation: 0,
          language: 'en',
          onboarding_completed: false,
          onboarding_step: 0
        }
      }
    });
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    return supabase.auth.signInWithPassword({
      email,
      password
    });
  }

  async signOut(): Promise<{ error: any }> {
    return supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  async getSession() {
    return supabase.auth.getSession();
  }

  // User profile methods
  async createUserProfile(userId: string, profileData: Partial<AppUser>): Promise<any> {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        user_id: userId,
        ...profileData,
        reputation: 0,
        language: 'en',
        onboarding_completed: false,
        onboarding_step: 0
      }])
      .select()
      .single();

    return { data, error };
  }

  async getUserProfile(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return { data, error };
  }

  async updateUserProfile(userId: string, updates: Partial<AppUser>): Promise<any> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    return { data, error };
  }

  // Onboarding methods
  async completeOnboarding(userId: string, onboardingData: OnboardingData): Promise<any> {
    const profileUpdates = {
      first_name: onboardingData.firstName,
      last_name: onboardingData.lastName,
      phone: onboardingData.phone,
      location: onboardingData.location,
      interests: onboardingData.interests,
      language: onboardingData.language,
      onboarding_completed: true,
      onboarding_step: 4,
      profile_completed_at: new Date().toISOString()
    };

    return this.updateUserProfile(userId, profileUpdates);
  }

  async updateOnboardingStep(userId: string, step: number): Promise<any> {
    return this.updateUserProfile(userId, {
      onboarding_step: step
    });
  }

  // Sync user data between auth and profile
  async syncUserWithProfile(authUser: User): Promise<AppUser | null> {
    try {
      // First check if profile exists
      const { data: profile, error } = await this.getUserProfile(authUser.id);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (profile) {
        // Profile exists, return combined data
        return {
          id: authUser.id,
          email: authUser.email!,
          ...profile
        };
      } else {
        // Profile doesn't exist, create it
        const profileData = {
          username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
          email: authUser.email,
          reputation: 0,
          language: 'en',
          onboarding_completed: false,
          onboarding_step: 0
        };

        const { data: newProfile, error: createError } = await this.createUserProfile(authUser.id, profileData);

        if (createError) {
          console.error('Error creating user profile:', createError);
          return null;
        }

        return {
          id: authUser.id,
          email: authUser.email!,
          ...newProfile
        };
      }
    } catch (error) {
      console.error('Error syncing user with profile:', error);
      return null;
    }
  }

  // Auth state listener
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }

  // Password reset
  async resetPassword(email: string): Promise<any> {
    return supabase.auth.resetPasswordForEmail(email);
  }

  // Update password
  async updatePassword(newPassword: string): Promise<any> {
    return supabase.auth.updateUser({ password: newPassword });
  }

  // Profile data methods for components
  async getUserReports(userId: string): Promise<any> {
    return supabase
      .from('reports')
      .select('upvotes, downvotes')
      .eq('user_id', userId);
  }

  async getUserRecentReports(userId: string, limit: number = 5): Promise<any> {
    return supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
  }

  async getAllUsersByReputation(): Promise<any> {
    return supabase
      .from('users')
      .select('user_id, reputation')
      .order('reputation', { ascending: false });
  }

  async getUserReportsCount(userId: string): Promise<any> {
    return supabase
      .from('reports')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);
  }

  // Voting methods
  async getUserVote(userId: string, reportId: number): Promise<any> {
    return supabase
      .from('votes')
      .select('vote_type')
      .eq('user_id', userId)
      .eq('report_id', reportId)
      .maybeSingle();
  }

  async addVote(userId: string, reportId: number, voteType: 'upvote' | 'downvote'): Promise<any> {
    return supabase
      .from('votes')
      .insert([{
        user_id: userId,
        report_id: reportId,
        vote_type: voteType
      }]);
  }

  async removeVote(userId: string, reportId: number): Promise<any> {
    return supabase
      .from('votes')
      .delete()
      .eq('user_id', userId)
      .eq('report_id', reportId);
  }

  async updateVote(userId: string, reportId: number, voteType: 'upvote' | 'downvote'): Promise<any> {
    return supabase
      .from('votes')
      .update({ vote_type: voteType })
      .eq('user_id', userId)
      .eq('report_id', reportId);
  }

  // Reports methods for profile
  async getNearbyReports(limit: number = 10): Promise<any> {
    return supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
  }

  // Account management methods
  async deleteAccount(userId: string): Promise<any> {
    // Delete user profile data first
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error deleting user profile:', profileError);
      return { error: profileError };
    }

    // Delete user votes
    const { error: votesError } = await supabase
      .from('votes')
      .delete()
      .eq('user_id', userId);

    if (votesError) {
      console.error('Error deleting user votes:', votesError);
      // Continue with account deletion even if votes deletion fails
    }

    // Delete user reports
    const { error: reportsError } = await supabase
      .from('reports')
      .delete()
      .eq('user_id', userId);

    if (reportsError) {
      console.error('Error deleting user reports:', reportsError);
      // Continue with account deletion even if reports deletion fails
    }

    // Finally delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      return { error: authError };
    }

    return { error: null };
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
