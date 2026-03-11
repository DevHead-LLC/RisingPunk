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
  getWrongWordCooldownMsTier10Plus,
  RCH_WRONG_WORD_COOLDOWN_MS_TIER_5,
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

/** Tier 8: seven USER_DATA nodes — Exploit, Encrypt, Exfiltrate, Bypass, Extract, Offload, Purge. */
function generateTier8Packets(): { id: string; type: PacketTypeKey; value: number }[] {
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

/** Tier 9–11: eight USER_DATA nodes — Exploit, Encrypt, Exfiltrate, Bypass, Extract, Offload, Purge, Wipe. */
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
    { id: 'p8', type: 'USER_DATA', value },
  ];
}

/** Tier 12–15: nine USER_DATA nodes — … Purge, Wipe, Scrub. */
function generateTier12Packets(): { id: string; type: PacketTypeKey; value: number }[] {
  const value = PACKET_TYPES.USER_DATA;
  return [
    { id: 'p1', type: 'USER_DATA', value },
    { id: 'p2', type: 'USER_DATA', value },
    { id: 'p3', type: 'USER_DATA', value },
    { id: 'p4', type: 'USER_DATA', value },
    { id: 'p5', type: 'USER_DATA', value },
    { id: 'p6', type: 'USER_DATA', value },
    { id: 'p7', type: 'USER_DATA', value },
    { id: 'p8', type: 'USER_DATA', value },
    { id: 'p9', type: 'USER_DATA', value },
  ];
}

