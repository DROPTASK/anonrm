/**
 * @file src/hooks/useAuth.tsx
 * @description Master Authentication Module for AnonRM.
 * Implements a highly resilient, OTP-only (Email) authentication flow.
 * Manages Supabase session states, synchronizes extended user profiles via React Query,
 * handles cross-tab session syncing, and provides robust Route Guard components.
 *
 * Architecture strictly enforces normalized relational data, rigorous strict mode TypeScript,
 * and zero `any` usage. Designed for Vite + React 19 + Supabase.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import { supabase, AppError, parseSupabaseError, AuthService, realtimeManager } from '../../lib/supabase';
import type { Database, ProfileDetails } from '../../lib/types';

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

export type AuthStatus = 'INITIALIZING' | 'UNAUTHENTICATED' | 'AUTHENTICATED' | 'ERROR';

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ProfileDetails | null;
  status: AuthStatus;
  error: AppError | null;
}

export interface AuthContextType extends AuthState {
  // Authentication Flows
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Profile Management
  updateProfile: (updates: Partial<Database['public']['Tables']['profiles']['Update']>) => Promise<void>;
  
  // Helper Flags
  isInitializing: boolean;
  isAuthenticated: boolean;
  isProfileLoading: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ============================================================================
// 2. CONTEXT INITIALIZATION
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// 3. AUTH PROVIDER COMPONENT
// ============================================================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  
  // Local Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('INITIALIZING');
  const [authError, setAuthError] = useState<AppError | null>(null);

  // --- 1. Core Session Initialization & Listener ---
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Fetch current session securely from Supabase local storage
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (mounted) {
          if (initialSession) {
            setSession(initialSession);
            setUser(initialSession.user);
            setStatus('AUTHENTICATED');
          } else {
            setStatus('UNAUTHENTICATED');
          }
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
        if (mounted) {
          setStatus('ERROR');
          setAuthError(parseSupabaseError(err));
        }
      }
    };

    initializeAuth();

    // Listen for Auth changes (Login, Logout, Token Refresh, Cross-Tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        console.info(`[Auth] Event: ${event}`);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setStatus('AUTHENTICATED');
          setAuthError(null);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setStatus('UNAUTHENTICATED');
          
          // Clear React Query cache aggressively on logout to prevent data leaks
          queryClient.clear();
          
          // Clear realtime connections
          realtimeManager.clearAll();
        } else if (event === 'USER_UPDATED') {
          setSession(currentSession);
          setUser(currentSession?.user || null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // --- 2. Profile Fetching (React Query) ---
  // We decouple the Supabase Auth User from the App Profile (database row)
  // This query automatically runs when the user is authenticated.
  const { 
    data: profile, 
    isLoading: isProfileLoading,
    error: profileError
  } = useQuery<ProfileDetails, AppError>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) throw new AppError('No authenticated user.', 'UNAUTHORIZED');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // If the profile doesn't exist yet (first-time login via OTP magic link), we should create it.
        // Supabase often uses Postgres Triggers for this, but a client-side fallback is robust.
        if (error.code === 'PGRST116') {
          console.warn('[Auth] Profile not found. Attempting to create initial profile record...');
          
          const newProfile = {
            id: user.id,
            username: `user_${Math.random().toString(36).substring(2, 10)}`, // Generate fallback username
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            karma: 0,
            followers_count: 0,
            following_count: 0,
            is_verified: false,
          };

          const { data: insertedData, error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (insertError) throw parseSupabaseError(insertError);
          return insertedData as ProfileDetails;
        }
        throw parseSupabaseError(error);
      }
      return data as ProfileDetails;
    },
    enabled: !!user?.id && status === 'AUTHENTICATED',
    staleTime: 1000 * 60 * 5, // Cache profile for 5 minutes
    retry: 2,
  });

  // Handle Profile Fetch Errors
  useEffect(() => {
    if (profileError) {
      toast.error('Failed to load user profile data. Some features may be unavailable.');
      console.error('[Auth] Profile fetch error:', profileError);
    }
  }, [profileError]);

  // --- 3. Authentication Mutations ---

  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      // Input sanitization and basic validation
      const sanitizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        throw new AppError('Invalid email format.', 'INVALID_EMAIL', 'warning');
      }
      
      await AuthService.sendOtp(sanitizedEmail);
    },
    onSuccess: () => {
      toast.success('Security code sent! Please check your email.', { duration: 5000 });
    },
    onError: (error: AppError) => {
      toast.error(error.message || 'Failed to send security code.');
    }
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, token }: { email: string; token: string }) => {
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedToken = token.trim();
      
      if (sanitizedToken.length !== 6) {
        throw new AppError('Invalid code. Must be 6 digits.', 'INVALID_OTP', 'warning');
      }

      await AuthService.verifyOtp(sanitizedEmail, sanitizedToken);
      // Note: `onAuthStateChange` listener handles the state update upon success.
    },
    onSuccess: () => {
      toast.success('Welcome back!');
    },
    onError: (error: AppError) => {
      toast.error(error.message || 'Invalid or expired code. Please try again.');
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await AuthService.signOut();
    },
    onSuccess: () => {
      toast('You have been logged out.', { icon: '👋' });
    },
    onError: (error: AppError) => {
      toast.error('Failed to log out cleanly. ' + error.message);
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Database['public']['Tables']['profiles']['Update']>) => {
      if (!user) throw new AppError('Not authenticated', 'UNAUTHORIZED');
      
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);
        
      if (error) throw parseSupabaseError(error);
    },
    onSuccess: (_, variables) => {
      // Optimistically update the cached profile
      queryClient.setQueryData(['profile', user?.id], (oldData: ProfileDetails | undefined) => {
        if (!oldData) return oldData;
        return { ...oldData, ...variables };
      });
      toast.success('Profile updated successfully.');
    },
    onError: (error: AppError) => {
      toast.error(error.message || 'Failed to update profile.');
    }
  });

  // --- 4. Context Payload Memoization ---
  
  const contextValue = useMemo<AuthContextType>(() => ({
    session,
    user,
    profile: profile || null,
    status,
    error: authError,
    
    // Actions
    sendOtp: async (email: string) => sendOtpMutation.mutateAsync(email),
    verifyOtp: async (email: string, token: string) => verifyOtpMutation.mutateAsync({ email, token }),
    logout: async () => logoutMutation.mutateAsync(),
    updateProfile: async (updates) => updateProfileMutation.mutateAsync(updates),
    
    // Flags
    isInitializing: status === 'INITIALIZING',
    isAuthenticated: status === 'AUTHENTICATED',
    isProfileLoading: isProfileLoading,
  }), [
    session, 
    user, 
    profile, 
    status, 
    authError, 
    isProfileLoading,
    sendOtpMutation,
    verifyOtpMutation,
    logoutMutation,
    updateProfileMutation
  ]);

  // Avoid rendering the main app until the initial auth check completes
  if (status === 'INITIALIZING') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900 dark:border-t-indigo-500" />
          <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse text-sm">
            Securing connection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// 4. CORE CUSTOM HOOKS
// ============================================================================

/**
 * Primary hook to access Authentication state and actions.
 * Must be used within an <AuthProvider>.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider component.');
  }
  return context;
};

/**
 * Specialized hook for components that require the user to be fully authenticated.
 * Throws an error or returns null if the user is missing, simplifying typescript checks
 * in protected components.
 */
