import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { censorMessage } from '../utils/censor';

// --- Types ---
interface ProfileStats {
  confessions: number;
  followers: number;
  following: number;
}

interface UserConfession {
  id: string;
  text: string;
  upvotes: number;
  comments: number;
}

interface AnonymousReply {
  id: string;
  text: string;
  time: string;
  isRead: boolean;
}

// --- Mock Data ---
const MOCK_USER = {
  username: "alex_dev",
  name: "Alex",
  bio: "Building cool things and breaking production. 🚀",
  stats: { confessions: 14, followers: 1205, following: 84 }
};

const MOCK_CONFESSIONS: UserConfession[] = [
  { id: "c1", text: "I act like a senior dev but I still google 'how to center a div' every time. What a shit show.", upvotes: 342, comments: 12 },
  { id: "c2", text: "Sometimes I just stare at my VS Code so my boss thinks I'm deep in thought.", upvotes: 89, comments: 3 },
  { id: "c3", text: "I deployed to prod on a Friday and didn't tell anyone.", upvotes: 450, comments: 45 },
  { id: "c4", text: "I use light theme when I want to feel chaotic.", upvotes: 12, comments: 1 },
  { id: "c5", text: "I don't actually know how Docker works, I just copy-paste the config.", upvotes: 890, comments: 120 },
];

const MOCK_REPLIES: AnonymousReply[] = [
  { id: "r1", text: "Are you actually dropping the app this month? It looks fire.", time: "2h ago", isRead: false },
  { id: "r2", text: "Who was that girl you were with at the cafe yesterday? 👀", time: "5h ago", isRead: true },
  { id: "r3", text: "Can you do a tutorial on how you set up your Vite config?", time: "1d ago", isRead: true },
];

// --- Skeleton ---
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
    <div className="w-full h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl mb-8"></div>
    
    <div className="grid grid-cols-3 gap-1">
      {[1,2,3,4,5,6].map(i => (
        <div key={i} className="aspect-square bg-zinc-200 dark:bg-zinc-800"></div>
      ))}
    </div>
  </div>
);

