import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newGroupId: string) => void;
}

export default function CreateGroupModal({ isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('You must be logged in');

    // 1. Create the group
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert({ name, description, is_private: isPrivate, created_by: user.id })
      .select()
      .single();

    if (groupError || !groupData) {
      console.error('Error creating group:', groupError);
      setIsSubmitting(false);
      return;
    }

    // 2. Add creator as a member
    await supabase.from('group_members').insert({
      group_id: groupData.id,
      user_id: user.id,
      role: 'admin'
    });

    setIsSubmitting(false);
    onSuccess(groupData.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Create New Group</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
              placeholder="e.g., Tech Confessions"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none resize-none"
              placeholder="What is this group about?"
              rows={3}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-gray-300 text-black focus:ring-black w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Private Group (Invite Only)</span>
          </label>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 text-gray-500 font-medium">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !name.trim()}
            className="flex-1 bg-black dark:bg-white text-white dark:text-black py-2 rounded-lg font-medium disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
