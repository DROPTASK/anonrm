// src/utils/censor.ts

// In production, fetch this array from your Supabase 'blocked_words' table on app load
const BLOCKED_WORDS = ["fuck", "shit", "bitch", "asshole", "damn"]; 

export const censorMessage = (text: string): string => {
  if (!text) return "";
  
  let censoredText = text;
  
  BLOCKED_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    censoredText = censoredText.replace(regex, (match) => {
      // Censor 2nd, 4th, 6th, etc. letters (index 1, 3, 5)
      return match.split('').map((char, index) => {
        // Index is 0-based. So 1 is 2nd letter, 3 is 4th letter.
        return (index % 2 !== 0) ? '*' : char;
      }).join('');
    });
  });

  return censoredText;
};
