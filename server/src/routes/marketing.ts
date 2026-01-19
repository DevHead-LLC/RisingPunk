import express, { Request, Response } from 'express';
import { detectOS } from '../utils/osDetection';
import { 
  APP_STORE_WEB_URL,
  GOOGLE_PLAY_WEB_URL,
  DESKTOP_LANDING_URL 
} from '../config/env';

const router = express.Router();

/**
 * Smart redirect endpoint: /go
 * For YouTube promotion - detects user OS and redirects appropriately
 * Uses deep links to open native app stores directly on mobile devices
 * 
 * Performance optimized: minimal processing, proper cache headers, no unnecessary middleware
 * 
 * Usage: https://risingpunk.com/go?utm_source=youtube&utm_campaign=trailer
 */
router.get('/go', (req: Request, res: Response) => {
  try {
    // Get User-Agent (early return if missing)
    const userAgent = req.headers['user-agent'] || '';
    
    // Detect OS (fast regex-based detection)
    const os = detectOS(userAgent);
    
    // Set performance and SEO headers before redirect
    // No-cache: redirects should always be fresh (user might switch devices)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Prevent search engines from indexing redirect endpoint
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    
    // Determine redirect URL
    // Use HTTPS URLs for mobile to preserve UTM tracking parameters
    // iOS 18+ and Android will automatically redirect to native app stores
    let redirectUrl: string;
    
    if (os === 'ios') {
      // Use HTTPS URL - iOS 18+ automatically redirects to App Store app
      // This preserves UTM parameters for campaign tracking
      const url = new URL(APP_STORE_WEB_URL);
      if (req.query.utm_source) url.searchParams.set('utm_source', req.query.utm_source as string);
      if (req.query.utm_campaign) url.searchParams.set('utm_campaign', req.query.utm_campaign as string);
      if (req.query.utm_medium) url.searchParams.set('utm_medium', req.query.utm_medium as string);
      redirectUrl = url.toString();
    } else if (os === 'android') {
      // Use HTTPS URL - preserves UTM parameters for campaign tracking
      // Android can be configured to open Play Store app via App Links
      const url = new URL(GOOGLE_PLAY_WEB_URL);
      if (req.query.utm_source) url.searchParams.set('utm_source', req.query.utm_source as string);
      if (req.query.utm_campaign) url.searchParams.set('utm_campaign', req.query.utm_campaign as string);
      if (req.query.utm_medium) url.searchParams.set('utm_medium', req.query.utm_medium as string);
      redirectUrl = url.toString();
    } else {
      // Desktop users get the web landing page with UTM parameters
      const url = new URL(DESKTOP_LANDING_URL);
      if (req.query.utm_source) url.searchParams.set('utm_source', req.query.utm_source as string);
      if (req.query.utm_campaign) url.searchParams.set('utm_campaign', req.query.utm_campaign as string);
      if (req.query.utm_medium) url.searchParams.set('utm_medium', req.query.utm_medium as string);
      redirectUrl = url.toString();
    }

    // Lightweight logging (async, doesn't block redirect)
    // Only log first 50 chars of UA to reduce log size
    setImmediate(() => {
      console.log(`[Redirect] ${os} -> ${redirectUrl.substring(0, 60)}...`);
    });

    // Perform redirect (302 = temporary redirect, appropriate for this use case)
    res.redirect(302, redirectUrl);
  } catch (error) {
    // Error handling: fallback to desktop landing page
    console.error('Redirect error:', error);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.redirect(302, DESKTOP_LANDING_URL);
  }
});

export default router;
