import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Triggered to refresh the feed
}

export default function NewConfessionModal({ isOpen, onClose, onSuccess }: Props) {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('You must be logged in.');

    const { error } = await supabase.from('confessions').insert({
      user_id: user.id,
      content,
      is_anonymous: isAnonymous
    });

    setIsSubmitting(false);
    if (error) {
      console.error(error.message);
    } else {
      setContent('');
      setIsAnonymous(false);
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg p-6 shadow-xl relative">
        <h2 className="text-xl font-bold mb-4 dark:text-white">New Confession</h2>
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?..."
          className="w-full h-32 p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
        />
        
        <div className="flex items-center justify-between mt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-gray-300 text-black focus:ring-black w-4 h-4"
            />
            Post Anonymously
          </label>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
              className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium text-sm disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
