import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { User } from '../models/User';
import { BinaryBankCrackSession } from '../models/BinaryBankCrackSession';
import {
  getLevelParams,
  getAllLevelIds,
  getTierLevels,
  getCostForLevel,
  computeBinaryBankCrackPhreakBonus,
  generateVaultTargets,
  computeFlipLimitForVault,
  type LevelId,
} from '../config/binaryBankCrackConfig';
import { accrueBalanceToTime } from '../utils/balanceAccrual';

const router = express.Router();

/** Convert bits (MSB first) to decimal; length must match registerSize. */
function bitsToDecimal(bits: number[], registerSize: number): number {
  if (!Array.isArray(bits) || bits.length !== registerSize) return -1;
  let n = 0;
  for (let i = 0; i < bits.length; i++) {
    n = (n << 1) | (bits[i] === 1 ? 1 : 0);
  }
  return n;
}

/** Minimum number of bit flips to get from last state to current (server-authoritative; do not trust client flipsUsed). */
function minFlipsBetween(last: number[][], current: number[][]): number {
  if (!Array.isArray(last) || !Array.isArray(current) || last.length !== current.length) return 0;
  let count = 0;
  for (let r = 0; r < last.length; r++) {
    const a = last[r];
    const b = current[r];
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) continue;
    for (let i = 0; i < a.length; i++) {
      if ((a[i] === 1 ? 1 : 0) !== (b[i] === 1 ? 1 : 0)) count++;
    }
  }
  return count;
}

function initialRegistersBits(registerCount: number, registerSize: number): number[][] {
  return Array.from({ length: registerCount }, () => Array.from({ length: registerSize }, () => 0));
}

