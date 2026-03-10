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
  RCH_WRONG_WORD_COOLDOWN_MS_TIER_6,
  RCH_WRONG_WORD_COOLDOWN_MS_TIER_7,
  RCH_WRONG_WORD_COOLDOWN_MS_TIER_8,
  RCH_WRONG_WORD_COOLDOWN_MS_TIER_9,
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

/** Tier 4: four USER_DATA nodes — Exploit, Encrypt, Exfiltrate, Bypass. */
function generateTier4Packets(): { id: string; type: PacketTypeKey; value: number }[] {
  const value = PACKET_TYPES.USER_DATA;
  return [
    { id: 'p1', type: 'USER_DATA', value },
    { id: 'p2', type: 'USER_DATA', value },
    { id: 'p3', type: 'USER_DATA', value },
    { id: 'p4', type: 'USER_DATA', value },
  ];
}

/** Tier 6: five USER_DATA nodes — Exploit, Encrypt, Exfiltrate, Bypass, Extract. */
function generateTier6Packets(): { id: string; type: PacketTypeKey; value: number }[] {
  const value = PACKET_TYPES.USER_DATA;
  return [
    { id: 'p1', type: 'USER_DATA', value },
    { id: 'p2', type: 'USER_DATA', value },
    { id: 'p3', type: 'USER_DATA', value },
    { id: 'p4', type: 'USER_DATA', value },
    { id: 'p5', type: 'USER_DATA', value },
  ];
}

/** Tier 7: six USER_DATA nodes — Exploit, Encrypt, Exfiltrate, Bypass, Extract, Offload. */
function generateTier7Packets(): { id: string; type: PacketTypeKey; value: number }[] {
  const value = PACKET_TYPES.USER_DATA;
  return [
    { id: 'p1', type: 'USER_DATA', value },
    { id: 'p2', type: 'USER_DATA', value },
    { id: 'p3', type: 'USER_DATA', value },
    { id: 'p4', type: 'USER_DATA', value },
    { id: 'p5', type: 'USER_DATA', value },
    { id: 'p6', type: 'USER_DATA', value },
  ];
}

