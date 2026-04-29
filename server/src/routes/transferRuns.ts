import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { TransferRun } from '../models/TransferRun';
import {
  buildTransferRunQuote,
  cancelOutboundTransferRun,
  launchTransferRun,
  TransferRunError,
} from '../services/TransferRunService';

const router = express.Router();

router.get('/active', auth, async (_req: Request, res: Response): Promise<void> => {
  try {
    // Map animation only — omit sender/recipient ids and financial fields (peer privacy).
    const runs = await TransferRun.find({ state: 'outbound' })
      .sort({ departAt: 1 })
      .select(
        'transferRunId originX originY targetX targetY state departAt arriveAt totalTravelSeconds'
      )
      .lean();
    res.json({ runs });
  } catch (error) {
    console.error('GET /api/transfer-runs/active error:', error);
    res.status(500).json({ error: 'Failed to load active transfer runs' });
  }
});

router.get('/mine', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const senderId = String(req.user._id);
    const runs = await TransferRun.find({ senderId, state: { $in: ['outbound', 'resolving'] } })
      .sort({ departAt: 1 })
      .select(
        'transferRunId senderId recipientId originX originY targetX targetY state departAt arriveAt totalTravelSeconds totalTransferValue feeAmount walletAmount itemPayload'
      )
      .lean();
    res.json({ runs });
  } catch (error) {
    console.error('GET /api/transfer-runs/mine error:', error);
    res.status(500).json({ error: 'Failed to load your transfer runs' });
  }
});

router.post('/quote', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const quote = buildTransferRunQuote({
      walletAmountRaw: req.body?.walletAmount,
      requestedItemsRaw: Array.isArray(req.body?.items) ? req.body.items : [],
    });
    res.json({
      walletAmount: quote.walletAmount,
      itemValueTotal: quote.itemValueTotal,
      totalTransferValue: quote.totalTransferValue,
      feeAmount: quote.feeAmount,
      totalSenderCashDebit: quote.totalSenderCashDebit,
      itemPayload: quote.itemPayload,
      feePolicyNote: 'Transfer fee is non-refundable once transfer launches.',
    });
  } catch (error) {
    if (error instanceof TransferRunError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('POST /api/transfer-runs/quote error:', error);
    res.status(500).json({ error: 'Failed to build transfer quote' });
  }
});

router.post('/launch', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await launchTransferRun({
      senderId: String(req.user._id),
      recipientUserId: String(req.body?.recipientUserId ?? ''),
      recipientTargetX: Number(req.body?.recipientTargetX),
      recipientTargetY: Number(req.body?.recipientTargetY),
      walletAmount: Number(req.body?.walletAmount ?? 0),
      items: Array.isArray(req.body?.items) ? req.body.items : [],
    });
    res.json({
      success: true,
      ...result,
      feePolicyNote: 'Transfer fee is non-refundable once transfer launches.',
    });
  } catch (error) {
    if (error instanceof TransferRunError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('POST /api/transfer-runs/launch error:', error);
    res.status(500).json({ error: 'Failed to launch transfer run' });
  }
});

router.post('/:transferRunId/cancel', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    await cancelOutboundTransferRun({
      senderId: String(req.user._id),
      transferRunId: String(req.params.transferRunId ?? ''),
    });
    res.json({ success: true, message: 'Transfer cancelled. Payload refunded minus transfer fee.' });
  } catch (error) {
    if (error instanceof TransferRunError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('POST /api/transfer-runs/:transferRunId/cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel transfer run' });
  }
});

export default router;
