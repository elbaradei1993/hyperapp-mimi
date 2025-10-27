import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, AuthState } from '../types';
import { authService } from '../services/auth';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, username: string) => Promise<any>;
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
    onboardingCompleted: false
  });

  useEffect(() => {
    // Check initial auth state
    checkAuthState();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (authUser) => {
      if (authUser) {
        // User is signed in, sync with profile
        const userProfile = await authService.syncUserWithProfile(authUser);
        if (userProfile) {
          setAuthState({
            user: userProfile,
            isAuthenticated: true,
            isLoading: false,
            onboardingCompleted: userProfile.onboarding_completed || false
          });
        }
      } else {
        // User is signed out
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          onboardingCompleted: false
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuthState = async () => {
    try {
      const { data: { session } } = await authService.getSession();

      if (session?.user) {
        const userProfile = await authService.syncUserWithProfile(session.user);
        if (userProfile) {
          setAuthState({
            user: userProfile,
            isAuthenticated: true,
            isLoading: false,
            onboardingCompleted: userProfile.onboarding_completed || false
          });
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const response = await authService.signIn(email, password);
      return response;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const response = await authService.signUp(email, password, username);
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
