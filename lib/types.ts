/**
 * @file src/lib/types.ts
 * @description Master Type Definition File for AnonRM.
 * Contains the complete Supabase PostgreSQL schema representations, domain models,
 * application state interfaces, and generic utility types for React Query/Mutations.
 * 
 * Architecture strictly enforces normalized relational data, rigorous strict mode TypeScript,
 * and zero `any` usage. Designed for Vite + React 19 + Supabase.
 */

// ============================================================================
// 1. UTILITY & JSON TYPES
// ============================================================================

/**
 * Standard JSON type to represent Supabase JSONB columns accurately.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================================
// 2. ENUMS
// ============================================================================

export type GroupVisibility = 'public' | 'private' | 'invite_only';
export type GroupMemberRole = 'owner' | 'admin' | 'moderator' | 'member';
export type GroupMemberStatus = 'pending' | 'active' | 'banned' | 'muted';

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'voice' 
  | 'confession_card' 
  | 'system';

export type ChatRoomType = 'direct' | 'group';

export type NotificationType =
  | 'like'
  | 'reply'
  | 'mention'
  | 'comment'
  | 'follow'
  | 'group_invite'
  | 'group_request'
  | 'group_accepted'
  | 'question_received'
  | 'announcement'
  | 'system_alert';

export type ReportTargetType = 'user' | 'confession' | 'comment' | 'group' | 'message';
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export type VoteType = 1 | -1;
export type TargetEntityType = 'confession' | 'comment' | 'reply';

export type WordSeverity = 'low' | 'medium' | 'high' | 'critical';
export type WordReplacementStyle = 'asterisk' | 'emoji' | 'remove' | 'block_entirely';

export type ThemePreference = 'light' | 'dark' | 'system';
export type PrivacyLevel = 'everyone' | 'following' | 'none';

// ============================================================================
// 3. MAIN SUPABASE DATABASE SCHEMA
// ============================================================================

export interface Database {
  public: {
    Tables: {
      
      /**
       * PROFILES TABLE
       * Extends Supabase auth.users. Contains Instagram-like profile data.
       */
      profiles: {
        Row: {
          id: string; // References auth.users.id
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          bio: string | null;
          karma: number; // Calculated field based on upvotes/downvotes
          is_verified: boolean;
          badges: Json[] | null; // Array of achievement objects
          followers_count: number;
          following_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          karma?: number;
          is_verified?: boolean;
          badges?: Json[] | null;
          followers_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          karma?: number;
          is_verified?: boolean;
          badges?: Json[] | null;
          followers_count?: number;
          following_count?: number;
          updated_at?: string;
        };
      };

      /**
       * USER SETTINGS TABLE
       * 1-to-1 relationship with profiles. Manages preferences and privacy.
       */
      user_settings: {
        Row: {
          user_id: string;
          theme: ThemePreference;
          email_notifications: boolean;
          push_notifications: boolean;
          allow_messages_from: PrivacyLevel;
          profile_visibility: PrivacyLevel;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: ThemePreference;
          email_notifications?: boolean;
          push_notifications?: boolean;
          allow_messages_from?: PrivacyLevel;
          profile_visibility?: PrivacyLevel;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          theme?: ThemePreference;
          email_notifications?: boolean;
          push_notifications?: boolean;
          allow_messages_from?: PrivacyLevel;
          profile_visibility?: PrivacyLevel;
          language?: string;
          updated_at?: string;
        };
      };

      /**
       * CONFESSIONS TABLE
       * Core entity. Can belong to a user, group, or category. Supports anonymity.
       */
      confessions: {
        Row: {
          id: string;
          author_id: string;
          content: string; // Dynamically filtered for blocked words prior to insert
          background_color: string | null;
          text_color: string | null;
          is_anonymous: boolean;
          views_count: number;
          upvotes_count: number;
          downvotes_count: number;
          comments_count: number;
          group_id: string | null;
          category_id: string | null;
          is_pinned: boolean; // For global or group pinning
          is_trending: boolean;
          created_at: string;
          updated_at: string;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          content: string;
          background_color?: string | null;
          text_color?: string | null;
          is_anonymous?: boolean;
          views_count?: number;
          upvotes_count?: number;
          downvotes_count?: number;
          comments_count?: number;
          group_id?: string | null;
          category_id?: string | null;
          is_pinned?: boolean;
          is_trending?: boolean;
          created_at?: string;
          updated_at?: string;
          edited_at?: string | null;
        };
        Update: {
          content?: string;
          background_color?: string | null;
          text_color?: string | null;
          is_anonymous?: boolean;
          views_count?: number;
          upvotes_count?: number;
          downvotes_count?: number;
          comments_count?: number;
          is_pinned?: boolean;
          is_trending?: boolean;
          updated_at?: string;
          edited_at?: string | null;
        };
      };

      /**
       * COMMENTS & REPLIES TABLE
       * Infinite nesting supported via parent_id relation.
       */
      comments: {
        Row: {
          id: string;
          confession_id: string;
          author_id: string;
          parent_id: string | null; // Null if top-level comment
          content: string;
          upvotes_count: number;
          downvotes_count: number;
          is_anonymous: boolean;
          is_pinned: boolean; // Author of confession can pin comments
          created_at: string;
          updated_at: string;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          confession_id: string;
          author_id: string;
          parent_id?: string | null;
          content: string;
          upvotes_count?: number;
          downvotes_count?: number;
          is_anonymous?: boolean;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
          edited_at?: string | null;
        };
        Update: {
          content?: string;
          upvotes_count?: number;
          downvotes_count?: number;
          is_anonymous?: boolean;
          is_pinned?: boolean;
          updated_at?: string;
          edited_at?: string | null;
        };
      };

      /**
       * VOTES TABLE
       * Polymorphic voting system (Reddit style). Prevents double voting via unique constraints.
       */
      votes: {
        Row: {
          id: string;
          user_id: string;
          target_type: TargetEntityType;
          target_id: string;
          value: VoteType; // 1 for upvote, -1 for downvote
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          target_type: TargetEntityType;
          target_id: string;
          value: VoteType;
          created_at?: string;
        };
        Update: {
          value?: VoteType; // Changing upvote to downvote
        };
      };

      /**
       * BOOKMARKS / SAVED CONFESSIONS
       * Allows organizing saved confessions into custom collections.
       */
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          confession_id: string;
          collection_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          confession_id: string;
          collection_name?: string | null;
          created_at?: string;
        };
        Update: {
          collection_name?: string | null;
        };
      };

      /**
       * FOLLOWERS TABLE
       * Instagram-style user relationships.
       */
      followers: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: Record<string, never>; // Should only insert or delete
      };

      /**
       * NGL STORIES TABLE
       * Holds the custom prompts users create to receive anonymous messages.
       */
      stories: {
        Row: {
          id: string;
          author_id: string;
          prompt: string;
          background_image: string | null;
          expires_at: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          prompt: string;
          background_image?: string | null;
          expires_at: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          prompt?: string;
          background_image?: string | null;
          expires_at?: string;
          is_active?: boolean;
        };
      };

      /**
       * NGL STORY QUESTIONS (REPLIES)
       * Anonymous submissions to a user's story link.
       */
      story_questions: {
        Row: {
          id: string;
          story_id: string;
          sender_identifier: string; // Hash of IP or session to rate-limit/ban anonymously
          content: string;
          is_read: boolean;
          is_replied: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          sender_identifier: string;
          content: string;
          is_read?: boolean;
          is_replied?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
          is_replied?: boolean;
        };
      };

      /**
       * GROUPS TABLE
       * Private/Public confession communities.
       */
      groups: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          visibility: GroupVisibility;
          rules: Json | null; // Array of rule strings or objects
          is_nsfw: boolean;
          members_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          visibility?: GroupVisibility;
          rules?: Json | null;
          is_nsfw?: boolean;
          members_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          visibility?: GroupVisibility;
          rules?: Json | null;
          is_nsfw?: boolean;
          members_count?: number;
          updated_at?: string;
        };
      };

      /**
       * GROUP MEMBERS TABLE
       * Defines roles and approval status for users in groups.
       */
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: GroupMemberRole;
          status: GroupMemberStatus;
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: GroupMemberRole;
          status?: GroupMemberStatus;
          joined_at?: string;
        };
        Update: {
          role?: GroupMemberRole;
          status?: GroupMemberStatus;
        };
      };

      /**
       * CHAT ROOMS
       * Telegram-like messaging architecture. Covers DMs and Group Chats.
       */
      chat_rooms: {
        Row: {
          id: string;
          type: ChatRoomType;
          name: string | null; // Null for DMs, required for Group Chats
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          last_message_at: string | null;
        };
        Insert: {
          id?: string;
          type: ChatRoomType;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string | null;
        };
        Update: {
          name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
          last_message_at?: string | null;
        };
      };

      /**
       * CHAT PARTICIPANTS
       * Tracks who is in which chat room, and read receipts.
       */
      chat_participants: {
        Row: {
          room_id: string;
          user_id: string;
          role: GroupMemberRole | null;
          last_read_at: string | null;
          joined_at: string;
          is_muted: boolean;
          is_pinned: boolean;
        };
        Insert: {
          room_id: string;
          user_id: string;
          role?: GroupMemberRole | null;
          last_read_at?: string | null;
          joined_at?: string;
          is_muted?: boolean;
          is_pinned?: boolean;
        };
        Update: {
          role?: GroupMemberRole | null;
          last_read_at?: string | null;
          is_muted?: boolean;
          is_pinned?: boolean;
        };
      };

      /**
       * MESSAGES TABLE
       * Supports rich text, media, replies, and integrated confession cards.
       */
      messages: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string | null; // Null indicates system message
          type: MessageType;
          content: string; // Filtered through blocked words if text
          media_url: string | null;
          reply_to_id: string | null; // Self-referential for message threads
          is_edited: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_id?: string | null;
          type?: MessageType;
          content: string;
          media_url?: string | null;
          reply_to_id?: string | null;
          is_edited?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          is_edited?: boolean;
          is_deleted?: boolean;
          updated_at?: string;
        };
      };

      /**
       * MESSAGE REACTIONS
       * Slack/Telegram style emoji reactions.
       */
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };

      /**
       * NOTIFICATIONS TABLE
       * Comprehensive Instagram-style realtime notifications.
       */
      notifications: {
        Row: {
          id: string;
          user_id: string; // Recipient
          actor_id: string | null; // Who triggered it (Null if anonymous/system)
          type: NotificationType;
          target_id: string | null; // ID of the confession, group, or comment
          target_url: string | null; // Direct routing URL
          content: string | null; // Preview text
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: NotificationType;
          target_id?: string | null;
          target_url?: string | null;
          content?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };

      /**
       * BLOCKED WORDS TABLE
       * Critical security & moderation table. Processed during edge functions/middleware.
       */
      blocked_words: {
        Row: {
          id: string;
          word: string;
          severity: WordSeverity;
          replacement_style: WordReplacementStyle;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          word: string;
          severity?: WordSeverity;
          replacement_style?: WordReplacementStyle;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          word?: string;
          severity?: WordSeverity;
          replacement_style?: WordReplacementStyle;
          is_enabled?: boolean;
          updated_at?: string;
        };
      };

      /**
       * REPORTS TABLE
       * Unified reporting mechanism for all user-generated content.
       */
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: string;
          status: ReportStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_id: string;
          reason: string;
          status?: ReportStatus;
          created_at?: string;
        };
        Update: {
          status?: ReportStatus;
        };
      };
      
      /**
       * BLOCKED USERS TABLE
       * Prevents interaction, DMs, and visibility between two users.
       */
      blocked_users: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// ============================================================================
