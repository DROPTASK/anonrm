import { useState } from 'react';
import Feed from '../components/Feed';
import NewConfessionModal from '../components/NewConfessionModal';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Changing the key forces React to unmount and remount the Feed component,
  // which re-runs its useEffect and fetches the latest confessions from Supabase.
  const [refreshKey, setRefreshKey] = useState(0);

  const handleConfessionSuccess = () => {
    setRefreshKey(prev => prev + 1); // Trigger a feed refresh
  };

  return (
    <div className="p-4 md:p-8 min-h-screen pb-24 bg-white dark:bg-gray-900">
      
      {/* Header Area */}
      <div className="max-w-2xl mx-auto w-full mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Global Feed
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Read the latest anonymous thoughts...
          </p>
        </div>
        
        {/* Post Button (Hidden on tiny screens to avoid crowding) */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-black dark:bg-white text-white dark:text-black px-4 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">New Confession</span>
        </button>
      </div>

      {/* Main Feed */}
      <Feed key={refreshKey} />

      {/* Floating Action Button (Mobile Only) */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="sm:hidden fixed bottom-20 right-6 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Confession Creation Modal */}
      <NewConfessionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleConfessionSuccess}
      />
      
    </div>
  );
}
