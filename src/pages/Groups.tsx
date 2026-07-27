import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { censorMessage } from '../utils/censor';

// --- Types ---
interface Group {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private';
  memberCount: number;
  lastMessage?: string;
  time?: string;
  unread?: number;
}

interface ChatMessage {
  id: string;
  sender: string; // 'me', 'other', or 'anonymous'
  senderName?: string;
  text: string;
  time: string;
  isConfession: boolean;
}

// --- Mock Data ---
const MOCK_MY_GROUPS: Group[] = [
  { id: 'g1', name: 'Dev Confessions', description: 'Safe space for dev rants.', type: 'private', memberCount: 142, lastMessage: 'I dropped the prod DB today...', time: '10:42 AM', unread: 3 },
  { id: 'g2', name: 'College Secrets', description: 'What happens here stays here.', type: 'public', memberCount: 890, lastMessage: 'Anyone going to the party tonight?', time: 'Yesterday', unread: 0 },
];

const MOCK_EXPLORE: Group[] = [
  { id: 'g3', name: 'Startup Failures', description: 'Vent about your failed startups anonymously.', type: 'public', memberCount: 3400 },
  { id: 'g4', name: 'Late Night Thoughts', description: 'Deep conversations only.', type: 'public', memberCount: 12500 },
];

const MOCK_CHAT: ChatMessage[] = [
  { id: 'm1', sender: 'other', senderName: 'alex_dev', text: 'Did anyone figure out the new API limits?', time: '10:30 AM', isConfession: false },
  { id: 'm2', sender: 'me', text: 'Yeah, they throttled it to 100 req/min.', time: '10:32 AM', isConfession: false },
  { id: 'm3', sender: 'anonymous', text: 'I bypassed the rate limit by creating 50 fake accounts. Please don\'t tell anyone.', time: '10:42 AM', isConfession: true },
];

