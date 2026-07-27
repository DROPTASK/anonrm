// src/pages/SingleConfession.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { censorMessage } from '../utils/censor';

// --- Types & Mocks ---
interface Comment {
  id: string;
  author: string;
  text: string;
  time: string;
}

interface ConfessionDetail {
  id: string;
  author: string;
  text: string;
  time: string;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
  comments: Comment[];
}

const DetailSkeleton = () => (
  <div className="flex flex-col w-full animate-pulse p-4">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
      <div className="flex flex-col gap-2">
        <div className="w-24 h-4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
        <div className="w-16 h-3 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
      </div>
    </div>
    <div className="w-full h-6 bg-zinc-200 dark:bg-zinc-800 rounded mb-2"></div>
    <div className="w-full h-6 bg-zinc-200 dark:bg-zinc-800 rounded mb-2"></div>
    <div className="w-2/3 h-6 bg-zinc-200 dark:bg-zinc-800 rounded mb-8"></div>
    <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-4"></div>
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
          <div className="flex-1">
            <div className="w-20 h-3 bg-zinc-200 dark:bg-zinc-800 rounded mb-2"></div>
            <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function SingleConfession() {
  const { username, confessionId } = useParams<{ username: string, confessionId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [post, setPost] = useState<ConfessionDetail | null>(null);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    // Simulate fetch
    setTimeout(() => {
      setPost({
        id: confessionId || "conf_1",
        author: username || "anonymous_dev",
        text: "I act like a senior dev but I still google 'how to center a div' every time. Don't tell my boss. What a shit show.",
        time: "2h ago",
        upvotes: 342,
        downvotes: 12,
        userVote: null,
        comments: [
          { id: "c1", author: "frontend_god", text: "Flexbox is your friend. But yeah, been there.", time: "1h ago" },
          { id: "c2", author: "backend_bro", text: "I just use float and hope for the best.", time: "45m ago" },
          { id: "c3", text: "Bro same. Css is hell.", author: "random_guy", time: "10m ago"}
        ]
      });
      setIsLoading(false);
    }, 800);
  }, [username, confessionId]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Confession link copied to clipboard!");
  };

  if (isLoading) return (
    <div className="w-full min-h-screen flex flex-col">
      <header className="glass-header sticky top-0 z-40 px-4 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
        <h1 className="text-xl font-bold">Confession</h1>
      </header>
      <DetailSkeleton />
    </div>
  );

  if (!post) return null;

  return (
    <div className="w-full min-h-screen flex flex-col pb-20">
      <header className="glass-header sticky top-0 z-40 px-4 py-4 flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800">
        <button onClick={() => navigate(-1)} className="text-zinc-900 dark:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold tracking-tight">Confession</h1>
      </header>

      <div className="flex-1 overflow-y-auto animate-fade-in">
        {/* Main Post */}
        <div className="p-4 bg-white dark:bg-[#09090b]">
          <Link to={`/u/${post.author}`} className="flex items-center gap-3 mb-4 group inline-flex">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {post.author.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold group-hover:underline">@{post.author}</h3>
              <p className="text-xs text-zinc-500 font-medium">{post.time}</p>
            </div>
          </Link>

          <p className="text-xl md:text-2xl font-semibold leading-relaxed mb-6 break-words">
            {censorMessage(post.text)}
          </p>

          <div className="flex items-center justify-between border-y border-zinc-200 dark:border-zinc-800 py-3">
            {/* Voting */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full">
              <button className={`p-2.5 rounded-l-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition ${post.userVote === 'up' ? 'text-orange-500' : 'text-zinc-500'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7-7" /></svg>
              </button>
              <span className="text-base font-bold px-3 text-zinc-700 dark:text-zinc-300">{post.upvotes - post.downvotes}</span>
              <button className={`p-2.5 rounded-r-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition ${post.userVote === 'down' ? 'text-indigo-500' : 'text-zinc-500'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7-7-7-7" /></svg>
              </button>
            </div>
            
            <button onClick={handleShare} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-bold text-sm bg-zinc-100 dark:bg-zinc-900 px-4 py-2.5 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Share
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="px-4 py-2 bg-white dark:bg-[#09090b]">
          <h4 className="font-bold text-sm text-zinc-500 mb-4">Comments ({post.comments.length})</h4>
          <div className="flex flex-col gap-5">
            {post.comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <Link to={`/u/${comment.author}`} className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-xs font-bold text-zinc-500 mt-1">
                  {comment.author.charAt(0).toUpperCase()}
                </Link>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <Link to={`/u/${comment.author}`} className="font-bold text-sm hover:underline">{comment.author}</Link>
                    <span className="text-[10px] text-zinc-500 font-medium">{comment.time}</span>
                  </div>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug break-words">
                    {censorMessage(comment.text)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Comment Input */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 p-3 flex gap-3 z-40">
        <input 
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-full px-4 py-2.5 outline-none text-sm border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-colors"
        />
        <button 
          disabled={!commentText.trim()}
          className="bg-primary hover:bg-primaryHover disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-full text-sm transition-colors"
        >
          Post
        </button>
      </div>
    </div>
  );
}
