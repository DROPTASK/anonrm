/**
 * @file src/pages/Confession.tsx
 * @description Single Confession view with deeply nested, Reddit-style comment threads.
 * Implements an O(N) client-side tree builder, recursive rendering, optimistic UI updates
 * for voting/replying, and smooth thread collapsing via Framer Motion.
 *
 * Architecture strictly enforces normalized relational data, rigorous strict mode TypeScript,
 * and zero `any` usage. Designed for Vite + React 19 + Supabase.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { supabase, AppError, parseSupabaseError } from '../../lib/supabase';
import type { Database, ConfessionWithRelations, CommentWithRelations, VoteType } from '../../lib/types';
import { ConfessionCard, ConfessionCardSkeleton } from '../components/ConfessionCard';

// ============================================================================
// 1. SCHEMAS & TYPES
// ============================================================================

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment is too long'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

export interface CommentNode extends CommentWithRelations {
  children: CommentNode[];
}

// ============================================================================
// 2. ICONS
// ============================================================================

const Icons = {
  Back: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
  ),
  Upvote: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 19V5M5 12l7-7 7 7"/></svg>
  ),
  Downvote: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
  ),
  Reply: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
  ),
  More: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
  ),
  Expand: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="6 9 12 15 18 9"/></svg>
  ),
  Send: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  ),
};

// ============================================================================
// 3. API SERVICES
// ============================================================================

const fetchConfessionDetails = async (id: string, userId?: string): Promise<ConfessionWithRelations> => {
  try {
    const { data: confession, error } = await supabase
      .from('confessions')
      .select(`
        *,
        author:profiles(id, username, avatar_url, is_verified),
        group:groups(id, name, slug, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!confession) throw new AppError('Confession not found', 'NOT_FOUND');

    let enriched = confession as ConfessionWithRelations;

    if (userId) {
      const [{ data: voteData }, { data: saveData }] = await Promise.all([
        supabase.from('votes').select('value').eq('user_id', userId).eq('target_type', 'confession').eq('target_id', id).maybeSingle(),
        supabase.from('bookmarks').select('id').eq('user_id', userId).eq('confession_id', id).maybeSingle()
      ]);
      enriched.user_vote = voteData?.value as VoteType || null;
      enriched.is_saved = !!saveData;
    }

    return enriched;
  } catch (error) {
    throw parseSupabaseError(error);
  }
};

const fetchCommentsFlat = async (confessionId: string, userId?: string): Promise<CommentWithRelations[]> => {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles(id, username, avatar_url, is_verified)
      `)
      .eq('confession_id', confessionId)
      .order('created_at', { ascending: true }); // Oldest first, standard for threads

    if (error) throw error;
    if (!comments) return [];

    let enrichedComments = comments as CommentWithRelations[];

    if (userId && enrichedComments.length > 0) {
      const commentIds = enrichedComments.map(c => c.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('target_id, value')
        .eq('user_id', userId)
        .eq('target_type', 'comment')
        .in('target_id', commentIds);

      if (votes) {
        const votesMap = new Map(votes.map(v => [v.target_id, v.value as VoteType]));
        enrichedComments = enrichedComments.map(c => ({
          ...c,
          user_vote: votesMap.get(c.id) || null
        }));
      }
    }

    return enrichedComments;
  } catch (error) {
    throw parseSupabaseError(error);
  }
};

// O(N) Flat-to-Tree Algorithm
const buildCommentTree = (comments: CommentWithRelations[]): CommentNode[] => {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // Initialize node maps
  comments.forEach(comment => {
    map.set(comment.id, { ...comment, children: [] });
  });

  // Build relationships
  comments.forEach(comment => {
    const node = map.get(comment.id)!;
    if (comment.parent_id) {
      const parent = map.get(comment.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // Fallback: If parent is missing (deleted), attach to root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  // Sort roots by upvotes implicitly (or leave chronological). Reddit sorts by score.
  roots.sort((a, b) => {
    const scoreA = (a.upvotes_count || 0) - (a.downvotes_count || 0);
    const scoreB = (b.upvotes_count || 0) - (b.downvotes_count || 0);
    return scoreB - scoreA;
  });

  return roots;
};

// ============================================================================
// 4. SUB-COMPONENTS
// ============================================================================

/**
 * Reusable text area for posting new comments and replies
 */
