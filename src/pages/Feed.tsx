// src/pages/Feed.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { censorMessage } from '../utils/censor';

// --- Types ---
interface Comment {
  id: string;
  author: string;
  text: string;
  time: string;
}

interface Confession {
  id: string;
  author: string;
  text: string;
  time: string;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
  comments: Comment[];
}

// --- Skeleton Loader Component ---
const FeedSkeleton = () => (
  <div className="flex flex-col w-full animate-pulse">
    {[1, 2, 3].map((i) => (
      <div key={i} className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
          <div className="flex flex-col gap-2">
            <div className="w-24 h-3 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            <div className="w-16 h-2 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
          </div>
        </div>
        <div className="w-full h-4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2"></div>
        <div className="w-3/4 h-4 bg-zinc-200 dark:bg-zinc-800 rounded mb-6"></div>
        <div className="flex gap-6">
          <div className="w-16 h-6 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="w-16 h-6 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

export default function Feed() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<Confession[]>([]);
  const [composeText, setComposeText] = useState("");
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  // Simulate network fetch
  useEffect(() => {
    setTimeout(() => {
      setPosts([
        {
          id: "conf_1",
          author: "anonymous_dev",
          text: "I act like a senior dev but I still google 'how to center a div' every time. Don't tell my boss. What a shit show.",
          time: "2h ago",
          upvotes: 342,
          downvotes: 12,
          userVote: null,
          comments: [
            { id: "c1", author: "frontend_god", text: "Flexbox is your friend.", time: "1h ago" },
            { id: "c2", author: "backend_bro", text: "Bro same.", time: "45m ago" }
          ]
        },
        {
          id: "conf_2",
          author: "gym_rat99",
          text: "I only go to the gym so I can listen to Taylor Swift without my friends judging me.",
          time: "5h ago",
          upvotes: 1205,
          downvotes: 45,
          userVote: 'up',
          comments: []
        }
      ]);
      setIsLoading(false);
    }, 1500);
  }, []);

  const handleVote = (postId: string, type: 'up' | 'down') => {
    setPosts(currentPosts => currentPosts.map(post => {
      if (post.id !== postId) return post;
      
      let newUpvotes = post.upvotes;
      let newDownvotes = post.downvotes;
      let newUserVote = type;

      // Remove existing vote
      if (post.userVote === 'up') newUpvotes--;
      if (post.userVote === 'down') newDownvotes--;

      // Toggle off if clicking same vote again
      if (post.userVote === type) {
        newUserVote = null;
      } else {
        // Apply new vote
        if (type === 'up') newUpvotes++;
        if (type === 'down') newDownvotes++;
      }

      return { ...post, upvotes: newUpvotes, downvotes: newDownvotes, userVote: newUserVote };
    }));
  };

  const handleShare = (username: string, confId: string) => {
    // In production, this uses Web Share API or copies to clipboard
    const url = `${window.location.origin}/u/${username}/${confId}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-header sticky top-0 z-40 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">ConfessApp</h1>
        <Link to="/profile" className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex items-center justify-center font-bold text-zinc-500">
          U
        </Link>
      </header>

      {/* Compose */}
      <div className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <textarea
          value={composeText}
          onChange={(e) => setComposeText(e.target.value)}
          placeholder="Confess something..."
          className="w-full bg-transparent text-lg resize-none outline-none placeholder:text-zinc-500 dark:text-zinc-50 min-h-[60px]"
          maxLength={300}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-zinc-500 font-medium">{composeText.length}/300</span>
          <button 
            disabled={!composeText.trim()}
            className="bg-primary hover:bg-primaryHover disabled:opacity-50 text-white font-bold py-1.5 px-5 rounded-full text-sm transition-all"
          >
            Post
          </button>
        </div>
      </div>

      {/* Feed Content */}
      <div className="flex flex-col pb-6">
        {isLoading ? <FeedSkeleton /> : posts.map((post, index) => (
          <article 
            key={post.id} 
            className="p-4 border-b border-zinc-200 dark:border-zinc-800 animate-slide-up bg-white dark:bg-[#09090b]"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Post Header */}
            <div className="flex items-center justify-between mb-3">
              <Link to={`/u/${post.author}`} className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                  {post.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold group-hover:underline">@{post.author}</h3>
                  <p className="text-xs text-zinc-500">{post.time}</p>
                </div>
              </Link>
              <button onClick={() => navigate(`/u/${post.author}/${post.id}`)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
              </button>
            </div>

            {/* Post Body (Censored) */}
            <p className="text-base font-medium leading-snug mb-4 break-words">
              {censorMessage(post.text)}
            </p>
            
            {/* Action Bar (Reddit + Insta style) */}
            <div className="flex items-center gap-6 text-zinc-500 dark:text-zinc-400">
              
              {/* Upvote / Downvote */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full">
                <button onClick={() => handleVote(post.id, 'up')} className={`p-2 rounded-l-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition ${post.userVote === 'up' ? 'text-orange-500' : ''}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
                <span className="text-sm font-bold px-2">{post.upvotes - post.downvotes}</span>
                <button onClick={() => handleVote(post.id, 'down')} className={`p-2 rounded-r-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition ${post.userVote === 'down' ? 'text-indigo-500' : ''}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              
              {/* Comment Button */}
              <button 
                onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <span className="text-sm font-bold">{post.comments.length}</span>
              </button>

              {/* Share Button */}
              <button onClick={() => handleShare(post.author, post.id)} className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors ml-auto">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
            </div>

            {/* Inline Comments Section */}
            {activeCommentPost === post.id && (
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50 animate-fade-in">
                {post.comments.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {post.comments.map(c => (
                      <div key={c.id} className="flex gap-2 text-sm">
                        <Link to={`/u/${c.author}`} className="font-bold shrink-0 hover:underline">{c.author}</Link>
                        <span className="text-zinc-700 dark:text-zinc-300 break-words">{censorMessage(c.text)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 mb-4">No comments yet. Be the first!</p>
                )}
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-full px-4 py-2 text-sm outline-none"
                  />
                  <button className="text-primary font-bold px-3 text-sm" disabled={!commentText.trim()}>Post</button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
