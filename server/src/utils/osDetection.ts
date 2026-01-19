export type DetectedOS = 'ios' | 'android' | 'desktop';

// Pre-compile regex patterns for better performance (compiled once, reused)
// iOS: Match iPhone, iPad, or iPod (real iOS devices always include one of these)
// Note: "ios" substring removed to avoid false positives (e.g., "Studios", "Axios")
const IOS_PATTERN = /iphone|ipad|ipod/i;
const ANDROID_PATTERN = /android/i;

/**
 * Detects operating system from User-Agent string using regex patterns
 * Returns 'ios', 'android', or 'desktop'
 * Optimized for performance: pre-compiled regex, early returns, no dependencies
 */
export function detectOS(userAgent: string): DetectedOS {
  // Early return for empty/missing User-Agent
  if (!userAgent) {
    return 'desktop';
  }

  // Check iOS first (most common mobile traffic)
  if (IOS_PATTERN.test(userAgent)) {
    return 'ios';
  }

  // Check Android
  if (ANDROID_PATTERN.test(userAgent)) {
    return 'android';
  }

  // Default to desktop (Windows, macOS, Linux, etc.)
  return 'desktop';
}