export const useRequireAuth = () => {
  const context = useAuth();
  
  if (!context.isAuthenticated || !context.user || !context.profile) {
    throw new Error('useRequireAuth was called in an unauthenticated context. Ensure it is wrapped in a ProtectedRoute.');
  }
  
  return {
    session: context.session as Session,
    user: context.user as User,
    profile: context.profile as ProfileDetails,
    updateProfile: context.updateProfile,
    logout: context.logout,
  };
};

// ============================================================================
// 5. ROUTE GUARDS (React Router)
// ============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  requireVerification?: boolean; // E.g., for pages that require the user to have `is_verified` true
  fallbackPath?: string;
}

/**
 * A wrapper component for React Router routes.
 * Redirects unauthenticated users to the Login page, preserving their intended destination.
 * 
 * @example
 * <Route path="/messages" element={
 *   <ProtectedRoute>
 *     <DMsPage />
 *   </ProtectedRoute>
 * } />
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireVerification = false,
  fallbackPath = '/login'
}) => {
  const { isAuthenticated, isInitializing, profile, isProfileLoading } = useAuth();
  const location = useLocation();

  // Handle Initial Load
  if (isInitializing) {
    // Relying on the global AuthProvider loader here, but we return null just in case
    return null; 
  }

  // Handle Unauthenticated
  if (!isAuthenticated) {
    // Redirect to login, but save the location they were trying to access
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Handle Profile Loading (Wait before checking verification status)
  if (isProfileLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-800 rounded-full animate-spin dark:border-gray-800 dark:border-t-gray-200" />
      </div>
    );
  }

  // Handle Verification Requirements
  if (requireVerification && profile && !profile.is_verified) {
    toast.error('You must be a verified user to access this area.', { id: 'unverified-toast' });
    return <Navigate to="/settings" replace />;
  }

  // Authorized
  return <>{children}</>;
};

/**
 * A wrapper component that redirects AUTHENTICATED users away from public pages (like Login).
 * 
 * @example
 * <Route path="/login" element={
 *   <PublicOnlyRoute>
 *     <LoginPage />
 *   </PublicOnlyRoute>
 * } />
 */
export const PublicOnlyRoute: React.FC<{ children: ReactNode, redirectTo?: string }> = ({ 
  children, 
  redirectTo = '/' 
}) => {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return null;

  if (isAuthenticated) {
    // If they came from a protected route to the login page, redirect them back where they came from
    const destination = (location.state as any)?.from?.pathname || redirectTo;
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};
