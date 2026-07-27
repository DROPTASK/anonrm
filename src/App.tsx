// src/App.tsx
import { Routes, Route, Outlet, Link, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Lazy loading components for production performance
const Feed = lazy(() => import('./pages/Feed'));
// Placeholder imports - we will create these next
const Groups = lazy(() => import('./pages/Groups'));
const DMs = lazy(() => import('./pages/DMs'));
const Profile = lazy(() => import('./pages/Profile'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const SingleConfession = lazy(() => import('./pages/SingleConfession'));
const Ask = lazy(() => import('./pages/Ask'));
const Login = lazy(() => import('./pages/Login'));

// Loading Fallback for Suspense
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-[#09090b]">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Main Layout with Bottom Nav
const Layout = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login';
  const isAskPage = location.pathname.startsWith('/ask/');

  // Hide nav on Login and Public Ask pages
  const showNav = !isAuthPage && !isAskPage;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50">
      <main className="flex-1 w-full max-w-md mx-auto relative pb-20">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      {showNav && (
        <nav className="glass-nav fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto h-16 flex justify-around items-center px-2 z-50">
          <Link to="/" className={`flex flex-col items-center gap-1 ${location.pathname === '/' ? 'text-primary' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'}`}>
            <svg className="w-6 h-6" fill={location.pathname === '/' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </Link>
          <Link to="/groups" className={`flex flex-col items-center gap-1 ${location.pathname.includes('/groups') ? 'text-primary' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'}`}>
            <svg className="w-6 h-6" fill={location.pathname.includes('/groups') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </Link>
          <Link to="/dms" className={`flex flex-col items-center gap-1 ${location.pathname.includes('/dms') ? 'text-primary' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'}`}>
            <svg className="w-6 h-6" fill={location.pathname.includes('/dms') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </Link>
          <Link to="/profile" className={`flex flex-col items-center gap-1 ${location.pathname === '/profile' ? 'text-primary' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'}`}>
             <svg className="w-6 h-6" fill={location.pathname === '/profile' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </Link>
        </nav>
      )}
    </div>
  );
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
      <Route path="/ask/:username/:linkId?" element={<Suspense fallback={<PageLoader />}><Ask /></Suspense>} />
      
      <Route element={<Layout />}>
        <Route path="/" element={<Feed />} />
        <Route path="/groups/*" element={<Groups />} />
        <Route path="/dms/*" element={<DMs />} />
        <Route path="/profile" element={<Profile />} />
        
        {/* Detail Pages */}
        <Route path="/u/:username" element={<UserProfile />} />
        <Route path="/u/:username/:confessionId" element={<SingleConfession />} />
      </Route>
    </Routes>
  );
}
