// Auth Manager - Handles authentication and user management
class AuthManager {
  constructor(app) {
    this.app = app;
  }

  async checkAuthState() {
    // Check if we have a Telegram user first
    if (this.app.tg && this.app.tg.initDataUnsafe && this.app.tg.initDataUnsafe.user) {
      const telegramUser = this.app.tg.initDataUnsafe.user;
      this.app.userData = telegramUser;
      this.app.isAuthenticated = true;
      await this.syncUserWithSupabase();
      this.app.uiManager.updateUserInfo();
      await this.loadUserMoodVote(); // Load existing mood vote
      return;
    }

    // Check Supabase authentication as fallback
    const { data: { session }, error } = await this.app.supabase.auth.getSession();
    if (session && session.user) {
      this.app.isAuthenticated = true;
      this.app.userData = {
        id: session.user.id,
        email: session.user.email,
        ...session.user.user_metadata
      };
      await this.syncUserWithSupabase();
      this.app.uiManager.updateUserInfo();
      await this.loadUserMoodVote(); // Load existing mood vote
    } else {
      // Show auth modal if no authentication found
      this.showAuthModal();
    }
  }

  showAuthModal() {
    document.getElementById('authModal').style.display = 'block';
  }

  hideAuthModal() {
    document.getElementById('authModal').style.display = 'none';
  }

  async setupAuthListeners() {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.getAttribute('data-tab');
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        e.target.classList.add('active');
        document.getElementById(tabName + 'Form').classList.remove('hidden');
      });
    });

    // Close auth modal
    document.getElementById('closeAuth').addEventListener('click', () => {
      this.hideAuthModal();
    });

    // Login button
    document.getElementById('loginBtn').addEventListener('click', this.handleAuthLogin.bind(this));

    // Signup button
    document.getElementById('signupBtn').addEventListener('click', this.handleAuthSignup.bind(this));
  }

  async handleAuthLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      this.app.uiManager.showNotification("Please fill all fields", "error");
      return;
    }

    // Show loading state
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;

    try {
      const { data, error } = await this.app.supabase.auth.signInWithPassword({
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
        this.app.uiManager.showNotification(errorMessage, "error");
      } else {
        this.app.isAuthenticated = true;
        this.app.userData = {
          id: data.user.id,
          email: data.user.email,
          ...data.user.user_metadata
        };
        await this.syncUserWithSupabase();
        this.app.uiManager.updateUserInfo();
        this.hideAuthModal();
        this.app.dataManager.loadInitialData();
        this.app.uiManager.showNotification("Login successful", "success");
      }
    } catch (error) {
      this.app.uiManager.showNotification("Login failed. Please try again.", "error");
      console.error("Login error:", error);
    } finally {
      // Reset button state
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
  }

  async handleAuthSignup() {
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

    if (!username || !email || !password || !passwordConfirm) {
      this.app.uiManager.showNotification("Please fill all fields", "error");
      return;
    }

    if (password !== passwordConfirm) {
      this.app.uiManager.showNotification("Passwords don't match", "error");
      return;
    }

    if (password.length < 6) {
      this.app.uiManager.showNotification("Password must be at least 6 characters", "error");
      return;
    }

    // Show loading state
    const signupBtn = document.getElementById('signupBtn');
    const originalText = signupBtn.textContent;
    signupBtn.textContent = 'Signing up...';
    signupBtn.disabled = true;

    try {
      const { data, error } = await this.app.supabase.auth.signUp({
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
        this.app.uiManager.showNotification(errorMessage, "error");
      } else {
        this.app.uiManager.showNotification("Signup successful! Please check your email for verification.", "success");
        // Switch to login tab
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        document.querySelector('[data-tab="login"]').classList.add('active');
        document.getElementById('loginForm').classList.remove('hidden');
      }
    } catch (error) {
      this.app.uiManager.showNotification("Signup failed. Please try again.", "error");
      console.error("Signup error:", error);
    } finally {
      // Reset button state
      signupBtn.textContent = originalText;
      signupBtn.disabled = false;
    }
  }

  async handleLogout() {
    try {
      const { error } = await this.app.supabase.auth.signOut();

      if (error) {
        this.app.uiManager.showNotification("Logout failed", "error");
        console.error("Logout error:", error);
      } else {
        // Reset app state
        this.app.isAuthenticated = false;
        this.app.userData = null;
        this.app.nearbyReports = [];
        this.app.userReports = [];

        // Update UI
        this.app.uiManager.updateUserInfo();
        this.showAuthModal();
        this.app.dataManager.loadInitialData();

        this.app.uiManager.showNotification("Logged out successfully", "success");
      }
    } catch (error) {
      this.app.uiManager.showNotification("Logout failed", "error");
      console.error("Logout error:", error);
    }
  }

  async syncUserWithSupabase() {
    if (!this.app.userData) {
      return false;
    }

    try {
      // Check if user exists in users table
      const { data, error } = await this.app.supabase
        .from('users')
        .select('*')
        .eq('user_id', this.app.userData.id)
        .maybeSingle();

      if (error) {
        return false;
      } else if (data) {
        // Update user data with Supabase info
        this.app.userData.reputation = data.reputation || 0;
        this.app.userData.language = data.language || 'en';
        this.app.currentLanguage = data.language || 'en';
        this.app.uiManager.applyLanguage(this.app.currentLanguage);

        // Update language selector
        document.getElementById('languageSelect').value = this.app.currentLanguage;
        document.getElementById('currentLanguage').textContent = this.app.currentLanguage === 'en' ? 'EN' : 'AR';

        return true;
      } else {
        // User doesn't exist in users table, create a new record
        const { data: newUser, error: insertError } = await this.app.supabase
          .from('users')
          .insert([
            {
              user_id: this.app.userData.id,
              username: this.app.userData.username || this.app.userData.first_name || 'User',
              reputation: 0,
              language: 'en'
            }
          ])
          .select()
          .single();

        if (insertError) {
          return false;
        }

        this.app.userData.reputation = 0;
        this.app.userData.language = 'en';
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  // Load user mood vote on app initialization
  async loadUserMoodVote() {
    if (!this.app.isAuthenticated) return;

    try {
      const { data, error } = await this.app.supabase
        .from('mood_votes')
        .select('mood_type')
        .eq('user_id', this.app.userData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading user mood vote:", error);
        return;
      }

      if (data) {
        // Mark the mood card as selected
        const moodCard = document.querySelector(`.mood-vote-card[data-mood="${data.mood_type}"]`);
        if (moodCard) {
          moodCard.classList.add('selected');
        }
      }
    } catch (error) {
      console.error("Error loading user mood vote:", error);
    }
  }
}

// Make AuthManager globally available
window.AuthManager = AuthManager;