// --- Skeleton Loaders ---
const ListSkeleton = () => (
  <div className="flex flex-col w-full animate-pulse">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex items-center gap-3 p-4 border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full shrink-0"></div>
        <div className="flex-1">
          <div className="w-32 h-4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2"></div>
          <div className="w-48 h-3 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

// --- Sub-components ---

// 1. Group List & Explore Home
function GroupsHome() {
  const [activeTab, setActiveTab] = useState<'chats' | 'explore'>('chats');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [activeTab]);

  return (
    <div className="flex flex-col w-full min-h-screen relative pb-20">
      {/* Header & Tabs */}
      <header className="glass-header sticky top-0 z-40 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold tracking-tight">Groups</h1>
          <button className="text-zinc-900 dark:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
        </div>
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
          <button onClick={() => { setActiveTab('chats'); setIsLoading(true); }} className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'chats' ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'text-zinc-500'}`}>
            Chats
          </button>
          <button onClick={() => { setActiveTab('explore'); setIsLoading(true); }} className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'explore' ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'text-zinc-500'}`}>
            Explore
          </button>
        </div>
      </header>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? <ListSkeleton /> : (
          <div className="flex flex-col animate-fade-in">
            {(activeTab === 'chats' ? MOCK_MY_GROUPS : MOCK_EXPLORE).map((group) => (
              <Link key={group.id} to={`/groups/${group.id}`} className="flex items-center gap-3 p-4 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {group.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-base truncate">{group.name}</h3>
                    {activeTab === 'chats' && group.time && <span className="text-xs font-medium text-zinc-500 shrink-0 ml-2">{group.time}</span>}
                  </div>
                  {activeTab === 'chats' ? (
                    <p className="text-sm text-zinc-500 truncate font-medium">{group.lastMessage}</p>
                  ) : (
                    <p className="text-sm text-zinc-500 truncate font-medium">{group.memberCount.toLocaleString()} members</p>
                  )}
                </div>
                {activeTab === 'chats' && group.unread ? (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {group.unread}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB to Create Group */}
      <Link to="/groups/new" className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-50">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
      </Link>
    </div>
  );
}

// 2. Chat View (Telegram Style)
function ChatView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isConfessionMode, setIsConfessionMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Mock fetching group details based on ID
  const groupName = id === 'g1' ? 'Dev Confessions' : 'Secret Group';

  return (
    <div className="flex flex-col h-screen w-full bg-[#f4f4f5] dark:bg-black fixed inset-0 z-50 max-w-md mx-auto">
      {/* Telegram-style Header */}
      <header className="glass-header px-2 py-3 flex items-center gap-3 shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <button onClick={() => navigate(-1)} className="p-2 text-zinc-600 dark:text-zinc-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-3 flex-1 cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {groupName.charAt(0)}
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-base leading-tight">{groupName}</h2>
            <span className="text-xs text-zinc-500 font-medium">142 members</span>
          </div>
        </div>
        <button className="p-2 text-zinc-600 dark:text-zinc-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="text-center text-xs font-semibold text-zinc-400 my-2">Today</div>
        
        {MOCK_CHAT.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.isConfession ? 'justify-center my-2' : msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            
            {/* Standard Message Bubble */}
            {!msg.isConfession && (
              <div className={`max-w-[80%] flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                {msg.sender === 'other' && <span className="text-xs font-bold text-zinc-500 ml-1 mb-1">{msg.senderName}</span>}
                <div className={`px-4 py-2 rounded-2xl text-[15px] leading-snug ${
                  msg.sender === 'me' 
                    ? 'bg-primary text-white rounded-br-sm' 
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-bl-sm'
                }`}>
                  {censorMessage(msg.text)}
                </div>
                <span className="text-[10px] text-zinc-400 font-medium mt-1 mx-1">{msg.time}</span>
              </div>
            )}

            {/* Confession Card Setup */}
            {msg.isConfession && (
              <div className="w-[90%] bg-gradient-to-br from-zinc-900 to-black dark:from-zinc-800 dark:to-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-purple-500 to-primary"></div>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" /></svg>
                  <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Anonymous Confession</span>
                </div>
                <p className="text-white text-lg font-medium leading-relaxed">
                  {censorMessage(msg.text)}
                </p>
                <span className="text-[10px] text-zinc-500 font-medium mt-3 block text-right">{msg.time}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-[#09090b] border-t border-zinc-200 dark:border-zinc-800 p-2 shrink-0">
        <div className={`flex items-end gap-2 p-1 rounded-3xl border transition-colors ${
          isConfessionMode ? 'border-primary bg-primary/5' : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900'
        }`}>
          {/* Toggle Confession Mode Button */}
          <button 
            onClick={() => setIsConfessionMode(!isConfessionMode)}
            className={`p-2.5 rounded-full shrink-0 transition-colors ${isConfessionMode ? 'bg-primary text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
            title="Toggle Confession Mode"
          >
             <svg className="w-6 h-6" fill={isConfessionMode ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
             </svg>
          </button>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isConfessionMode ? "Type an anonymous confession..." : "Message"}
            className="flex-1 bg-transparent max-h-32 min-h-[44px] py-3 text-[15px] resize-none outline-none dark:text-white"
            rows={1}
          />
          
          <button 
            disabled={!inputText.trim()}
            className="p-2.5 shrink-0 text-primary disabled:text-zinc-400 disabled:opacity-50 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. Create Group Form
function CreateGroup() {
  const navigate = useNavigate();
  const [type, setType] = useState<'public'|'private'>('public');

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-[#09090b] fixed inset-0 z-50 max-w-md mx-auto">
      <header className="px-4 py-4 flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800">
        <button onClick={() => navigate(-1)} className="text-zinc-900 dark:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold">New Group</h1>
      </header>

      <div className="p-6 flex flex-col gap-6 animate-slide-up">
        {/* Profile Image Picker Mock */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 cursor-pointer">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-zinc-500">Group Name</label>
          <input type="text" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors" placeholder="E.g., Campus Secrets" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-zinc-500">Description</label>
          <textarea className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors resize-none h-24" placeholder="What is this group about?" />
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <label className="text-sm font-bold text-zinc-500">Privacy Setting</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setType('public')}
              className={`flex-1 p-4 rounded-xl border text-left transition-all ${type === 'public' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}
            >
              <div className="font-bold mb-1">Public</div>
              <div className="text-xs text-zinc-500">Anyone can find and join via explore.</div>
            </button>
            <button 
              onClick={() => setType('private')}
              className={`flex-1 p-4 rounded-xl border text-left transition-all ${type === 'private' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}
            >
              <div className="font-bold mb-1">Private</div>
              <div className="text-xs text-zinc-500">Only accessible via invite link.</div>
            </button>
          </div>
        </div>

        <button className="w-full mt-auto bg-primary hover:bg-primaryHover text-white font-bold py-4 rounded-full transition-colors">
          Create Group
        </button>
      </div>
    </div>
  );
}

// --- Main Export ---
export default function Groups() {
  return (
    <Routes>
      <Route index element={<GroupsHome />} />
      <Route path="new" element={<CreateGroup />} />
      <Route path=":id" element={<ChatView />} />
    </Routes>
  );
}