// 4. SUPABASE GENERIC TYPE HELPERS
// ============================================================================

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
      Database['public']['Views'])
  ? (Database['public']['Tables'] &
      Database['public']['Views'])[PublicTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
  ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
  ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

// ============================================================================
// 5. EXTENDED DOMAIN MODELS (For UI Components & React Query)
// ============================================================================

/**
 * Confession augmented with relational data required for the feed UI.
 */
export interface ConfessionWithRelations extends Tables<'confessions'> {
  author?: Pick<Tables<'profiles'>, 'id' | 'username' | 'avatar_url' | 'is_verified'> | null;
  group?: Pick<Tables<'groups'>, 'id' | 'name' | 'slug' | 'avatar_url'> | null;
  user_vote?: VoteType | null; 
  is_saved?: boolean;
}

/**
 * Nested Comment tree structure for the Confession Page UI.
 */
export interface CommentWithRelations extends Tables<'comments'> {
  author?: Pick<Tables<'profiles'>, 'id' | 'username' | 'avatar_url' | 'is_verified'> | null;
  user_vote?: VoteType | null;
  replies?: CommentWithRelations[];
}

/**
 * Chat Room augmented with the latest message and unread metadata for the Telegram-style sidebar.
 */
export interface ChatRoomFeedItem extends Tables<'chat_rooms'> {
  last_message?: Tables<'messages'> | null;
  unread_count: number;
  other_participant?: Pick<Tables<'profiles'>, 'id' | 'username' | 'avatar_url'> | null;
}

/**
 * Message payload enriched with reactions and sender data for the Chat Window UI.
 */
export interface MessageWithRelations extends Tables<'messages'> {
  sender?: Pick<Tables<'profiles'>, 'id' | 'username' | 'avatar_url'> | null;
  reactions: Tables<'message_reactions'>[];
  reply_to?: Pick<Tables<'messages'>, 'id' | 'content' | 'type'> | null;
}

/**
 * Profile enriched with advanced counts and relationship status for the Profile Page UI.
 */
export interface ProfileDetails extends Tables<'profiles'> {
  is_following?: boolean;
  is_followed_by?: boolean;
  is_blocked?: boolean;
}

// ============================================================================
// 6. PAGINATION & API RESPONSE INTERFACES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number | null;
  nextPageToken?: number | string | null;
}

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  status: number;
}
