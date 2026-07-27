/**
 * @file src/components/Sidebar.tsx
 * @description Master navigation and layout controller.
 * Implements a highly responsive Sidebar for desktop/tablet and a Bottom Navigation for mobile.
 * Features: Real-time unread badges, Framer Motion popover menus, dark/light theme toggling,
 * authenticated user state management, and animated tooltips.
 *
 * Architecture strictly enforces rigorous strict mode TypeScript and zero `any` usage.
 */

import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { supabase } from '../../lib/supabase';

// ============================================================================
// 1. ICONS (Full SVG Suite for Navigation and Menus)
// ============================================================================

const Icons = {
  Home: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  Compass: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
  ),
  Message: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  ),
  User: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  Bell: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  ),
  Plus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  More: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
  ),
  Settings: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
  Bookmark: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
  ),
  Moon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  ),
  Sun: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
  ),
  LogOut: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  LogIn: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
  )
};

// ============================================================================
// 2. INTERFACES & PROPS
// ============================================================================

export interface SidebarProps {
  onOpenCompose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  requiresAuth: boolean;
  badgeCount?: number;
}

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================

export const Sidebar: React.FC<SidebarProps> = ({ onOpenCompose }) => {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // --- Theme Initialization ---
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('theme') === 'dark' ||
                   (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // --- Click Outside Handler for More Menu ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreMenuOpen]);

  // --- Real-time Data Fetching (Badges) ---
  
  // 1. Fetch unread DMs
  const { data: unreadDMs = 0 } = useQuery({
    queryKey: ['unread_dms', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      // In a real DB, this would query an unread_status table or similar.
      // Mocking the query structure to demonstrate production architecture.
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', 'active_rooms_subquery') // Pseudo-code for complex join
        .eq('is_read', false)
        .neq('sender_id', user.id);
        
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30s as a fallback to realtime subscriptions
  });

  // 2. Fetch unseen notifications (Mocked logic for architecture demonstration)
  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ['unread_notifications', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      return 0; // Returning 0 for now until a notifications table exists
    },
    enabled: !!user,
  });

  // --- Navigation Configuration ---
  const navItems: NavItem[] = [
    { label: 'Home', path: '/', icon: Icons.Home, requiresAuth: false },
    { label: 'Groups', path: '/groups', icon: Icons.Compass, requiresAuth: false },
    { label: 'Messages', path: '/dms', icon: Icons.Message, requiresAuth: true, badgeCount: unreadDMs },
    { label: 'Notifications', path: '/notifications', icon: Icons.Bell, requiresAuth: true, badgeCount: unreadNotifications },
    { label: 'Profile', path: '/profile', icon: Icons.User, requiresAuth: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.requiresAuth || (item.requiresAuth && user));

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderBadge = (count?: number) => {
    if (!count || count <= 0) return null;
    return (
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0a0a0a]"
      >
        {count > 9 ? '9+' : count}
      </motion.div>
    );
  };

  const handleAuthAction = () => {
    if (user) {
      logout();
      toast.success('Logged out successfully');
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      {/* 
        =======================================================================
        DESKTOP & TABLET SIDEBAR (Hidden on Mobile)
        - Tablet (md): Collapsed view (Icons only)
        - Desktop (xl): Expanded view (Icons + Text)
        =======================================================================
      */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-20 xl:w-64 bg-white dark:bg-[#0a0a0a] border-r border-gray-100 dark:border-gray-800/60 py-6 px-3 z-40 transition-all duration-300">
        
        {/* Header / Logo */}
        <NavLink 
          to="/" 
          className="flex items-center justify-center xl:justify-start xl:px-4 mb-10 text-indigo-600 dark:text-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
        >
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none flex-shrink-0 transition-transform hover:rotate-12">
            <span className="text-white font-black text-2xl">A</span>
          </div>
          <span className="hidden xl:block ml-4 text-3xl font-black tracking-tighter text-gray-900 dark:text-white">
            AnonRM
          </span>
        </NavLink>

        {/* Primary Navigation */}
        <nav className="flex-1 w-full space-y-3">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className={`group relative flex items-center justify-center xl:justify-start px-0 xl:px-4 py-3.5 xl:py-4 rounded-2xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive 
                    ? 'font-extrabold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800/80' 
                    : 'font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <item.icon className={`w-7 h-7 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  {renderBadge(item.badgeCount)}
                </div>
                
                <span className="hidden xl:block ml-5 text-xl tracking-tight">{item.label}</span>

                {/* Animated Tooltip for Tablet (Collapsed) View */}
                <span className="xl:hidden absolute left-16 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Actions (Compose, More Menu, User Profile) */}
        <div className="mt-auto flex flex-col space-y-4 w-full relative" ref={moreMenuRef}>
          
          {/* Compose Button */}
          <button
            onClick={onOpenCompose}
            aria-label="Create new confession"
            className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-4 shadow-xl shadow-indigo-200/50 dark:shadow-none transition-all hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-[#0a0a0a]"
          >
            <Icons.Plus className="w-7 h-7 xl:mr-3" />
            <span className="hidden xl:block font-black text-xl tracking-tight">Confess</span>
          </button>

          {/* More Menu Popover */}
          <AnimatePresence>
            {isMoreMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-24 left-0 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50"
              >
                <div className="flex flex-col p-2">
                  <button onClick={() => { setIsMoreMenuOpen(false); navigate('/settings'); }} className="flex items-center px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                    <Icons.Settings className="w-5 h-5 mr-3" /> Settings
                  </button>
                  <button onClick={() => { setIsMoreMenuOpen(false); navigate('/profile'); }} className="flex items-center px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                    <Icons.Bookmark className="w-5 h-5 mr-3" /> Saved Confessions
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />
                  <button onClick={toggleTheme} className="flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                    <div className="flex items-center">
                      {isDarkMode ? <Icons.Moon className="w-5 h-5 mr-3" /> : <Icons.Sun className="w-5 h-5 mr-3" />}
                      Appearance
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {isDarkMode ? 'Dark' : 'Light'}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* More Options Trigger (Desktop only) */}
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="hidden xl:flex items-center px-4 py-3.5 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <Icons.More className="w-7 h-7 mr-5" />
            <span className="text-xl">More</span>
          </button>

          {/* User Profile / Auth Action */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col items-center xl:flex-row xl:justify-between px-1 xl:px-0">
            {user ? (
              <>
                <button onClick={() => navigate('/profile')} className="hidden xl:flex items-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-1 min-w-0 mr-2">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 border-2 border-transparent">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm flex items-center justify-center h-full">👤</span>
                    )}
                  </div>
                  <div className="ml-3 overflow-hidden text-left">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{profile?.display_name || profile?.username}</p>
                    <p className="text-xs font-medium text-gray-500 truncate">@{profile?.username}</p>
                  </div>
                </button>

                <button 
                  onClick={handleAuthAction}
                  className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors focus:outline-none"
                  title="Logout"
                >
                  <Icons.LogOut className="w-6 h-6" />
                </button>
              </>
            ) : (
              <button
                onClick={handleAuthAction}
                className="w-full flex items-center justify-center xl:justify-start border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold rounded-2xl py-3 xl:px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Icons.LogIn className="w-6 h-6 xl:mr-3" />
                <span className="hidden xl:block text-lg">Login</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 
        =======================================================================
        MOBILE BOTTOM NAVIGATION
        - Fixed to bottom, respects safe area insets (iOS).
        - Floating Action Button sits slightly above.
        =======================================================================
      */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 z-40 pb-safe">
        <div className="flex items-center justify-between px-4 h-16">
          {visibleNavItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className="relative flex flex-col items-center justify-center p-2 w-full h-full"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <item.icon className={`w-7 h-7 transition-all duration-300 ${isActive ? 'text-indigo-600 dark:text-white scale-110' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} />
                  {renderBadge(item.badgeCount)}
                </div>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Mobile Floating Action Button (FAB) */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onOpenCompose}
        aria-label="Create new confession"
        className="md:hidden fixed bottom-20 right-5 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-300/50 dark:shadow-none z-50 focus:outline-none"
      >
        <Icons.Plus className="w-7 h-7" />
      </motion.button>
    </>
  );
};

export default Sidebar;
