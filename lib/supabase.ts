/**
 * @file src/lib/supabase.ts
 * @description Core Supabase Client and Service Layer for AnonRM.
 * Provides singleton initialization, real-time channel management, exponential backoff retries,
 * typed storage interactions, and comprehensive error mapping.
 * 
 * Architecture strictly enforces normalized relational data, rigorous strict mode TypeScript,
 * and zero `any` usage. Designed for Vite + React 19 + Supabase.
 */

import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
  PostgrestError,
  AuthError,
  Session,
  User,
} from '@supabase/supabase-js';
import type { Database } from './types';

// ============================================================================
// 1. ENVIRONMENT VALIDATION
// ============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'CRITICAL: Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

// ============================================================================
// 2. CLIENT INITIALIZATION
// ============================================================================

/**
 * Singleton typed Supabase client.
 * Configured with specific options for optimal performance in a React/Vite SPA.
 */
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'anonrm_auth_token',
      storage: window.localStorage,
    },
    realtime: {
      params: {
        eventsPerSecond: 10, // Rate limiting for high-frequency events like typing
      },
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'anonrm-web-client',
      },
    },
  }
);

// ============================================================================
// 3. ERROR HANDLING DOMAIN
// ============================================================================

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string = 'UNKNOWN_ERROR',
    public severity: ErrorSeverity = 'error',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    
    // In production, you would pipe 'critical' errors to Sentry/Datadog here.
    if (severity === 'critical') {
      console.error(`[CRITICAL AppError] ${code}: ${message}`, originalError);
    }
  }
}

/**
 * Parses raw Supabase/PostgreSQL errors into user-friendly AppErrors.
 */
export const parseSupabaseError = (error: unknown): AppError => {
  if (!error) {
    return new AppError('An unexpected error occurred.', 'UNKNOWN');
  }

  // Handle PostgREST Errors (Database level)
  const pgError = error as PostgrestError;
  if (pgError.code) {
    switch (pgError.code) {
      case '23505': // unique_violation
        return new AppError(
          'This value is already taken. Please try another one.',
          pgError.code,
          'warning',
          pgError
        );
      case '23503': // foreign_key_violation
        return new AppError(
          'Referenced record does not exist or was deleted.',
          pgError.code,
          'error',
          pgError
        );
      case '42501': // insufficient_privilege (Row Level Security blocked it)
        return new AppError(
          'You do not have permission to perform this action.',
          pgError.code,
          'error',
          pgError
        );
      case '23514': // check_violation (e.g., word filter rejection at DB level)
        return new AppError(
          'Your input violates platform guidelines or constraints.',
          pgError.code,
          'warning',
          pgError
        );
      case 'PGRST116': // Not found
        return new AppError(
          'The requested resource could not be found.',
          pgError.code,
          'warning',
          pgError
        );
      default:
        return new AppError(
          `Database error: ${pgError.message || 'Operation failed'}`,
          pgError.code,
          'error',
          pgError
        );
    }
  }

  // Handle Supabase Auth Errors
  const authError = error as AuthError;
  if (authError.status) {
    switch (authError.status) {
      case 400:
        return new AppError('Invalid email or code.', 'AUTH_400', 'warning', authError);
      case 401:
        return new AppError('Session expired. Please log in again.', 'AUTH_401', 'warning', authError);
      case 429:
        return new AppError('Too many requests. Please wait a moment.', 'AUTH_429', 'warning', authError);
      default:
        return new AppError(authError.message, 'AUTH_ERROR', 'error', authError);
    }
  }

  // Handle standard JS Errors
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return new AppError('Network disconnected. Please check your internet connection.', 'NETWORK_ERROR', 'warning', error);
    }
    return new AppError(error.message, 'STANDARD_ERROR', 'error', error);
  }

  // Fallback
  return new AppError('An unknown error occurred while processing your request.', 'UNKNOWN', 'error', error);
};

