import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function Ask() {
  const { username } = useParams<{ username: string }>();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Mock send function
  const handleSend = () => {
    setIsSending(true);
    // Simulate network request
    setTimeout(() => {
      setIsSending(false);
      setIsSent(true);
    }, 1200);
  };

  const handleReset = () => {
    setMessage('');
    setIsSent(false);
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Dynamic Background Element */}
      <div className="absolute top-0 w-full h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>

      <div className="w-full max-w-sm animate-slide-up z-10">
        
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-3xl font-black text-zinc-400">
            {username?.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center">
            @{username}
          </h1>
          <div className="flex items-center gap-1.5 mt-2 text-sm font-semibold text-zinc-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            100% Anonymous
          </div>
        </div>

        {/* Form or Success State */}
        {!isSent ? (
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-xl">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Send me an anonymous message..."
              className="w-full h-32 bg-transparent text-lg resize-none outline-none placeholder:text-zinc-400 dark:text-zinc-50 p-2"
              maxLength={300}
            />
            <div className="flex items-center justify-between mt-4 border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
              <span className="text-xs font-semibold text-zinc-400 pl-2">
                {message.length}/300
              </span>
              <button
                onClick={handleSend}
                disabled={!message.trim() || isSending}
                className="bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:bg-primary text-white font-bold py-3 px-8 rounded-full flex items-center justify-center gap-2 transition-all min-w-[120px]"
              >
                {isSending ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl flex flex-col items-center text-center animate-fade-in">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Message Sent!</h2>
            <p className="text-zinc-500 text-sm mb-6 font-medium">
              Your secret is safe. They won't know who sent this.
            </p>
            <button
              onClick={handleReset}
              className="text-primary font-bold text-sm hover:underline"
            >
              Send another message
            </button>
          </div>
        )}

        {/* Growth Loop Footer */}
        <div className="mt-12 text-center flex flex-col items-center animate-fade-in">
          <p className="text-xs font-semibold text-zinc-500 mb-3">Want your own anonymous messages?</p>
          <Link 
            to="/login"
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-3 px-6 rounded-full text-sm transition-transform active:scale-95"
          >
            Get your own ConfessApp link
          </Link>
        </div>
        
      </div>
    </div>
  );
}
