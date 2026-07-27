import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Replace with actual Supabase Auth integration
      // if (isLogin) {
      //   await supabase.auth.signInWithPassword({ email, password })
      // } else {
      //   await supabase.auth.signUp({ email, password })
      // }
      
      // Simulating network request for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // On success, route to the home/feed page
      navigate('/');
    } catch (error) {
      console.error("Auth error:", error);
      alert("Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    // TODO: Supabase OAuth integration
    // await supabase.auth.signInWithOAuth({ provider })
    console.log(`Authenticating with ${provider}...`);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/');
    }, 1000);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-white dark:bg-[#09090b]">
      {/* Background Decorative Blur */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-sm z-10 animate-slide-up">
        
        {/* Header / Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl transform rotate-3">
            <svg className="w-8 h-8 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">
            ConfessApp
          </h1>
          <p className="text-sm font-semibold text-zinc-500">
            Share your secrets safely.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/50 dark:bg-[#18181b]/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-2xl">
          
          <div className="flex gap-2 mb-6 bg-zinc-100 dark:bg-zinc-900/50 p-1 rounded-xl">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-500 ml-1">Email</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all dark:text-white"
              />
            </div>
            
            <div className="flex flex-col gap-1.5 mb-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-zinc-500">Password</label>
                {isLogin && <a href="#" className="text-xs font-bold text-primary hover:underline">Forgot?</a>}
              </div>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all dark:text-white"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:hover:bg-primary text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Or</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
          </div>

          {/* Social Auth */}
          <button 
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </div>
        
        {/* Footer Link */}
        <p className="text-center text-xs font-semibold text-zinc-500 mt-8">
          By signing up, you agree to our <a href="#" className="text-zinc-900 dark:text-zinc-300 hover:underline">Terms of Service</a> and <a href="#" className="text-zinc-900 dark:text-zinc-300 hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
