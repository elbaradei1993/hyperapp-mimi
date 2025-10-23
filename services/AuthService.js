/**
 * Authentication Service
 * Handles user authentication, session management, and user data
 */
class AuthService {
  constructor(configService, notificationService) {
    this.configService = configService;
    this.notificationService = notificationService;
    this.supabase = null;
    this.userData = null;
    this.isAuthenticated = false;
    this.tg = window.Telegram?.WebApp;

    this.initializeSupabase();
  }

  /**
   * Initialize Supabase client
   */
  initializeSupabase() {
    try {
      if (window.supabase && this.configService.get('supabaseUrl') && this.configService.get('supabaseKey')) {
        this.supabase = window.supabase.createClient(
          this.configService.get('supabaseUrl'),
          this.configService.get('supabaseKey')
        );
      } else {
        console.warn('Supabase not available or not configured');
      }
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
    }
  }

  /**
   * Check authentication state
   */
  async checkAuthState() {
    // Check if we have a Telegram user first
    if (this.tg && this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) {
      const telegramUser = this.tg.initDataUnsafe.user;
      this.userData = telegramUser;
      this.isAuthenticated = true;
      await this.syncUserWithSupabase();
      return true;
    }

    // Check Supabase authentication as fallback
    if (this.supabase) {
      try {
        const { data: { session }, error } = await this.supabase.auth.getSession();
        if (session && session.user) {
          this.isAuthenticated = true;
          this.userData = {
            id: session.user.id,
            email: session.user.email,
            ...session.user.user_metadata
          };
          await this.syncUserWithSupabase();
          return true;
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      }
    }

    return false;
  }

  /**
   * Sync user data with Supabase
   */
  async syncUserWithSupabase() {
    if (!this.userData || !this.supabase) {
      return false;
    }

    try {
      // Check if user exists in users table
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('user_id', this.userData.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error syncing user:', error);
        return false;
      }

      if (data) {
        // Update user data with Supabase info
        this.userData.reputation = data.reputation || 0;
        this.userData.language = data.language || 'en';
        return true;
      } else {
        // User doesn't exist in users table, create a new record
        const { data: newUser, error: insertError } = await this.supabase
          .from('users')
          .insert([
            {
              user_id: this.userData.id,
              username: this.userData.username || this.userData.first_name || 'User',
              reputation: 0,
              language: 'en'
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user:', insertError);
          return false;
        }

        this.userData.reputation = 0;
        this.userData.language = 'en';
        return true;
      }
    } catch (error) {
      console.error('Error syncing user with Supabase:', error);
      return false;
    }
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    if (!this.supabase) {
      throw new Error('Authentication service not available');
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Account not found. Please sign up first.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and confirm your account.";
        }
        throw new Error(errorMessage);
      }

      this.isAuthenticated = true;
      this.userData = {
        id: data.user.id,
        email: data.user.email,
        ...data.user.user_metadata
      };

      await this.syncUserWithSupabase();
      return { success: true, user: this.userData };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Sign up with email and password
   */
  async signup(username, email, password) {
    if (!this.supabase) {
      throw new Error('Authentication service not available');
    }

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            reputation: 0,
            language: 'en'
          }
        }
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('User already registered')) {
          errorMessage = "Account already exists. Please login instead.";
        }
        throw new Error(errorMessage);
      }

      return { success: true, message: "Signup successful! Please check your email for verification." };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      if (this.supabase) {
        const { error } = await this.supabase.auth.signOut();
        if (error) {
          console.error('Logout error:', error);
          throw error;
        }
      }

      // Reset local state
      this.isAuthenticated = false;
      this.userData = null;

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    if (!this.isAuthenticated || !this.supabase) {
      throw new Error('Not authenticated');
    }