const CommentComposer: React.FC<{
  confessionId: string;
  parentId?: string | null;
  onCancel?: () => void;
  onSuccess?: () => void;
  autoFocus?: boolean;
}> = ({ confessionId, parentId = null, onCancel, onSuccess, autoFocus = false }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    mode: 'onChange'
  });

  const postMutation = useMutation({
    mutationFn: async (data: CommentFormValues) => {
      if (!user) throw new AppError('Must be logged in to comment.', 'AUTH_REQUIRED');

      const tempId = `temp-${Date.now()}`;
      const payload = {
        confession_id: confessionId,
        author_id: user.id,
        parent_id: parentId,
        content: data.content.trim(),
        is_anonymous: false, // Configurable later via toggle
      };

      const { data: insertedData, error } = await supabase
        .from('comments')
        .insert(payload)
        .select(`*, author:profiles(id, username, avatar_url, is_verified)`)
        .single();

      if (error) throw parseSupabaseError(error);
      return insertedData as CommentWithRelations;
    },
    onSuccess: (newComment) => {
      // Optimistically insert into the flat cache list
      queryClient.setQueryData(['comments', confessionId], (oldData: CommentWithRelations[] | undefined) => {
        if (!oldData) return [newComment];
        return [...oldData, newComment];
      });
      
      // Increment confession comment count in cache
      queryClient.setQueryData(['confession', confessionId], (oldData: ConfessionWithRelations | undefined) => {
         if (!oldData) return oldData;
         return { ...oldData, comments_count: (oldData.comments_count || 0) + 1 };
      });

      reset();
      toast.success('Comment posted');
      if (onSuccess) onSuccess();
    },
    onError: (err: AppError) => toast.error(err.message)
  });

  const onSubmit = (data: CommentFormValues) => postMutation.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-2 w-full flex flex-col">
      <div className="relative">
        <textarea
          {...register('content')}
          autoFocus={autoFocus}
          placeholder={parentId ? "Write a reply..." : "Add a comment..."}
          rows={parentId ? 2 : 3}
          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-4 text-[15px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow resize-none scrollbar-hide shadow-inner"
        />
        {errors.content && (
          <span className="absolute bottom-3 left-4 text-xs text-red-500 font-medium">
            {errors.content.message}
          </span>
        )}
      </div>
      <div className="flex justify-end space-x-2 mt-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || postMutation.isPending}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-full shadow-md transition-all flex items-center"
        >
          {postMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          ) : (
            <Icons.Send className="w-4 h-4 mr-2" />
          )}
          {parentId ? 'Reply' : 'Post'}
        </button>
      </div>
    </form>
  );
};

/**
 * RECURSIVE Comment Component
 * Handles rendering itself and mapping over its children recursively.
 */
