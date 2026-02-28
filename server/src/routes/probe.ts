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

/** In-memory store of active probes so other clients can see them. Entries removed on cancel, after return ends, or TTL. */
interface ActiveProbe {
  id: string;
  sentByUserId: string;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  targetOwner: 'player' | 'npc';
  targetUserId?: string;
  targetNpcSlug?: string;
  targetNpcInstanceId?: string;
  launchedAt: number;
  /** Set when probe reaches target; probe stays in store until returnEndAt so viewers see return trip. */
  phase?: 'outbound' | 'returning';
  returnEndAt?: number;
  returnDurationSec?: number;
}
const activeProbesStore = new Map<string, ActiveProbe>();
const PROBE_TTL_MS = 10 * 60 * 1000;

function pruneStaleProbes(): void {
  const now = Date.now();
  for (const [id, p] of activeProbesStore.entries()) {
    if (p.phase === 'returning' && p.returnEndAt != null && now >= p.returnEndAt) {
      activeProbesStore.delete(id);
    } else if ((p.phase !== 'returning' || !p.returnEndAt) && now - p.launchedAt > PROBE_TTL_MS) {
      activeProbesStore.delete(id);
    }
  }
}

// POST /launch — register probe so other users can see it
router.post('/launch', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { probeId, fromX, fromY, targetX, targetY, targetOwner, targetUserId, targetNpcSlug, targetNpcInstanceId } = req.body;
    if (!probeId || typeof probeId !== 'string' || probeId.length > 120) {
      res.status(400).json({ error: 'probeId required' });
      return;
    }
    if (targetOwner !== 'player' && targetOwner !== 'npc') {
      res.status(400).json({ error: 'targetOwner must be "player" or "npc"' });
      return;
    }
    const fromXNum = typeof fromX === 'number' ? fromX : parseInt(String(fromX), 10);
    const fromYNum = typeof fromY === 'number' ? fromY : parseInt(String(fromY), 10);
    const x = typeof targetX === 'number' ? targetX : parseInt(String(targetX), 10);
    const y = typeof targetY === 'number' ? targetY : parseInt(String(targetY), 10);
    if (Number.isNaN(fromXNum) || Number.isNaN(fromYNum) || Number.isNaN(x) || Number.isNaN(y)) {
      res.status(400).json({ error: 'fromX, fromY, targetX, targetY required' });
      return;
    }

    const homeDefenseFeatures = await ResearchFeatureService.getUserFeatures(String(userId), 'home-defense');
    const probeUnlocked = homeDefenseFeatures.some((f: any) => f.id === 'probe' && f.isUnlocked);
    if (!probeUnlocked) {
      res.status(403).json({ error: 'Probe research is not unlocked' });
      return;
    }

    const entry: ActiveProbe = {
      id: probeId,
      sentByUserId: String(userId),
      fromX: fromXNum,
      fromY: fromYNum,
      targetX: x,
      targetY: y,
      targetOwner,
      targetUserId: targetUserId != null ? String(targetUserId) : undefined,
      targetNpcSlug: targetNpcSlug != null ? String(targetNpcSlug) : undefined,
      targetNpcInstanceId: targetNpcInstanceId != null ? String(targetNpcInstanceId) : undefined,
      launchedAt: Date.now(),
    };
    activeProbesStore.set(probeId, entry);
    pruneStaleProbes();
    res.json({ success: true });
  } catch (err: any) {
    console.error('Probe launch error:', err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

// GET /active — list active probes for map visibility (all users see all probes)
router.get('/active', auth, (req: Request, res: Response) => {
  try {
    pruneStaleProbes();
    const probes = Array.from(activeProbesStore.values()).map((p) => ({
      id: p.id,
      sentByUserId: p.sentByUserId,
      fromX: p.fromX,
      fromY: p.fromY,
      targetX: p.targetX,
      targetY: p.targetY,
      targetOwner: p.targetOwner,
      targetUserId: p.targetUserId,
      targetNpcSlug: p.targetNpcSlug,
      targetNpcInstanceId: p.targetNpcInstanceId,
      launchedAt: p.launchedAt,
      phase: p.phase ?? 'outbound',
      returnEndAt: p.returnEndAt,
      returnDurationSec: p.returnDurationSec,
    }));
    res.json({ probes });
  } catch (err: any) {
    console.error('Probe active list error:', err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

// POST /cancel — remove probe from active store (sender only)
router.post('/cancel', auth, (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { probeId } = req.body;
    if (!probeId || typeof probeId !== 'string') {
      res.status(400).json({ error: 'probeId required' });
      return;
    }
    const entry = activeProbesStore.get(probeId);
    if (entry && String(entry.sentByUserId) === String(userId)) {
      activeProbesStore.delete(probeId);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Probe cancel error:', err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

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

// POST /complete — probe reached target; send Probe Report DM to probing user.
// Requires a probe previously launched via /launch and sufficient outbound travel time elapsed.
router.post('/complete', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { probeId, targetOwner, targetUserId, targetNpcSlug, targetX, targetY } = req.body;
    if (!probeId || typeof probeId !== 'string' || probeId.length > 120) {
      res.status(400).json({ error: 'probeId required' });
      return;
    }
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

    const entry = activeProbesStore.get(probeId);
    if (!entry) {
      res.status(400).json({ error: 'Probe not found or not launched; launch via /launch first' });
      return;
    }
    if (String(entry.sentByUserId) !== String(userId)) {
      res.status(403).json({ error: 'Not your probe' });
      return;
    }
    if (entry.targetOwner !== targetOwner || entry.targetX !== x || entry.targetY !== y) {
      res.status(400).json({ error: 'Probe target does not match' });
      return;
    }
    if (targetOwner === 'player' && String(entry.targetUserId ?? '') !== String(targetUserId ?? '')) {
      res.status(400).json({ error: 'Probe target does not match' });
      return;
    }
    if (targetOwner === 'npc' && (entry.targetNpcSlug ?? '') !== (targetNpcSlug ?? '')) {
      res.status(400).json({ error: 'Probe target does not match' });
      return;
    }
    const distance = Math.sqrt((entry.targetX - entry.fromX) ** 2 + (entry.targetY - entry.fromY) ** 2);
    const outboundDurationSec = Math.max(2, distance * 2);
    const elapsedMs = Date.now() - entry.launchedAt;
    if (elapsedMs < outboundDurationSec * 1000) {
      res.status(400).json({ error: 'Probe has not reached target yet' });
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

    const returnDurationSec = Math.max(2, distance * 2);
    entry.phase = 'returning';
    entry.returnDurationSec = returnDurationSec;
    entry.returnEndAt = Date.now() + returnDurationSec * 1000;

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
