import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { censorText } from '../utils/censor';
import StoryExportCard from '../components/StoryExportCard';

interface User {
  id: string;
  username: string;
  avatar_url: string;
}

interface Message {
  id: string;
  sender_id: string | null;
  receiver_id: string;
  content: string;
  created_at: string;
  is_anonymous: boolean;
}

export default function DMs() {
  const [activeTab, setActiveTab] = useState<'dms' | 'anonymous'>('dms');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [recentChats, setRecentChats] = useState<User[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [anonMessages, setAnonMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Current User
  useEffect(() => {
    const fetchMe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
        setCurrentUser(data);
      }
    };
    fetchMe();
  }, []);

  // Search Users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      const { data } = await supabase
        .from('users')
        .select('*')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', currentUser?.id)
        .limit(10);
      setSearchResults(data || []);
    };
    
    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, currentUser]);

  // Fetch Anonymous Messages
  useEffect(() => {
    if (!currentUser) return;
    const fetchAnon = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .is('group_id', null)
        .is('sender_id', null) // Anonymous NGL-style messages have no sender
        .eq('receiver_id', currentUser.id)
        .order('created_at', { ascending: false });
      setAnonMessages(data || []);
    };
    fetchAnon();
  }, [currentUser]);

  // Fetch DM Messages with Selected User
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .is('group_id', null)
        .not('sender_id', 'is', null) // Exclude anon messages from live chat
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
      
      setMessages(data || []);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    fetchMessages();
  }, [selectedUser, currentUser]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedUser || !currentUser) return;

    const newMsg = {
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: messageInput,
      is_anonymous: false // DMs are not anonymous
    };

    setMessageInput('');

    const { data, error } = await supabase
      .from('messages')
      .insert(newMsg)
      .select()
      .single();

    if (!error && data) {
      setMessages(prev => [...prev, data]);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const displayList = searchQuery ? searchResults : recentChats;

  return (
    <div className="flex h-full md:h-screen w-full bg-white dark:bg-gray-900 overflow-hidden">
      
      {/* LEFT PANE */}
      <div className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col ${selectedUser || activeTab === 'anonymous' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold dark:text-white mb-4">Messages</h2>
          
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 text-sm rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-black dark:focus:ring-white mb-4"
          />
          
          <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800">
            <button 
              className={`pb-2 text-sm font-medium border-b-2 ${activeTab === 'dms' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500'}`}
              onClick={() => setActiveTab('dms')}
            >
              Direct Messages
            </button>
            <button 
              className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'anonymous' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500'}`}
              onClick={() => { setActiveTab('anonymous'); setSelectedUser(null); }}
            >
              Anonymous Replies
              {anonMessages.length > 0 && (
                <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{anonMessages.length}</span>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'dms' && (
            displayList.length === 0 ? (
              <p className="text-center text-gray-500 mt-8 text-sm">
                {searchQuery ? 'No users found.' : 'Search for a user to start chatting.'}
              </p>
            ) : (
              displayList.map(user => (
                <div 
                  key={user.id} 
                  onClick={() => setSelectedUser(user)}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedUser?.id === user.id ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                >
                  <img src={user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`} alt={user.username} className="w-12 h-12 rounded-full bg-gray-200" />
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{user.username}</h3>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* RIGHT PANE: Anonymous Inbox View */}
      {activeTab === 'anonymous' && (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 overflow-y-auto p-4 md:p-8">
          <div className="flex items-center mb-6">
            <button className="md:hidden mr-4 text-gray-500" onClick={() => setActiveTab('dms')}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h2 className="text-2xl font-bold dark:text-white">Anonymous Inbox</h2>
              <p className="text-gray-500 text-sm">Messages sent via your public link.</p>
            </div>
          </div>
          
          {anonMessages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Your inbox is empty. Share your link to get messages!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {anonMessages.map(msg => (
                <StoryExportCard 
                  key={msg.id} 
                  message={msg.content} 
                  username={currentUser?.username || 'user'} 
                  date={msg.created_at} 
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* RIGHT PANE: Active DM View */}
      {activeTab === 'dms' && (
        <div className={`flex-1 flex-col bg-gray-50 dark:bg-gray-950 ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a user to start messaging
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-4 gap-3 shrink-0">
                <button className="md:hidden text-gray-500 mr-2" onClick={() => setSelectedUser(null)}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <img src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedUser.username}`} className="w-10 h-10 rounded-full" />
                <h2 className="font-bold text-gray-900 dark:text-white">{selectedUser.username}</h2>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => {
                  const isMine = msg.sender_id === currentUser?.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl max-w-[75%] ${isMine ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'}`}>
                        <p className="whitespace-pre-wrap break-words">{censorText(msg.content)}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 mx-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Message..."
                    className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="w-10 h-10 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
