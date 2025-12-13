/**
 * Content Moderation Utility
 * Filters bad words by replacing them with asterisks
 * Focuses on direct offensive terms, not partial matches in other words
 */

// Comprehensive list of offensive words and phrases
// Focus on direct offensive terms, not words that might appear in other contexts
const BAD_WORDS = [
  // Vulgar/Profanity (direct terms only, not partial words)
  'asshole', 'bastard', 'bitch', 'bullshit', 'cock', 'cocksucker', 'crap', 'cunt', 'damn',
  'dick', 'dickhead', 'fag', 'faggot', 'fuck', 'fucked', 'fucker', 'fucking', 'goddamn',
  'hell', 'motherfucker', 'piss', 'prick', 'shit', 'shitter', 'slut', 'tits', 'whore',
  
  // Racist slurs (direct terms and common variations)
  'nigger', 'nigga', 'n1gger', 'n1gga', 'n!gger', 'n!gga', 'ni99er', 'ni99a',
  'chink', 'gook', 'kike', 'spic', 'wetback', 'towelhead', 'sandnigger', 'sandnigga',
  'beaner', 'coon', 'jap', 'paki', 'raghead', 'taco', 'zipperhead',
  
  // Sexist/Discriminatory terms (additional terms not already listed above)
  'skank', 'ho', 'hoe',
  
  // Hate speech terms (additional terms not already listed above)
  'retard', 'retarded', 'dyke', 'tranny', 'shemale',
];

// Character substitution map for leetspeak detection
const CHAR_SUBSTITUTIONS: { [key: string]: string } = {
  '@': 'a',
  '4': 'a',
  '$': 's',
  '5': 's',
  '0': 'o',
  '1': 'i',
  '!': 'i',
  '3': 'e',
  '7': 't',
  '+': 't',
};

/**
 * Normalizes text by replacing common character substitutions with their letter equivalents
 * This helps catch leetspeak variations like "f@ck" or "n1gg3r"
 */
function normalizeLeetspeak(text: string): string {
  let normalized = text.toLowerCase();
  for (const [char, replacement] of Object.entries(CHAR_SUBSTITUTIONS)) {
    normalized = normalized.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement);
  }
  return normalized;
}

/**
 * Creates a regex pattern for a word that handles:
 * - Case-insensitive matching
 * - Leetspeak variations (after normalization)
 * - Word boundaries to avoid false positives
 */
function createWordPattern(word: string): RegExp {
  // Escape special regex characters
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Use word boundaries to match whole words only
  // This prevents matching "ass" in "class" or "pass"
  return new RegExp(`\\b${escaped}\\b`, 'gi');
}

/**
 * Filters bad words from text by replacing them with asterisks
 * @param text - The text to filter
 * @returns The filtered text with bad words replaced by asterisks
 */
export function filterBadWords(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let filtered = text;
  const normalizedText = normalizeLeetspeak(text);

  // Process each bad word
  for (const badWord of BAD_WORDS) {
    // Check direct matches in original text (case-insensitive, word boundaries)
    const directPattern = createWordPattern(badWord);
    filtered = filtered.replace(directPattern, (match) => '*'.repeat(match.length));

    // Check normalized text for leetspeak variations
    const normalizedPattern = createWordPattern(badWord);
    let match;
    const regex = new RegExp(normalizedPattern.source, 'g');
    
    // Process matches in reverse order to maintain correct indices
    const matches: Array<{ start: number; end: number; original: string }> = [];
    while ((match = regex.exec(normalizedText)) !== null) {
      if (match.index !== undefined) {
        const start = match.index;
        const end = start + match[0].length;
        const originalMatch = text.substring(start, end);
        matches.push({ start, end, original: originalMatch });
      }
    }
    
    // Replace matches found in normalized text at corresponding positions in original
    // Process in reverse to maintain indices
    for (let i = matches.length - 1; i >= 0; i--) {
      const { start, end, original } = matches[i];
      // Only replace if not already replaced
      if (filtered.substring(start, end) === original) {
        filtered = filtered.substring(0, start) + '*'.repeat(original.length) + filtered.substring(end);
      }
    }
  }

  return filtered;
}

/**
 * Checks if text contains any bad words
 * @param text - The text to check
 * @returns true if bad words are detected, false otherwise
 */
export function containsBadWords(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const filtered = filterBadWords(text);
  return filtered !== text;
}

/**
 * Creates a regex pattern for a word WITHOUT word boundaries
 * This allows matching bad words even when they appear inside other words
 * (e.g., "ass" in "class" or "MyAssholeCrew")
 */
function createSubstringPattern(word: string): RegExp {
  // Escape special regex characters
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // No word boundaries - matches anywhere in the string
  return new RegExp(escaped, 'gi');
}

/**
 * Checks if text contains any bad words as substrings (no word boundaries)
 * Used for crew names/identifiers where words are concatenated without spaces
 * @param text - The text to check
 * @returns true if bad words are detected, false otherwise
 */
export function containsBadWordsAsSubstring(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const normalizedText = normalizeLeetspeak(text.toLowerCase());

  // Check each bad word as a substring (no word boundaries)
  for (const badWord of BAD_WORDS) {
    // Check in normalized text for leetspeak variations
    const normalizedPattern = createSubstringPattern(badWord);
    if (normalizedPattern.test(normalizedText)) {
      return true;
    }
    
    // Also check original text (case-insensitive)
    const directPattern = createSubstringPattern(badWord);
    if (directPattern.test(text)) {
      return true;
    }
  }

  return false;
}
