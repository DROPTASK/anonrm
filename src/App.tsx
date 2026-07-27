/**
 * @file src/App.tsx
 * @description Main application entry point and router configuration.
 * Configures React Query, Toaster, Auth Context, and maps all URL routes to pages.
 * Handles the responsive layout wrapper (Sidebar + Mobile Bottom Nav).
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

// Providers
import { AuthProvider, useAuth } from './hooks/useAuth';

// Layout & Global Components
import Sidebar from './components/Sidebar'; // Assuming Sidebar component exists and handles navigation
import { NewConfessionModal } from './components/NewConfessionModal';

// Pages
import Feed from './pages/Feed';
import Groups from './pages/Groups';
import DMs from './pages/DMs';
import Profile from './pages/Profile';
import Confession from './pages/Confession';
import Ask from './pages/Ask';
import Login from './pages/Login';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Initialize React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ============================================================================
// LAYOUT WRAPPERS
// ============================================================================

/**
 * Main Layout wrapper for authenticated and general app browsing.
 * Renders the persistent Sidebar (desktop) / Bottom Nav (mobile) and 
 * the global 'New Confession' modal state.
 */
const AppLayout: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      
      {/* Persistent Navigation */}
      <Sidebar onOpenCompose={() => setIsModalOpen(true)} />

      {/* Main Scrollable Content Area */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative scrollbar-hide">
        {/* Child routes inject here */}
        <Outlet />
      </main>

      {/* Global Modals */}
      <NewConfessionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

/**
 * Guard for routes requiring a logged-in user.
 * Redirects to /login if unauthenticated.
 */
const ProtectedRoute: React.FC = () => {
  const { user, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

// ============================================================================
// APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          
          {/* Global Toast Notifications */}
          <Toaster 
            position="bottom-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
                borderRadius: '9999px',
                fontWeight: 'bold',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#4ade80', secondary: '#fff' },
              },
            }}
          />

          <Routes>
            {/* Public Standalone Routes (No Sidebar) */}
            <Route path="/login" element={<Login />} />
            <Route path="/ask/:storyId" element={<Ask />} />

            {/* Main App Routes (Wrapped in Layout) */}
            <Route element={<AppLayout />}>
              
              {/* Publicly accessible app routes */}
              <Route path="/" element={<Feed />} />
              <Route path="/c/:id" element={<Confession />} />
              <Route path="/u/:username" element={<Profile />} />
              
              {/* Protected app routes (Requires Auth) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/profile" element={<Profile />} />
                <Route path="/dms" element={<DMs />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/settings" element={
                  <div className="p-10 pl-20 xl:pl-64 flex items-center justify-center h-screen">
                    <h1 className="text-2xl font-bold">Settings (Coming Soon)</h1>
                  </div>
                } />
              </Route>

              {/* 404 Fallback within Layout */}
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-screen pt-16 md:pt-0 md:pl-20 xl:pl-64">
                  <h1 className="text-6xl mb-4">👽</h1>
                  <h2 className="text-2xl font-bold">Page Not Found</h2>
                  <p className="text-gray-500">The link you followed may be broken, or the page may have been removed.</p>
                </div>
              } />

            </Route>
          </Routes>

        </BrowserRouter>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
