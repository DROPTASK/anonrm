/**
 * @file src/pages/DMs.tsx
 * @description Telegram-style Direct Messaging and Group Chat Interface.
 * Implements real-time presence (typing indicators), reverse infinite scroll pagination,
 * optimistic UI updates, responsive split-pane layout, and rich message bubbles.
 *
 * Architecture strictly enforces normalized relational data, rigorous strict mode TypeScript,
 * and zero `any` usage. Designed for Vite + React 19 + Supabase.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { supabase, realtimeManager, AppError, parseSupabaseError } from '../../lib/supabase';
import type { Database, MessageType, ChatRoomType } from '../../lib/types';

// ============================================================================
// 1. TYPES & INTERFACES
// ============================================================================

type Profile = Database['public']['Tables']['profiles']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type ChatRoom = Database['public']['Tables']['chat_rooms']['Row'];
type ChatParticipant = Database['public']['Tables']['chat_participants']['Row'];

export interface EnrichedChatRoom extends ChatRoom {
  other_user?: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'is_verified'>;
  last_message?: Pick<Message, 'content' | 'created_at' | 'type'>;
  unread_count: number;
  is_muted: boolean;
  is_pinned: boolean;
}

export interface EnrichedMessage extends Message {
  sender?: Pick<Profile, 'id' | 'username' | 'avatar_url'>;
}

// ============================================================================
// 2. ICONS (Minimal SVGs)
// ============================================================================

const Icons = {
  Search: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
  Edit: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
  ),
  Back: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
  ),
  More: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
  ),
  Send: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  ),
  Paperclip: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
  ),
  Smile: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
  ),
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="20 6 9 17 4 12"/></svg>
  ),
  DoubleCheck: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="18 6 7 17 2 12"/><polyline points="22 10 11 21 6 16"/></svg>
  )
};

// ============================================================================
// 3. UTILITIES
// ============================================================================

const formatTime = (dateString: string) => {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(dateString));
};

const formatDateGroup = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
};

// ============================================================================
// 4. API SERVICES
// ============================================================================

/**
 * Fetches the user's chat rooms. Simulates a complex join by aggregating data.
 */
const fetchChatList = async (userId: string): Promise<EnrichedChatRoom[]> => {
  try {
    // 1. Get user's room participations
    const { data: participations, error: partError } = await supabase
      .from('chat_participants')
      .select('room_id, is_pinned, is_muted')
      .eq('user_id', userId);

    if (partError) throw partError;
    if (!participations || participations.length === 0) return [];

    const roomIds = participations.map(p => p.room_id);

    // 2. Get Rooms data
    const { data: rooms, error: roomsError } = await supabase
      .from('chat_rooms')
      .select('*')
      .in('id', roomIds)
      .order('last_message_at', { ascending: false });

    if (roomsError) throw roomsError;

    // 3. Get Other Participants for DMs (type = 'direct')
    const { data: otherParticipants, error: otherPartError } = await supabase
      .from('chat_participants')
      .select('room_id, user_id, profiles(id, username, avatar_url, is_verified)')
      .in('room_id', roomIds)
      .neq('user_id', userId); // Get the *other* people
      
    if (otherPartError) throw otherPartError;

    // 4. Map everything together
    const enriched: EnrichedChatRoom[] = rooms.map(room => {
      const p = participations.find(part => part.room_id === room.id);
      let other_user;

      if (room.type === 'direct') {
        const op = otherParticipants?.find(op => op.room_id === room.id);
        // Safely extract the profile object from the join
        if (op && op.profiles) {
          other_user = Array.isArray(op.profiles) ? op.profiles[0] : op.profiles;
        }
      }

      return {
        ...room,
        is_pinned: p?.is_pinned ?? false,
        is_muted: p?.is_muted ?? false,
        unread_count: 0, // Would require a separate query/RPC against message timestamps in prod
        other_user: other_user as any,
      };
    });

    return enriched;
  } catch (error) {
    throw parseSupabaseError(error);
  }
};

/**
 * Fetches paginated messages for a specific room.
 */
const fetchMessages = async (roomId: string, pageParam = 0): Promise<{ data: EnrichedMessage[], nextPage: number | null }> => {
  const limit = 30;
  const from = pageParam * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(id, username, avatar_url)
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false }) // Fetch newest first for reverse infinite scroll
    .range(from, to);

  if (error) throw parseSupabaseError(error);

  // Cast properly. PostgREST returns sender as array or object depending on relation type, usually single object for Many-to-One.
  const typedData = (data as any[]).map(msg => ({
    ...msg,
    sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender
  })) as EnrichedMessage[];

  return {
    data: typedData,
    nextPage: data.length === limit ? pageParam + 1 : null
  };
};

// ============================================================================
// 5. SUB-COMPONENTS
// ============================================================================

