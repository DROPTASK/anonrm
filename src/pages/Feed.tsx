/**
 * @file src/pages/Feed.tsx
 * @description The main algorithmic and chronological feed for AnonRM.
 * Implements infinite scrolling, DOM virtualization for performance, robust error boundaries,
 * and direct integration with Supabase using React Query.
 * 
 * Features:
 * - Variable-height virtualized lists (@tanstack/react-virtual)
 * - Intersection Observer for seamless pagination
 * - Framer Motion layout animations and gestures
 * - Dark/Light mode glassmorphic UI
 * - Multiple sorting algorithms (Trending, Latest, Top)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useWindowVirtualizer, VirtualItem } from '@tanstack/react-virtual';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';

// Supabase & Types
import { supabase, AppError, parseSupabaseError } from '../../lib/supabase';
import type { ConfessionWithRelations, Database, VoteType } from '../../lib/types';

// Components
import { ConfessionCard, ConfessionCardSkeleton } from '../components/ConfessionCard';

// ============================================================================
// TYPES & ENUMS
// ============================================================================

type FeedSortType = 'latest' | 'trending' | 'top' | 'pinned';

interface FeedPageProps {
  currentUserId?: string; // Passed down from auth provider
}

interface FetchFeedParams {
  pageParam?: number;
  sortType: FeedSortType;
  userId?: string;
  limit?: number;
}

// ============================================================================
// ICONS (Raw SVG to avoid heavy dependencies)
// ============================================================================

const Icons = {
  Trending: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Latest: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Top: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Create: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Search: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Filter: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
};

// ============================================================================
// API SERVICE LOGIC
// ============================================================================

/**
 * Fetches confessions with relational data (author, group).
 * Merges the current user's votes and saves manually since PostgREST
 * doesn't support complex embedded filtered relations easily without RPCs.
 */