/** GET /api/binary-bank-crack/status — levels completed, level configs, tier levels. */
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
    const levelsCompleted: string[] = Array.isArray(user.binaryBankCrack?.levelsCompleted)
      ? user.binaryBankCrack!.levelsCompleted
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
        registerCount: params.registerCount,
        registerSize: params.registerSize,
        flipLimit: params.flipLimit,
        timeLimitSeconds: params.timeLimitSeconds,
        showDecimalAssist: params.showDecimalAssist,
        cost: getCostForLevel(id),
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
    console.error('Binary Bank Crack status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/binary-bank-crack/session/start — start or resume session; returns vault targets and flips remaining. */
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
    const levelsCompleted: string[] = Array.isArray(user.binaryBankCrack?.levelsCompleted)
      ? user.binaryBankCrack!.levelsCompleted
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
    let sessionDoc = await BinaryBankCrackSession.findOne({ userId: user._id, levelId }).lean();
    // If existing session has too few flips to possibly solve (unwinnable), treat as retry: delete and start fresh.
    if (sessionDoc && sessionDoc.vaultTargets?.length) {
      const resumeParams = getLevelParams(sessionDoc.levelId);
      if (resumeParams) {
        const fullLimit = computeFlipLimitForVault(
          sessionDoc.vaultTargets,
          resumeParams.registerSize,
          resumeParams.accidentalFlips
        );
        const minFlipsNeeded = fullLimit - resumeParams.accidentalFlips;
        if (sessionDoc.flipsRemaining < minFlipsNeeded) {
          await BinaryBankCrackSession.deleteOne({ userId: user._id, levelId });
          sessionDoc = null;
        }
      }
    }
    // If existing session has expired (timer ran out), delete so player can retry and start a new run instead of instant loss loop.
    if (sessionDoc) {
      const expireParams = getLevelParams(sessionDoc.levelId);
      if (expireParams) {
        const createdExpire = (sessionDoc as { createdAt?: Date }).createdAt;
        const elapsedExpire = createdExpire
          ? Math.floor((Date.now() - new Date(createdExpire).getTime()) / 1000)
          : 0;
        if (elapsedExpire >= (expireParams.timeLimitSeconds ?? 30)) {
          await BinaryBankCrackSession.deleteOne({ userId: user._id, levelId });
          sessionDoc = null;
        }
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
      const vaultTargets = generateVaultTargets(params.registerCount, params.registerSize);
      const flipsRemaining = computeFlipLimitForVault(
        vaultTargets,
        params.registerSize,
        params.accidentalFlips
      );
      try {
        await BinaryBankCrackSession.create({
          userId: user._id,
          levelId,
          vaultTargets,
          flipsRemaining,
          currentRegisterIndex: 0,
          firstAttemptPaid: false,
          lastAcceptedRegisters: initialRegistersBits(params.registerCount, params.registerSize),
        });
      } catch (createErr: unknown) {
        const code = (createErr as { code?: number })?.code;
        if (code === 11000) {
          const existing = await BinaryBankCrackSession.findOne({ userId: user._id, levelId }).lean();
          if (existing) {
            const nowDup = new Date();
            const balDup = (await User.findById(userId).lean())?.balance ?? user.balance;
            const accruedDup = accrueBalanceToTime(
              balDup?.total ?? 0,
              balDup?.ratePerSecond ?? 0,
              balDup?.lastUpdated ?? nowDup,
              balDup?.fractionalRemainder ?? 0,
              nowDup
            );
            const paramsExisting = getLevelParams(levelId);
            const canonicalFlipsDup =
              paramsExisting && existing.vaultTargets?.length
                ? computeFlipLimitForVault(
                    existing.vaultTargets,
                    paramsExisting.registerSize,
                    paramsExisting.accidentalFlips
                  )
                : existing.flipsRemaining;
            const limitDup = paramsExisting?.timeLimitSeconds ?? 30;
            const createdDup = (existing as { createdAt?: Date }).createdAt;
            const elapsedDup = createdDup
              ? Math.floor((nowDup.getTime() - new Date(createdDup).getTime()) / 1000)
              : 0;
            res.json({
              vaultTargets: existing.vaultTargets,
              flipsRemaining: canonicalFlipsDup,
              currentRegisterIndex: existing.currentRegisterIndex,
              registerCount: paramsExisting?.registerCount ?? existing.vaultTargets.length,
              registerSize: paramsExisting?.registerSize ?? 4,
              timeLimitSeconds: limitDup,
              timeRemainingSeconds: Math.max(0, limitDup - elapsedDup),
              showDecimalAssist: paramsExisting?.showDecimalAssist ?? true,
              balance: {
                total: accruedDup.total,
                ratePerSecond: balDup?.ratePerSecond ?? 0,
                lastUpdated: accruedDup.lastUpdated.toISOString(),
              },
            });
            return;
          }
        }
        throw createErr;
      }
      const newTotal = accrued.total - cost;
      try {
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
      } catch {
        await BinaryBankCrackSession.deleteOne({ userId: user._id, levelId });
        res.status(500).json({ error: 'Server error' });
        return;
      }
      res.json({
        vaultTargets,
        flipsRemaining,
        currentRegisterIndex: 0,
        registerCount: params.registerCount,
        registerSize: params.registerSize,
        timeLimitSeconds: params.timeLimitSeconds,
        timeRemainingSeconds: params.timeLimitSeconds,
        showDecimalAssist: params.showDecimalAssist,
        balance: {
          total: newTotal,
          ratePerSecond: bal?.ratePerSecond ?? 0,
          lastUpdated: accrued.lastUpdated.toISOString(),
        },
      });
      return;
    }
    const paramsResume = getLevelParams(levelId);
    const nowExisting = new Date();
    const balExisting = user.balance;
    const accruedExisting = accrueBalanceToTime(
      balExisting?.total ?? 0,
      balExisting?.ratePerSecond ?? 0,
      balExisting?.lastUpdated ?? nowExisting,
      balExisting?.fractionalRemainder ?? 0,
      nowExisting
    );
    /** Resume: return stored flipsRemaining and server-computed time remaining (no timer reset on reopen). */
    const limitResume = paramsResume?.timeLimitSeconds ?? 30;
    const createdResume = (sessionDoc as { createdAt?: Date }).createdAt;
    const elapsedResume = createdResume
      ? Math.floor((nowExisting.getTime() - new Date(createdResume).getTime()) / 1000)
      : 0;
    const timeRemainingResume = Math.max(0, limitResume - elapsedResume);
    res.json({
      vaultTargets: sessionDoc.vaultTargets,
      flipsRemaining: sessionDoc.flipsRemaining,
      currentRegisterIndex: sessionDoc.currentRegisterIndex,
      registerCount: paramsResume?.registerCount ?? sessionDoc.vaultTargets.length,
      registerSize: paramsResume?.registerSize ?? 4,
      timeLimitSeconds: limitResume,
      timeRemainingSeconds: timeRemainingResume,
      showDecimalAssist: paramsResume?.showDecimalAssist ?? true,
      balance: {
        total: accruedExisting.total,
        ratePerSecond: balExisting?.ratePerSecond ?? 0,
        lastUpdated: accruedExisting.lastUpdated.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Binary Bank Crack session start error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/binary-bank-crack/submit — submit all registers; validate full combination. Flips consumed per bit toggle. */
router.post('/submit', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { levelId, registers, flipsUsed } = req.body as { levelId?: string; registers?: number[][]; flipsUsed?: number };
    if (!levelId || typeof levelId !== 'string' || !Array.isArray(registers)) {
      res.status(400).json({ error: 'levelId and registers (array of bit arrays) required' });
      return;
    }
    const params = getLevelParams(levelId);
    if (!params) {
      res.status(400).json({ error: 'Invalid level' });
      return;
    }
    if (
      registers.length !== params.registerCount ||
      registers.some((r) => !Array.isArray(r) || r.length !== params.registerSize)
    ) {
      res.status(400).json({
        error: `registers must be ${params.registerCount} arrays of ${params.registerSize} bits each`,
      });
      return;
    }
    if (registers.some((r) => r.some((b) => b !== 0 && b !== 1))) {
      res.status(400).json({ error: 'bits must be 0 or 1' });
      return;
    }
    const sessionDoc = await BinaryBankCrackSession.findOne({ userId: req.user!._id, levelId });
    if (!sessionDoc) {
      res.status(400).json({ error: 'No active session; start a session first' });
      return;
    }
    /** Enforce time limit on server so delayed or scripted requests cannot win after timer expired. Use 1s grace: client timer starts when session response is received, so server can be ~1s ahead; only fail when elapsed > limit + 1 so "1s left" on client is still valid. */
    const createdSubmit = (sessionDoc as { createdAt?: Date }).createdAt;
    const elapsedSubmit = createdSubmit
      ? Math.floor((Date.now() - new Date(createdSubmit).getTime()) / 1000)
      : 0;
    const timeLimitWithGrace = params.timeLimitSeconds + 1;
    if (elapsedSubmit > timeLimitWithGrace) {
      await BinaryBankCrackSession.deleteOne({ userId: req.user!._id, levelId });
      const userForBal = await User.findById(userId);
      const bal = userForBal?.balance;
      const nowExpired = new Date();
      const accruedExpired = accrueBalanceToTime(
        bal?.total ?? 0,
        bal?.ratePerSecond ?? 0,
        bal?.lastUpdated ?? nowExpired,
        bal?.fractionalRemainder ?? 0,
        nowExpired
      );
      res.json({
        win: false,
        lostByTime: true,
        registerResults: undefined,
        flipsRemaining: sessionDoc.flipsRemaining,
        balance: {
          total: accruedExpired.total,
          ratePerSecond: bal?.ratePerSecond ?? 0,
          lastUpdated: accruedExpired.lastUpdated.toISOString(),
        },
      });
      return;
    }
    /** Server-authoritative flip count: do not trust client flipsUsed (would allow unlimited retries). */
    const lastState =
      sessionDoc.lastAcceptedRegisters && sessionDoc.lastAcceptedRegisters.length === params.registerCount
        ? sessionDoc.lastAcceptedRegisters
        : initialRegistersBits(params.registerCount, params.registerSize);
    const used = Math.min(minFlipsBetween(lastState, registers), sessionDoc.flipsRemaining);
    const newFlipsRemaining = Math.max(0, sessionDoc.flipsRemaining - used);

    const vaultTargets = sessionDoc.vaultTargets;
    const registerSize = params.registerSize;
    const registerResults = registers.map(
      (bits, i) => bitsToDecimal(bits, registerSize) === (vaultTargets[i] ?? -1)
    );
    const allCorrect = registerResults.every(Boolean);

    /** Win when combination is correct regardless of flips remaining; only fail when wrong combo and 0 flips. */
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (!user.unlockedFeatures?.programmingFacility) {
      res.status(403).json({ error: 'Programming Facility not unlocked' });
      return;
    }
    const now = new Date();
    const bal = user.balance;
    const accrued = accrueBalanceToTime(
      bal?.total ?? 0,
      bal?.ratePerSecond ?? 0,
      bal?.lastUpdated ?? now,
      bal?.fractionalRemainder ?? 0,
      now
    );
    const newTotal = accrued.total;

    if (allCorrect) {
      await User.updateOne(
        { _id: userId },
        { $addToSet: { 'binaryBankCrack.pendingClaimLevelIds': levelId } }
      );
      await BinaryBankCrackSession.deleteOne({ userId: req.user!._id, levelId });
      res.json({
        win: true,
        registerResults,
        flipsRemaining: newFlipsRemaining,
        balance: {
          total: newTotal,
          ratePerSecond: bal?.ratePerSecond ?? 0,
          lastUpdated: accrued.lastUpdated.toISOString(),
        },
      });
      return;
    }

    if (newFlipsRemaining <= 0) {
      await BinaryBankCrackSession.deleteOne({ userId: req.user!._id, levelId });
      res.json({
        win: false,
        valueMismatch: true,
        registerResults,
        flipsRemaining: 0,
        lostAllFlips: true,
        balance: {
          total: newTotal,
          ratePerSecond: bal?.ratePerSecond ?? 0,
          lastUpdated: accrued.lastUpdated.toISOString(),
        },
      });
      return;
    }
    await BinaryBankCrackSession.updateOne(
      { userId: req.user!._id, levelId },
      { $set: { flipsRemaining: newFlipsRemaining, lastAcceptedRegisters: registers } }
    );
    res.json({
      win: false,
      valueMismatch: true,
      registerResults,
      flipsRemaining: newFlipsRemaining,
      balance: {
        total: newTotal,
        ratePerSecond: bal?.ratePerSecond ?? 0,
        lastUpdated: accrued.lastUpdated.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Binary Bank Crack submit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/binary-bank-crack/claim — mark level complete (call after win). */
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
    const levelsCompleted: string[] = Array.isArray(user.binaryBankCrack?.levelsCompleted)
      ? user.binaryBankCrack!.levelsCompleted
      : [];
    const pendingClaimLevelIds: string[] = Array.isArray(user.binaryBankCrack?.pendingClaimLevelIds)
      ? user.binaryBankCrack.pendingClaimLevelIds
      : [];
    if (levelsCompleted.includes(levelId)) {
      await BinaryBankCrackSession.deleteOne({ userId: user._id, levelId });
      await User.updateOne(
        { _id: userId },
        { $pull: { 'binaryBankCrack.pendingClaimLevelIds': levelId } }
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
      res.status(403).json({ error: 'Win the level before claiming' });
      return;
    }
    const updated = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { 'binaryBankCrack.pendingClaimLevelIds': levelId },
        $addToSet: { 'binaryBankCrack.levelsCompleted': levelId },
      },
      { new: true }
    );
    if (!updated) {
      res.status(500).json({ error: 'Server error' });
      return;
    }
    const newCompleted = Array.isArray(updated.binaryBankCrack?.levelsCompleted)
      ? updated.binaryBankCrack!.levelsCompleted
      : [...levelsCompleted, levelId];
    const phreakBonus = computeBinaryBankCrackPhreakBonus(newCompleted);
    await User.updateOne({ _id: userId }, { $set: { phreakBonus } });
    await BinaryBankCrackSession.deleteOne({ userId: user._id, levelId });
    res.json({ success: true, levelsCompleted: newCompleted });
  } catch (error: unknown) {
    console.error('Binary Bank Crack claim error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/binary-bank-crack/session/reset — delete session so next start gets new random vault (optional; client can just start again). */
router.post('/session/reset', auth, async (req: Request, res: Response) => {
  try {
    const { levelId } = req.body as { levelId?: string };
    if (!levelId || typeof levelId !== 'string') {
      res.status(400).json({ error: 'levelId required' });
      return;
    }
    await BinaryBankCrackSession.deleteOne({ userId: req.user!._id, levelId });
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('Binary Bank Crack session reset error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
