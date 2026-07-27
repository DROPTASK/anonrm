import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

interface Props {
  message: string;
  username: string;
  date: string;
}

export default function StoryExportCard({ message, username, date }: Props) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);

    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 3, // High resolution for mobile displays
        useCORS: true,
        backgroundColor: null, // Keep border radius transparency
      });

      const image = canvas.toDataURL('image/png');
      
      // Trigger download
      const link = document.createElement('a');
      link.href = image;
      link.download = `confession-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting image:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
      
      {/* The Area to be Exported */}
      <div 
        ref={exportRef}
        className="w-full max-w-[320px] aspect-square flex flex-col relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-1"
      >
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-[22px] p-6 flex flex-col">
          
          <div className="text-center border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Send me anonymous messages!</h3>
            <p className="text-sm text-gray-500">@{username}</p>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <p className="text-center font-medium text-gray-800 dark:text-gray-200 text-xl md:text-2xl break-words whitespace-pre-wrap">
              {message}
            </p>
          </div>

          <div className="text-center mt-4">
             <span className="text-xs text-gray-400 font-medium">{new Date(date).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Export Button (Outside the capture area) */}
      <button 
        onClick={handleExport}
        disabled={isExporting}
        className="mt-6 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        {isExporting ? 'Generating Image...' : 'Share to Insta Story'}
      </button>
    </div>
  );
}