    try {
      const { error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('user_id', this.userData.id);

      if (error) {
        throw error;
      }

      // Update local user data
      Object.assign(this.userData, updates);

      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  /**
   * Calculate user reputation
   */
  async calculateUserReputation(userId) {
    if (!this.supabase) return 0;

    try {
      // Get user's reports and their vote counts
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('upvotes, downvotes')
        .eq('user_id', userId);

      if (error) {
        console.error("Error calculating reputation:", error);
        return 0;
      }

      // Calculate reputation based on net upvotes
      let reputation = 0;
      reports.forEach(report => {
        const netVotes = (report.upvotes || 0) - (report.downvotes || 0);
        reputation += Math.max(0, netVotes); // Only positive contributions count
      });

      // Add base reputation for active users
      reputation += Math.min(10, reports.length); // Up to 10 points for activity

      return Math.max(0, reputation);
    } catch (error) {
      console.error("Error calculating user reputation:", error);
      return 0;
    }
  }

  /**
   * Update user reputation
   */
  async updateUserReputation() {
    if (!this.isAuthenticated) return;

    try {
      const reputation = await this.calculateUserReputation(this.userData.id);

      // Update database
      const { error } = await this.supabase
        .from('users')
        .update({ reputation: reputation })
        .eq('user_id', this.userData.id);

      if (error) {
        console.error("Error updating user reputation:", error);
      }

      // Update local user data
      this.userData.reputation = reputation;

      return reputation;
    } catch (error) {
      console.error("Error updating user reputation:", error);
      return 0;
    }
  }

  /**
   * Get user badges
   */
  async getUserBadges(userId) {
    const badges = [];
    const reputation = await this.calculateUserReputation(userId);

    // Reputation-based badges
    if (reputation >= 100) {
      badges.push({
        name: 'Community Leader',
        description: 'Earned 100+ reputation points',
        icon: 'fas fa-crown',
        color: 'linear-gradient(135deg, #FFD700, #FFA500)'
      });
    } else if (reputation >= 50) {
      badges.push({
        name: 'Trusted Reporter',
        description: 'Earned 50+ reputation points',
        icon: 'fas fa-shield-alt',
        color: 'linear-gradient(135deg, #4CAF50, #45A049)'
      });
    } else if (reputation >= 10) {
      badges.push({
        name: 'Active Contributor',
        description: 'Earned 10+ reputation points',
        icon: 'fas fa-star',
        color: 'linear-gradient(135deg, #2196F3, #1976D2)'
      });
    }

    // Activity-based badges
    try {
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('id')
        .eq('user_id', userId);

      if (!error && reports) {
        const reportCount = reports.length;

        if (reportCount >= 50) {
          badges.push({
            name: 'Safety Guardian',
            description: 'Submitted 50+ safety reports',
            icon: 'fas fa-user-shield',
            color: 'linear-gradient(135deg, #9C27B0, #7B1FA2)'
          });
        } else if (reportCount >= 20) {
          badges.push({
            name: 'Community Watch',
            description: 'Submitted 20+ safety reports',
            icon: 'fas fa-eye',
            color: 'linear-gradient(135deg, #FF5722, #D84315)'
          });
        } else if (reportCount >= 5) {
          badges.push({
            name: 'First Responder',
            description: 'Submitted 5+ safety reports',
            icon: 'fas fa-plus-circle',
            color: 'linear-gradient(135deg, #009688, #00796B)'
          });
        }
      }
    } catch (error) {
      console.error("Error checking user badges:", error);
    }

    return badges;
  }

  /**
   * Check for newly unlocked badges
   */
  async checkBadgeUnlocks() {
    if (!this.isAuthenticated) return;

    try {
      const currentBadges = await this.getUserBadges(this.userData.id);
      const badgeNames = currentBadges.map(badge => badge.name);

      // Check if user unlocked new badges
      const savedBadges = JSON.parse(localStorage.getItem('hyperapp-badges') || '[]');
      const newBadges = badgeNames.filter(name => !savedBadges.includes(name));

      if (newBadges.length > 0) {
        // Show badge notifications
        newBadges.forEach(badgeName => {
          const badge = currentBadges.find(b => b.name === badgeName);
          if (badge) {
            this.notificationService.showBadgeNotification(badge);
          }
        });

        // Save updated badges
        localStorage.setItem('hyperapp-badges', JSON.stringify(badgeNames));
      }
    } catch (error) {
      console.error("Error checking badge unlocks:", error);
    }
  }

  /**
   * Get current user data
   */
  getCurrentUser() {
    return this.userData;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Get Supabase client instance
   */
  getSupabaseClient() {
    return this.supabase;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthService;
}
