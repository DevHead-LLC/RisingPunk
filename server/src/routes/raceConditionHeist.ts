import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { User } from '../models/User';
import { RaceConditionHeistSession } from '../models/RaceConditionHeistSession';
import {
  getLevelParams,
  getAllLevelIds,
  getTierLevels,
  getCostForLevel,
  getComboMultiplier,
  computeRaceConditionHeistGuardianBonus,
  getRandomWordGroupForTier,
  PACKET_TYPES,
  EXPLOIT_TYPES,
  type LevelId,
  type PacketTypeKey,
} from '../config/raceConditionHeistConfig';
import { accrueBalanceToTime } from '../utils/balanceAccrual';

const router = express.Router();

/** GET /api/race-condition-heist/status */
router.get('/status', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (!user.unlockedFeatures?.programmingFacility) {
      res.status(403).json({ error: 'Programming Facility not unlocked' });
      return;
    }
    const levelsCompleted: string[] = Array.isArray(user.raceConditionHeist?.levelsCompleted)
      ? user.raceConditionHeist!.levelsCompleted
      : [];
    const completedSet = new Set(levelsCompleted);
    const levelIds = getAllLevelIds();
    const levelConfigs = levelIds.map((id) => {
      const params = getLevelParams(id);
      if (!params) return null;
      const isCompleted = completedSet.has(id);
      const prevLevels = levelIds.slice(0, levelIds.indexOf(id));
      const isUnlocked = prevLevels.every((lid) => completedSet.has(lid));
      return {
        levelId: params.levelId,
        tier: params.tier,
        matchDurationMs: params.matchDurationMs,
        cost: getCostForLevel(id),
        scoreThreshold: params.scoreThreshold,
        isCompleted,
        isUnlocked,
      };
    }).filter(Boolean);
    res.json({
      levelsCompleted,
      levelConfigs,
      tierLevels: getTierLevels(1),
    });
  } catch (error: unknown) {
    console.error('Race Condition Heist status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Generate one packet for Pass 1 / Tier 1. Exploit timing is validated by word-rotation (word before secure). */
function generatePass1Packet(): { id: string; type: PacketTypeKey; value: number } {
  const types = Object.entries(PACKET_TYPES) as [PacketTypeKey, number][];
  const [type, value] = types[0];
  return { id: 'p1', type, value };
}

/** Tier 2: two USER_DATA nodes — first Capture (Exploit), second Encrypt. */
function generateTier2Packets(): { id: string; type: PacketTypeKey; value: number }[] {
  const value = PACKET_TYPES.USER_DATA;
  return [
    { id: 'p1', type: 'USER_DATA', value },
    { id: 'p2', type: 'USER_DATA', value },
  ];
}

/** Tier 3: three USER_DATA nodes — Exploit, Encrypt, Exfiltrate. */
function generateTier3Packets(): { id: string; type: PacketTypeKey; value: number }[] {
  const value = PACKET_TYPES.USER_DATA;
  return [
    { id: 'p1', type: 'USER_DATA', value },
    { id: 'p2', type: 'USER_DATA', value },
    { id: 'p3', type: 'USER_DATA', value },
  ];
}

/** Index in wordRotation when exploit is valid (the word before the secure word: Lock, Encrypt, or Secure). */
function getPreSecureIndex(wordRotation: string[]): number {
  if (wordRotation.length < 2) return 0;
  return wordRotation.length - 2;
}

/** Current word index from elapsed ms, rotation params, and optional start offset. */
function getCurrentWordIndex(
  elapsedMs: number,
  wordDurationMs: number,
  wordCount: number,
  wordStartOffset: number = 0
): number {
  if (wordCount <= 0) return 0;
  return (Math.floor(elapsedMs / wordDurationMs) + wordStartOffset) % wordCount;
}

/** POST /api/race-condition-heist/session/start */
router.post('/session/start', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { levelId } = req.body as { levelId?: string };
    if (!levelId || typeof levelId !== 'string') {
      res.status(400).json({ error: 'levelId required' });
      return;
    }
    const params = getLevelParams(levelId);
    if (!params) {
      res.status(400).json({ error: 'Invalid level' });
      return;
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (!user.unlockedFeatures?.programmingFacility) {
      res.status(403).json({ error: 'Programming Facility not unlocked' });
      return;
    }
    const levelsCompleted: string[] = Array.isArray(user.raceConditionHeist?.levelsCompleted)
      ? user.raceConditionHeist!.levelsCompleted
      : [];
    const completedSet = new Set(levelsCompleted);
    const levelIds = getAllLevelIds();
    const idx = levelIds.indexOf(levelId);
    const prevLevels = levelIds.slice(0, idx);
    const isUnlocked = prevLevels.every((lid) => completedSet.has(lid));
    if (!isUnlocked) {
      res.status(403).json({ error: 'Level not unlocked' });
      return;
    }
    if (completedSet.has(levelId)) {
      res.status(400).json({ error: 'Level already completed' });
      return;
    }
    let sessionDoc = await RaceConditionHeistSession.findOne({ userId: user._id, levelId }).lean();
    if (sessionDoc) {
      const elapsed = Date.now() - new Date(sessionDoc.startedAt).getTime();
      const runOver =
        sessionDoc.phase !== 'RUNNING' ||
        elapsed >= sessionDoc.matchDurationMs;
      if (runOver) {
        await RaceConditionHeistSession.deleteOne({ userId: user._id, levelId });
        sessionDoc = null;
      }
    }
    if (!sessionDoc) {
      const cost = getCostForLevel(levelId);
      const now = new Date();
      const bal = user.balance;
      const accrued = accrueBalanceToTime(
        bal?.total ?? 0,
        bal?.ratePerSecond ?? 0,
        bal?.lastUpdated ?? now,
        bal?.fractionalRemainder ?? 0,
        now
      );
      if (accrued.total < cost) {
        res.status(402).json({
          error: 'Insufficient funds',
          required: cost,
          balance: accrued.total,
        });
        return;
      }
      const wordDurationMs = params.wordDurationMs;
      const isTier2 = params.tier === 2;
      const isTier3 = params.tier === 3;
      const packets = isTier3
        ? generateTier3Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
        : isTier2
          ? generateTier2Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
          : [{ ...generatePass1Packet(), isHijacked: false }];
      const wordRotation =
        params.tier <= 3 ? getRandomWordGroupForTier(params.tier) : params.wordRotation;
      const wordStartOffset =
        wordRotation.length > 0 ? Math.floor(Math.random() * wordRotation.length) : 0;
      const wordRotationPhase2 = (isTier2 || isTier3) ? getRandomWordGroupForTier(params.tier) : undefined;
      const wordStartOffsetPhase2 =
        wordRotationPhase2 && wordRotationPhase2.length > 0
          ? Math.floor(Math.random() * wordRotationPhase2.length)
          : undefined;
      const wordRotationPhase3 = isTier3 ? getRandomWordGroupForTier(params.tier) : undefined;
      const wordStartOffsetPhase3 =
        wordRotationPhase3 && wordRotationPhase3.length > 0
          ? Math.floor(Math.random() * wordRotationPhase3.length)
          : undefined;
      try {
        await RaceConditionHeistSession.create({
          userId: user._id,
          levelId,
          startedAt: now,
          matchDurationMs: params.matchDurationMs,
          wordRotation,
          wordDurationMs,
          wordStartOffset,
          ...((isTier2 || isTier3) && {
            wordRotationPhase2,
            wordStartOffsetPhase2: wordStartOffsetPhase2 ?? 0,
          }),
          ...(isTier3 && {
            wordRotationPhase3,
            wordStartOffsetPhase3: wordStartOffsetPhase3 ?? 0,
          }),
          phase: 'RUNNING',
          packets,
          score: 0,
          comboCount: 0,
        });
      } catch (createErr: unknown) {
        const code = (createErr as { code?: number })?.code;
        if (code === 11000) {
          const existing = await RaceConditionHeistSession.findOne({ userId: user._id, levelId }).lean();
          if (existing) {
            res.json({
              startedAt: existing.startedAt,
              matchDurationMs: existing.matchDurationMs,
              scoreThreshold: params.scoreThreshold,
              wordRotation: existing.wordRotation,
              wordDurationMs: existing.wordDurationMs,
              wordStartOffset: existing.wordStartOffset ?? 0,
              ...(existing.wordRotationPhase2 && {
                wordRotationPhase2: existing.wordRotationPhase2,
                wordStartOffsetPhase2: existing.wordStartOffsetPhase2 ?? 0,
                phase2StartedAt: existing.phase2StartedAt,
              }),
              ...(existing.wordRotationPhase3 && {
                wordRotationPhase3: existing.wordRotationPhase3,
                wordStartOffsetPhase3: existing.wordStartOffsetPhase3 ?? 0,
                phase3StartedAt: existing.phase3StartedAt,
              }),
              phase: existing.phase,
              packets: existing.packets,
              score: existing.score,
              comboCount: existing.comboCount,
              exploitCooldownUntil: existing.exploitCooldownUntil,
            });
            return;
          }
        }
        throw createErr;
      }
      const newTotal = accrued.total - cost;
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            'balance.total': newTotal,
            'balance.lastUpdated': accrued.lastUpdated,
            'balance.fractionalRemainder': accrued.fractionalRemainder,
          },
        }
      );
      res.json({
        startedAt: now.toISOString(),
        matchDurationMs: params.matchDurationMs,
        scoreThreshold: params.scoreThreshold,
        wordRotation,
        wordDurationMs,
        wordStartOffset,
        ...((isTier2 || isTier3) && {
          wordRotationPhase2,
          wordStartOffsetPhase2: wordStartOffsetPhase2 ?? 0,
        }),
        ...(isTier3 && {
          wordRotationPhase3,
          wordStartOffsetPhase3: wordStartOffsetPhase3 ?? 0,
        }),
        phase: 'RUNNING',
        packets,
        score: 0,
        comboCount: 0,
        balance: {
          total: newTotal,
          ratePerSecond: bal?.ratePerSecond ?? 0,
          lastUpdated: accrued.lastUpdated.toISOString(),
        },
      });
      return;
    }
    res.json({
      startedAt: sessionDoc.startedAt,
      matchDurationMs: sessionDoc.matchDurationMs,
      scoreThreshold: params.scoreThreshold,
      wordRotation: sessionDoc.wordRotation ?? params.wordRotation,
      wordDurationMs: sessionDoc.wordDurationMs ?? params.wordDurationMs,
      wordStartOffset: sessionDoc.wordStartOffset ?? 0,
      ...(sessionDoc.wordRotationPhase2 && {
        wordRotationPhase2: sessionDoc.wordRotationPhase2,
        wordStartOffsetPhase2: sessionDoc.wordStartOffsetPhase2 ?? 0,
        phase2StartedAt: sessionDoc.phase2StartedAt,
      }),
      ...(sessionDoc.wordRotationPhase3 && {
        wordRotationPhase3: sessionDoc.wordRotationPhase3,
        wordStartOffsetPhase3: sessionDoc.wordStartOffsetPhase3 ?? 0,
        phase3StartedAt: sessionDoc.phase3StartedAt,
      }),
      phase: sessionDoc.phase,
      packets: sessionDoc.packets,
      score: sessionDoc.score,
      comboCount: sessionDoc.comboCount,
      exploitCooldownUntil: sessionDoc.exploitCooldownUntil,
    });
  } catch (error: unknown) {
    console.error('Race Condition Heist session start error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/race-condition-heist/attempt-hijack */
router.post('/attempt-hijack', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { levelId, packetId } = req.body as { levelId?: string; packetId?: string };
    if (!levelId || typeof levelId !== 'string' || !packetId || typeof packetId !== 'string') {
      res.status(400).json({ error: 'levelId and packetId required' });
      return;
    }
    const params = getLevelParams(levelId);
    if (!params) {
      res.status(400).json({ error: 'Invalid level' });
      return;
    }
    const sessionDoc = await RaceConditionHeistSession.findOne({ userId: req.user!._id, levelId });
    if (!sessionDoc) {
      res.status(400).json({ error: 'No active session; start a session first' });
      return;
    }
    const now = new Date();
    const startedAt = new Date(sessionDoc.startedAt);
    const elapsedMs = now.getTime() - startedAt.getTime();
    if (elapsedMs >= sessionDoc.matchDurationMs) {
      sessionDoc.phase = 'LOCKDOWN';
      await sessionDoc.save();
      res.json({
        success: false,
        phase: 'LOCKDOWN',
        reason: 'match_ended',
        packets: sessionDoc.packets,
        score: sessionDoc.score,
        comboCount: 0,
      });
      return;
    }
    const packetIndex = sessionDoc.packets.findIndex((p) => p.id === packetId);
    const packet = packetIndex !== -1 ? sessionDoc.packets[packetIndex] : undefined;
    if (!packet) {
      res.status(400).json({ error: 'Packet not found' });
      return;
    }
    if (packet.isHijacked) {
      res.status(400).json({ error: 'Packet already hijacked' });
      return;
    }
    /** Tier 2+: second node (Encrypt) can only be attempted after first node is captured. */
    if (packetIndex === 1) {
      if (!sessionDoc.packets[0]?.isHijacked) {
        res.status(400).json({
          error: 'Capture the first node before encrypting the second',
          reason: 'complete_first_node',
          packets: sessionDoc.packets,
          score: sessionDoc.score,
          comboCount: sessionDoc.comboCount,
        });
        return;
      }
      if (!sessionDoc.phase2StartedAt || !sessionDoc.wordRotationPhase2?.length) {
        res.status(400).json({ error: 'Phase 2 not started' });
        return;
      }
    }
    /** Tier 3: third node (Exfiltrate) can only be attempted after first two are captured. */
    if (packetIndex === 2) {
      if (!sessionDoc.packets[0]?.isHijacked || !sessionDoc.packets[1]?.isHijacked) {
        res.status(400).json({
          error: 'Capture the first two nodes before exfiltrating the third',
          reason: 'complete_previous_nodes',
          packets: sessionDoc.packets,
          score: sessionDoc.score,
          comboCount: sessionDoc.comboCount,
        });
        return;
      }
      if (!sessionDoc.phase3StartedAt || !sessionDoc.wordRotationPhase3?.length) {
        res.status(400).json({ error: 'Phase 3 not started' });
        return;
      }
    }
    const cooldownMs = EXPLOIT_TYPES.BUFFER_OVERFLOW.cooldownMs;
    const multiplier = EXPLOIT_TYPES.BUFFER_OVERFLOW.multiplier;
    if (sessionDoc.exploitCooldownUntil && new Date(sessionDoc.exploitCooldownUntil).getTime() > now.getTime()) {
      res.json({
        success: false,
        reason: 'cooldown',
        packets: sessionDoc.packets,
        score: sessionDoc.score,
        comboCount: sessionDoc.comboCount,
        exploitCooldownUntil: sessionDoc.exploitCooldownUntil,
      });
      return;
    }
    const wordDurationMs = sessionDoc.wordDurationMs ?? 1500;
    let currentIndex: number;
    let wordRotation: string[];
    let inWindow: boolean;
    if (packetIndex === 2 && sessionDoc.phase3StartedAt && sessionDoc.wordRotationPhase3?.length) {
      const phase3ElapsedMs = now.getTime() - new Date(sessionDoc.phase3StartedAt).getTime();
      wordRotation = sessionDoc.wordRotationPhase3;
      const wordStartOffsetPhase3 = sessionDoc.wordStartOffsetPhase3 ?? 0;
      currentIndex = getCurrentWordIndex(
        phase3ElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffsetPhase3
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    } else if (packetIndex === 1 && sessionDoc.phase2StartedAt && sessionDoc.wordRotationPhase2?.length) {
      const phase2ElapsedMs = now.getTime() - new Date(sessionDoc.phase2StartedAt).getTime();
      wordRotation = sessionDoc.wordRotationPhase2;
      const wordStartOffsetPhase2 = sessionDoc.wordStartOffsetPhase2 ?? 0;
      currentIndex = getCurrentWordIndex(
        phase2ElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffsetPhase2
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    } else {
      wordRotation = sessionDoc.wordRotation ?? [];
      const wordStartOffset = sessionDoc.wordStartOffset ?? 0;
      currentIndex = getCurrentWordIndex(
        elapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffset
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    }
    if (!inWindow) {
      sessionDoc.comboCount = 0;
      await sessionDoc.save();
      res.json({
        success: false,
        reason: 'missed_window',
        packets: sessionDoc.packets,
        score: sessionDoc.score,
        comboCount: 0,
        exploitCooldownUntil: new Date(now.getTime() + cooldownMs).toISOString(),
      });
      return;
    }
    const comboMult = getComboMultiplier(sessionDoc.comboCount);
    const addedScore = Math.floor(packet.value * multiplier * comboMult);
    sessionDoc.score += addedScore;
    sessionDoc.comboCount += 1;
    sessionDoc.lastSuccessfulHijackAt = now;
    sessionDoc.exploitCooldownUntil = new Date(now.getTime() + cooldownMs);
    if (packetIndex === 0 && sessionDoc.wordRotationPhase2?.length) {
      sessionDoc.phase2StartedAt = now;
    }
    if (packetIndex === 1 && sessionDoc.wordRotationPhase3?.length) {
      sessionDoc.phase3StartedAt = now;
    }
    const pIdx = sessionDoc.packets.findIndex((p) => p.id === packetId);
    if (pIdx !== -1) sessionDoc.packets[pIdx].isHijacked = true;
    await sessionDoc.save();
    res.json({
      success: true,
      addedScore,
      packets: sessionDoc.packets,
      score: sessionDoc.score,
      comboCount: sessionDoc.comboCount,
      exploitCooldownUntil: sessionDoc.exploitCooldownUntil?.toISOString(),
      ...(sessionDoc.phase2StartedAt && {
        phase2StartedAt: sessionDoc.phase2StartedAt.toISOString(),
      }),
      ...(sessionDoc.phase3StartedAt && {
        phase3StartedAt: sessionDoc.phase3StartedAt.toISOString(),
      }),
    });
  } catch (error: unknown) {
    console.error('Race Condition Heist attempt-hijack error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/race-condition-heist/end-run — client calls when timer expires or user ends. */
router.post('/end-run', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { levelId } = req.body as { levelId?: string };
    if (!levelId || typeof levelId !== 'string') {
      res.status(400).json({ error: 'levelId required' });
      return;
    }
    const sessionDoc = await RaceConditionHeistSession.findOne({ userId: req.user!._id, levelId });
    if (!sessionDoc) {
      res.status(400).json({ error: 'No active session' });
      return;
    }
    sessionDoc.phase = 'LOCKDOWN';
    await sessionDoc.save();
    const params = getLevelParams(levelId);
    const scoreThreshold = params?.scoreThreshold ?? 50;
    const won = sessionDoc.score >= scoreThreshold;
    if (won) {
      await User.updateOne(
        { _id: userId },
        { $addToSet: { 'raceConditionHeist.pendingClaimLevelIds': levelId } }
      );
    }
    await RaceConditionHeistSession.deleteOne({ userId: req.user!._id, levelId });
    res.json({
      phase: 'LOCKDOWN',
      packets: sessionDoc.packets,
      score: sessionDoc.score,
      comboCount: sessionDoc.comboCount,
      scoreThreshold,
      won,
    });
  } catch (error: unknown) {
    console.error('Race Condition Heist end-run error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/race-condition-heist/claim */
router.post('/claim', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { levelId } = req.body as { levelId?: string };
    if (!levelId || typeof levelId !== 'string') {
      res.status(400).json({ error: 'levelId required' });
      return;
    }
    const params = getLevelParams(levelId);
    if (!params) {
      res.status(400).json({ error: 'Invalid level' });
      return;
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (!user.unlockedFeatures?.programmingFacility) {
      res.status(403).json({ error: 'Programming Facility not unlocked' });
      return;
    }
    const levelsCompleted: string[] = Array.isArray(user.raceConditionHeist?.levelsCompleted)
      ? user.raceConditionHeist!.levelsCompleted
      : [];
    const pendingClaimLevelIds: string[] = Array.isArray(user.raceConditionHeist?.pendingClaimLevelIds)
      ? user.raceConditionHeist!.pendingClaimLevelIds
      : [];
    if (levelsCompleted.includes(levelId)) {
      await RaceConditionHeistSession.deleteOne({ userId: user._id, levelId });
      await User.updateOne(
        { _id: userId },
        { $pull: { 'raceConditionHeist.pendingClaimLevelIds': levelId } }
      );
      res.json({ success: true, levelsCompleted });
      return;
    }
    const levelIds = getAllLevelIds();
    const idx = levelIds.indexOf(levelId);
    const prevLevels = levelIds.slice(0, idx);
    const completedSet = new Set(levelsCompleted);
    const isUnlocked = prevLevels.every((lid) => completedSet.has(lid));
    if (!isUnlocked) {
      res.status(403).json({ error: 'Level not unlocked' });
      return;
    }
    if (!pendingClaimLevelIds.includes(levelId)) {
      res.status(403).json({ error: 'Complete the run and meet score threshold before claiming' });
      return;
    }
    const updated = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { 'raceConditionHeist.pendingClaimLevelIds': levelId },
        $addToSet: { 'raceConditionHeist.levelsCompleted': levelId },
      },
      { new: true }
    );
    if (!updated) {
      res.status(500).json({ error: 'Server error' });
      return;
    }
    const newCompleted = Array.isArray(updated.raceConditionHeist?.levelsCompleted)
      ? updated.raceConditionHeist!.levelsCompleted
      : [...levelsCompleted, levelId];
    const guardianBonus = computeRaceConditionHeistGuardianBonus(newCompleted);
    await User.updateOne({ _id: userId }, { $set: { guardianBonus } });
    await RaceConditionHeistSession.deleteOne({ userId: user._id, levelId });
    res.json({ success: true, levelsCompleted: newCompleted });
  } catch (error: unknown) {
    console.error('Race Condition Heist claim error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
