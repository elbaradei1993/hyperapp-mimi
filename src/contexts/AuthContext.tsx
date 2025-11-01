import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, AuthState } from '../types';
import { authService } from '../services/auth';
import { authLogger } from '../lib/authLogger';

// Proper TypeScript interfaces for auth responses
interface AuthResponse {
  data?: {
    user?: any;
    session?: any;
  };
  error?: {
    message: string;
    status?: number;
    name?: string;
  };
}

interface SessionResponse {
  data: {
    session?: {
      user: any;
    };
  };
  error?: {
    message: string;
    status?: number;
    name?: string;
  };
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string, username: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<any>;
  refreshProfile: () => Promise<void>;
  checkOnboardingStatus: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    onboardingCompleted: false,
    emailUnconfirmed: false // Initialize new state
  });

  // Debug single mounting
  useEffect(() => {
    console.log('🔄 AuthProvider mounted');
    return () => {
      console.log('🔄 AuthProvider unmounted');
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let subscription: any = null;
    let abortController: AbortController | null = null;

    const checkAuthState = async () => {
      if (!isMounted) return;

      abortController = new AbortController();

      try {
        console.log('🔍 AuthContext.checkAuthState: Checking initial authentication state', {
          timestamp: new Date().toISOString()
        });

        // Add timeout to session check
        const sessionPromise = authService.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 5000);
        });

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as unknown as SessionResponse;

        if (!isMounted) return;

        if (error) {
          console.log('⚠️ AuthContext.checkAuthState: Session error detected', {
            error: {
              message: error.message,
              status: error.status,
              name: error.name
            },
            timestamp: new Date().toISOString()
          });

          // Handle token refresh errors by clearing invalid tokens
          if (error.message?.includes('Invalid Refresh Token') ||
              error.message?.includes('Refresh Token Not Found') ||
              error.status === 400) {
            console.warn('🧹 AuthContext.checkAuthState: Clearing invalid tokens from previous session', {
              reason: 'Invalid refresh token detected',
              timestamp: new Date().toISOString()
            });

            // Clear any stale tokens before signing out
            localStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('supabase.auth.refreshToken');
            localStorage.removeItem('supabase.auth.expires_at');

            await authService.signOut(); // This will clear local storage
            if (isMounted) {
              setAuthState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                onboardingCompleted: false
              });
            }
            return;
          }
          throw error;
        }

        if (session?.user) {
          console.log('✅ AuthContext.checkAuthState: Valid session found, syncing profile', {
            userId: session.user.id,
            email: session.user.email,
            timestamp: new Date().toISOString()
          });

          try {
            const userProfile = await authService.syncUserWithProfile(session.user);

            if (!isMounted) return;

            if (userProfile) {
              console.log('✅ AuthContext.checkAuthState: Profile sync successful', {
                userId: userProfile.id,
                onboardingCompleted: userProfile.onboarding_completed,
                timestamp: new Date().toISOString()
              });

              setAuthState({
                user: userProfile,
                isAuthenticated: true,
                isLoading: false,
                onboardingCompleted: userProfile.onboarding_completed || false,
                emailUnconfirmed: false
              });
            } else {
              throw new Error('Profile sync returned null');
            }
          } catch (syncError: any) {
            if (!isMounted) return;

            console.warn('⚠️ AuthContext.checkAuthState: Profile sync failed, using basic auth user', {
              userId: session.user.id,
              error: syncError.message,
              timestamp: new Date().toISOString()
            });

            // Ensure basicUser matches User type completely
            const basicUser: User = {
              id: session.user.id,
              email: session.user.email!,
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
              reputation: 0,
              language: 'en',
              onboarding_completed: false,
              onboarding_step: 0
            };

            setAuthState({
              user: basicUser,
              isAuthenticated: true,
              isLoading: false,
              onboardingCompleted: false,
              emailUnconfirmed: !session.user.email_confirmed_at // Set based on email confirmation status
            });
          }
        } else {
          console.log('ℹ️ AuthContext.checkAuthState: No valid session found, showing login modal', {
            timestamp: new Date().toISOString()
          });

          if (isMounted) {
            setAuthState(prev => ({ ...prev, isLoading: false, emailUnconfirmed: false }));
          }
        }
      } catch (error: any) {
        if (!isMounted) return;

        console.error('🚨 AuthContext.checkAuthState: Unexpected error during auth state check', {
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
            status: error.status
          },
          timestamp: new Date().toISOString()
        });

        // Clear any potentially corrupted auth state
        console.warn('🧹 AuthContext.checkAuthState: Clearing auth state due to unexpected error', {
          timestamp: new Date().toISOString()
        });

        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refreshToken');
        localStorage.removeItem('supabase.auth.expires_at');

        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          onboardingCompleted: false
        });
      } finally {
        if (abortController) {
          abortController.abort();
        }
      }
    };

    const initializeAuth = async () => {
      if (!isMounted) return;

      console.log('🔄 AuthContext: Starting authentication initialization', {
        timestamp: new Date().toISOString()
      });

      // Start auth state check without timeout first
      const checkPromise = checkAuthState();

      // Add timeout as a safety net
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          if (isMounted) {
            console.warn('⏰ AuthContext: Initialization taking longer than expected, ensuring loading state is reset', {
              timestamp: new Date().toISOString()
            });
            // Force loading state reset if not already done
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
          resolve();
        }, 8000); // 8 second timeout
      });

      try {
        // Wait for auth check to complete
        await checkPromise;
        console.log('✅ AuthContext: Auth check completed successfully', {
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        console.error('🚨 AuthContext: Auth check failed, but continuing with login modal', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        // Ensure loading state is reset even on error
        if (isMounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }

      // Wait for timeout safety net (but don't block on it)
      await timeoutPromise;

      if (!isMounted) return;

      // Listen for auth changes
      const { data: { subscription: authSubscription } } = authService.onAuthStateChange(async (authUser) => {
        if (!isMounted) return;

        console.log('🔄 AuthContext: Auth state change detected', {
          hasUser: !!authUser,
          userId: authUser?.id,
          email: authUser?.email,
          timestamp: new Date().toISOString()
        });

        try {
          if (authUser) {
            console.log('🔄 AuthContext: User signed in, starting profile sync', {
              userId: authUser.id,
              email: authUser.email,
              timestamp: new Date().toISOString()
            });

            // User is signed in, sync with profile
            const userProfile = await authService.syncUserWithProfile(authUser);

            if (!isMounted) return;

            if (userProfile) {
              console.log('✅ AuthContext: Profile sync successful, updating state', {
                userId: userProfile.id,
                email: userProfile.email,
                onboardingCompleted: userProfile.onboarding_completed,
                timestamp: new Date().toISOString()
              });

              setAuthState({
                user: userProfile,
                isAuthenticated: true,
                isLoading: false,
                onboardingCompleted: userProfile.onboarding_completed || false,
                emailUnconfirmed: false
              });
            } else {
              // Profile sync failed - create basic user object and continue
              console.warn('⚠️ AuthContext: Profile sync failed, using basic auth user', {
                userId: authUser.id,
                email: authUser.email,
                timestamp: new Date().toISOString()
              });

              // Ensure basicUser matches User type completely
              const basicUser: User = {
                id: authUser.id,
                email: authUser.email!,
                username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
                reputation: 0,
                language: 'en',
                onboarding_completed: false,
                onboarding_step: 0
              };

              setAuthState({
                user: basicUser,
                isAuthenticated: true,
                isLoading: false,
                onboardingCompleted: false,
                emailUnconfirmed: !authUser.email_confirmed_at // Set based on email confirmation status
              });
            }
          } else {
            console.log('🔄 AuthContext: User signed out, clearing state', {
              timestamp: new Date().toISOString()
            });

            // User is signed out
            setAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              onboardingCompleted: false,
              emailUnconfirmed: false
            });
          }
        } catch (error: any) {
          console.error('🚨 AuthContext: Error in auth state change listener', {
            error: {
              message: error?.message,
              name: error?.name,
              stack: error?.stack
            },
            hasUser: !!authUser,
            userId: authUser?.id,
            timestamp: new Date().toISOString()
          });

          // If we have an authenticated user but profile sync failed,
          // still set authenticated state to prevent infinite loading
          if (authUser) {
            console.warn('⚠️ AuthContext: Profile sync failed but user is authenticated, setting basic state', {
              userId: authUser.id,
              email: authUser.email,
              timestamp: new Date().toISOString()
            });

            // Ensure basicUser matches User type completely
            const basicUser: User = {
              id: authUser.id,
              email: authUser.email!,
              username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
              reputation: 0,
              language: 'en',
              onboarding_completed: false,
              onboarding_step: 0
            };

            setAuthState({
              user: basicUser,
              isAuthenticated: true,
              isLoading: false,
              onboardingCompleted: false,
              emailUnconfirmed: !authUser.email_confirmed_at // Set based on email confirmation status
            });
          } else {
            // Ensure loading state is reset even on error
            setAuthState(prev => ({ ...prev, isLoading: false, emailUnconfirmed: false }));
          }
        }
      });

      subscription = authSubscription;
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);



  const signIn = async (email: string, password: string) => {
    authLogger.logAuthAttempt('AuthContext.signIn: Starting sign-in process', {
      email: email.toLowerCase().trim(),
      hasPassword: !!password
    });

    // Create a timeout promise that doesn't interfere with error logging
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        authLogger.logTimeout('AuthContext.signIn: Authentication timeout reached', 30000, {
          email: email.toLowerCase().trim()
        });
        reject(new Error('Authentication timeout'));
      }, 30000);
    });

    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const authPromise = authService.signIn(email, password);

      // Use Promise.race but clear timeout when auth completes
      const response = await Promise.race([authPromise, timeoutPromise]) as AuthResponse;

      // Clear the timeout since we got a response
      if (timeoutId) clearTimeout(timeoutId);

      if (response.error) {
        authLogger.logAuthError('AuthContext.signIn: Authentication failed at context level', {
          message: response.error.message,
          status: response.error.status,
          name: response.error.name,
          details: response.error
        }, {
          email: email.toLowerCase().trim()
        });
      } else {
        authLogger.logAuthSuccess('AuthContext.signIn: Authentication response received', {
          hasUser: !!(response.data?.user),
          userId: response.data?.user?.id,
          email: response.data?.user?.email
        });
      }

      // Note: Loading state will be reset by the auth state change listener
      // If that fails, we have a fallback in checkAuthState
      return response;
    } catch (error: any) {
      // Ensure timeout is always cleared
      if (timeoutId) clearTimeout(timeoutId);

      authLogger.logNetworkError('AuthContext.signIn: Unexpected error in sign-in process', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        status: error.status
      }, {
        email: email.toLowerCase().trim()
      });
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username: string): Promise<AuthResponse> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Registration timeout')), 30000); // 30 second timeout
      });

      const authPromise = authService.signUp(email, password, username);
      const response = await Promise.race([authPromise, timeoutPromise]) as AuthResponse;

      return response;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        onboardingCompleted: false
      });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!authState.user) throw new Error('No user logged in');

    try {
      const response = await authService.updateUserProfile(authState.user.id, updates);

      if (response.data) {
        setAuthState(prev => ({
          ...prev,
          user: { ...prev.user!, ...response.data },
          onboardingCompleted: response.data.onboarding_completed || prev.onboardingCompleted
        }));
      }

      return response;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (!authState.user) return;

    try {
      const { data: { session } } = await authService.getSession();
      if (session?.user) {
        const userProfile = await authService.syncUserWithProfile(session.user);
        if (userProfile) {
          setAuthState(prev => ({
            ...prev,
            user: userProfile,
            onboardingCompleted: userProfile.onboarding_completed || false
          }));
        }
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const checkOnboardingStatus = (): boolean => {
    return authState.onboardingCompleted;
  };

  const value: AuthContextType = {
    ...authState,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
    checkOnboardingStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During hot reloading or initial mount, context might be temporarily undefined
    // Return a safe default that won't crash the app
    console.warn('useAuth called outside AuthProvider or during initialization, returning safe defaults');
    return {
      user: null,
      isAuthenticated: false,
      isLoading: true,
      onboardingCompleted: false,
      signIn: async () => { throw new Error('AuthProvider not initialized'); },
      signUp: async () => { throw new Error('AuthProvider not initialized'); },
      signOut: async () => { throw new Error('AuthProvider not initialized'); },
      updateProfile: async () => { throw new Error('AuthProvider not initialized'); },
      refreshProfile: async () => { throw new Error('AuthProvider not initialized'); },
      checkOnboardingStatus: () => false
    };
  }
  return context;
};

export default AuthContext;
