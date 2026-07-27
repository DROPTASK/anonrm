/**
 * @file src/components/ConfessionCard.tsx
 * @description The universal Confession Card used across the Feed, Profile, and Detail views.
 * Supports custom background colors, optimistic voting, bookmarking, and native sharing.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabase';
import type { ConfessionWithRelations, VoteType } from '../../lib/types';

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  Upvote: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 19V5M5 12l7-7 7 7"/></svg>
  ),
  Downvote: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
  ),
  Message: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  ),
  Share: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
  ),
  Bookmark: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
  ),
  BookmarkFilled: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
  ),
  More: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
  )
};

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface ConfessionCardProps {
  confession: ConfessionWithRelations;
  currentUserId?: string;
  isDetailView?: boolean;
  onHideSuccess?: (confessionId: string) => void;
  onDeleteSuccess?: (confessionId: string) => void;
}

// ============================================================================
// SKELETON LOADER (Exported for other files)
// ============================================================================

export const ConfessionCardSkeleton: React.FC = () => (
  <div className="w-full bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse mb-6">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
        <div className="space-y-2">
          <div className="w-24 h-3 bg-gray-200 dark:bg-gray-800 rounded-full" />
          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-800 rounded-full" />
        </div>
      </div>
    </div>
    <div className="space-y-3 mb-6">
      <div className="w-full h-4 bg-gray-200 dark:bg-gray-800 rounded-full" />
      <div className="w-full h-4 bg-gray-200 dark:bg-gray-800 rounded-full" />
      <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-800 rounded-full" />
    </div>
    <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
      <div className="w-24 h-8 bg-gray-200 dark:bg-gray-800 rounded-full" />
      <div className="flex space-x-2">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ConfessionCard: React.FC<ConfessionCardProps> = ({ confession, currentUserId, isDetailView = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isBookmarked, setIsBookmarked] = useState(confession.is_saved || false);

  // Computed Properties
  const authorName = confession.is_anonymous ? 'Anonymous' : (confession.author?.username || 'Unknown');
  const authorAvatar = confession.is_anonymous ? null : confession.author?.avatar_url;
  const timeAgo = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    -Math.floor((new Date().getTime() - new Date(confession.created_at).getTime()) / (1000 * 60 * 60 * 24) || 1), 
    'day'
  );
  
  const score = (confession.upvotes_count || 0) - (confession.downvotes_count || 0);

  // Dynamic Card Styles for customized confessions
  const hasCustomStyle = !!confession.background_color;
  const cardStyle = hasCustomStyle ? {
    backgroundColor: confession.background_color,
    color: confession.text_color || '#ffffff',
    border: 'none',
  } : {};

  // --- Voting Mutation (Optimistic) ---
  const voteMutation = useMutation({
    mutationFn: async (voteValue: VoteType | null) => {
      if (!currentUserId) throw new Error('AUTH_REQUIRED');
      
      if (voteValue === null) {
        await supabase.from('votes').delete().eq('target_id', confession.id).eq('user_id', currentUserId);
      } else {
        await supabase.from('votes').upsert({
          user_id: currentUserId, target_type: 'confession', target_id: confession.id, value: voteValue
        }, { onConflict: 'user_id,target_id,target_type' });
      }
      return voteValue;
    },
    onMutate: async (newVote) => {
      // Optimitic Update across both Feed and Single Confession queries
      const updateCache = (oldData: any) => {
        if (!oldData) return oldData;
        
        let upDiff = 0;
        let downDiff = 0;
        if (confession.user_vote === 1) upDiff -= 1;
        if (confession.user_vote === -1) downDiff -= 1;
        if (newVote === 1) upDiff += 1;
        if (newVote === -1) downDiff += 1;

        const updatedConfession = {
          ...confession,
          user_vote: newVote,
          upvotes_count: Math.max(0, (confession.upvotes_count || 0) + upDiff),
          downvotes_count: Math.max(0, (confession.downvotes_count || 0) + downDiff)
        };

        // If it's the Feed query (infinite pages)
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              data: page.data.map((c: any) => c.id === confession.id ? updatedConfession : c)
            }))
          };
        }
        // If it's the Single Confession query
        return updatedConfession;
      };

      queryClient.setQueryData(['feed'], updateCache);
      queryClient.setQueryData(['confession', confession.id], updateCache);
    },
    onError: (err) => {
      if (err.message === 'AUTH_REQUIRED') {
        toast.error('Sign in to vote.');
        navigate('/login');
      } else {
        toast.error('Failed to register vote.');
      }
    }
  });

  const handleVote = (e: React.MouseEvent, type: VoteType) => {
    e.preventDefault();
    e.stopPropagation();
    const newVote = confession.user_vote === type ? null : type;
    voteMutation.mutate(newVote);
  };

  // --- Save / Bookmark Mutation ---
  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) {
      toast.error('Sign in to save confessions.');
      return navigate('/login');
    }

    const previousState = isBookmarked;
    setIsBookmarked(!isBookmarked); // Optimistic

    if (previousState) {
      await supabase.from('bookmarks').delete().eq('confession_id', confession.id).eq('user_id', currentUserId);
      toast('Removed from saved', { icon: '🗑️' });
    } else {
      await supabase.from('bookmarks').insert({ confession_id: confession.id, user_id: currentUserId });
      toast.success('Confession saved!');
    }
  };

  // --- Share Logic ---
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/c/${confession.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Read this confession on AnonRM', url }); } catch (err) {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  // --- Render ---
  const CardWrapper = isDetailView ? motion.div : Link;
  const wrapperProps = isDetailView 
    ? { className: "w-full block" } 
    : { to: `/c/${confession.id}`, className: "w-full block group/card" };

  return (
    <CardWrapper {...(wrapperProps as any)}>
      <motion.div 
        layoutId={`confession-card-${confession.id}`}
        className={`w-full rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-7 shadow-sm transition-all duration-300 relative overflow-hidden ${
          !hasCustomStyle 
            ? 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-xl dark:hover:border-gray-700' 
            : 'shadow-xl'
        }`}
        style={cardStyle as any}
      >
        
        {/* Decorative Background Glow (Only for non-custom cards) */}
        {!hasCustomStyle && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -mt-10 -mr-10 transition-opacity group-hover/card:opacity-100 opacity-50 pointer-events-none" />
        )}

        {/* Header */}
        <header className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border-2 ${hasCustomStyle ? 'border-white/20' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800'}`}>
              {authorAvatar ? (
                <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">🎭</span>
              )}
            </div>
            
            {/* Meta Info */}
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <span className={`font-bold text-[15px] sm:text-base tracking-tight ${hasCustomStyle ? 'text-inherit opacity-90' : 'text-gray-900 dark:text-white'}`}>
                  {authorName}
                </span>
                {!confession.is_anonymous && confession.author?.is_verified && (
                  <span className="text-blue-500 text-xs ml-0.5">✓</span>
                )}
              </div>
              <div className={`text-xs font-medium flex items-center space-x-1.5 ${hasCustomStyle ? 'text-inherit opacity-70' : 'text-gray-500 dark:text-gray-400'}`}>
                <span>{timeAgo}</span>
                {confession.group && (
                  <>
                    <span>•</span>
                    <Link 
                      to={`/g/${confession.group.slug}`} 
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline flex items-center"
                    >
                      g/{confession.group.slug}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Options Menu Trigger */}
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast('More options coming soon!'); }} 
            className={`p-2 rounded-full transition-colors ${hasCustomStyle ? 'hover:bg-black/10' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <Icons.More className="w-6 h-6" />
          </button>
        </header>

        {/* Content Body */}
        <div className="relative z-10 mb-6">
          <p className={`text-[17px] sm:text-[19px] leading-relaxed whitespace-pre-wrap break-words ${hasCustomStyle ? 'font-medium' : 'text-gray-800 dark:text-gray-200 font-medium'}`}>
            {confession.content}
          </p>
        </div>

        {/* Action Footer */}
        <footer className={`flex items-center justify-between pt-4 relative z-10 border-t ${hasCustomStyle ? 'border-white/20' : 'border-gray-100 dark:border-gray-800/60'}`}>
          
          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* Voting Component */}
            <div className={`flex items-center rounded-full p-1 border ${
              hasCustomStyle 
                ? 'bg-black/10 border-transparent' 
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200/60 dark:border-gray-700/60'
            }`}>
              <button 
                onClick={(e) => handleVote(e, 1)}
                className={`p-2 rounded-full transition-colors ${
                  confession.user_vote === 1 
                    ? 'text-orange-500 bg-orange-100 dark:bg-orange-500/20' 
                    : hasCustomStyle ? 'hover:bg-white/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icons.Upvote className="w-5 h-5" />
              </button>
              <span className={`w-8 text-center text-sm font-bold ${
                confession.user_vote === 1 ? 'text-orange-500' : confession.user_vote === -1 ? 'text-indigo-500' : hasCustomStyle ? 'text-inherit opacity-90' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {score}
              </span>
              <button 
                onClick={(e) => handleVote(e, -1)}
                className={`p-2 rounded-full transition-colors ${
                  confession.user_vote === -1 
                    ? 'text-indigo-500 bg-indigo-100 dark:bg-indigo-500/20' 
                    : hasCustomStyle ? 'hover:bg-white/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icons.Downvote className="w-5 h-5" />
              </button>
            </div>

            {/* Comments Counter */}
            <div className={`flex items-center px-4 py-2.5 rounded-full font-bold text-sm transition-colors ${
              hasCustomStyle 
                ? 'bg-black/10 hover:bg-black/20 text-inherit' 
                : 'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}>
              <Icons.Message className="w-5 h-5 mr-2" />
              {confession.comments_count || 0}
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <button 
              onClick={handleShare}
              className={`p-3 rounded-full transition-colors ${hasCustomStyle ? 'hover:bg-black/10' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-500'}`}
            >
              <Icons.Share className="w-6 h-6" />
            </button>
            <button 
              onClick={handleBookmark}
              className={`p-3 rounded-full transition-all ${
                isBookmarked 
                  ? (hasCustomStyle ? 'text-white' : 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30')
                  : (hasCustomStyle ? 'hover:bg-black/10' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-500')
              }`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isBookmarked ? 'filled' : 'outline'}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {isBookmarked ? <Icons.BookmarkFilled className="w-6 h-6" /> : <Icons.Bookmark className="w-6 h-6" />}
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </footer>

      </motion.div>
    </CardWrapper>
  );
};
