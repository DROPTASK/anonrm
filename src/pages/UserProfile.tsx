// src/pages/UserProfile.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { censorMessage } from '../utils/censor';

// --- Types & Mocks ---
interface UserConfession {
  id: string;
  text: string;
  upvotes: number;
}

const MOCK_CONFESSIONS: UserConfession[] = [
  { id: "conf_1", text: "I act like a senior dev but I still google 'how to center a div' every time. Don't tell my boss. What a shit show.", upvotes: 342 },
  { id: "conf_a", text: "I pretend my code is compiling when I just want a coffee break.", upvotes: 89 },
  { id: "conf_b", text: "I dropped the prod DB today and blamed it on AWS.", upvotes: 450 },
];

const ProfileSkeleton = () => (
  <div className="flex flex-col w-full animate-pulse p-4">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-800 rounded-full shrink-0"></div>
      <div className="flex-1 flex justify-between px-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-8 h-4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            <div className="w-12 h-3 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
          </div>
        ))}
      </div>
    </div>
    <div className="w-32 h-4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2"></div>
    <div className="w-48 h-3 bg-zinc-100 dark:bg-zinc-900 rounded mb-6"></div>
    <div className="w-full h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl mb-8"></div>
    <div className="grid grid-cols-3 gap-1">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="aspect-square bg-zinc-200 dark:bg-zinc-800"></div>
      ))}
    </div>
  </div>
);

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [username]);

  return (
    <div className="w-full min-h-screen flex flex-col pb-20">
      {/* Header */}
      <header className="glass-header sticky top-0 z-40 px-4 py-4 flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800">
        <button onClick={() => navigate(-1)} className="text-zinc-900 dark:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold tracking-tight">{username}</h1>
      </header>

      {isLoading ? <ProfileSkeleton /> : (
        <div className="animate-fade-in flex flex-col">
          {/* Profile Info */}
          <div className="px-4 pt-6 pb-4">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-3xl shrink-0">
                {username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 flex justify-between items-center px-2">
                <div className="flex flex-col items-center">
                  <span className="font-bold text-lg">3</span>
                  <span className="text-xs text-zinc-500 font-medium">Posts</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-lg">1.2k</span>
                  <span className="text-xs text-zinc-500 font-medium">Followers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-lg">84</span>
                  <span className="text-xs text-zinc-500 font-medium">Following</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-1 mb-6">
              <span className="font-bold text-sm">Developer Secrets</span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Just venting about production bugs. 🐛</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-2">
              <button 
                onClick={() => setIsFollowing(!isFollowing)}
                className={`flex-1 font-bold py-2 rounded-xl text-sm transition-colors ${isFollowing ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'bg-primary text-white'}`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <Link 
                to={`/ask/${username}`}
                className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Anonymous Msg
              </Link>
            </div>
          </div>

          <div className="w-full border-t border-zinc-200 dark:border-zinc-800 mb-0.5"></div>

          {/* Grid */}
          <div className="grid grid-cols-3 gap-0.5 bg-zinc-200 dark:bg-zinc-800">
            {MOCK_CONFESSIONS.map((confession) => (
              <Link 
                to={`/u/${username}/${confession.id}`} 
                key={confession.id}
                className="aspect-square bg-zinc-100 dark:bg-zinc-900 p-2 overflow-hidden relative group flex flex-col justify-center text-center hover:opacity-90 transition-opacity"
              >
                <p className="text-[10px] md:text-xs font-medium leading-tight text-zinc-800 dark:text-zinc-200 line-clamp-4">
                  {censorMessage(confession.text)}
                </p>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    <span className="text-xs font-bold">{confession.upvotes}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
