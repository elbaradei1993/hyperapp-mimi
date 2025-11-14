import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, AuthState } from '../types';
import { authService } from '../services/auth';

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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<any>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { session } = await authService.getSession();

        if (session?.user && isMounted) {
          const userProfile = await authService.syncUserWithProfile(session.user);
          setUser(userProfile);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (authUser) => {
      if (!isMounted) return;

      try {
        if (authUser) {
          const userProfile = await authService.syncUserWithProfile(authUser);
          setUser(userProfile);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        // If profile sync fails, sign out to prevent inconsistent state
        await authService.signOut();
        setUser(null);
      }
    });

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);


  const signIn = async (email: string, password: string) => {
    await authService.signIn(email, password);
  };

  const signUp = async (email: string, password: string, username: string) => {
    await authService.signUp(email, password, username);
  };

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await authService.resetPassword(email);
    if (error) {
      throw new Error(error.message);
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error('No user logged in');
    const response = await authService.updateUserProfile(user.id, updates);
    if (response.data) {
      setUser({ ...user, ...response.data });
    }
    return response;
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { session } = await authService.getSession();
    if (session?.user) {
      const userProfile = await authService.syncUserWithProfile(session.user);
      setUser(userProfile);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