const fetchFeed = async ({ pageParam = 0, sortType, userId, limit = 15 }: FetchFeedParams): Promise<{
  data: ConfessionWithRelations[];
  nextPageToken: number | null;
}> => {
  try {
    const from = pageParam * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('confessions')
      .select(`
        *,
        author:profiles(id, username, avatar_url, is_verified),
        group:groups(id, name, slug, avatar_url)
      `);

    // Apply Sorting Algorithms
    switch (sortType) {
      case 'latest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'trending':
        query = query.order('is_trending', { ascending: false })
                     .order('upvotes_count', { ascending: false })
                     .order('created_at', { ascending: false });
        break;
      case 'top':
        // Calculate top by highest karma (upvotes - downvotes) implicitly via upvotes for simplicity here,
        // In a strict prod environment, a database view or RPC should compute `score = upvotes - downvotes`
        query = query.order('upvotes_count', { ascending: false });
        break;
      case 'pinned':
        query = query.eq('is_pinned', true).order('created_at', { ascending: false });
        break;
    }

    // Execute Pagination
    const { data: confessionsData, error: confessionsError } = await query.range(from, to);

    if (confessionsError) throw confessionsError;

    if (!confessionsData || confessionsData.length === 0) {
      return { data: [], nextPageToken: null };
    }

    let enrichedData: ConfessionWithRelations[] = confessionsData as ConfessionWithRelations[];

    // If user is logged in, fetch their specific interaction states (Votes, Bookmarks)
    if (userId && enrichedData.length > 0) {
      const confessionIds = enrichedData.map(c => c.id);

      // Fetch User Votes
      const { data: votesData } = await supabase
        .from('votes')
        .select('target_id, value')
        .eq('user_id', userId)
        .eq('target_type', 'confession')
        .in('target_id', confessionIds);

      // Fetch User Bookmarks (Saved)
      const { data: savesData } = await supabase
        .from('bookmarks')
        .select('confession_id')
        .eq('user_id', userId)
        .in('confession_id', confessionIds);

      // Map relational data back into the confession objects
      const votesMap = new Map(votesData?.map(v => [v.target_id, v.value as VoteType]));
      const savesSet = new Set(savesData?.map(s => s.confession_id));

      enrichedData = enrichedData.map(confession => ({
        ...confession,
        user_vote: votesMap.get(confession.id) || null,
        is_saved: savesSet.has(confession.id)
      }));
    }

    return {
      data: enrichedData,
      nextPageToken: confessionsData.length === limit ? pageParam + 1 : null
    };

  } catch (error) {
    throw parseSupabaseError(error);
  }
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

/**
 * Filter Tabs Component
 * Uses Framer Motion for the sliding active indicator pill.
 */
const FilterTabs: React.FC<{
  activeSort: FeedSortType;
  setSort: (sort: FeedSortType) => void;
}> = ({ activeSort, setSort }) => {
  const tabs: { id: FeedSortType; label: string; icon: React.FC<any> }[] = [
    { id: 'latest', label: 'Latest', icon: Icons.Latest },
    { id: 'trending', label: 'Trending', icon: Icons.Trending },
    { id: 'top', label: 'Top', icon: Icons.Top },
  ];

  return (
    <div className="flex items-center space-x-1 p-1 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl w-full max-w-2xl mx-auto mb-6 sticky top-20 z-40 border border-gray-200 dark:border-gray-700/50">
      {tabs.map((tab) => {
        const isActive = activeSort === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setSort(tab.id)}
            className={`relative flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 z-10 ${
              isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
            }`}
            aria-selected={isActive}
            role="tab"
          >
            {isActive && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50"
                initial={false}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{ zIndex: -1 }}
              />
            )}
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Inline Create Post Widget
 * Sits at the top of the feed to encourage interaction.
 */
const InlineComposer: React.FC = () => {
  return (
    <div 
      className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 mb-6 flex items-center space-x-4 cursor-text group transition-shadow hover:shadow-md"
      onClick={() => {
        // In a real app, this would open the NewConfessionModal via context/zustand or route to /ask
        toast('Create Modal opens here', { icon: '✍️' });
      }}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 text-white shadow-inner">
        <Icons.Create className="w-5 h-5" />
      </div>
      <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-2xl py-3 px-4 border border-gray-100 dark:border-gray-700/50 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30 transition-colors">
        <p className="text-gray-500 dark:text-gray-400 text-[15px]">Confess something anonymously...</p>
      </div>
    </div>
  );
};

/**
 * Empty State Component
 */
const EmptyFeedState: React.FC<{ filter: string }> = ({ filter }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 px-4 text-center"
  >
    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
      <span className="text-3xl">📭</span>
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Confessions Found</h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
      There are no {filter} confessions to display right now. Be the first to break the silence!
    </p>
    <button className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">
      Post a Confession
    </button>
  </motion.div>
);

// ============================================================================
// MAIN FEED COMPONENT
// ============================================================================

export const Feed: React.FC<FeedPageProps> = ({ currentUserId }) => {
  const queryClient = useQueryClient();
  const [activeSort, setActiveSort] = useState<FeedSortType>('trending');

  // --- Data Fetching (React Query Infinite) ---
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    refetch
  } = useInfiniteQuery({
    queryKey: ['feed', activeSort, currentUserId],
    queryFn: ({ pageParam }) => fetchFeed({ pageParam: pageParam as number, sortType: activeSort, userId: currentUserId }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes to prevent over-fetching on rapid unmounts
  });

  // Flatten the pages array from React Query into a single array of items
  const flatData = React.useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? [];
  }, [data]);

  // --- Intersection Observer for Infinite Scroll ---
  const { ref: loadMoreRef, inView } = useInView({
    rootMargin: '400px', // Trigger fetch 400px before reaching the end of the list
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // --- Virtualization (DOM Performance) ---
  // Calculates dynamic heights of items to prevent DOM bloat on massive feeds.
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useWindowVirtualizer({
    count: flatData.length,
    estimateSize: () => 250, // Average height of a ConfessionCard in px
    overscan: 3, // Render 3 items outside viewport for smooth scrolling
  });

  // --- Event Handlers ---
  const handleHideConfession = useCallback((confessionId: string) => {
    // Optimistically remove from cache
    queryClient.setQueryData(['feed', activeSort, currentUserId], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          data: page.data.filter((c: ConfessionWithRelations) => c.id !== confessionId)
        }))
      };
    });
    toast.success('Confession hidden from your feed.', { position: 'bottom-center' });
  }, [queryClient, activeSort, currentUserId]);

  const handleDeleteConfession = useCallback((confessionId: string) => {
    handleHideConfession(confessionId); // Same cache removal logic applies
  }, [handleHideConfession]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center space-x-3 mb-4 max-w-md w-full border border-red-100 dark:border-red-800/50">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-bold">Failed to load feed</h4>
            <p className="text-sm opacity-90">{(error as Error).message || 'Check your connection.'}</p>
          </div>
        </div>
        <button 
          onClick={() => refetch()}
          className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-medium shadow-sm hover:scale-105 transition-transform"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-24 pt-4 px-3 sm:px-0">
      
      {/* Top Header / Header Search actions (Mobile mostly) */}
      <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-4 sm:hidden">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">AnonRM</h1>
        <div className="flex space-x-2">
          <button className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300">
            <Icons.Search className="w-5 h-5" />
          </button>
          <button className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300">
            <Icons.Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <InlineComposer />
      
      <FilterTabs activeSort={activeSort} setSort={setActiveSort} />

      {/* Main Feed Content Area */}
      <main className="w-full max-w-2xl mx-auto relative">
        
        {/* Initial Loading State */}
        {status === 'pending' ? (
          <div className="space-y-4">
            <ConfessionCardSkeleton />
            <ConfessionCardSkeleton />
            <ConfessionCardSkeleton />
          </div>
        ) : flatData.length === 0 ? (
          <EmptyFeedState filter={activeSort} />
        ) : (
          /* Virtualized List Container */
          <div ref={parentRef} className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
              const confession = flatData[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <ConfessionCard
                    confession={confession}
                    currentUserId={currentUserId}
                    onHideSuccess={handleHideConfession}
                    onDeleteSuccess={handleDeleteConfession}
                  />
                  
                  {/* Future Ready Sponsored Area Placeholder - Injected dynamically every ~10 posts */}
                  {virtualItem.index > 0 && virtualItem.index % 10 === 0 && (
                    <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl p-4 mb-4 border border-blue-100 dark:border-blue-800/30 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Sponsored</span>
                        <h4 className="text-gray-900 dark:text-white font-medium text-sm sm:text-base">Join the ultimate developer community today.</h4>
                      </div>
                      <button className="text-sm font-semibold px-4 py-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        Learn More
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Infinite Scroll Trigger & Loader */}
        <div ref={loadMoreRef} className="w-full py-8 flex justify-center items-center h-24">
          {isFetchingNextPage ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900 dark:border-t-indigo-400" />
              <span className="text-sm text-gray-500 font-medium">Loading more secrets...</span>
            </div>
          ) : hasNextPage ? (
            <span className="text-sm text-transparent">Scroll for more</span> // Hidden text to keep DOM height consistent
          ) : flatData.length > 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">You've reached the bottom of the void.</p>
            </div>
          ) : null}
        </div>

      </main>
    </div>
  );
};

export default Feed;
