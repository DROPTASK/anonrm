/**
 * @file src/utils/censor.ts
 * @description Utility for detecting and censoring profanity or NSFW content.
 * Uses regex boundaries to prevent the Scunthorpe problem (e.g., blocking "class").
 */

// A simplified list for demonstration. In a real app, use a comprehensive dictionary or external API.
const BANNED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'slut', 'whore',
  'faggot', 'nigger', 'spic', 'chink', 'twat', 'wanker', 'bastard'
];

/**
 * Escapes regex characters in a string
 */
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Builds a dynamic regex pattern from the banned words list
 */
const buildCensorRegex = (): RegExp => {
  const pattern = BANNED_WORDS.map(escapeRegExp).join('|');
  // \b ensures we only match whole words
  return new RegExp(`\\b(${pattern})\\b`, 'gi');
};

const CENSOR_REGEX = buildCensorRegex();

/**
 * Replaces banned words with asterisks of the same length.
 * @param text The input string to censor.
 * @returns The censored string.
 */
export const censorText = (text: string): string => {
  if (!text) return text;
  
  return text.replace(CENSOR_REGEX, (match) => {
    return '*'.repeat(match.length);
  });
};

/**
 * Checks if a string contains banned words.
 * @param text The input string to check.
 * @returns boolean indicating if profanity was found.
 */
export const containsProfanity = (text: string): boolean => {
  if (!text) return false;
  
  // Reset regex state before testing
  CENSOR_REGEX.lastIndex = 0;
  return CENSOR_REGEX.test(text);
};
