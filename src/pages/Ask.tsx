/**
 * @file src/pages/Ask.tsx
 * @description Public-facing NGL-style anonymous question form.
 * Unauthenticated users arrive here via a shared link to drop anonymous messages.
 * Includes fingerprinting, rate-limiting UI, and character validation.
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import { supabase, parseSupabaseError } from '../../lib/supabase';
import { censorText, containsProfanity } from '../utils/censor';
import type { Database } from '../../lib/types';

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================

type Story = Database['public']['Tables']['stories']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface EnrichedStory extends Story {
  author: Pick<Profile, 'username' | 'avatar_url' | 'display_name'>;
}

const messageSchema = z.object({
  content: z.string()
    .min(2, 'Message must be at least 2 characters.')
    .max(300, 'Message cannot exceed 300 characters.'),
});

type MessageFormValues = z.infer<typeof messageSchema>;

// ============================================================================
// API SERVICES
// ============================================================================

const fetchStoryDetails = async (storyId: string): Promise<EnrichedStory> => {
  const { data, error } = await supabase
    .from('stories')
    .select(`
      *,
      author:profiles(username, avatar_url, display_name)
    `)
    .eq('id', storyId)
    .single();

  if (error) throw parseSupabaseError(error);
  if (!data) throw new Error('Story not found');
  
  // Cast based on the known join structure
  return data as unknown as EnrichedStory;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const Ask: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const [isSuccess, setIsSuccess] = useState(false);

  // --- Fetch Target Story ---
  const { data: story, isLoading, error } = useQuery({
    queryKey: ['story', storyId],
    queryFn: () => fetchStoryDetails(storyId!),
    enabled: !!storyId,
    retry: false,
  });

  // --- Form Setup ---
  const { register, handleSubmit, watch, reset, formState: { errors, isValid } } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    mode: 'onChange'
  });
  const content = watch('content', '');

  // --- Submit Mutation ---
  const submitMutation = useMutation({
    mutationFn: async (data: MessageFormValues) => {
      if (!story) throw new Error('Invalid story');

      // 1. Client-side Profanity Check (Optional hard block, or just censor)
      if (containsProfanity(data.content)) {
        throw new Error('Please keep the message respectful.');
      }

      // 2. Generate an anonymous fingerprint (Basic implementation via localStorage)
      let fingerprint = localStorage.getItem('anon_fingerprint');
      if (!fingerprint) {
        fingerprint = `anon-${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('anon_fingerprint', fingerprint);
      }

      // 3. Submit to DB
      const { error } = await supabase.from('story_questions').insert({
        story_id: story.id,
        content: censorText(data.content.trim()),
        sender_identifier: fingerprint
      });

      if (error) throw parseSupabaseError(error);
    },
    onSuccess: () => {
      setIsSuccess(true);
      reset();
      // Reset success state after 5 seconds to allow sending another message
      setTimeout(() => setIsSuccess(false), 5000);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to send message.');
    }
  });

  const onSubmit = (data: MessageFormValues) => {
    submitMutation.mutate(data);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="text-6xl mb-4">🔗</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Link Expired</h1>
        <p className="text-gray-500">This anonymous prompt no longer exists or has expired.</p>
        <Link to="/" className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full font-bold">
          Create Your Own
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl overflow-hidden relative z-10 border border-white/50 dark:border-gray-800"
      >
        <div className="p-8">
          
          {/* Header Info */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 p-1 mb-4 shadow-lg">
                <div className="w-full h-full rounded-full border-2 border-white dark:border-gray-900 overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center">
                  {story.author?.avatar_url ? (
                    <img src={story.author.avatar_url} alt={story.author.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🎭</span>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border-2 border-white dark:border-gray-900">
                Anonymous
              </div>
            </div>
            
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">
              @{story.author?.username}
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              is asking for anonymous messages!
            </p>
          </div>

          {/* Prompt Bubble */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-5 mb-6 text-center relative">
            {/* Chat tail pointer */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-50 dark:bg-indigo-900/20 border-t border-l border-indigo-100 dark:border-indigo-800/50 transform rotate-45" />
            <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 relative z-10">
              "{story.prompt}"
            </h2>
          </div>

          {/* Interaction Area */}
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center text-center py-8"
              >
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Message Sent!</h3>
                <p className="text-sm text-gray-500">They won't know who sent it.</p>
                <button 
                  onClick={() => setIsSuccess(false)}
                  className="mt-6 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit(onSubmit)} 
                className="flex flex-col"
              >
                <div className="relative">
                  <textarea
                    {...register('content')}
                    placeholder="Type something secretly..."
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 text-[15px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow resize-none min-h-[140px] shadow-inner"
                  />
                  <div className="absolute bottom-3 right-4 text-xs font-bold text-gray-400">
                    {content.length}/300
                  </div>
                </div>
                {errors.content && (
                  <p className="text-red-500 text-xs font-bold mt-2 ml-1">
                    {errors.content.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!isValid || submitMutation.isPending}
                  className="mt-6 w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-black text-lg rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center"
                >
                  {submitMutation.isPending ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Send Anonymously
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 ml-2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 p-4 text-center">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Powered by <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">AnonRM</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Ask;
