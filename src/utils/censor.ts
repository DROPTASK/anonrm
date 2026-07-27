import { supabase } from '../lib/supabase'; // Adjust path based on your project structure

// In-memory cache for blocked words
let blockedWordsCache: string[] = [];
let isFetched = false;

/**
 * Fetches blocked words from Supabase and caches them in memory.
 * Call this once during app initialization.
 */
export const fetchBlockedWords = async (): Promise<void> => {
  if (isFetched) return;

  const { data, error } = await supabase
    .from('blocked_words')
    .select('word');

  if (error) {
    console.error('Error fetching blocked words:', error.message);
    return;
  }

  if (data) {
    blockedWordsCache = data.map(item => item.word.toLowerCase());
    isFetched = true;
  }
};

/**
 * Censors a given string by checking against the cached blocked words.
 * Replaces the 2nd, 4th, 6th... letters of matched words with an asterisk (*).
 */
export const censorText = (text: string): string => {
  if (!blockedWordsCache.length) return text;

  // Escape words for regex and join them into an OR capture group
  const escapedWords = blockedWordsCache.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');

  return text.replace(regex, (match) => {
    // Arrays are 0-indexed. Odd indices map to the 2nd (1), 4th (3), 6th (5) letters.
    return match.split('').map((char, index) => {
      return index % 2 === 1 ? '*' : char;
    }).join('');
  });
};