/** Tier 16–21: ten USER_DATA nodes — … Wipe, Scrub, Flush. */
function generateTier16Packets(): { id: string; type: PacketTypeKey; value: number }[] {
  const value = PACKET_TYPES.USER_DATA;
  return [
    { id: 'p1', type: 'USER_DATA', value },
    { id: 'p2', type: 'USER_DATA', value },
    { id: 'p3', type: 'USER_DATA', value },
    { id: 'p4', type: 'USER_DATA', value },
    { id: 'p5', type: 'USER_DATA', value },
    { id: 'p6', type: 'USER_DATA', value },
    { id: 'p7', type: 'USER_DATA', value },
    { id: 'p8', type: 'USER_DATA', value },
    { id: 'p9', type: 'USER_DATA', value },
    { id: 'p10', type: 'USER_DATA', value },
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
      const tier10to11 = params.tier === 10 || params.tier === 11;
      const tier12to15 = params.tier >= 12 && params.tier <= 15;
      const tier16to21 = params.tier >= 16 && params.tier <= 21;
      const packets = tier16to21
        ? generateTier16Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
        : tier12to15
          ? generateTier12Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
          : isTier9 || tier10to11
            ? generateTier9Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
            : isTier8
              ? generateTier8Packets().map((p) => ({ id: p.id, type: p.type, value: p.value, isHijacked: false }))
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
        params.tier <= 21 ? getRandomWordGroupForTier(params.tier) : params.wordRotation;
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
              ...(existing.wordRotationPhase8 && {
                wordRotationPhase8: existing.wordRotationPhase8,
                wordStartOffsetPhase8: existing.wordStartOffsetPhase8 ?? 0,
                phase8StartedAt: existing.phase8StartedAt,
              }),
              ...(existing.wordRotationPhase9 && {
                wordRotationPhase9: existing.wordRotationPhase9,
                wordStartOffsetPhase9: existing.wordStartOffsetPhase9 ?? 0,
                phase9StartedAt: existing.phase9StartedAt,
              }),
              ...(existing.wordRotationPhase10 && {
                wordRotationPhase10: existing.wordRotationPhase10,
                wordStartOffsetPhase10: existing.wordStartOffsetPhase10 ?? 0,
                phase10StartedAt: existing.phase10StartedAt,
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
      ...(sessionDoc.wordRotationPhase8 && {
        wordRotationPhase8: sessionDoc.wordRotationPhase8,
        wordStartOffsetPhase8: sessionDoc.wordStartOffsetPhase8 ?? 0,
        phase8StartedAt: sessionDoc.phase8StartedAt,
      }),
      ...(sessionDoc.wordRotationPhase9 && {
        wordRotationPhase9: sessionDoc.wordRotationPhase9,
        wordStartOffsetPhase9: sessionDoc.wordStartOffsetPhase9 ?? 0,
        phase9StartedAt: sessionDoc.phase9StartedAt,
      }),
      ...(sessionDoc.wordRotationPhase10 && {
        wordRotationPhase10: sessionDoc.wordRotationPhase10,
        wordStartOffsetPhase10: sessionDoc.wordStartOffsetPhase10 ?? 0,
        phase10StartedAt: sessionDoc.phase10StartedAt,
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
    const { levelId, packetId, displayedWordIndex, displayedWordLabel, clientViewpoint } = req.body as {
      levelId?: string;
      packetId?: string;
      displayedWordIndex?: number;
      displayedWordLabel?: string;
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
    /** Tier 9+: eighth node (Wipe) can only be attempted after first seven are captured. */
    if (packetIndex === 7) {
      if (
        !sessionDoc.packets[0]?.isHijacked ||
        !sessionDoc.packets[1]?.isHijacked ||
        !sessionDoc.packets[2]?.isHijacked ||
        !sessionDoc.packets[3]?.isHijacked ||
        !sessionDoc.packets[4]?.isHijacked ||
        !sessionDoc.packets[5]?.isHijacked ||
        !sessionDoc.packets[6]?.isHijacked
      ) {
        res.status(400).json({
          error: 'Capture the first seven nodes before wiping the eighth',
          reason: 'complete_previous_nodes',
          packets: sessionDoc.packets,
          score: sessionDoc.score,
          comboCount: sessionDoc.comboCount,
        });
        return;
      }
      if (!sessionDoc.phase8StartedAt || !sessionDoc.wordRotationPhase8?.length) {
        res.status(400).json({ error: 'Phase 8 not started' });
        return;
      }
    }
    /** Tier 12+: ninth node (Scrub) can only be attempted after first eight are captured. */
    if (packetIndex === 8) {
      if (
        !sessionDoc.packets[0]?.isHijacked ||
        !sessionDoc.packets[1]?.isHijacked ||
        !sessionDoc.packets[2]?.isHijacked ||
        !sessionDoc.packets[3]?.isHijacked ||
        !sessionDoc.packets[4]?.isHijacked ||
        !sessionDoc.packets[5]?.isHijacked ||
        !sessionDoc.packets[6]?.isHijacked ||
        !sessionDoc.packets[7]?.isHijacked
      ) {
        res.status(400).json({
          error: 'Capture the first eight nodes before scrubbing the ninth',
          reason: 'complete_previous_nodes',
          packets: sessionDoc.packets,
          score: sessionDoc.score,
          comboCount: sessionDoc.comboCount,
        });
        return;
      }
      if (!sessionDoc.phase9StartedAt || !sessionDoc.wordRotationPhase9?.length) {
        res.status(400).json({ error: 'Phase 9 not started' });
        return;
      }
    }
    /** Tier 16+: tenth node (Flush) can only be attempted after first nine are captured. */
    if (packetIndex === 9) {
      if (
        !sessionDoc.packets[0]?.isHijacked ||
        !sessionDoc.packets[1]?.isHijacked ||
        !sessionDoc.packets[2]?.isHijacked ||
        !sessionDoc.packets[3]?.isHijacked ||
        !sessionDoc.packets[4]?.isHijacked ||
        !sessionDoc.packets[5]?.isHijacked ||
        !sessionDoc.packets[6]?.isHijacked ||
        !sessionDoc.packets[7]?.isHijacked ||
        !sessionDoc.packets[8]?.isHijacked
      ) {
        res.status(400).json({
          error: 'Capture the first nine nodes before flushing the tenth',
          reason: 'complete_previous_nodes',
          packets: sessionDoc.packets,
          score: sessionDoc.score,
          comboCount: sessionDoc.comboCount,
        });
        return;
      }
      if (!sessionDoc.phase10StartedAt || !sessionDoc.wordRotationPhase10?.length) {
        res.status(400).json({ error: 'Phase 10 not started' });
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
    if (packetIndex === 9 && sessionDoc.phase10StartedAt && sessionDoc.wordRotationPhase10?.length) {
      serverPhaseElapsedMs = now.getTime() - new Date(sessionDoc.phase10StartedAt).getTime();
      wordRotation = sessionDoc.wordRotationPhase10;
      const wordStartOffsetPhase10 = sessionDoc.wordStartOffsetPhase10 ?? 0;
      currentIndex = getCurrentWordIndex(
        serverPhaseElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffsetPhase10
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    } else if (packetIndex === 8 && sessionDoc.phase9StartedAt && sessionDoc.wordRotationPhase9?.length) {
      serverPhaseElapsedMs = now.getTime() - new Date(sessionDoc.phase9StartedAt).getTime();
      wordRotation = sessionDoc.wordRotationPhase9;
      const wordStartOffsetPhase9 = sessionDoc.wordStartOffsetPhase9 ?? 0;
      currentIndex = getCurrentWordIndex(
        serverPhaseElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffsetPhase9
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    } else if (packetIndex === 7 && sessionDoc.phase8StartedAt && sessionDoc.wordRotationPhase8?.length) {
      serverPhaseElapsedMs = now.getTime() - new Date(sessionDoc.phase8StartedAt).getTime();
      wordRotation = sessionDoc.wordRotationPhase8;
      const wordStartOffsetPhase8 = sessionDoc.wordStartOffsetPhase8 ?? 0;
      currentIndex = getCurrentWordIndex(
        serverPhaseElapsedMs,
        wordDurationMs,
        wordRotation.length,
        wordStartOffsetPhase8
      );
      const preSecureIndex = getPreSecureIndex(wordRotation);
      inWindow = wordRotation.length >= 2 && currentIndex === preSecureIndex;
    } else if (packetIndex === 6 && sessionDoc.phase7StartedAt && sessionDoc.wordRotationPhase7?.length) {
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
    /** Resolve what the user saw: prefer value (label) so we compare array[8]=correct, array[9]=fatal, array[0–7]=wrong. */
    const labelFromClient =
      typeof displayedWordLabel === 'string' && displayedWordLabel.trim() !== ''
        ? displayedWordLabel.trim()
        : clientViewpoint?.displayedWordLabel?.trim();
    const indexFromLabel =
      labelFromClient != null && labelFromClient !== ''
        ? wordRotation.indexOf(labelFromClient)
        : -1;
    const clientReportedIndex =
      indexFromLabel >= 0
        ? indexFromLabel
        : typeof displayedWordIndex === 'number'
          ? displayedWordIndex
          : clientViewpoint && typeof clientViewpoint.displayedWordIndex === 'number'
            ? clientViewpoint.displayedWordIndex
            : undefined;
    /** Tiers 6+: validate success purely from client-reported word at click. No server timer; no leniency. */
    const tierUsesClientOnlySuccess = params.tier >= 6;
    if (tierUsesClientOnlySuccess) {
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
    /** Tier 5: 4-word cycles. Tap on array[0] or [1] = wrong word — longer cooldown (no fatal). */
    if (
      params.tier === 5 &&
      typeof clientReportedIndex === 'number' &&
      (clientReportedIndex === 0 || clientReportedIndex === 1)
    ) {
      sessionDoc.comboCount = 0;
      sessionDoc.exploitCooldownUntil = new Date(now.getTime() + RCH_WRONG_WORD_COOLDOWN_MS_TIER_5);
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
    /** Tier 8: tap on array[0]–[4] = wrong word (7-word sets). */
    if (
      params.tier === 8 &&
      typeof clientReportedIndex === 'number' &&
      (clientReportedIndex === 0 || clientReportedIndex === 1 || clientReportedIndex === 2 || clientReportedIndex === 3 || clientReportedIndex === 4)
    ) {
      sessionDoc.comboCount = 0;
      sessionDoc.exploitCooldownUntil = new Date(now.getTime() + RCH_WRONG_WORD_COOLDOWN_MS_TIER_8);
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
    /** Tier 9: tap on array[0]–[5] = wrong word (8-word sets). */
    if (
      params.tier === 9 &&
      typeof clientReportedIndex === 'number' &&
      (clientReportedIndex === 0 || clientReportedIndex === 1 || clientReportedIndex === 2 || clientReportedIndex === 3 || clientReportedIndex === 4 || clientReportedIndex === 5)
    ) {
      sessionDoc.comboCount = 0;
      sessionDoc.exploitCooldownUntil = new Date(now.getTime() + RCH_WRONG_WORD_COOLDOWN_MS_TIER_9);
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
    /** Tiers 10–21: tap on array[0]–[7] = wrong word (10-word sets). */
    if (
      params.tier >= 10 &&
      params.tier <= 21 &&
      typeof clientReportedIndex === 'number' &&
      (clientReportedIndex === 0 || clientReportedIndex === 1 || clientReportedIndex === 2 || clientReportedIndex === 3 ||
       clientReportedIndex === 4 || clientReportedIndex === 5 || clientReportedIndex === 6 || clientReportedIndex === 7)
    ) {
      sessionDoc.comboCount = 0;
      sessionDoc.exploitCooldownUntil = new Date(now.getTime() + getWrongWordCooldownMsTier10Plus(params.tier));
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
    /** Require client to agree with exploit word when we have client data. (Tiers 6+ use client-only validation above.) */
    if (!tierUsesClientOnlySuccess && inWindow && typeof clientReportedIndex === 'number' && clientReportedIndex !== preSecureIndexFinal) {
      inWindow = false;
    }
    const serverNotOnSecure = currentIndex !== secureWordIndex;
    /** Leniency for tiers 1–5: client said they saw the exploit word and server index is adjacent. Tiers 6+ use client-only success. */
    let leniencyUsed: string | null = null;
    if (!tierUsesClientOnlySuccess && !inWindow && typeof displayedWordIndex === 'number') {
      const clientSawExploitWord = displayedWordIndex === preSecureIndexFinal;
      const adjacent = isWithinOneWord(currentIndex, displayedWordIndex, wordRotation.length);
      if (clientSawExploitWord && serverNotOnSecure && adjacent) {
        inWindow = true;
        leniencyUsed = 'adjacent';
      }
    }
    if (
      !tierUsesClientOnlySuccess &&
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
    if (packetIndex === 0 && tier >= 2) {
      sessionDoc.phase2StartedAt = now;
      const rot2 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase2 = rot2;
      sessionDoc.wordStartOffsetPhase2 =
        rot2.length > 0 ? Math.floor(Math.random() * rot2.length) : 0;
    }
    if (packetIndex === 1 && tier >= 3) {
      sessionDoc.phase3StartedAt = now;
      const rot3 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase3 = rot3;
      sessionDoc.wordStartOffsetPhase3 =
        rot3.length > 0 ? Math.floor(Math.random() * rot3.length) : 0;
    }
    if (packetIndex === 2 && tier >= 4) {
      sessionDoc.phase4StartedAt = now;
      const rot4 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase4 = rot4;
      sessionDoc.wordStartOffsetPhase4 =
        rot4.length > 0 ? Math.floor(Math.random() * rot4.length) : 0;
    }
    if (packetIndex === 3 && tier >= 6) {
      sessionDoc.phase5StartedAt = now;
      const rot5 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase5 = rot5;
      sessionDoc.wordStartOffsetPhase5 =
        rot5.length > 0 ? Math.floor(Math.random() * rot5.length) : 0;
    }
    if (packetIndex === 4 && tier >= 7) {
      sessionDoc.phase6StartedAt = now;
      const rot6 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase6 = rot6;
      sessionDoc.wordStartOffsetPhase6 =
        rot6.length > 0 ? Math.floor(Math.random() * rot6.length) : 0;
    }
    if (packetIndex === 5 && tier >= 8) {
      sessionDoc.phase7StartedAt = now;
      const rot7 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase7 = rot7;
      sessionDoc.wordStartOffsetPhase7 =
        rot7.length > 0 ? Math.floor(Math.random() * rot7.length) : 0;
    }
    if (packetIndex === 6 && tier >= 9) {
      sessionDoc.phase8StartedAt = now;
      const rot8 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase8 = rot8;
      sessionDoc.wordStartOffsetPhase8 =
        rot8.length > 0 ? Math.floor(Math.random() * rot8.length) : 0;
    }
    if (packetIndex === 7 && tier >= 12) {
      sessionDoc.phase9StartedAt = now;
      const rot9 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase9 = rot9;
      sessionDoc.wordStartOffsetPhase9 =
        rot9.length > 0 ? Math.floor(Math.random() * rot9.length) : 0;
    }
    if (packetIndex === 8 && tier >= 16) {
      sessionDoc.phase10StartedAt = now;
      const rot10 = getRandomWordGroupForTier(tier);
      sessionDoc.wordRotationPhase10 = rot10;
      sessionDoc.wordStartOffsetPhase10 =
        rot10.length > 0 ? Math.floor(Math.random() * rot10.length) : 0;
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
    const phase8 =
      sessionDoc.phase8StartedAt && Array.isArray(sessionDoc.wordRotationPhase8) && sessionDoc.wordRotationPhase8.length > 0
        ? {
            phase8StartedAt: sessionDoc.phase8StartedAt.toISOString(),
            wordRotationPhase8: [...sessionDoc.wordRotationPhase8],
            wordStartOffsetPhase8: sessionDoc.wordStartOffsetPhase8 ?? 0,
          }
        : undefined;
    const phase9 =
      sessionDoc.phase9StartedAt && Array.isArray(sessionDoc.wordRotationPhase9) && sessionDoc.wordRotationPhase9.length > 0
        ? {
            phase9StartedAt: sessionDoc.phase9StartedAt.toISOString(),
            wordRotationPhase9: [...sessionDoc.wordRotationPhase9],
            wordStartOffsetPhase9: sessionDoc.wordStartOffsetPhase9 ?? 0,
          }
        : undefined;
    const phase10 =
      sessionDoc.phase10StartedAt && Array.isArray(sessionDoc.wordRotationPhase10) && sessionDoc.wordRotationPhase10.length > 0
        ? {
            phase10StartedAt: sessionDoc.phase10StartedAt.toISOString(),
            wordRotationPhase10: [...sessionDoc.wordRotationPhase10],
            wordStartOffsetPhase10: sessionDoc.wordStartOffsetPhase10 ?? 0,
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
      ...phase8,
      ...phase9,
      ...phase10,
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
    const allPacketsHijacked =
      sessionDoc.packets.length > 0 &&
      sessionDoc.packets.every((p) => p.isHijacked);
    const won =
      sessionDoc.score >= scoreThreshold && allPacketsHijacked;
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
