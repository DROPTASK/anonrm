import { useState, useRef } from 'react';
// import html2canvas from 'html2canvas'; // Uncomment when you install the package

const MOCK_DMS = [
  {
    id: 1,
    text: "I saw you working at the cafe today. The new app UI is looking incredibly sleek. Too shy to say hi though!",
    time: "10m ago",
    isRead: false,
  },
  {
    id: 2,
    text: "Are you still using Vite for this? The hot reload must be super fast.",
    time: "1h ago",
    isRead: false,
  },
  {
    id: 3,
    text: "Honestly, going with the minimalist dark mode was the right call.",
    time: "3h ago",
    isRead: true,
  }
];

export default function DMs() {
  const [dms, setDms] = useState(MOCK_DMS);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Ref for the IG Story export feature
  const captureRef = useRef<HTMLDivElement>(null);

  const toggleDM = (id: number) => {
    // Mark as read when opened
    setDms(currentDms => 
      currentDms.map(dm => dm.id === id ? { ...dm, isRead: true } : dm)
    );
    setExpandedId(expandedId === id ? null : id);
  };

  const handleShareToIG = async () => {
    // Placeholder for html2canvas logic
    // if (captureRef.current) {
    //   const canvas = await html2canvas(captureRef.current, { backgroundColor: null });
    //   const image = canvas.toDataURL("image/png");
    //   // Trigger share API or download
    // }
    console.log("Exporting to IG Story...");
  };

  const unreadCount = dms.filter(m => !m.isRead).length;

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Sticky Glass Header */}
      <header className="glass-header sticky top-0 z-40 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">Direct Messages</h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full animate-fade-in">
              {unreadCount} new
            </span>
          )}
        </div>
      </header>

      {/* DM List */}
      <div className="flex flex-col pb-6">
        {dms.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500">
            <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>Your inbox is empty.</p>
          </div>
        ) : (
          dms.map((dm, index) => (
            <div 
              key={dm.id} 
              className={`border-b border-zinc-200 dark:border-zinc-800 transition-colors animate-slide-up ${
                !dm.isRead ? 'bg-zinc-50 dark:bg-zinc-900/50' : ''
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* DM Header / Preview */}
              <button 
                onClick={() => toggleDM(dm.id)}
                className="w-full text-left px-4 py-4 flex flex-col gap-2 focus:outline-none"
              >
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    {!dm.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                    )}
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Anonymous
                    </span>
                  </div>
                  <span className="text-xs font-medium text-zinc-400">
                    {dm.time}
                  </span>
                </div>
                
                <p className={`text-base truncate w-full ${!dm.isRead ? 'font-semibold text-zinc-900 dark:text-white' : 'font-medium text-zinc-600 dark:text-zinc-300'}`}>
                  {dm.text}
                </p>
              </button>

              {/* Expanded Action Area & IG Story Card */}
              {expandedId === dm.id && (
                <div className="px-4 pb-4 animate-fade-in">
                  
                  {/* IG Story Capture Container */}
                  <div 
                    ref={captureRef}
                    className="p-6 bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-[#18181b] dark:to-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl mb-4 shadow-sm flex flex-col gap-4 relative overflow-hidden"
                  >
                    {/* Decorative element for the generated image */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
                    
                    <div className="flex items-center gap-2 z-10">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                        ?
                      </div>
                      <span className="text-sm font-bold text-zinc-500">Anonymous Message</span>
                    </div>
                    
                    <p className="text-xl font-bold leading-snug whitespace-pre-wrap z-10 text-zinc-900 dark:text-white">
                      {dm.text}
                    </p>
                    
                    <div className="mt-2 text-xs font-semibold text-zinc-400 z-10">
                      ConfessApp
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* IG Story Share Button */}
                    <button 
                      onClick={handleShareToIG}
                      className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Share to IG
                    </button>
                    
                    {/* Reply Button */}
                    <button className="flex-1 bg-primary hover:bg-primaryHover text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