const CommentItem: React.FC<{
  node: CommentNode;
  confessionId: string;
  level?: number;
}> = ({ node, confessionId, level = 0 }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  // Computed Values
  const authorName = node.is_anonymous ? 'Anonymous' : (node.author?.username || 'Unknown');
  const authorAvatar = node.is_anonymous ? null : node.author?.avatar_url;
  const score = (node.upvotes_count || 0) - (node.downvotes_count || 0);

  const timeAgo = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    -Math.floor((new Date().getTime() - new Date(node.created_at).getTime()) / (1000 * 60 * 60 * 24) || 1), 
    'day'
  ).replace('days ago', 'd').replace('day ago', 'd'); // Simplified time formatting for thread UI

  // --- Voting Mutation ---
  const voteMutation = useMutation({
    mutationFn: async (voteValue: VoteType | null) => {
      if (!user) throw new AppError('Must be logged in to vote', 'AUTH_REQUIRED');
      
      if (voteValue === null) {
        await supabase.from('votes').delete().eq('target_id', node.id).eq('user_id', user.id);
      } else {
        await supabase.from('votes').upsert({
          user_id: user.id, target_type: 'comment', target_id: node.id, value: voteValue
        }, { onConflict: 'user_id,target_id,target_type' });
      }
      return voteValue;
    },
    onMutate: async (newVote) => {
      await queryClient.cancelQueries({ queryKey: ['comments', confessionId] });
      const previousComments = queryClient.getQueryData<CommentWithRelations[]>(['comments', confessionId]);

      // Optimistically update the flat array in cache
      queryClient.setQueryData(['comments', confessionId], (old: CommentWithRelations[] | undefined) => {
        if (!old) return old;
        return old.map(c => {
          if (c.id !== node.id) return c;
          
          let upDiff = 0;
          let downDiff = 0;

          // Remove old vote
          if (c.user_vote === 1) upDiff -= 1;
          if (c.user_vote === -1) downDiff -= 1;

          // Add new vote
          if (newVote === 1) upDiff += 1;
          if (newVote === -1) downDiff += 1;

          return {
            ...c,
            user_vote: newVote,
            upvotes_count: Math.max(0, (c.upvotes_count || 0) + upDiff),
            downvotes_count: Math.max(0, (c.downvotes_count || 0) + downDiff)
          };
        });
      });

      return { previousComments };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['comments', confessionId], context?.previousComments);
      toast.error('Failed to vote');
    }
  });

  const handleVote = (type: VoteType) => {
    const newVote = node.user_vote === type ? null : type;
    voteMutation.mutate(newVote);
  };

  // Prevent infinite visual squishing on mobile
  const maxVisualLevel = 5;
  const isDeep = level >= maxVisualLevel;

  return (
    <div className={`flex w-full ${level > 0 ? (isDeep ? 'ml-2' : 'ml-3 sm:ml-5 mt-3') : 'mt-5'}`}>
      
      {/* 
        The collapsible thread line + Avatar column.
        We use group hover effects to highlight the line.
      */}
      <div className="flex flex-col items-center mr-2 sm:mr-3 group cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 z-10">
          {authorAvatar ? (
             <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
          ) : (
             <span className="text-[10px]">🎭</span>
          )}
        </div>
        
        {/* Thread Vertical Line */}
        {!isCollapsed && (node.children.length > 0 || isReplying) && (
          <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-800 group-hover:bg-indigo-400 dark:group-hover:bg-indigo-600 transition-colors my-1 rounded-full" />
        )}
      </div>

      {/* Main Comment Body */}
      <div className="flex-1 min-w-0">
        
        {/* Header */}
        <div className="flex items-center space-x-2 text-xs sm:text-sm mb-1">
          <Link to={`/u/${authorName}`} className="font-bold text-gray-900 dark:text-gray-100 hover:underline truncate max-w-[120px]">
            {authorName}
          </Link>
          {node.author?.is_verified && <span className="text-blue-500 text-xs">✓</span>}
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span className="text-gray-500 dark:text-gray-400">{timeAgo}</span>
          
          {isCollapsed && (
             <button onClick={() => setIsCollapsed(false)} className="ml-2 text-indigo-500 flex items-center bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
               <Icons.Expand className="w-3 h-3 mr-1" />
               Expand ({node.children.length})
             </button>
          )}
        </div>

        {/* Content & Interactions (Hidden if collapsed) */}
        {!isCollapsed && (
          <AnimatePresence initial={false}>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {/* Text */}
              <p className="text-[15px] sm:text-base text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                {node.content}
              </p>

              {/* Action Bar */}
              <div className="flex items-center space-x-1 sm:space-x-4 mt-2 mb-2">
                
                {/* Voting Container */}
                <div className="flex items-center bg-gray-100/50 dark:bg-gray-800/50 rounded-full p-0.5 border border-gray-200/50 dark:border-gray-700/50">
                  <button onClick={() => handleVote(1)} className={`p-1.5 rounded-full transition-colors ${node.user_vote === 1 ? 'text-orange-500 bg-orange-100 dark:bg-orange-500/20' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400'}`}>
                    <Icons.Upvote className="w-4 h-4" />
                  </button>
                  <span className={`text-xs font-bold w-6 text-center ${node.user_vote === 1 ? 'text-orange-500' : node.user_vote === -1 ? 'text-indigo-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    {score}
                  </span>
                  <button onClick={() => handleVote(-1)} className={`p-1.5 rounded-full transition-colors ${node.user_vote === -1 ? 'text-indigo-500 bg-indigo-100 dark:bg-indigo-500/20' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400'}`}>
                    <Icons.Downvote className="w-4 h-4" />
                  </button>
                </div>

                <button 
                  onClick={() => setIsReplying(!isReplying)}
                  className="flex items-center px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                >
                  <Icons.Reply className="w-4 h-4 mr-1.5" />
                  Reply
                </button>

                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <Icons.More className="w-4 h-4" />
                </button>
              </div>

              {/* Inline Reply Composer */}
              {isReplying && (
                <div className="mb-4">
                  <CommentComposer 
                    confessionId={confessionId} 
                    parentId={node.id} 
                    onCancel={() => setIsReplying(false)}
                    onSuccess={() => setIsReplying(false)}
                    autoFocus
                  />
                </div>
              )}

              {/* RECURSIVE CHILDREN RENDER */}
              {node.children.length > 0 && (
                <div className="flex flex-col">
                  {node.children.map(child => (
                    <CommentItem 
                      key={child.id} 
                      node={child} 
                      confessionId={confessionId} 
                      level={level + 1} 
                    />
                  ))}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}

      </div>
    </div>
  );
};

// ============================================================================
// 5. MAIN PAGE COMPONENT
// ============================================================================

export const Confession: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Validate ID presence
  if (!id) {
    return <div className="p-10 text-center">Invalid URL.</div>;
  }

  // --- Fetch Main Confession ---
  const { data: confession, isLoading: isConfessionLoading, error: confessionError } = useQuery({
    queryKey: ['confession', id],
    queryFn: () => fetchConfessionDetails(id, user?.id),
    retry: 1,
  });

  // --- Fetch Comments & Build Tree ---
  const { data: flatComments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => fetchCommentsFlat(id, user?.id),
    enabled: !!confession, // Only fetch comments if confession loads
  });

  const commentTree = useMemo(() => buildCommentTree(flatComments), [flatComments]);

  // --- RENDER HELPERS ---

  if (isConfessionLoading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pt-4 pb-20 md:pl-20 xl:pl-64 flex justify-center">
        <div className="w-full max-w-3xl px-3 sm:px-4">
           <ConfessionCardSkeleton />
           <div className="mt-8 space-y-6">
             {[1, 2, 3].map(i => (
               <div key={i} className="flex space-x-4 animate-pulse ml-4">
                 <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800" />
                 <div className="flex-1 space-y-2">
                   <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                   <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    );
  }

  if (confessionError || !confession) {
    return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pt-20 md:pl-20 xl:pl-64 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-6xl mb-4">🌪️</span>
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Confession Lost</h2>
        <p className="text-gray-500 mb-6">This confession may have been deleted by the author or removed by moderators.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full shadow-lg transition-transform hover:scale-105">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 md:pb-12 pt-4 md:pt-8 md:pl-20 xl:pl-64 flex justify-center relative">
      
      {/* Main Content Column */}
      <main className="w-full max-w-3xl px-3 sm:px-6 relative">
        
        {/* Top Navigation / Breadcrumb */}
        <div className="flex items-center mb-4 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors w-fit">
          <button onClick={() => navigate(-1)} className="flex items-center space-x-2 bg-white dark:bg-gray-900 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <Icons.Back className="w-5 h-5" />
            <span className="text-sm font-bold">Back</span>
          </button>
        </div>

        {/* The Confession Card */}
        <div className="z-10 relative">
          <ConfessionCard confession={confession} currentUserId={user?.id} isDetailView={true} />
        </div>

        {/* Comments Section */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl sm:rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm mt-4 p-4 sm:p-8 relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800/50">
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Comments <span className="text-gray-400 font-medium ml-1">({confession.comments_count || 0})</span>
            </h3>
            {/* Sort Toggle (Visual only for this mockup, relies on API sorting in prod) */}
            <select className="bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-700 focus:outline-none">
              <option>Top</option>
              <option>Newest</option>
            </select>
          </div>

          {/* Top-Level Composer */}
          <div className="mb-8">
            <CommentComposer confessionId={confession.id} />
          </div>

          {/* Comment Tree Rendering */}
          <div className="flex flex-col w-full relative">
            {isCommentsLoading ? (
               <div className="flex justify-center py-10">
                 <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
               </div>
            ) : commentTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center opacity-70">
                <span className="text-5xl mb-4">🌱</span>
                <p className="text-gray-500 font-medium text-lg">No comments yet</p>
                <p className="text-gray-400 text-sm">Be the first to share your thoughts.</p>
              </div>
            ) : (
              commentTree.map(node => (
                <CommentItem 
                  key={node.id} 
                  node={node} 
                  confessionId={confession.id} 
                />
              ))
            )}
          </div>
          
        </section>

      </main>
    </div>
  );
};

export default Confession;
