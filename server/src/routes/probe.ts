import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth';
import { User } from '../models/User';
import { PrivateMessage } from '../models/PrivateMessage';
import { PROBE_REPORT_SENDER_ID, PROBE_REPORT_SENDER_USERNAME } from '../constants/systemSenders';
import { BattleRewardService } from '../services/BattleRewardService';
import { NPCService } from '../services/NPCService';
import { ResearchFeatureService } from '../services/ResearchFeatureService';
import { ShieldService } from '../services/ShieldService';

const router = express.Router();

const PROBE_REPORT_PREFIX = 'PRB|';

/** Structured payload for Probe Report DMs; client parses when message starts with PRB| */
export interface ProbeReportPayload {
  pr: 1;
  n: string;   // target name (handle or NPC name)
  t: 'player' | 'npc';
  l: number;   // level (user level or NPC userLevelAssociation)
  x: number;
  y: number;
  b: { breacher: number; guardian: number; phreak: number };
}

// POST /complete — probe reached target; send Probe Report DM to probing user
router.post('/complete', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { targetOwner, targetUserId, targetNpcSlug, targetX, targetY } = req.body;
    if (targetOwner !== 'player' && targetOwner !== 'npc') {
      res.status(400).json({ error: 'targetOwner must be "player" or "npc"' });
      return;
    }
    const x = typeof targetX === 'number' ? targetX : parseInt(String(targetX), 10);
    const y = typeof targetY === 'number' ? targetY : parseInt(String(targetY), 10);
    if (Number.isNaN(x) || Number.isNaN(y)) {
      res.status(400).json({ error: 'targetX and targetY are required' });
      return;
    }

    const homeDefenseFeatures = await ResearchFeatureService.getUserFeatures(String(userId), 'home-defense');
    const probeUnlocked = homeDefenseFeatures.some((f: any) => f.id === 'probe' && f.isUnlocked);
    if (!probeUnlocked) {
      res.status(403).json({ error: 'Probe research is not unlocked' });
      return;
    }

    let targetName: string;
    let targetLevel: number;
    let bots: { breacher: number; guardian: number; phreak: number };

    if (targetOwner === 'player') {
      const targetId = targetUserId;
      if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
        res.status(400).json({ error: 'targetUserId required for player target' });
        return;
      }
      if (String(targetId) === String(userId)) {
        res.status(400).json({ error: 'Cannot probe yourself' });
        return;
      }
      const targetUserForShield = await User.findById(targetId);
      if (!targetUserForShield) {
        res.status(404).json({ error: 'Target user not found' });
        return;
      }
      const shielded = await ShieldService.checkAndUpdateShieldStatus(targetUserForShield);
      if (shielded) {
        res.status(400).json({ error: 'Target is shielded and cannot be probed' });
        return;
      }
      targetName = (targetUserForShield as any).handle || 'Unknown';
      targetLevel = (targetUserForShield as any).level ?? 1;
      const counts = await BattleRewardService.getUserBotCounts(String(targetId));
      bots = counts
        ? { breacher: counts.breacher, guardian: counts.guardian, phreak: counts.phreak }
        : { breacher: 0, guardian: 0, phreak: 0 };
    } else {
      if (!targetNpcSlug || typeof targetNpcSlug !== 'string') {
        res.status(400).json({ error: 'targetNpcSlug required for NPC target' });
        return;
      }
      const npc = await NPCService.getNPCBySlug(targetNpcSlug);
      if (!npc) {
        res.status(404).json({ error: 'NPC not found' });
        return;
      }
      targetName = npc.name;
      targetLevel = npc.userLevelAssociation;
      const breacher = npc.battalions.filter((b) => b.type === 'breacher').reduce((s, b) => s + b.quantity, 0);
      const guardian = npc.battalions.filter((b) => b.type === 'guardian').reduce((s, b) => s + b.quantity, 0);
      const phreak = npc.battalions.filter((b) => b.type === 'phreak').reduce((s, b) => s + b.quantity, 0);
      bots = { breacher, guardian, phreak };
    }

    const payload: ProbeReportPayload = {
      pr: 1,
      n: targetName,
      t: targetOwner,
      l: targetLevel,
      x,
      y,
      b: bots,
    };
    const messageBody = PROBE_REPORT_PREFIX + JSON.stringify(payload);
    if (messageBody.length > 600) {
      res.status(500).json({ error: 'Probe report too long' });
      return;
    }

    const doc = new PrivateMessage({
      senderId: PROBE_REPORT_SENDER_ID,
      recipientId: userId,
      senderUsername: PROBE_REPORT_SENDER_USERNAME,
      message: messageBody,
      readAt: null,
      isFromAdmin: false,
    });
    await doc.save();

    res.json({
      success: true,
      message: {
        id: String(doc._id),
        senderId: String(doc.senderId),
        recipientId: String(doc.recipientId),
        senderUsername: doc.senderUsername,
        message: doc.message,
        timestamp: doc.createdAt,
        readAt: doc.readAt,
      },
    });
  } catch (err: any) {
    console.error('Probe complete error:', err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

export default router;
