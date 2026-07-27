import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { censorText } from '../utils/censor';
import CreateGroupModal from '../components/CreateGroupModal';

interface Group {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  users: { username: string; avatar_url: string };
}

export default function Groups() {
  const [activeTab, setActiveTab] = useState<'chats' | 'explore'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [exploreGroups, setExploreGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConfessionMode, setIsConfessionMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Current User
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
  }, []);

  // Fetch Groups (My Chats & Explore)
  const fetchGroups = async () => {
    if (!currentUserId) return;

    // My Groups (via group_members)
    const { data: myMemberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', currentUserId);
      
    const myGroupIds = myMemberships?.map(m => m.group_id) || [];

    if (myGroupIds.length > 0) {
      const { data: myGroupsData } = await supabase.from('groups').select('*').in('id', myGroupIds);
      setGroups(myGroupsData || []);
    }

    // Explore (Public groups not joined)
    const { data: publicGroups } = await supabase
      .from('groups')
      .select('*')
      .eq('is_private', false);
      
    const unjoined = (publicGroups || []).filter(g => !myGroupIds.includes(g.id));
    setExploreGroups(unjoined);
  };

  useEffect(() => {
    fetchGroups();
  }, [currentUserId]);

  // Fetch Messages for Selected Group
  useEffect(() => {
    if (!selectedGroup) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, users(username, avatar_url)')
        .eq('group_id', selectedGroup.id)
        .order('created_at', { ascending: true });
      
      setMessages(data as unknown as Message[] || []);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    fetchMessages();
  }, [selectedGroup]);

  // Send Message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedGroup || !currentUserId) return;

    const newMsg = {
      group_id: selectedGroup.id,
      sender_id: currentUserId,
      content: messageInput,
      is_anonymous: isConfessionMode
    };

    setMessageInput(''); // Optimistic clear

    const { data, error } = await supabase
      .from('messages')
      .insert(newMsg)
      .select('*, users(username, avatar_url)')
      .single();

    if (!error && data) {
      setMessages(prev => [...prev, data as unknown as Message]);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleJoinGroup = async (group: Group) => {
    if (!currentUserId) return;
    await supabase.from('group_members').insert({ group_id: group.id, user_id: currentUserId });
    await fetchGroups();
    setSelectedGroup(group);
  };

  const displayGroups = activeTab === 'chats' ? groups : exploreGroups;
  const filteredGroups = displayGroups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Telegram Layout is full height minus mobile nav (using h-[calc(100vh-64px)] on mobile, h-full on desktop)
  return (
    <div className="flex h-full md:h-screen w-full bg-white dark:bg-gray-900 overflow-hidden">
      
      {/* LEFT PANE: Chat List */}
      <div className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col ${selectedGroup ? 'hidden md:flex' : 'flex'}`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold dark:text-white">Groups</h2>
            <button onClick={() => setIsModalOpen(true)} className="text-gray-500 hover:text-black dark:hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 text-sm rounded-lg px-4 py-2 outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
          />
          
          <div className="flex gap-4 mt-4 border-b border-gray-200 dark:border-gray-800">
            <button 
              className={`pb-2 text-sm font-medium border-b-2 ${activeTab === 'chats' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500'}`}
              onClick={() => setActiveTab('chats')}
            >
              My Chats
            </button>
            <button 
              className={`pb-2 text-sm font-medium border-b-2 ${activeTab === 'explore' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-500'}`}
              onClick={() => setActiveTab('explore')}
            >
              Explore
            </button>
          </div>
        </div>

        {/* Group List */}
        <div className="flex-1 overflow-y-auto">
          {filteredGroups.length === 0 ? (
            <p className="text-center text-gray-500 mt-8 text-sm">No groups found.</p>
          ) : (
            filteredGroups.map(group => (
              <div 
                key={group.id} 
                onClick={() => activeTab === 'chats' ? setSelectedGroup(group) : handleJoinGroup(group)}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedGroup?.id === group.id ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              >
                <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${group.id}`} alt="Group" className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{group.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{activeTab === 'explore' ? 'Tap to join' : group.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE: Chat Area */}
      <div className={`flex-1 flex-col bg-gray-50 dark:bg-gray-950 ${!selectedGroup ? 'hidden md:flex' : 'flex'}`}>
        {!selectedGroup ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a group to start messaging
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-4 gap-3 shrink-0">
              <button className="md:hidden text-gray-500 mr-2" onClick={() => setSelectedGroup(null)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${selectedGroup.id}`} className="w-10 h-10 rounded-full" />
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">{selectedGroup.name}</h2>
                <p className="text-xs text-gray-500">{selectedGroup.is_private ? 'Private Group' : 'Public Group'}</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => {
                const isMine = msg.sender_id === currentUserId;
                const displayName = msg.is_anonymous ? 'Anonymous' : msg.users.username;
                
                // Styling differences for Confessions vs Normal
                const bubbleColor = msg.is_anonymous 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' 
                  : isMine 
                    ? 'bg-black dark:bg-white text-white dark:text-black' 
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white';

                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-gray-400 mb-1 mx-1">{displayName}</span>
                    <div className={`px-4 py-2 rounded-2xl max-w-[75%] ${bubbleColor} ${msg.is_anonymous ? 'italic shadow-md' : ''}`}>
                      <p className="whitespace-pre-wrap break-words">{censorText(msg.content)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0">
              {/* Confession Toggle */}
              <div className="flex items-center gap-2 mb-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isConfessionMode} onChange={(e) => setIsConfessionMode(e.target.checked)} />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                  <span className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                    {isConfessionMode ? 'Confession Mode (Anonymous)' : 'Normal Message'}
                  </span>
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isConfessionMode ? "Type a secret confession..." : "Message..."}
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

      <CreateGroupModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={(id) => {
          fetchGroups();
          // Find and select the newly created group
          supabase.from('groups').select('*').eq('id', id).single().then(({data}) => {
            if(data) setSelectedGroup(data);
          });
        }} 
      />
    </div>
  );
}