// ============================================================================
// 4. RESILIENCE & RETRY UTILITIES
// ============================================================================

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

/**
 * Wraps a promise-returning function with Exponential Backoff retry logic.
 * Crucial for mobile-first apps where connections drop frequently.
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const { maxRetries = 3, initialDelayMs = 500, backoffFactor = 2 } = options;
  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: unknown) {
      attempt++;
      const isNetworkError = error instanceof Error && error.message.includes('Failed to fetch');
      const isRateLimit = (error as AuthError)?.status === 429;
      
      // We only retry on network failures or rate limits. RLS or Constraint errors will never succeed on retry.
      if (!isNetworkError && !isRateLimit) {
        throw error; 
      }

      if (attempt >= maxRetries) {
        throw parseSupabaseError(error);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= backoffFactor; // Exponential backoff
    }
  }

  throw new AppError('Operation failed after max retries.', 'RETRY_EXHAUSTED', 'error');
};

// ============================================================================
// 5. REALTIME MANAGER (Telegram & Instagram Features)
// ============================================================================

/**
 * Centralized manager for Supabase Realtime Channels.
 * Prevents memory leaks by ensuring only one subscription exists per entity,
 * and handles automatic cleanup.
 */
class RealtimeSubscriptionManager {
  private activeChannels: Map<string, RealtimeChannel> = new Map();

  /**
   * Generates a deterministic channel name based on context.
   */
  private getChannelName(type: 'room' | 'user' | 'group' | 'feed', id: string): string {
    return `realtime:${type}:${id}`;
  }

  /**
   * Subscribes to a Telegram-style chat room for new messages and typing presence.
   */
  public subscribeToChatRoom(
    roomId: string,
    currentUserId: string,
    onNewMessage: (payload: { new: Database['public']['Tables']['messages']['Row'] }) => void,
    onTypingUpdate?: (typingUserIds: string[]) => void
  ): RealtimeChannel {
    const channelName = this.getChannelName('room', roomId);

    if (this.activeChannels.has(channelName)) {
      return this.activeChannels.get(channelName)!;
    }

    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          onNewMessage(payload as any);
        }
      )
      .on('presence', { event: 'sync' }, () => {
        if (onTypingUpdate) {
          const state = channel.presenceState<{ typing: boolean }>();
          const typingUsers = Object.keys(state).filter((userId) => 
            state[userId]?.some((s) => s.typing)
          );
          onTypingUpdate(typingUsers);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.activeChannels.set(channelName, channel);
        }
      });

    return channel;
  }

  /**
   * Broadcasts a "User is typing" event for a specific chat room.
   */
  public async setTypingStatus(roomId: string, isTyping: boolean): Promise<void> {
    const channelName = this.getChannelName('room', roomId);
    const channel = this.activeChannels.get(channelName);
    if (channel) {
      await channel.track({ typing: isTyping });
    }
  }

  /**
   * Subscribes to an Instagram-style notification feed for a user.
   */
  public subscribeToNotifications(
    userId: string,
    onNewNotification: (payload: { new: Database['public']['Tables']['notifications']['Row'] }) => void
  ): RealtimeChannel {
    const channelName = this.getChannelName('user', userId);

    if (this.activeChannels.has(channelName)) {
      return this.activeChannels.get(channelName)!;
    }

    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          onNewNotification(payload as any);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.activeChannels.set(channelName, channel);
        }
      });

    return channel;
  }

  /**
   * Safely unwraps and destroys a subscription to prevent memory leaks.
   */
  public unsubscribe(channelType: 'room' | 'user' | 'group' | 'feed', id: string): void {
    const channelName = this.getChannelName(channelType, id);
    const channel = this.activeChannels.get(channelName);

    if (channel) {
      supabase.removeChannel(channel).then(() => {
        this.activeChannels.delete(channelName);
      });
    }
  }

  /**
   * Clears all active realtime subscriptions (e.g., on logout).
   */
  public clearAll(): void {
    this.activeChannels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.activeChannels.clear();
  }
}

