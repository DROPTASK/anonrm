/**
 * @file src/components/NewConfessionModal.tsx
 * @description Global modal for creating new confessions.
 * Features a responsive design (Desktop Modal / Mobile Bottom Sheet), rich card theming,
 * identity toggling (Anonymous/Public), and audience selection (Global/Groups).
 *
 * Architecture strictly enforces normalized relational data, rigorous strict mode TypeScript,
 * and zero `any` usage. Designed for Vite + React 19 + Supabase.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { supabase, AppError, parseSupabaseError } from '../../lib/supabase';
import type { Database } from '../../lib/types';

// ============================================================================
// 1. SCHEMAS & TYPES
// ============================================================================

const MAX_CHARS = 1000;

const confessionSchema = z.object({
  content: z.string()
    .min(5, 'Confession must be at least 5 characters long.')
    .max(MAX_CHARS, `Confession cannot exceed ${MAX_CHARS} characters.`),
  is_anonymous: z.boolean(),
  background_color: z.string().nullable(),
  text_color: z.string().nullable(),
  group_id: z.string().nullable(),
});

type ConfessionFormValues = z.infer<typeof confessionSchema>;

export interface NewConfessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGroupId?: string | null; // If opening from a specific group page
}

// ============================================================================
// 2. CONSTANTS (Theming & Colors)
// ============================================================================

const COLOR_PRESETS = [
  { id: 'default', bg: null, text: null, label: 'Default' },
  { id: 'dark', bg: '#111827', text: '#F9FAFB', label: 'Dark' },
  { id: 'crimson', bg: '#7F1D1D', text: '#FEE2E2', label: 'Crimson' },
  { id: 'ocean', bg: '#1E3A8A', text: '#DBEAFE', label: 'Ocean' },
  { id: 'forest', bg: '#14532D', text: '#DCFCE7', label: 'Forest' },
  { id: 'sunset', bg: '#9A3412', text: '#FFEDD5', label: 'Sunset' },
  { id: 'amethyst', bg: '#581C87', text: '#F3E8FF', label: 'Amethyst' },
];

// ============================================================================
// 3. ICONS
// ============================================================================

const Icons = {
  Close: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  Globe: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  ),
  Users: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  EyeOff: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  ),
  Palette: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
  ),
  Send: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  ),
};

// ============================================================================
// 4. API SERVICES
// ============================================================================

const fetchUserGroups = async (userId: string) => {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      groups ( id, name, avatar_url, is_nsfw )
    `)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw parseSupabaseError(error);
  
  // Extract groups from the join
  return (data as any[]).map(membership => membership.groups).filter(Boolean);
};

// ============================================================================
// 5. COMPONENT
// ============================================================================

export const NewConfessionModal: React.FC<NewConfessionModalProps> = ({ isOpen, onClose, defaultGroupId = null }) => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle Resize for responsive modal vs bottom sheet
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Form Setup ---
  const { register, handleSubmit, watch, setValue, reset, control, formState: { errors, isValid } } = useForm<ConfessionFormValues>({
    resolver: zodResolver(confessionSchema),
    defaultValues: {
      content: '',
      is_anonymous: true,
      background_color: null,
      text_color: null,
      group_id: defaultGroupId,
    },
    mode: 'onChange'
  });

  const content = watch('content');
  const isAnonymous = watch('is_anonymous');
  const currentBg = watch('background_color');
  const currentText = watch('text_color');
  const selectedGroupId = watch('group_id');

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      reset();
      setShowColorPicker(false);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, reset]);

  // --- Data Fetching (Groups) ---
  const { data: groups = [] } = useQuery({
    queryKey: ['user_active_groups', user?.id],
    queryFn: () => fetchUserGroups(user!.id),
    enabled: isOpen && !!user,
  });

  // --- Submit Mutation ---
  const submitMutation = useMutation({
    mutationFn: async (data: ConfessionFormValues) => {
      if (!user) throw new AppError('Must be logged in.', 'AUTH_REQUIRED');

      const payload = {
        author_id: user.id,
        content: data.content.trim(),
        is_anonymous: data.is_anonymous,
        background_color: data.background_color,
        text_color: data.text_color,
        group_id: data.group_id,
        is_pinned: false,
        is_trending: false,
      };

      const { error } = await supabase.from('confessions').insert(payload);
      if (error) throw parseSupabaseError(error);
    },
    onSuccess: () => {
      toast.success('Confession posted successfully!');
      // Invalidate relevant feeds
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (selectedGroupId) {
        queryClient.invalidateQueries({ queryKey: ['group_feed', selectedGroupId] });
      }
      onClose();
    },
    onError: (err: AppError) => {
      toast.error(err.message || 'Failed to post confession.');
    }
  });

  // --- Handlers ---
  const handleDragEnd = (event: any, info: PanInfo) => {
    if (isMobile && info.offset.y > 150) {
      onClose();
    }
  };

  const onSubmit = (data: ConfessionFormValues) => {
    submitMutation.mutate(data);
  };

  // Keyboard shortcut to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // --- Dynamic Styles ---
  const cardStyle = {
    backgroundColor: currentBg || 'var(--card-bg, transparent)',
    color: currentText || 'inherit',
  };

  const progressPercentage = Math.min((content.length / MAX_CHARS) * 100, 100);
  const isNearLimit = content.length > MAX_CHARS * 0.9;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center pointer-events-none">
            <motion.div
              drag={isMobile ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`w-full sm:w-[600px] pointer-events-auto flex flex-col bg-white dark:bg-gray-900 shadow-2xl sm:border sm:border-gray-200 dark:sm:border-gray-700 overflow-hidden ${
                isMobile ? 'rounded-t-[2.5rem] h-[90vh]' : 'rounded-3xl max-h-[85vh]'
              }`}
            >
              
              {/* Mobile Drag Handle */}
              {isMobile && (
                <div className="w-full flex justify-center pt-4 pb-2">
                  <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
                </div>
              )}

              {/* Header */}
              <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">New Confession</h2>
                </div>
                {!isMobile && (
                  <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none">
                    <Icons.Close className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                )}
              </header>

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <form id="confession-form" onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col space-y-6">
                  
                  {/* Target Audience / Group Selector */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Post To</label>
                    <div className="relative">
                      <select
                        {...register('group_id')}
                        className="w-full appearance-none bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pl-11 text-[15px] font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-shadow"
                      >
                        <option value="">Global Feed (Public)</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name} {group.is_nsfw ? '(NSFW)' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        {selectedGroupId ? <Icons.Users className="w-5 h-5" /> : <Icons.Globe className="w-5 h-5" />}
                      </div>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Identity Toggle */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Identity</label>
                    <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-2xl relative">
                      
                      {/* Sliding indicator */}
                      <motion.div
                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-600/50 z-0"
                        animate={{ left: isAnonymous ? '4px' : 'calc(50%)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />

                      <button
                        type="button"
                        onClick={() => setValue('is_anonymous', true)}
                        className={`flex-1 flex items-center justify-center py-2.5 z-10 font-semibold text-sm rounded-xl transition-colors ${isAnonymous ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        <Icons.EyeOff className="w-4 h-4 mr-2" />
                        Anonymous
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue('is_anonymous', false)}
                        className={`flex-1 flex items-center justify-center py-2.5 z-10 font-semibold text-sm rounded-xl transition-colors ${!isAnonymous ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 mr-2 overflow-hidden flex-shrink-0">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="You" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] flex items-center justify-center h-full">👤</span>
                          )}
                        </div>
                        @{profile?.username}
                      </button>
                    </div>
                  </div>

                  {/* Composition Area (The Canvas) */}
                  <div className="flex flex-col space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confession</label>
                      <button 
                        type="button" 
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className={`p-1.5 rounded-lg transition-colors ${showColorPicker || currentBg ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                      >
                        <Icons.Palette className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Dynamic Color Palette Selector */}
                    <AnimatePresence>
                      {showColorPicker && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          className="flex space-x-2 overflow-x-auto scrollbar-hide py-1"
                        >
                          {COLOR_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setValue('background_color', preset.bg);
                                setValue('text_color', preset.text);
                              }}
                              className={`w-10 h-10 rounded-full flex-shrink-0 border-2 transition-transform hover:scale-110 focus:outline-none ${
                                currentBg === preset.bg 
                                  ? 'border-indigo-500 scale-110 shadow-md' 
                                  : 'border-transparent border-gray-200 dark:border-gray-700'
                              }`}
                              style={{ 
                                backgroundColor: preset.bg || (document.documentElement.classList.contains('dark') ? '#1f2937' : '#f3f4f6') 
                              }}
                              title={preset.label}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Textarea wrapped in styling container */}
                    <div 
                      className={`relative w-full rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden transition-colors duration-300 ${!currentBg ? 'bg-gray-50 dark:bg-gray-800/30' : ''}`}
                      style={cardStyle}
                    >
                      <textarea
                        {...register('content')}
                        ref={(e) => {
                          register('content').ref(e);
                          // @ts-ignore
                          textareaRef.current = e;
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="What's on your mind?..."
                        className="w-full min-h-[160px] max-h-[300px] p-6 bg-transparent resize-none focus:outline-none placeholder-gray-400/70 text-lg leading-relaxed scrollbar-hide"
                      />
                      
                      {/* Character Count Indicator (Circular) */}
                      <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                        {isNearLimit && (
                          <span className={`text-xs font-bold ${content.length > MAX_CHARS ? 'text-red-500' : 'text-yellow-500'}`}>
                            {MAX_CHARS - content.length}
                          </span>
                        )}
                        <div className="relative w-6 h-6 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-gray-300 dark:text-gray-600"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className={`${content.length > MAX_CHARS ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-indigo-500'}`}
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray={`${progressPercentage}, 100`}
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                    {errors.content && (
                      <p className="text-red-500 text-xs font-bold mt-1 ml-2 flex items-center">
                        <span className="mr-1">⚠</span> {errors.content.message}
                      </p>
                    )}
                  </div>

                </form>
              </div>

              {/* Footer Actions */}
              <footer className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center pb-safe">
                <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block font-medium">
                  Press <kbd className="font-mono bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 mx-0.5">Ctrl</kbd> + <kbd className="font-mono bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 mx-0.5">Enter</kbd> to post
                </span>
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-full font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="confession-form"
                    disabled={!isValid || submitMutation.isPending}
                    className="flex-1 sm:flex-none flex items-center justify-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold rounded-full shadow-lg shadow-indigo-200 dark:shadow-none transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  >
                    {submitMutation.isPending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Icons.Send className="w-4 h-4 mr-2 -ml-1" />
                        Post
                      </>
                    )}
                  </button>
                </div>
              </footer>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NewConfessionModal;
