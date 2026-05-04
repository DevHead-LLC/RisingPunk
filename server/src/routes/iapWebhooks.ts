import express, { Request, Response } from 'express';
import { handleAppleAssnV2SignedPayload } from '../services/iap/iapAppleAssnService';

const router = express.Router();

/**
 * Apple ASSN V2 — expects JSON `{ signedPayload: string }` (no auth; must verify JWS).
 * @see taskItems/featuresAndBugs/iap-integration-plan.md Phase 3
 */
router.post('/apple', express.json({ limit: '256kb' }), async (req: Request, res: Response) => {
  try {
    const signedPayload = (req.body as { signedPayload?: unknown })?.signedPayload;
    if (typeof signedPayload !== 'string' || !signedPayload.trim()) {
      res.status(400).json({ error: 'signedPayload string required' });
      return;
    }
    const result = await handleAppleAssnV2SignedPayload(signedPayload);
    res.status(200).json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('not set') || msg.includes('APPLE_ROOT_CA_PATHS')) {
      // Bugbot: webhook is unauthenticated; avoid leaking server configuration internals to callers.
      res.status(503).json({ error: 'Apple ASSN verification not configured' });
      return;
    }
    console.error('Apple ASSN handler error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Google Play Real-time developer notifications — not wired until Pub/Sub + RTDN are configured.
 */
router.post('/google', express.json({ limit: '256kb' }), (_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Google RTDN webhook is not implemented yet. Use server reconciliation or add Pub/Sub per plan Phase 3.',
  });
});

export default router;
