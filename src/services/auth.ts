import { AuthResponse, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authLogger } from '../lib/authLogger';
import type { User as AppUser, OnboardingData } from '../types';

class AuthService {

  // Authentication methods
  async signUp(email: string, password: string, username: string): Promise<AuthResponse> {
    console.log('📝 AuthService.signUp: Starting signup process', {
      email: email.toLowerCase().trim(),
      hasPassword: !!password,
      username: username?.trim(),
      timestamp: new Date().toISOString()
    });

    try {
      const response = await supabase.auth.signUp({
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

      if (response.error) {
        console.error('❌ AuthService.signUp: Supabase signup failed', {
          message: response.error.message,
          status: response.error.status,
          name: response.error.name,
          details: response.error
        });
      } else {
        console.log('✅ AuthService.signUp: Signup successful', {
          userId: response.data.user?.id,
          email: response.data.user?.email,
          emailConfirmed: response.data.user?.email_confirmed_at ? true : false,
          timestamp: new Date().toISOString()
        });

        // Note: In production, you might want to enable email confirmation
        // For development, you can disable it in Supabase dashboard under Authentication > Settings
        if (!response.data.user?.email_confirmed_at) {
          console.warn('⚠️ AuthService.signUp: Email confirmation required. User must confirm email before logging in.');
        }
      }

      return response;
    } catch (networkError: any) {
      console.error('🚨 AuthService.signUp: Network or unexpected error', {
        message: networkError.message,
        name: networkError.name,
        stack: networkError.stack,
        status: networkError.status
      });
      throw networkError;
    }
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    authLogger.logAuthAttempt('AuthService.signIn: Starting authentication attempt', {
      email: email.toLowerCase().trim(),
      hasPassword: !!password,
      supabaseUrl: 'https://nqwejzbayquzsvcodunl.supabase.co'
    });

    try {
      const response = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (response.error) {
        authLogger.logAuthError('AuthService.signIn: Supabase authentication failed', {
          message: response.error.message,
          status: response.error.status,
          name: response.error.name,
          details: response.error
        }, {
          email: email.toLowerCase().trim(),
          hasPassword: !!password
        });
      } else {
        authLogger.logAuthSuccess('AuthService.signIn: Authentication successful', {
          userId: response.data.user?.id,
          email: response.data.user?.email
        });
      }

      return response;
    } catch (networkError: any) {
      authLogger.logNetworkError('AuthService.signIn: Network or unexpected error', {
        message: networkError.message,
        name: networkError.name,
        stack: networkError.stack,
        status: networkError.status
      }, {
        email: email.toLowerCase().trim(),
        hasPassword: !!password
      });
      throw networkError;
    }
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
    console.log('🔄 AuthService.syncUserWithProfile: Starting profile sync', {
      userId: authUser.id,
      email: authUser.email,
      timestamp: new Date().toISOString()
    });

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error('⏰ AuthService.syncUserWithProfile: Profile sync timeout', {
            userId: authUser.id,
            timestamp: new Date().toISOString()
          });
          reject(new Error('Profile sync timeout'));
        }, 15000); // 15 second timeout
      });

      const syncPromise = this.performProfileSync(authUser);
      const result = await Promise.race([syncPromise, timeoutPromise]);

      return result;
    } catch (error: any) {
      console.error('🚨 AuthService.syncUserWithProfile: Sync failed or timed out', {
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
          status: error.status
        },
        userId: authUser.id,
        email: authUser.email,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  private async performProfileSync(authUser: User): Promise<AppUser | null> {
    // First check if profile exists
    console.log('🔍 AuthService.syncUserWithProfile: Checking for existing profile', {
      userId: authUser.id,
      timestamp: new Date().toISOString()
    });

    const { data: profile, error } = await this.getUserProfile(authUser.id);

    if (error) {
      console.log('⚠️ AuthService.syncUserWithProfile: Profile query error', {
        error: {
          message: error.message,
          code: error.code,
          status: error.status
        },
        userId: authUser.id,
        timestamp: new Date().toISOString()
      });

      // PGRST116 is "not found" error, which is expected for new users
      if (error.code !== 'PGRST116') {
        console.error('❌ AuthService.syncUserWithProfile: Unexpected error fetching profile', {
          error: {
            message: error.message,
            code: error.code,
            status: error.status,
            details: error
          },
          userId: authUser.id,
          timestamp: new Date().toISOString()
        });
        return null;
      }
    }

    if (profile) {
      // Profile exists, return combined data
      console.log('✅ AuthService.syncUserWithProfile: Found existing profile', {
        userId: authUser.id,
        email: authUser.email,
        profileId: profile.user_id,
        onboardingCompleted: profile.onboarding_completed,
        timestamp: new Date().toISOString()
      });

      return {
        id: authUser.id,
        email: authUser.email!,
        ...profile
      };
    } else {
      // Profile doesn't exist, create it
      console.log('🆕 AuthService.syncUserWithProfile: Creating new profile', {
        userId: authUser.id,
        email: authUser.email,
        username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
        timestamp: new Date().toISOString()
      });

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
        console.error('❌ AuthService.syncUserWithProfile: Error creating user profile', {
          error: {
            message: createError.message,
            code: createError.code,
            status: createError.status,
            details: createError
          },
          userId: authUser.id,
          profileData,
          timestamp: new Date().toISOString()
        });
        // Don't return null - let the auth context handle the fallback
        return null;
      }

      console.log('✅ AuthService.syncUserWithProfile: Successfully created profile', {
        userId: authUser.id,
        email: authUser.email,
        profileId: newProfile?.user_id,
        timestamp: new Date().toISOString()
      });

      return {
        id: authUser.id,
        email: authUser.email!,
        ...newProfile
      };
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
