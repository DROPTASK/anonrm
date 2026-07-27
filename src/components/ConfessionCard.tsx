import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { censorMessage } from '../utils/censor';

// Define the shape of our joined data
export interface ConfessionData {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  is_anonymous: boolean;
  created_at: string;
  users: {
    username: string;
    avatar_url: string;
  };
}

interface Props {
  confession: ConfessionData;
}

export default function ConfessionCard({ confession }: Props) {
  const navigate = useNavigate();
  const [upvotes, setUpvotes] = useState(confession.upvotes);
  const [downvotes, setDownvotes] = useState(confession.downvotes);
  const [copied, setCopied] = useState(false);

  const displayUsername = confession.is_anonymous ? 'anonymous' : confession.users.username;
  const displayAvatar = confession.is_anonymous 
    ? 'https://api.dicebear.com/7.x/identicon/svg?seed=anonymous' // Placeholder for anon
    : confession.users.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${displayUsername}`;

  // Navigate to single confession page
  const handleCardClick = () => {
    navigate(`/${displayUsername}/${confession.id}`);
  };

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setUpvotes(prev => prev + 1); // Optimistic UI update
    await supabase.from('confessions').update({ upvotes: upvotes + 1 }).eq('id', confession.id);
  };

  const handleDownvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownvotes(prev => prev + 1); // Optimistic UI update
    await supabase.from('confessions').update({ downvotes: downvotes + 1 }).eq('id', confession.id);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/${displayUsername}/${confession.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(confession.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  });

  return (
    <article 
      onClick={handleCardClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
    >
      {/* Header: User Info */}
      <div className="flex items-center gap-3 mb-3">
        <img 
          src={displayAvatar} 
          alt={displayUsername} 
          className="w-10 h-10 rounded-full bg-gray-200"
        />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {displayUsername}
          </h3>
          <p className="text-xs text-gray-500">{formattedDate}</p>
        </div>
      </div>

      {/* Body: Censored Text */}
      <div className="mb-4">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-lg">
          {censorMessage(confession.content)}
        </p>
      </div>

      {/* Footer: Actions */}
      <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1">
          <button onClick={handleUpvote} className="hover:text-green-500 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
          <span className="text-sm font-medium mx-1">{upvotes - downvotes}</span>
          <button onClick={handleDownvote} className="hover:text-red-500 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>

        <button onClick={handleShare} className="flex items-center gap-1 hover:text-blue-500 transition-colors ml-auto">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          <span className="text-sm font-medium">{copied ? 'Copied!' : 'Share'}</span>
        </button>
      </div>
    </article>
  );
}