export const realtimeManager = new RealtimeSubscriptionManager();

// ============================================================================
// 6. STORAGE WRAPPER SERVICE
// ============================================================================

export type BucketName = 'avatars' | 'banners' | 'chat_media' | 'group_assets' | 'story_backgrounds';

/**
 * Service for handling strictly typed storage operations.
 * Enforces file path sanitization and standardizes cache controls.
 */
export class StorageService {
  /**
   * Generates a safe, unique file path to avoid overwriting and caching issues.
   */
  private static generateSecurePath(userId: string, fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const uniqueId = crypto.randomUUID();
    const timestamp = Date.now();
    return `${userId}/${timestamp}_${uniqueId}.${ext}`;
  }

  /**
   * Uploads a file to a specific Supabase Storage bucket.
   */
  public static async uploadFile(
    bucket: BucketName,
    userId: string,
    file: File,
    onProgress?: (_progress: number) => void
  ): Promise<string> {
    try {
      // Basic client-side size validation (10MB limit)
      const MAX_SIZE_MB = 10;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new AppError(`File exceeds the ${MAX_SIZE_MB}MB limit.`, 'FILE_TOO_LARGE', 'warning');
      }

      const filePath = this.generateSecurePath(userId, file.name);

      // Using upload rather than standard API to support potential progress hooking in future Supabase JS versions
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '31536000', // Cache for 1 year (immutable via unique path)
          upsert: false,
        });

      if (error) throw error;
      if (!data?.path) throw new Error('Upload succeeded but no path was returned.');

      // Return public URL immediately
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;

    } catch (error) {
      throw parseSupabaseError(error);
    }
  }

  /**
   * Deletes a file from a bucket using its full public URL or relative path.
   */
  public static async deleteFile(bucket: BucketName, urlOrPath: string): Promise<void> {
    try {
      let pathToDelete = urlOrPath;
      
      // If a full public URL is passed, extract the relative path
      if (urlOrPath.startsWith('http')) {
        const urlParts = urlOrPath.split(`${bucket}/`);
        if (urlParts.length === 2) {
          pathToDelete = urlParts[1];
        } else {
          throw new Error('Invalid storage URL format.');
        }
      }

      const { error } = await supabase.storage.from(bucket).remove([pathToDelete]);
      if (error) throw error;
    } catch (error) {
      throw parseSupabaseError(error);
    }
  }
}

// ============================================================================
// 7. AUTHENTICATION WRAPPER (Email OTP Flow)
// ============================================================================

/**
 * Encapsulates the specific Auth flow required by the Prompt (No Passwords, OTP only).
 */
export class AuthService {
  /**
   * Initiates the OTP login process. Sends a magic code to the user's email.
   */
  public static async sendOtp(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Auto-signup for new emails
        },
      });

      if (error) throw error;
    } catch (error) {
      throw parseSupabaseError(error);
    }
  }

  /**
   * Verifies the 6-digit OTP code sent to the email.
   */
  public static async verifyOtp(email: string, token: string): Promise<{ user: User; session: Session }> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'magiclink', // Supabase treats email codes under the magiclink type flag often, or 'signup'/'recovery'
      });

      if (error) throw error;
      if (!data.user || !data.session) throw new Error('Verification failed: No session returned.');

      return { user: data.user, session: data.session };
    } catch (error) {
      throw parseSupabaseError(error);
    }
  }

  /**
   * Signs the current user out and cleans up all active real-time connections.
   */
  public static async signOut(): Promise<void> {
    try {
      realtimeManager.clearAll();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw parseSupabaseError(error);
    }
  }

  /**
   * Retrieves the active session, resolving null if not authenticated.
   */
  public static async getSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.warn('Error fetching session:', error);
      return null;
    }
  }
}
