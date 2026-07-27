import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { fetchBlockedWords } from './utils/censor';

// Components
import Layout from './components/Layout';

// Pages
import Home from './pages/Home';
import Groups from './pages/Groups';
import DMs from './pages/DMs';
import Profile from './pages/Profile';
import SingleConfession from './pages/SingleConfession';
import Ask from './pages/Ask';
import Login from './pages/Login';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch blocked words globally on app mount
    fetchBlockedWords();

    // 2. Check active auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 3. Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTE: The NGL-style anonymous form */}
        <Route path="/ask/:username" element={<Ask />} />

        {/* AUTHENTICATED ROUTES */}
        {session ? (
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/dms" element={<DMs />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* Dynamic parameters must come last to prevent route conflicts */}
            <Route path="/:username" element={<Profile />} />
            <Route path="/:username/:confession_id" element={<SingleConfession />} />
          </Route>
        ) : (
          /* UNATHENTICATED FALLBACK */
          <Route path="*" element={<Login />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
