import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import '../models/IapDeveloperSupportLedger';
import {
  verifyAppleDeveloperSupport,
  verifyGoogleDeveloperSupport,
  listDeveloperSupportLedgerWithSupporter,
} from '../services/iap/iapDeveloperSupportService';

const router = express.Router();

function isIapConfigurationError(msg: string): boolean {
  const s = msg.toLowerCase();
  const hasEnvKey =
    s.includes('apple_') ||
    s.includes('google_play_') ||
    s.includes('app_apple_id') ||
    s.includes('bundle_id') ||
    s.includes('bundle id');
  const hasConfigSignal =
    s.includes('not set') ||
    s.includes('required') ||
    s.includes('must be') ||
    s.includes('contained no usable paths') ||
    s.includes('valid json');
  return hasEnvKey && hasConfigSignal;
}

function isStoreVerificationInputError(msg: string): boolean {
  const s = msg.toLowerCase();
  return (
    s.includes('verification failed') ||
    s.includes('failed to decode') ||
    s.includes('invalid compact jws') ||
    s.includes('transactionid missing') ||
    s.includes('product id not in v1 catalog')
  );
}

router.post('/developer-support/verify', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const platform = body.platform;
    if (platform === 'apple') {
      const signedTransactionInfo = body.signedTransactionInfo;
      if (typeof signedTransactionInfo !== 'string' || !signedTransactionInfo.trim()) {
        res.status(400).json({ error: 'signedTransactionInfo string required' });
        return;
      }
      const result = await verifyAppleDeveloperSupport({ userId, signedTransactionInfo });
      res.json(result);
      return;
    }
    if (platform === 'google') {
      const productId = body.productId;
      const purchaseToken = body.purchaseToken;
      if (typeof productId !== 'string' || !productId.trim()) {
        res.status(400).json({ error: 'productId string required' });
        return;
      }
      if (typeof purchaseToken !== 'string' || !purchaseToken.trim()) {
        res.status(400).json({ error: 'purchaseToken string required' });
        return;
      }
      const result = await verifyGoogleDeveloperSupport({ userId, productId, purchaseToken });
      res.json(result);
      return;
    }
    res.status(400).json({ error: 'platform must be apple or google' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isIapConfigurationError(msg)) {
      res.status(503).json({ error: 'IAP verification is not configured on this server' });
      return;
    }
    if (msg.includes('already recorded for a different RisingPunk account')) {
      res.status(409).json({ error: msg });
      return;
    }
    if (msg.startsWith('IAP verify:')) {
      res.status(400).json({ error: msg });
      return;
    }
    if (isStoreVerificationInputError(msg)) {
      res.status(400).json({ error: `IAP verify: ${msg}` });
      return;
    }
    console.error('IAP verify error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/developer-support/ledger', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { supporter, rows } = await listDeveloperSupportLedgerWithSupporter(userId);
    res.json({ supporter, rows });
  } catch (e: unknown) {
    console.error('IAP ledger list error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