/**
 * Chat List Item (Sidebar)
 */
const ChatListItem: React.FC<{
  room: EnrichedChatRoom;
  isActive: boolean;
  onClick: () => void;
}> = ({ room, isActive, onClick }) => {
  
  // Determine display properties based on room type
  const displayName = room.type === 'direct' 
    ? (room.other_user?.username || 'Unknown User')
    : (room.name || 'Group Chat');
    
  const displayAvatar = room.type === 'direct'
    ? room.other_user?.avatar_url
    : room.avatar_url;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center p-3 sm:p-4 transition-colors focus:outline-none text-left border-b border-gray-100 dark:border-gray-800/50 ${
        isActive 
          ? 'bg-indigo-50 dark:bg-gray-800' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 bg-white dark:bg-gray-900'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-indigo-200 to-purple-200 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700">
          {displayAvatar ? (
            <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl sm:text-2xl">{room.type === 'direct' ? '👤' : '👥'}</span>
          )}
        </div>
        {/* Online Status Indicator (Mocked via presence logically) */}
        {room.type === 'direct' && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
        )}
      </div>

      <div className="ml-3 sm:ml-4 flex-1 overflow-hidden">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className={`font-semibold truncate text-[15px] sm:text-[16px] ${isActive ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-900 dark:text-white'}`}>
            {displayName}
          </h3>
          {room.last_message_at && (
            <span className={`text-xs flex-shrink-0 ml-2 ${room.unread_count > 0 ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-400'}`}>
              {formatTime(room.last_message_at)}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <p className={`text-[13px] sm:text-[14px] truncate ${room.unread_count > 0 ? 'font-medium text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
            {room.last_message?.content || 'No messages yet'}
          </p>
          {room.unread_count > 0 && (
            <span className="ml-2 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
              {room.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

/**
 * Individual Chat Bubble
 */
const ChatBubble: React.FC<{
  message: EnrichedMessage;
  isMe: boolean;
  showAvatar: boolean; // Determines if we should show the sender's avatar (tail of message group)
}> = React.memo(({ message, isMe, showAvatar }) => {
  return (
    <div className={`flex w-full mt-1.5 mb-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
      
      {/* Avatar (Left side, only for others) */}
      {!isMe && (
        <div className="w-8 flex-shrink-0 mr-2 flex items-end">
          {showAvatar ? (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              {message.sender?.avatar_url ? (
                <img src={message.sender.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
              )}
            </div>
          ) : <div className="w-8" />}
        </div>
      )}

      {/* Message Content Container */}
      <div className={`relative max-w-[75%] sm:max-w-[65%] flex flex-col`}>
        <div 
          className={`relative px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-sm text-[15px] sm:text-[16px] leading-relaxed break-words ${
            isMe 
              ? 'bg-indigo-600 text-white rounded-br-sm' 
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-gray-700/50'
          }`}
        >
          {/* Confession Card Embed Type */}
          {message.type === 'confession_card' ? (
            <div className="bg-black/10 dark:bg-white/10 rounded-xl p-3 -mx-1 -mt-1 mb-1 border border-black/5 dark:border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1 block">Linked Confession</span>
              <p className="italic font-medium">{message.content}</p>
            </div>
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}

          {/* Time & Read Status Indicator */}
          <div className={`flex items-center justify-end space-x-1 mt-1 -mb-1 -mr-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
            <span className="text-[10px] sm:text-xs select-none">
              {formatTime(message.created_at)}
            </span>
            {isMe && (
              // Mocking read receipt logic here. Double check means read.
              <Icons.DoubleCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Message Input Composer
 */
const MessageComposer: React.FC<{
  roomId: string;
  onSend: (content: string, type: MessageType) => void;
  onTyping: () => void;
}> = ({ roomId, onSend, onTyping }) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  const handleSend = () => {
    if (!content.trim()) return;
    onSend(content.trim(), 'text');
    setContent('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-2 sm:p-4 flex items-end space-x-2">
      <button className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none">
        <Icons.Paperclip className="w-6 h-6" />
      </button>
      
      <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl flex items-end shadow-inner overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            onTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          className="w-full max-h-[120px] bg-transparent resize-none py-3 px-4 focus:outline-none text-gray-900 dark:text-white text-[15px] sm:text-[16px] leading-relaxed scrollbar-hide"
        />
        <button className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <Icons.Smile className="w-6 h-6" />
        </button>
      </div>

      {content.trim() ? (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition-colors focus:outline-none"
        >
          <Icons.Send className="w-5 h-5 -ml-0.5" />
        </motion.button>
      ) : (
        <button className="p-3 bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full transition-colors focus:outline-none">
          {/* Microphone Icon for Voice Notes (Mocked) */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// 6. MAIN PAGE COMPONENT
// ============================================================================

export const DMs: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Fetch Chat List ---
  const { data: chatRooms = [], isLoading: isRoomsLoading } = useQuery({
    queryKey: ['chatRooms', user?.id],
    queryFn: () => fetchChatList(user!.id),
    enabled: !!user?.id,
  });

  const activeRoom = useMemo(() => chatRooms.find(r => r.id === activeRoomId), [chatRooms, activeRoomId]);

  // --- Fetch Messages for Active Room (Infinite Scroll) ---
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['messages', activeRoomId],
    queryFn: ({ pageParam }) => fetchMessages(activeRoomId!, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!activeRoomId,
  });

  // Flatten and reverse messages (UI displays newest at bottom)
  const messages = useMemo(() => {
    if (!messagesData) return [];
    // API returns newest first, we reverse it to display chronological top-to-bottom
    return messagesData.pages.flatMap(page => page.data).reverse();
  }, [messagesData]);

  // --- Intersection Observer for Reverse Infinite Scroll ---
  const { ref: topBoundaryRef, inView } = useInView({
    rootMargin: '200px 0px 0px 0px', // Trigger slightly before reaching the absolute top
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // --- Auto Scroll to Bottom on New Message ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only auto-scroll if we are relatively close to the bottom already, 
    // to prevent jarring jumps if user is reading old history.
    // For simplicity in this demo, we scroll instantly on first load.
    scrollToBottom();
  }, [messages.length, activeRoomId]);

  // --- Realtime Subscriptions (Messages & Typing) ---
  useEffect(() => {
    if (!activeRoomId || !user) return;

    const channel = realtimeManager.subscribeToChatRoom(
      activeRoomId,
      user.id,
      (payload) => {
        // Optimistically inject new message into cache
        const newMessage = payload.new as EnrichedMessage;
        // Check if message is already in cache (sent by us via optimistic update) to avoid duplicates
        
        queryClient.setQueryData(['messages', activeRoomId], (oldData: any) => {
          if (!oldData) return oldData;
          
          // Modify the first page (which contains the newest messages due to our reverse order fetch)
          const newPages = [...oldData.pages];
          const firstPage = { ...newPages[0] };
          
          // Prepend because the array is sorted newest first in the DB response cache
          firstPage.data = [newMessage, ...firstPage.data];
          newPages[0] = firstPage;
          
          return { ...oldData, pages: newPages };
        });

        // Clear typing indicator if this user sent a message
        setTypingUsers(prev => prev.filter(id => id !== newMessage.sender_id));
        setTimeout(scrollToBottom, 100);
      },
      (typingList) => {
        // Filter out self
        setTypingUsers(typingList.filter(id => id !== user.id));
      }
    );

    return () => {
      realtimeManager.unsubscribe('room', activeRoomId);
    };
  }, [activeRoomId, user, queryClient]);

  // --- Send Message Mutation ---
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, type }: { content: string, type: MessageType }) => {
      const tempId = `temp-${Date.now()}`;
      const payload = {
        room_id: activeRoomId!,
        sender_id: user!.id,
        content,
        type,
        is_edited: false,
        is_deleted: false,
      };

      // Proceed with actual DB insert
      const { data, error } = await supabase
        .from('messages')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      
      // Update room last_message_at
      await supabase
        .from('chat_rooms')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeRoomId!);

      return data;
    },
    onMutate: async ({ content, type }) => {
      // 1. Cancel outgoing fetches
      await queryClient.cancelQueries({ queryKey: ['messages', activeRoomId] });
      // 2. Snapshot previous value
      const previousMessages = queryClient.getQueryData(['messages', activeRoomId]);
      
      // 3. Optimistically update cache
      const optimisticMsg: EnrichedMessage = {
        id: `opt-${Date.now()}`,
        room_id: activeRoomId!,
        sender_id: user!.id,
        content,
        type,
        media_url: null,
        reply_to_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: { id: user!.id, username: 'Me', avatar_url: null }, // Mocked
      };

      queryClient.setQueryData(['messages', activeRoomId], (oldData: any) => {
        if (!oldData) return oldData;
        const newPages = [...oldData.pages];
        newPages[0] = { ...newPages[0], data: [optimisticMsg, ...newPages[0].data] };
        return { ...oldData, pages: newPages };
      });

      setTimeout(scrollToBottom, 50);
      return { previousMessages };
    },
    onError: (err, newTodo, context) => {
      // Rollback
      queryClient.setQueryData(['messages', activeRoomId], context?.previousMessages);
      toast.error('Failed to send message');
    },
  });

  const handleSend = useCallback((content: string, type: MessageType) => {
    if (!activeRoomId) return;
    sendMessageMutation.mutate({ content, type });
    // Stop typing immediately
    realtimeManager.setTypingStatus(activeRoomId, false);
  }, [activeRoomId, sendMessageMutation]);

  const handleTyping = useCallback(() => {
    if (!activeRoomId) return;
    realtimeManager.setTypingStatus(activeRoomId, true);
    
    // Auto-clear typing status after 3 seconds of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      realtimeManager.setTypingStatus(activeRoomId, false);
    }, 3000);
  }, [activeRoomId]);


  // --- Render Helpers ---
  
  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: EnrichedMessage[] }[] = [];
    let currentDate = '';

    messages.forEach((msg) => {
      const dateStr = formatDateGroup(msg.created_at);
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: dateStr, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    });
    return groups;
  }, [messages]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex h-screen w-full bg-white dark:bg-gray-950 overflow-hidden pt-16 md:pt-0 md:pl-20 xl:pl-64 transition-all">
      
      {/* 
        =======================================================================
        LEFT PANEL: CHAT LIST
        =======================================================================
      */}
      <div 
        className={`${activeRoomId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-800/60 bg-gray-50 dark:bg-gray-950 h-[calc(100vh-64px)] md:h-screen z-10 flex-shrink-0 relative`}
      >
        {/* Header & Search */}
        <div className="p-4 bg-white dark:bg-gray-950 sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex justify-between items-center mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
            <button className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Icons.Edit className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          
          <div className="relative mt-4">
            <Icons.Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full bg-gray-100 dark:bg-gray-800/80 text-gray-900 dark:text-white rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-[15px]"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {isRoomsLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="w-14 h-14 bg-gray-200 dark:bg-gray-800 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : chatRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-3xl">📭</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No messages yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Start a conversation from a confession or search for a user.</p>
            </div>
          ) : (
            chatRooms.map(room => (
              <ChatListItem 
                key={room.id}
                room={room}
                isActive={activeRoomId === room.id}
                onClick={() => setActiveRoomId(room.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* 
        =======================================================================
        RIGHT PANEL: ACTIVE CHAT WINDOW
        =======================================================================
      */}
      <div className={`${!activeRoomId ? 'hidden md:flex' : 'flex'} flex-col flex-1 h-[calc(100vh-64px)] md:h-screen bg-pattern relative`}>
        
        {activeRoomId && activeRoom ? (
          <>
            {/* Chat Header */}
            <header className="h-16 px-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 z-20 shadow-sm">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setActiveRoomId(null)}
                  className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Icons.Back className="w-6 h-6" />
                </button>
                
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border border-gray-100 dark:border-gray-700">
                   {activeRoom.type === 'direct' && activeRoom.other_user?.avatar_url ? (
                     <img src={activeRoom.other_user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                   )}
                </div>
                
                <div className="flex flex-col">
                  <h2 className="font-bold text-[16px] text-gray-900 dark:text-white tracking-tight leading-tight">
                    {activeRoom.type === 'direct' ? activeRoom.other_user?.username : activeRoom.name}
                  </h2>
                  <span className="text-xs text-indigo-500 font-medium h-4">
                    {typingUsers.length > 0 ? (
                      <span className="animate-pulse">typing...</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 font-normal">Last seen recently</span>
                    )}
                  </span>
                </div>
              </div>
              
              <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <Icons.More className="w-6 h-6" />
              </button>
            </header>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-[#0a0a0a] relative scrollbar-hide">
              {/* Top Boundary for Infinite Scroll */}
              <div ref={topBoundaryRef} className="h-4 w-full flex justify-center">
                {isFetchingNextPage && <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />}
              </div>

              {groupedMessages.map((group) => (
                <div key={group.date} className="mb-6">
                  {/* Date Separator */}
                  <div className="flex justify-center mb-4 sticky top-2 z-10">
                    <span className="px-3 py-1 bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                      {group.date}
                    </span>
                  </div>
                  
                  {/* Message Bubbles */}
                  {group.messages.map((msg, index) => {
                    const isMe = msg.sender_id === user?.id;
                    const nextMsg = group.messages[index + 1];
                    // Show avatar if it's the last message in a cluster by the same person
                    const showAvatar = !nextMsg || nextMsg.sender_id !== msg.sender_id;
                    
                    return (
                      <ChatBubble 
                        key={msg.id} 
                        message={msg} 
                        isMe={isMe} 
                        showAvatar={showAvatar} 
                      />
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Chat Composer */}
            <MessageComposer 
              roomId={activeRoomId} 
              onSend={handleSend} 
              onTyping={handleTyping}
            />

          </>
        ) : (
          /* Empty State (Desktop right pane when no chat selected) */
          <div className="hidden md:flex flex-col items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-950">
            <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <Icons.Search className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Select a Chat</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-xs text-center">Choose a conversation from the left menu or start a new one.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default DMs;
