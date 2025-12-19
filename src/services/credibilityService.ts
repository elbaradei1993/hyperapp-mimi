import { supabase } from '../lib/supabase';
import type { ReportValidation } from '../types';

/**
 * Credibility Service - Handles report validation and credibility scoring
 */
class CredibilityService {
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

      if (error) {
        // PGRST116 = no rows returned (expected when user hasn't validated)
        // 406 = Not Acceptable (RLS policy issue, but functionality works)
        if (error.code === 'PGRST116' || error.code === '406') {
          return null; // No validation found
        }
        // Log other errors but don't throw
        console.warn('Unexpected error getting user validation:', error);
        return null;
      }

      return data?.validation_type || null;
    } catch (error) {
      console.warn('Error getting user validation:', error);
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

      if (error) {
        // Handle RLS policy issues gracefully
        if (error.code === '406') {
          console.warn('RLS policy issue getting validation stats, returning zeros');
          return { confirmCount: 0, denyCount: 0, totalValidations: 0 };
        }
        throw error;
      }

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
   * Remove user's validation for a report
   */
  async removeValidation(reportId: number, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('report_validations')
        .delete()
        .eq('report_id', reportId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing validation:', error);
      return false;
    }
  }

  /**
   * Update user verification level
   */
  async updateUserVerificationLevel(userId: string, level: 'basic' | 'verified' | 'trusted'): Promise<boolean> {
    try {
      const updateData: any = {
        verification_level: level
      };

      if (level !== 'basic') {
        updateData.verified_at = new Date().toISOString();
        if (level === 'trusted') {
          updateData.verification_badge_earned_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating user verification level:', error);
      return false;
    }
  }

  /**
   * Calculate credibility score for a report (client-side fallback)
   */
  calculateCredibilityScore(
    report: {
      credibility_score?: number;
      validation_count?: number;
      user_reputation?: number;
      created_at: string;
    },
    validationStats?: { confirmCount: number; denyCount: number; totalValidations: number }
  ): number {
    // If server-calculated score exists, use it
    if (report.credibility_score !== undefined) {
      return report.credibility_score;
    }

    // Fallback client-side calculation
    const baseScore = 0.5;
    const userRepBonus = ((report.user_reputation || 0) / 100) * 0.2;
    const hoursOld = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60);
    const timePenalty = Math.min(hoursOld * 0.01, 0.2);

    let communityBonus = 0;
    if (validationStats && validationStats.totalValidations > 0) {
      communityBonus = ((validationStats.confirmCount / validationStats.totalValidations) - 0.5) * 0.6;
    }

    const finalScore = Math.max(0.1, Math.min(0.9, baseScore + userRepBonus + communityBonus - timePenalty));
    return finalScore;
  }

  /**
   * Get credibility level description
   */
  getCredibilityLevel(score: number): {
    level: 'low' | 'medium' | 'high';
    label: string;
    color: string;
    icon: string;
  } {
    if (score >= 0.8) {
      return {
        level: 'high',
        label: 'Highly Credible',
        color: '#10b981',
        icon: '⭐'
      };
    } else if (score >= 0.6) {
      return {
        level: 'medium',
        label: 'Moderately Credible',
        color: '#f59e0b',
        icon: '⚖️'
      };
    } else {
      return {
        level: 'low',
        label: 'Low Credibility',
        color: '#ef4444',
        icon: '⚠️'
      };
    }
  }

  /**
   * Get verification level info
   */
  getVerificationLevelInfo(level: 'basic' | 'verified' | 'trusted' | undefined): {
    label: string;
    color: string;
    icon: string;
    description: string;
  } {
    switch (level) {
      case 'trusted':
        return {
          label: 'Trusted Reporter',
          color: '#10b981',
          icon: '⭐',
          description: 'High reputation + accurate reporting history'
        };
      case 'verified':
        return {
          label: 'Verified User',
          color: '#3b82f6',
          icon: '✅',
          description: 'Identity verified + activity history'
        };
      default:
        return {
          label: 'Basic User',
          color: '#6b7280',
          icon: '👤',
          description: 'Email/phone verified'
        };
    }
  }

  /**
   * Calculate net upvotes for a user (upvotes - downvotes across all reports)
   */
  async calculateUserNetUpvotes(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('upvotes, downvotes')
        .eq('user_id', userId);

      if (error) throw error;

      // Calculate net upvotes: sum of (upvotes - downvotes) for all reports
      const netUpvotes = data.reduce((total, report) => {
        return total + (report.upvotes || 0) - (report.downvotes || 0);
      }, 0);

      return Math.max(0, netUpvotes); // Ensure non-negative
    } catch (error) {
      console.error('Error calculating user net upvotes:', error);
      return 0;
    }
  }

  /**
   * Get verification level based on net upvotes
   */
  getVerificationLevelFromUpvotes(netUpvotes: number): 'basic' | 'verified' | 'trusted' {
    if (netUpvotes >= 50) {
      return 'trusted';
    } else if (netUpvotes >= 15) {
      return 'verified';
    } else {
      return 'basic';
    }
  }

  /**
   * Check and update user verification level based on current net upvotes
   */
  async checkAndUpdateVerificationLevel(userId: string): Promise<boolean> {
    try {
      // Calculate current net upvotes
      const netUpvotes = await this.calculateUserNetUpvotes(userId);

      // Determine what verification level they should have
      const newLevel = this.getVerificationLevelFromUpvotes(netUpvotes);

      // Get current verification level
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('verification_level')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentLevel = userData.verification_level || 'basic';

      // Only update if the level has changed
      if (currentLevel !== newLevel) {
        console.log(`🔄 Updating user ${userId} verification from ${currentLevel} to ${newLevel} (${netUpvotes} net upvotes)`);

        const success = await this.updateUserVerificationLevel(userId, newLevel);

        if (success) {
          console.log(`✅ User ${userId} verification level updated to ${newLevel}`);
        }

        return success;
      }

      return true; // No change needed
    } catch (error) {
      console.error('Error checking and updating verification level:', error);
      return false;
    }
  }
}

// Export singleton instance
export const credibilityService = new CredibilityService();
export default credibilityService;
