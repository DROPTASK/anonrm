import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfessionCard, { ConfessionData } from '../components/ConfessionCard';
import NewConfessionModal from '../components/NewConfessionModal';
import { Skeleton } from '../components/Skeleton';

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string;
}

export default function Profile() {
  const { username } = useParams<{ username?: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [confessions, setConfessions] = useState<ConfessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const fetchProfileData = async () => {
    setIsLoading(true);
    let targetUserId = '';

    // 1. Determine whose profile we are viewing
    if (username) {
      const { data } = await supabase.from('users').select('*').eq('username', username).single();
      if (data) {
        setProfile(data);
        targetUserId = data.id;
      }
    } else {
      // Fetch currently authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
        setProfile(data);
        targetUserId = user.id;
        setIsOwnProfile(true);
      }
    }

    // 2. Fetch their confessions
    if (targetUserId) {
      const { data } = await supabase
        .from('confessions')
        .select('*, users(username, avatar_url)')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });
      
      if (data) setConfessions(data as unknown as ConfessionData[]);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfileData();
  }, [username]);

  const handleCopyNglLink = () => {
    if (!profile) return;
    const url = `${window.location.origin}/ask/${profile.username}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="flex gap-6 items-center mb-8">
          <Skeleton className="w-20 h-20 md:w-28 md:h-28 rounded-full" />
          <div className="flex-1 space-y-4"><Skeleton className="h-6 w-32" /><Skeleton className="h-10 w-full" /></div>
        </div>
        <Skeleton className="h-32 w-full mb-4" />
      </div>
    );
  }

  if (!profile) return <div className="text-center py-12">User not found.</div>;

  const displayAvatar = profile.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.username}`;

  return (
    <div className="max-w-2xl mx-auto w-full p-4 md:p-8 pb-24">
      {/* Header: Instagram Style */}
      <header className="flex items-center gap-6 md:gap-10 mb-6">
        <img src={displayAvatar} alt={profile.username} className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-gray-200 border border-gray-200 dark:border-gray-700" />
        
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-bold mb-3 dark:text-white">{profile.username}</h2>
          
          <div className="flex gap-4 md:gap-6 text-sm md:text-base">
            <div className="flex flex-col items-center">
              <span className="font-bold dark:text-white">{confessions.length}</span>
              <span className="text-gray-500">Posts</span>
            </div>
            {/* Mocked Stats for aesthetic */}
            <div className="flex flex-col items-center">
              <span className="font-bold dark:text-white">1.2k</span>
              <span className="text-gray-500">Followers</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold dark:text-white">450</span>
              <span className="text-gray-500">Following</span>
            </div>
          </div>
        </div>
      </header>

      {/* Bio and NGL Button */}
      <div className="mb-8">
        <p className="text-sm md:text-base mb-4 dark:text-gray-200">
          Welcome to my confession profile. Shhh... 🤫
        </p>
        
        {isOwnProfile && (
          <button 
            onClick={handleCopyNglLink}
            className="w-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold py-2 rounded-lg border border-blue-100 dark:border-blue-800 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/50"
          >
            {linkCopied ? 'Link Copied!' : '🔗 Copy my anonymous link'}
          </button>
        )}
      </div>

      <hr className="border-gray-200 dark:border-gray-700 mb-6" />

      {/* Feed Area */}
      <div className="space-y-4">
        {confessions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No confessions yet.</p>
        ) : (
          confessions.map(conf => (
            <ConfessionCard key={conf.id} confession={conf} />
          ))
        )}
      </div>

      {/* FAB - Fixed Bottom Right (above mobile nav) */}
      {isOwnProfile && (
        <button 
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-20 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      )}

      <NewConfessionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchProfileData}
      />
    </div>
  );
}
