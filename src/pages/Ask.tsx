import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Ask() {
  const { username } = useParams<{ username: string }>();
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.from('users').select('id').eq('username', username).single();
      if (data) setTargetUserId(data.id);
    };
    fetchUser();
  }, [username]);

  const handleSubmit = async () => {
    if (!message.trim() || !targetUserId) return;
    setStatus('submitting');

    // Insert into messages with null sender_id (anonymous) and null group_id (DM)
    const { error } = await supabase.from('messages').insert({
      receiver_id: targetUserId,
      content: message,
    });

    if (error) {
      console.error(error);
      setStatus('error');
    } else {
      setStatus('success');
      setMessage('');
    }
  };

  if (!targetUserId && status !== 'error') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
        
        {status === 'success' ? (
          <div className="py-8">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Sent!</h2>
            <p className="text-gray-500 mt-2">Your anonymous message is on its way.</p>
            <button 
              onClick={() => setStatus('idle')}
              className="mt-6 text-purple-600 font-semibold hover:underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full mb-4 flex items-center justify-center">
               <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${username}`} alt={username} className="w-full h-full rounded-full" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Send an anonymous message to @{username}</h1>
            <p className="text-gray-500 text-sm mb-6">They won't know who sent it.</p>
            
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full h-32 p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none mb-4"
            />
            
            <button
              onClick={handleSubmit}
              disabled={status === 'submitting' || !message.trim()}
              className="w-full bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {status === 'submitting' ? 'Sending...' : 'Send Message'}
            </button>
          </>
        )}
        
      </div>
    </div>
  );
}