export default function Profile() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'confessions' | 'replies'>('confessions');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [storyReplyText, setStoryReplyText] = useState("");
  
  const captureRef = useRef<HTMLDivElement>(null);
  const askLink = `confessapp.com/ask/${MOCK_USER.username}`;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(askLink);
    alert("Anonymous link copied! Add it to your Instagram bio or story.");
  };

  const handleShareToStory = () => {
    // Placeholder for html2canvas execution
    console.log("Generating image and sharing to IG Story...");
    alert("In production, this opens Instagram with the generated sticker.");
  };

  return (
    <div className="w-full min-h-screen flex flex-col pb-20">
      {/* Header */}
      <header className="glass-header sticky top-0 z-40 px-4 py-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <h1 className="text-xl font-bold tracking-tight">{MOCK_USER.username}</h1>
        </div>
        <button className="text-zinc-900 dark:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </header>

      {isLoading ? <ProfileSkeleton /> : (
        <div className="animate-fade-in flex flex-col">
          
          {/* Profile Info (Insta Style) */}
          <div className="px-4 pt-6 pb-4">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white font-black text-3xl shrink-0 border-2 border-transparent ring-2 ring-zinc-100 dark:ring-zinc-900">
                {MOCK_USER.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 flex justify-between items-center px-2">
                <div className="flex flex-col items-center">
                  <span className="font-bold text-lg">{MOCK_USER.stats.confessions}</span>
                  <span className="text-xs text-zinc-500 font-medium">Posts</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-lg">{MOCK_USER.stats.followers}</span>
                  <span className="text-xs text-zinc-500 font-medium">Followers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-lg">{MOCK_USER.stats.following}</span>
                  <span className="text-xs text-zinc-500 font-medium">Following</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm">{MOCK_USER.name}</span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{MOCK_USER.bio}</span>
            </div>
          </div>

          {/* NGL Style Link Widget */}
          <div className="px-4 mb-6">
            <div className="w-full bg-gradient-to-r from-primary/10 to-purple-600/10 border border-primary/20 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Get anonymous messages!</span>
                  <span className="text-xs font-medium text-primary">{askLink}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCopyLink} className="flex-1 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 text-sm font-bold py-2 rounded-xl">
                  Copy Link
                </button>
                <button className="flex-1 bg-primary text-white text-sm font-bold py-2 rounded-xl">
                  Share on IG
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-zinc-200 dark:border-zinc-800">
            <button 
              onClick={() => setActiveTab('confessions')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 flex justify-center transition-colors ${activeTab === 'confessions' ? 'border-primary text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </button>
            <button 
              onClick={() => setActiveTab('replies')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 flex justify-center transition-colors relative ${activeTab === 'replies' ? 'border-primary text-zinc-900 dark:text-white' : 'border-transparent text-zinc-500'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              {/* Unread indicator dot */}
              <span className="absolute top-3 right-1/3 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 w-full">
            
            {/* --- Confessions Grid (Insta Style) --- */}
            {activeTab === 'confessions' && (
              <div className="grid grid-cols-3 gap-0.5 animate-fade-in bg-zinc-200 dark:bg-zinc-800">
                {MOCK_CONFESSIONS.map((confession) => (
                  <Link 
                    to={`/u/${MOCK_USER.username}/${confession.id}`} 
                    key={confession.id}
                    className="aspect-square bg-zinc-100 dark:bg-zinc-900 p-2 overflow-hidden relative group hover:opacity-90 transition-opacity flex flex-col justify-center text-center"
                  >
                    <p className="text-[10px] md:text-xs font-medium leading-tight text-zinc-800 dark:text-zinc-200 line-clamp-4">
                      {censorMessage(confession.text)}
                    </p>
                    
                    {/* Hover Overlay with Stats (Insta Style) */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        <span className="text-xs font-bold">{confession.upvotes}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* --- Story Replies Inbox (NGL Style) --- */}
            {activeTab === 'replies' && (
              <div className="flex flex-col p-4 gap-4 animate-fade-in">
                {MOCK_REPLIES.map((reply) => (
                  <div key={reply.id} className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                    {/* Reply Preview */}
                    <div className="p-4 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {!reply.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>}
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Anonymous Message</span>
                        </div>
                        <span className="text-xs text-zinc-400 font-medium">{reply.time}</span>
                      </div>
                      <p className="text-base font-bold leading-snug">{censorMessage(reply.text)}</p>
                    </div>

                    {/* Action Bar */}
                    <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 flex gap-2">
                      {activeReplyId !== reply.id ? (
                        <button 
                          onClick={() => setActiveReplyId(reply.id)}
                          className="w-full bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 text-sm font-bold py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Reply on Story
                        </button>
                      ) : (
                        <button 
                          onClick={() => setActiveReplyId(null)}
                          className="w-full text-zinc-500 text-sm font-bold py-2.5"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {/* Active Reply Editor (Expands when clicking "Reply on Story") */}
                    {activeReplyId === reply.id && (
                      <div className="p-4 bg-zinc-100 dark:bg-black border-t border-zinc-200 dark:border-zinc-800 animate-slide-up">
                        
                        {/* IG Story Sticker Preview */}
                        <div 
                          ref={captureRef}
                          className="w-full aspect-[4/5] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 flex flex-col justify-center gap-4 relative overflow-hidden shadow-xl"
                        >
                          {/* The Question Box */}
                          <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-white/20 dark:border-zinc-800/50">
                            <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2 text-center">
                              Send me anonymous messages
                            </div>
                            <p className="text-zinc-900 dark:text-white font-bold text-lg text-center leading-snug mb-3">
                              {censorMessage(reply.text)}
                            </p>
                            <div className="w-full h-10 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-800/50">
                              <span className="text-xs font-semibold text-zinc-400">confess.app/ask/{MOCK_USER.username}</span>
                            </div>
                          </div>

                          {/* The Answer Box (Live preview as user types) */}
                          {storyReplyText && (
                            <div className="bg-transparent text-white text-center p-2 animate-fade-in">
                              <p className="font-bold text-xl drop-shadow-md whitespace-pre-wrap">{censorMessage(storyReplyText)}</p>
                            </div>
                          )}
                        </div>

                        {/* Text Input & Export */}
                        <div className="mt-4 flex flex-col gap-3">
                          <textarea
                            value={storyReplyText}
                            onChange={(e) => setStoryReplyText(e.target.value)}
                            placeholder="Type your reply here..."
                            className="w-full bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 outline-none resize-none h-24 text-sm"
                          />
                          <button 
                            onClick={handleShareToStory}
                            className="w-full bg-primary hover:bg-primaryHover text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Export & Share to IG
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