/** Tier 9: seven USER_DATA nodes — Exploit, Encrypt, Exfiltrate, Bypass, Extract, Offload, Purge. */
function generateTier9Packets(): { id: string; type: PacketTypeKey; value: number }[] {
  const value = PACKET_TYPES.USER_DATA;
  return [
    { id: 'p1', type: 'USER_DATA', value },
    { id: 'p2', type: 'USER_DATA', value },
    { id: 'p3', type: 'USER_DATA', value },
    { id: 'p4', type: 'USER_DATA', value },
    { id: 'p5', type: 'USER_DATA', value },
    { id: 'p6', type: 'USER_DATA', value },
    { id: 'p7', type: 'USER_DATA', value },
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
      const isTier4 = params.tier === 4;
      const isTier5 = params.tier === 5;
      const isTier6 = params.tier === 6;
      const isTier7 = params.tier === 7;
      const isTier8 = params.tier === 8;
      const isTier9 = params.tier === 9;
      const packets = isTier9 || isTier8
        ? generateTier9Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
        : isTier7
          ? generateTier7Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
          : isTier6
          ? generateTier6Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
          : isTier4 || isTier5
          ? generateTier4Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
          : isTier3
          ? generateTier3Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
          : isTier2
            ? generateTier2Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
            : [{ ...generatePass1Packet(), isHijacked: false }];
      const wordRotation =
        params.tier <= 9 ? getRandomWordGroupForTier(params.tier) : params.wordRotation;
      const wordStartOffset =
        wordRotation.length > 0 ? Math.floor(Math.random() * wordRotation.length) : 0;
      /** Phase 2/3/4 word sets are chosen when that node becomes active (on hijack success), not at session start. */
      try {
        await RaceConditionHeistSession.create({
          userId: user._id,
          levelId,
          startedAt: now,
          matchDurationMs: params.matchDurationMs,
          wordRotation,
          wordDurationMs,
          wordStartOffset,
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
              serverTime: new Date().toISOString(),
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
              ...(existing.wordRotationPhase4 && {
                wordRotationPhase4: existing.wordRotationPhase4,
                wordStartOffsetPhase4: existing.wordStartOffsetPhase4 ?? 0,
                phase4StartedAt: existing.phase4StartedAt,
              }),
              ...(existing.wordRotationPhase5 && {
                wordRotationPhase5: existing.wordRotationPhase5,
                wordStartOffsetPhase5: existing.wordStartOffsetPhase5 ?? 0,
                phase5StartedAt: existing.phase5StartedAt,
              }),
              ...(existing.wordRotationPhase6 && {
                wordRotationPhase6: existing.wordRotationPhase6,
                wordStartOffsetPhase6: existing.wordStartOffsetPhase6 ?? 0,
                phase6StartedAt: existing.phase6StartedAt,
              }),
              ...(existing.wordRotationPhase7 && {
                wordRotationPhase7: existing.wordRotationPhase7,
                wordStartOffsetPhase7: existing.wordStartOffsetPhase7 ?? 0,
                phase7StartedAt: existing.phase7StartedAt,
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
      const serverTime = new Date().toISOString();
      res.json({
        startedAt: now.toISOString(),
        serverTime,
        matchDurationMs: params.matchDurationMs,
        scoreThreshold: params.scoreThreshold,
        wordRotation,
        wordDurationMs,
        wordStartOffset,
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
      serverTime: new Date().toISOString(),
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
      ...(sessionDoc.wordRotationPhase4 && {
        wordRotationPhase4: sessionDoc.wordRotationPhase4,
        wordStartOffsetPhase4: sessionDoc.wordStartOffsetPhase4 ?? 0,
        phase4StartedAt: sessionDoc.phase4StartedAt,
      }),
      ...(sessionDoc.wordRotationPhase5 && {
        wordRotationPhase5: sessionDoc.wordRotationPhase5,
        wordStartOffsetPhase5: sessionDoc.wordStartOffsetPhase5 ?? 0,
        phase5StartedAt: sessionDoc.phase5StartedAt,
      }),
      ...(sessionDoc.wordRotationPhase6 && {
        wordRotationPhase6: sessionDoc.wordRotationPhase6,
        wordStartOffsetPhase6: sessionDoc.wordStartOffsetPhase6 ?? 0,
        phase6StartedAt: sessionDoc.phase6StartedAt,
      }),
      ...(sessionDoc.wordRotationPhase7 && {
        wordRotationPhase7: sessionDoc.wordRotationPhase7,
        wordStartOffsetPhase7: sessionDoc.wordStartOffsetPhase7 ?? 0,
        phase7StartedAt: sessionDoc.phase7StartedAt,
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

/**
 * Word array rule: indices 0..length-1. Index length-1 = secure word. Index length-2 = exploit word
 * (tap when this word is displayed to capture). We accept when server index === preSecureIndex, or
 * when client reports displayedWordIndex === preSecureIndex and server index is adjacent (1 word off) for skew tolerance.
 */
function isWithinOneWord(serverIndex: number, clientIndex: number, length: number): boolean {
  if (length <= 0) return false;
  const d = (serverIndex - clientIndex + length) % length;
  return d <= 1 || d === length - 1;
}

/** POST /api/race-condition-heist/attempt-hijack */
router.post('/attempt-hijack', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { levelId, packetId, displayedWordIndex, clientViewpoint } = req.body as {
      levelId?: string;
      packetId?: string;
      displayedWordIndex?: number;
      clientViewpoint?: {
        clientTimestampMs: number;
        displayedWordIndex: number;
        displayedWordLabel: string;
        clientPhaseElapsedMs: number;
        wordDurationMs: number;
        wordCount: number;
      };
    };
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
    /** Tier 3+: third node (Exfiltrate) can only be attempted after first two are captured. */
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
    /** Tier 4–8: fourth node (Bypass) can only be attempted after first three are captured. */
    if (packetIndex === 3) {
      if (
        !sessionDoc.packets[0]?.isHijacked ||
        !sessionDoc.packets[1]?.isHijacked ||
        !sessionDoc.packets[2]?.isHijacked
      ) {
        res.status(400).json({
          error: 'Capture the first three nodes before bypassing the fourth',
          reason: 'complete_previous_nodes',
          packets: sessionDoc.packets,
          score: sessionDoc.score,
          comboCount: sessionDoc.comboCount,
        });
        return;
      }
      if (!sessionDoc.phase4StartedAt || !sessionDoc.wordRotationPhase4?.length) {
        res.status(400).json({ error: 'Phase 4 not started' });
        return;
      }
    }
    /** Tier 6–8: fifth node (Extract) can only be attempted after first four are captured. */
    if (packetIndex === 4) {
      if (
        !sessionDoc.packets[0]?.isHijacked ||
        !sessionDoc.packets[1]?.isHijacked ||
        !sessionDoc.packets[2]?.isHijacked ||
        !sessionDoc.packets[3]?.isHijacked
      ) {
        res.status(400).json({
          error: 'Capture the first four nodes before extracting the fifth',
          reason: 'complete_previous_nodes',
          packets: sessionDoc.packets,
          score: sessionDoc.score,
          comboCount: sessionDoc.comboCount,
        });
        return;
      }
      if (!sessionDoc.phase5StartedAt || !sessionDoc.wordRotationPhase5?.length) {
        res.status(400).json({ error: 'Phase 5 not started' });
        return;
      }
    }
    /** Tier 7–9: sixth node (Offload) can only be attempted after first five are captured. Tier 8–9 have 7 packets. */
    if (packetIndex === 5) {
      if (
        !sessionDoc.packets[0]?.isHijacked ||
        !sessionDoc.packets[1]?.isHijacked ||
        !sessionDoc.packets[2]?.isHijacked ||
        !sessionDoc.packets[3]?.isHijacked ||
        !sessionDoc.packets[4]?.isHijacked
      ) {
        res.status(400).json({
          error: 'Capture the first five nodes before offloading the sixth',
          reason: 'complete_previous_nodes',
          packets: sessionDoc.packets,
          score: sessionDoc.score,
          comboCount: sessionDoc.comboCount,
        });
        return;
      }
      if (!sessionDoc.phase6StartedAt || !sessionDoc.wordRotationPhase6?.length) {
        res.status(400).json({ error: 'Phase 6 not started' });
        return;
      }
    }
    /** Tier 8–9: seventh node (Purge) can only be attempted after first six are captured. */
    if (packetIndex === 6) {
      if (
        !sessionDoc.packets[0]?.isHijacked ||
        !sessionDoc.packets[1]?.isHijacked ||
        !sessionDoc.packets[2]?.isHijacked ||
        !sessionDoc.packets[3]?.isHijacked ||
        !sessionDoc.packets[4]?.isHijacked ||
        !sessionDoc.packets[5]?.isHijacked
      ) {
        res.status(400).json({
          error: 'Capture the first six nodes before purging the seventh',
          reason: 'complete_previous_nodes',
          packets: sessionDoc.packets,
          score: sessionDoc.score,
          comboCount: sessionDoc.comboCount,
        });
        return;
      }
      if (!sessionDoc.phase7StartedAt || !sessionDoc.wordRotationPhase7?.length) {
        res.status(400).json({ error: 'Phase 7 not started' });
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
    /** Server phase elapsed at request time; used to compare with clientViewpoint.clientPhaseElapsedMs. */
    let serverPhaseElapsedMs: number;
    if (packetIndex === 6 && sessionDoc.phase7StartedAt && sessionDoc.wordRotationPhase7?.length) {
      serverPhaseElapsedMs = now.getTime() - new Date(sessionDoc.phase7StartedAt).getTime();
      wordRotation = sessionDoc.wordRotationPhase7;
      const wordStartOffsetPhase7 = sessionDoc.wordStartOffsetPhase7 ?? 0;
      currentIndex = getCurrentWordIndex(
        serverPhaseElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffsetPhase7
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    } else if (packetIndex === 5 && sessionDoc.phase6StartedAt && sessionDoc.wordRotationPhase6?.length) {
      serverPhaseElapsedMs = now.getTime() - new Date(sessionDoc.phase6StartedAt).getTime();
      wordRotation = sessionDoc.wordRotationPhase6;
      const wordStartOffsetPhase6 = sessionDoc.wordStartOffsetPhase6 ?? 0;
      currentIndex = getCurrentWordIndex(
        serverPhaseElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffsetPhase6
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    } else if (packetIndex === 4 && sessionDoc.phase5StartedAt && sessionDoc.wordRotationPhase5?.length) {
      serverPhaseElapsedMs = now.getTime() - new Date(sessionDoc.phase5StartedAt).getTime();
      wordRotation = sessionDoc.wordRotationPhase5;
      const wordStartOffsetPhase5 = sessionDoc.wordStartOffsetPhase5 ?? 0;
      currentIndex = getCurrentWordIndex(
        serverPhaseElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffsetPhase5
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    } else if (packetIndex === 3 && sessionDoc.phase4StartedAt && sessionDoc.wordRotationPhase4?.length) {
      serverPhaseElapsedMs = now.getTime() - new Date(sessionDoc.phase4StartedAt).getTime();
      wordRotation = sessionDoc.wordRotationPhase4;
      const wordStartOffsetPhase4 = sessionDoc.wordStartOffsetPhase4 ?? 0;
      currentIndex = getCurrentWordIndex(
        serverPhaseElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffsetPhase4
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    } else if (packetIndex === 2 && sessionDoc.phase3StartedAt && sessionDoc.wordRotationPhase3?.length) {
      serverPhaseElapsedMs = now.getTime() - new Date(sessionDoc.phase3StartedAt).getTime();
      wordRotation = sessionDoc.wordRotationPhase3;
      const wordStartOffsetPhase3 = sessionDoc.wordStartOffsetPhase3 ?? 0;
      currentIndex = getCurrentWordIndex(
        serverPhaseElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffsetPhase3
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    } else if (packetIndex === 1 && sessionDoc.phase2StartedAt && sessionDoc.wordRotationPhase2?.length) {
      serverPhaseElapsedMs = now.getTime() - new Date(sessionDoc.phase2StartedAt).getTime();
      wordRotation = sessionDoc.wordRotationPhase2;
      const wordStartOffsetPhase2 = sessionDoc.wordStartOffsetPhase2 ?? 0;
      currentIndex = getCurrentWordIndex(
        serverPhaseElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffsetPhase2
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    } else {
      serverPhaseElapsedMs = elapsedMs;
      wordRotation = sessionDoc.wordRotation ?? [];
      const wordStartOffset = sessionDoc.wordStartOffset ?? 0;
      currentIndex = getCurrentWordIndex(
        serverPhaseElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffset
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    }
    const preSecureIndexFinal = getPreSecureIndex(wordRotation);
    const secureWordIndex = wordRotation.length - 1;
    /** Tier 5+: fatal only when the word the user saw when they clicked is the secure word. Use client-reported index (displayedWordIndex or clientViewpoint.displayedWordIndex). */
    const clientReportedIndex =
      typeof displayedWordIndex === 'number'
        ? displayedWordIndex
        : clientViewpoint && typeof clientViewpoint.displayedWordIndex === 'number'
          ? clientViewpoint.displayedWordIndex
          : undefined;
    /** Tiers 6–9: validate success purely from client-reported word at click. No server timer; no leniency. */
    const tier6or7or8or9 = params.tier === 6 || params.tier === 7 || params.tier === 8 || params.tier === 9;
    if (tier6or7or8or9) {
      inWindow = typeof clientReportedIndex === 'number' && clientReportedIndex === preSecureIndexFinal;
      console.log('[RCH-attempt] tier=%d packetIndex=%d clientReportedIndex=%s successIndex=%d secureIndex=%d inWindow=%s wordRotation.length=%d', params.tier, packetIndex, clientReportedIndex === undefined ? 'undefined' : String(clientReportedIndex), preSecureIndexFinal, secureWordIndex, String(inWindow), wordRotation.length);
    } else {
      console.log('[RCH-attempt] tier=%d packetIndex=%d serverCurrentIndex=%d clientReportedIndex=%s preSecureIndex=%d secureIndex=%d inWindow=%s', params.tier, packetIndex, currentIndex, clientReportedIndex === undefined ? 'undefined' : String(clientReportedIndex), preSecureIndexFinal, secureWordIndex, String(inWindow));
    }
    if (params.tier >= 5 && typeof clientReportedIndex === 'number' && clientReportedIndex === secureWordIndex) {
      await RaceConditionHeistSession.deleteOne({ userId: req.user!._id, levelId });
      res.json({
        success: false,
        reason: 'fatal_secure_word',
        packets: sessionDoc.packets,
        score: sessionDoc.score,
        comboCount: 0,
      });
      return;
    }
    /** Tier 6: tap on array[0], [1], or [2] = wrong word — incorrect warning and longer cooldown (no fatal). */
    if (
      params.tier === 6 &&
      typeof clientReportedIndex === 'number' &&
      (clientReportedIndex === 0 || clientReportedIndex === 1 || clientReportedIndex === 2)
    ) {
      sessionDoc.comboCount = 0;
      sessionDoc.exploitCooldownUntil = new Date(now.getTime() + RCH_WRONG_WORD_COOLDOWN_MS_TIER_6);
      await sessionDoc.save();
      res.json({
        success: false,
        reason: 'wrong_word',
        packets: sessionDoc.packets,
        score: sessionDoc.score,
        comboCount: 0,
        exploitCooldownUntil: sessionDoc.exploitCooldownUntil.toISOString(),
      });
      return;
    }
    /** Tier 7: tap on array[0], [1], [2], or [3] = wrong word (6-word sets). */
    if (
      params.tier === 7 &&
      typeof clientReportedIndex === 'number' &&
      (clientReportedIndex === 0 || clientReportedIndex === 1 || clientReportedIndex === 2 || clientReportedIndex === 3)
    ) {
      sessionDoc.comboCount = 0;
      sessionDoc.exploitCooldownUntil = new Date(now.getTime() + RCH_WRONG_WORD_COOLDOWN_MS_TIER_7);
      await sessionDoc.save();
      res.json({
        success: false,
        reason: 'wrong_word',
        packets: sessionDoc.packets,
        score: sessionDoc.score,
        comboCount: 0,
        exploitCooldownUntil: sessionDoc.exploitCooldownUntil.toISOString(),
      });
      return;
    }
    /** Tiers 8–9: tap on array[0], [1], [2], [3], or [4] = wrong word (7-word sets). */
    if (
      (params.tier === 8 || params.tier === 9) &&
      typeof clientReportedIndex === 'number' &&
      (clientReportedIndex === 0 || clientReportedIndex === 1 || clientReportedIndex === 2 || clientReportedIndex === 3 || clientReportedIndex === 4)
    ) {
      sessionDoc.comboCount = 0;
      const wrongWordCooldownMs = params.tier === 8 ? RCH_WRONG_WORD_COOLDOWN_MS_TIER_8 : RCH_WRONG_WORD_COOLDOWN_MS_TIER_9;
      sessionDoc.exploitCooldownUntil = new Date(now.getTime() + wrongWordCooldownMs);
      await sessionDoc.save();
      res.json({
        success: false,
        reason: 'wrong_word',
        packets: sessionDoc.packets,
        score: sessionDoc.score,
        comboCount: 0,
        exploitCooldownUntil: sessionDoc.exploitCooldownUntil.toISOString(),
      });
      return;
    }
    /** Require client to agree with exploit word when we have client data — prevents "random word" success when server clock says exploit but user tapped something else. (Tiers 6–9 use client-only validation above; this only affects other tiers.) */
    if (!tier6or7or8or9 && inWindow && typeof clientReportedIndex === 'number' && clientReportedIndex !== preSecureIndexFinal) {
      inWindow = false;
    }
    const serverNotOnSecure = currentIndex !== secureWordIndex;
    /** Leniency for non–tier-6/7/8/9: client said they saw the exploit word and server index is adjacent (index skew). Tiers 6–9 do not use timer or leniency — success is purely client-reported word at click. */
    let leniencyUsed: string | null = null;
    if (!tier6or7or8or9 && !inWindow && typeof displayedWordIndex === 'number') {
      const clientSawExploitWord = displayedWordIndex === preSecureIndexFinal;
      const adjacent = isWithinOneWord(currentIndex, displayedWordIndex, wordRotation.length);
      if (clientSawExploitWord && serverNotOnSecure && adjacent) {
        inWindow = true;
        leniencyUsed = 'adjacent';
      }
    }
    if (
      !tier6or7or8or9 &&
      !inWindow &&
      clientViewpoint &&
      typeof clientViewpoint.displayedWordIndex === 'number' &&
      clientViewpoint.displayedWordIndex === preSecureIndexFinal &&
      isWithinOneWord(currentIndex, clientViewpoint.displayedWordIndex, wordRotation.length)
    ) {
      inWindow = true;
      leniencyUsed = leniencyUsed ? `${leniencyUsed}+phase` : 'phase';
    }
    if (!inWindow) {
      sessionDoc.comboCount = 0;
      sessionDoc.exploitCooldownUntil = new Date(now.getTime() + cooldownMs);
      await sessionDoc.save();
      res.json({
        success: false,
        reason: 'missed_window',
        packets: sessionDoc.packets,
        score: sessionDoc.score,
        comboCount: 0,
        exploitCooldownUntil: sessionDoc.exploitCooldownUntil.toISOString(),
      });
      return;
    }
    const comboMult = getComboMultiplier(sessionDoc.comboCount);
    const addedScore = Math.floor(packet.value * multiplier * comboMult);
    sessionDoc.score += addedScore;
    sessionDoc.comboCount += 1;
    sessionDoc.lastSuccessfulHijackAt = now;
    sessionDoc.exploitCooldownUntil = new Date(now.getTime() + cooldownMs);
    const tier = params.tier;
    /** Each User Data node gets a fresh random word set and random start when that phase begins. */
    if (packetIndex === 0 && (tier === 2 || tier === 3 || tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8 || tier === 9)) {
      sessionDoc.phase2StartedAt = now;
      const rot2 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase2 = rot2;
      sessionDoc.wordStartOffsetPhase2 =
        rot2.length > 0 ? Math.floor(Math.random() * rot2.length) : 0;
    }
    if (packetIndex === 1 && (tier === 3 || tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8 || tier === 9)) {
      sessionDoc.phase3StartedAt = now;
      const rot3 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase3 = rot3;
      sessionDoc.wordStartOffsetPhase3 =
        rot3.length > 0 ? Math.floor(Math.random() * rot3.length) : 0;
    }
    if (packetIndex === 2 && (tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8 || tier === 9)) {
      sessionDoc.phase4StartedAt = now;
      const rot4 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase4 = rot4;
      sessionDoc.wordStartOffsetPhase4 =
        rot4.length > 0 ? Math.floor(Math.random() * rot4.length) : 0;
    }
    if (packetIndex === 3 && (tier === 6 || tier === 7 || tier === 8 || tier === 9)) {
      sessionDoc.phase5StartedAt = now;
      const rot5 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase5 = rot5;
      sessionDoc.wordStartOffsetPhase5 =
        rot5.length > 0 ? Math.floor(Math.random() * rot5.length) : 0;
    }
    if (packetIndex === 4 && (tier === 7 || tier === 8 || tier === 9)) {
      sessionDoc.phase6StartedAt = now;
      const rot6 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase6 = rot6;
      sessionDoc.wordStartOffsetPhase6 =
        rot6.length > 0 ? Math.floor(Math.random() * rot6.length) : 0;
    }
    if (packetIndex === 5 && (tier === 8 || tier === 9)) {
      sessionDoc.phase7StartedAt = now;
      const rot7 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase7 = rot7;
      sessionDoc.wordStartOffsetPhase7 =
        rot7.length > 0 ? Math.floor(Math.random() * rot7.length) : 0;
    }
    const pIdx = sessionDoc.packets.findIndex((p) => p.id === packetId);
    if (pIdx !== -1) sessionDoc.packets[pIdx].isHijacked = true;
    await sessionDoc.save();
    /** Always send phase word data when session has it so client can show the correct rotation per node. */
    const phase2 =
      sessionDoc.phase2StartedAt && Array.isArray(sessionDoc.wordRotationPhase2) && sessionDoc.wordRotationPhase2.length > 0
        ? {
            phase2StartedAt: sessionDoc.phase2StartedAt.toISOString(),
            wordRotationPhase2: [...sessionDoc.wordRotationPhase2],
            wordStartOffsetPhase2: sessionDoc.wordStartOffsetPhase2 ?? 0,
          }
        : undefined;
    const phase3 =
      sessionDoc.phase3StartedAt && Array.isArray(sessionDoc.wordRotationPhase3) && sessionDoc.wordRotationPhase3.length > 0
        ? {
            phase3StartedAt: sessionDoc.phase3StartedAt.toISOString(),
            wordRotationPhase3: [...sessionDoc.wordRotationPhase3],
            wordStartOffsetPhase3: sessionDoc.wordStartOffsetPhase3 ?? 0,
          }
        : undefined;
    const phase4 =
      sessionDoc.phase4StartedAt && Array.isArray(sessionDoc.wordRotationPhase4) && sessionDoc.wordRotationPhase4.length > 0
        ? {
            phase4StartedAt: sessionDoc.phase4StartedAt.toISOString(),
            wordRotationPhase4: [...sessionDoc.wordRotationPhase4],
            wordStartOffsetPhase4: sessionDoc.wordStartOffsetPhase4 ?? 0,
          }
        : undefined;
    const phase5 =
      sessionDoc.phase5StartedAt && Array.isArray(sessionDoc.wordRotationPhase5) && sessionDoc.wordRotationPhase5.length > 0
        ? {
            phase5StartedAt: sessionDoc.phase5StartedAt.toISOString(),
            wordRotationPhase5: [...sessionDoc.wordRotationPhase5],
            wordStartOffsetPhase5: sessionDoc.wordStartOffsetPhase5 ?? 0,
          }
        : undefined;
    const phase6 =
      sessionDoc.phase6StartedAt && Array.isArray(sessionDoc.wordRotationPhase6) && sessionDoc.wordRotationPhase6.length > 0
        ? {
            phase6StartedAt: sessionDoc.phase6StartedAt.toISOString(),
            wordRotationPhase6: [...sessionDoc.wordRotationPhase6],
            wordStartOffsetPhase6: sessionDoc.wordStartOffsetPhase6 ?? 0,
          }
        : undefined;
    const phase7 =
      sessionDoc.phase7StartedAt && Array.isArray(sessionDoc.wordRotationPhase7) && sessionDoc.wordRotationPhase7.length > 0
        ? {
            phase7StartedAt: sessionDoc.phase7StartedAt.toISOString(),
            wordRotationPhase7: [...sessionDoc.wordRotationPhase7],
            wordStartOffsetPhase7: sessionDoc.wordStartOffsetPhase7 ?? 0,
          }
        : undefined;
    res.json({
      success: true,
      addedScore,
      packets: sessionDoc.packets,
      score: sessionDoc.score,
      comboCount: sessionDoc.comboCount,
      exploitCooldownUntil: sessionDoc.exploitCooldownUntil?.toISOString(),
      serverTime: new Date().toISOString(),
      ...phase2,
      ...phase3,
      ...phase4,
      ...phase5,
      ...phase6,
      ...phase7,
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
