import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { User } from '../models/User';
import {
  getLevelParams,
  getLevelIdsForPhase1,
  getTierLevels,
  getCostForLevel,
  computePacketBreachArmyBonus,
  PROTOCOLS,
  type LevelId,
} from '../config/packetBreachConfig';
import { accrueBalanceToTime } from '../utils/balanceAccrual';

const router = express.Router();

/** Node as sent to client (display only). */
export interface NodeDef {
  id: string;
  protocol: string;
  port: number;
}

interface SessionData {
  solution: string[];
  antiSolution: string[];
  attemptsLeft: number;
  nodePool: NodeDef[];
  slots: number;
  /** First attempt is paid at session start; submit skips deduct on first attempt. */
  firstAttemptPaid: boolean;
  /** Tier 7+: the node id that is the decoy (not used in solution). Omitted for tiers 1–6. */
  decoyNodeId?: string;
}

const sessionStore = new Map<string, SessionData>();

function sessionKey(userId: string, levelId: string): string {
  return `${userId}:${levelId}`;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Digits mode for tiers 1–6: pool of 3 repeatable digits 1–3; solution/anti are 3 digits each. */
function generateDigitsPuzzle(): { nodePool: NodeDef[]; solution: string[]; antiSolution: string[] } {
  const nodePool: NodeDef[] = [
    { id: '1', protocol: 'tcp', port: 1 },
    { id: '2', protocol: 'udp', port: 2 },
    { id: '3', protocol: 'ssh', port: 3 },
  ];
  const digits = ['1', '2', '3'];
  const randDigit = () => digits[Math.floor(Math.random() * 3)];
  const solution: string[] = [randDigit(), randDigit(), randDigit()];
  let antiSolution: string[] = [randDigit(), randDigit(), randDigit()];
  while (antiSolution.every((d, i) => d === solution[i])) {
    antiSolution = [randDigit(), randDigit(), randDigit()];
  }
  return { nodePool, solution, antiSolution };
}

/** Tier 7+: pool of 4 nodes (1–4), one random node is the decoy (not in solution). Solution/anti use only the other 3. */
function generateDigitsPuzzleWithDecoy(): {
  nodePool: NodeDef[];
  solution: string[];
  antiSolution: string[];
  decoyNodeId: string;
} {
  const nodePool: NodeDef[] = [
    { id: '1', protocol: 'tcp', port: 1 },
    { id: '2', protocol: 'udp', port: 2 },
    { id: '3', protocol: 'ssh', port: 3 },
    { id: '4', protocol: 'http', port: 4 },
  ];
  const allIds = ['1', '2', '3', '4'];
  const decoyIndex = Math.floor(Math.random() * 4);
  const decoyNodeId = allIds[decoyIndex];
  const activeDigits = allIds.filter((_, i) => i !== decoyIndex);
  const randActive = () => activeDigits[Math.floor(Math.random() * 3)];
  const solution: string[] = [randActive(), randActive(), randActive()];
  let antiSolution: string[] = [randActive(), randActive(), randActive()];
  while (antiSolution.every((d, i) => d === solution[i])) {
    antiSolution = [randActive(), randActive(), randActive()];
  }
  return { nodePool, solution, antiSolution, decoyNodeId };
}

/** Generate node pool and solution/anti. Tiers 1–6: 3-node digits. Tier 7+: 4-node with decoy. */
function generatePuzzle(levelId: LevelId): {
  nodePool: NodeDef[];
  solution: string[];
  antiSolution: string[];
  decoyNodeId?: string;
} {
  const params = getLevelParams(levelId);
  if (!params) throw new Error('Invalid level');
  if (params.slots === 3 && params.tier >= 1 && params.tier <= 6) {
    return generateDigitsPuzzle();
  }
  if (params.slots === 3 && params.nodeTypes === 4 && params.tier >= 7) {
    return generateDigitsPuzzleWithDecoy();
  }
  if (params.slots !== 3 || (params.nodeTypes !== 3 && params.nodeTypes !== 4)) {
    throw new Error('Invalid level params');
  }
  const protocols = PROTOCOLS.slice(0, params.nodeTypes);
  const poolSize = 9;
  const nodePool: NodeDef[] = [];
  const usedPorts = new Set<number>();
  for (let i = 0; i < poolSize; i++) {
    let port: number;
    do {
      port = Math.floor(Math.random() * 9) + 1;
    } while (usedPorts.has(port));
    usedPorts.add(port);
    nodePool.push({
      id: String(i),
      protocol: protocols[i % protocols.length],
      port,
    });
  }
  const shuffled = shuffle([...nodePool]);
  const solution = shuffled.slice(0, 3).map((n) => n.id);
  const antiCandidates = shuffled.slice(3).map((n) => n.id);
  const antiSolution = antiCandidates.length >= 3
    ? [antiCandidates[2], antiCandidates[1], antiCandidates[0]]
    : shuffle([...nodePool.map((n) => n.id)]).slice(0, 3);
  return { nodePool, solution, antiSolution };
}

/** Compute Mastermind-style feedback (counts only). */
function computeFeedback(
  solution: string[],
  guess: string[]
): { routed: number; misrouted: number; rejected: number } {
  const sol = [...solution];
  const g = [...guess];
  let routed = 0;
  for (let i = 0; i < g.length; i++) {
    if (g[i] === sol[i]) {
      routed++;
      sol[i] = '';
      g[i] = '';
    }
  }
  let misrouted = 0;
  let rejected = 0;
  for (let i = 0; i < g.length; i++) {
    if (g[i] === '') continue;
    const idx = sol.indexOf(g[i]);
    if (idx !== -1) {
      misrouted++;
      sol[idx] = '';
    } else {
      rejected++;
    }
  }
  return { routed, misrouted, rejected };
}

/** GET /api/packet-breach/status — levels completed, which level is next playable (linear unlock). */
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
    const levelsCompleted: string[] = Array.isArray(user.packetBreach?.levelsCompleted)
      ? user.packetBreach!.levelsCompleted
      : [];
    const completedSet = new Set(levelsCompleted);
    const levelIds = getLevelIdsForPhase1();
    const levelConfigs = levelIds.map((id) => {
      const params = getLevelParams(id);
      if (!params) return null;
      const isCompleted = completedSet.has(id);
      const prevLevels = levelIds.slice(0, levelIds.indexOf(id));
      const isUnlocked = prevLevels.every((lid) => completedSet.has(lid));
      return {
        levelId: params.levelId,
        tier: params.tier,
        slots: params.slots,
        attempts: params.attempts,
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
    console.error('Packet Breach status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/packet-breach/session/start — start or resume session for level; returns node pool and attempts left. */
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
    const levelsCompleted: string[] = Array.isArray(user.packetBreach?.levelsCompleted)
      ? user.packetBreach!.levelsCompleted
      : [];
    const completedSet = new Set(levelsCompleted);
    const levelIds = getLevelIdsForPhase1();
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
    const key = sessionKey(userId, levelId);
    let session = sessionStore.get(key);
    if (!session) {
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
      const puzzle = generatePuzzle(levelId);
      const { nodePool, solution, antiSolution } = puzzle;
      session = {
        solution,
        antiSolution,
        attemptsLeft: params.attempts,
        nodePool,
        slots: params.slots,
        firstAttemptPaid: false,
        ...(puzzle.decoyNodeId != null && { decoyNodeId: puzzle.decoyNodeId }),
      };
      sessionStore.set(key, session);
      res.json({
        nodePool: session.nodePool,
        slots: session.slots,
        attemptsLeft: session.attemptsLeft,
        balance: {
          total: newTotal,
          ratePerSecond: bal?.ratePerSecond ?? 0,
          lastUpdated: accrued.lastUpdated.toISOString(),
        },
      });
      return;
    }
    res.json({
      nodePool: session.nodePool,
      slots: session.slots,
      attemptsLeft: session.attemptsLeft,
    });
  } catch (error: unknown) {
    console.error('Packet Breach session start error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/packet-breach/submit — submit sequence; returns feedback or win/lose. */
router.post('/submit', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { levelId, sequence } = req.body as { levelId?: string; sequence?: string[] };
    if (!levelId || typeof levelId !== 'string' || !Array.isArray(sequence)) {
      res.status(400).json({ error: 'levelId and sequence required' });
      return;
    }
    const params = getLevelParams(levelId);
    if (!params) {
      res.status(400).json({ error: 'Invalid level' });
      return;
    }
    const key = sessionKey(userId, levelId);
    const session = sessionStore.get(key);
    if (!session) {
      res.status(400).json({ error: 'No active session; start a session first' });
      return;
    }
    const validIds = new Set(session.nodePool.map((n) => n.id));
    if (sequence.length !== session.slots || sequence.some((id) => !validIds.has(id))) {
      res.status(400).json({ error: 'Invalid sequence length or node ids' });
      return;
    }
    if (session.attemptsLeft <= 0) {
      res.status(400).json({ error: 'No attempts left' });
      return;
    }
    const cost = getCostForLevel(levelId);
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
    const isFirstAttempt = session.firstAttemptPaid === false;
    if (isFirstAttempt) {
      session.firstAttemptPaid = true;
      sessionStore.set(key, session);
    } else {
      if (accrued.total < cost) {
        res.status(402).json({
          error: 'Insufficient funds',
          required: cost,
          balance: accrued.total,
        });
        return;
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
    }
    const newTotal = isFirstAttempt ? accrued.total : accrued.total - cost;
    const antiMatch =
      session.antiSolution.length === sequence.length &&
      session.antiSolution.every((id, i) => id === sequence[i]);
    if (antiMatch) {
      session.attemptsLeft = 0;
      sessionStore.delete(key);
      res.json({
        lostAllAttempts: true,
        antiSolutionTriggered: true,
        attemptsLeft: 0,
        routed: 0,
        misrouted: 0,
        rejected: 0,
        balance: {
          total: newTotal,
          ratePerSecond: bal?.ratePerSecond ?? 0,
          lastUpdated: accrued.lastUpdated.toISOString(),
        },
      });
      return;
    }
    const decoyUsed =
      session.decoyNodeId != null && sequence.includes(session.decoyNodeId);
    const feedback = computeFeedback(session.solution, sequence);
    session.attemptsLeft--;
    const win =
      session.solution.length === sequence.length &&
      session.solution.every((id, i) => id === sequence[i]);
    if (session.attemptsLeft === 0) {
      sessionStore.delete(key);
    } else {
      sessionStore.set(key, session);
    }
    if (decoyUsed) {
      res.json({
        decoyUsed: true,
        attemptsLeft: session.attemptsLeft,
        win: win || undefined,
        balance: {
          total: newTotal,
          ratePerSecond: bal?.ratePerSecond ?? 0,
          lastUpdated: accrued.lastUpdated.toISOString(),
        },
      });
    } else {
      res.json({
        ...feedback,
        attemptsLeft: session.attemptsLeft,
        win: win || undefined,
        balance: {
          total: newTotal,
          ratePerSecond: bal?.ratePerSecond ?? 0,
          lastUpdated: accrued.lastUpdated.toISOString(),
        },
      });
    }
  } catch (error: unknown) {
    console.error('Packet Breach submit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/packet-breach/claim — mark level complete (call after win). */
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
    const levelsCompleted: string[] = Array.isArray(user.packetBreach?.levelsCompleted)
      ? user.packetBreach!.levelsCompleted
      : [];
    if (levelsCompleted.includes(levelId)) {
      sessionStore.delete(sessionKey(userId, levelId));
      res.json({ success: true, levelsCompleted });
      return;
    }
    const levelIds = getLevelIdsForPhase1();
    const idx = levelIds.indexOf(levelId);
    const prevLevels = levelIds.slice(0, idx);
    const completedSet = new Set(levelsCompleted);
    const isUnlocked = prevLevels.every((lid) => completedSet.has(lid));
    if (!isUnlocked) {
      res.status(403).json({ error: 'Level not unlocked' });
      return;
    }
    const updated = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { 'packetBreach.levelsCompleted': levelId } },
      { new: true }
    );
    if (!updated) {
      res.status(500).json({ error: 'Server error' });
      return;
    }
    const newCompleted = Array.isArray(updated.packetBreach?.levelsCompleted)
      ? updated.packetBreach!.levelsCompleted
      : [...levelsCompleted, levelId];
    // Recompute from all completed levels so every tier reward (1–6+) is included
    const armyBonus = computePacketBreachArmyBonus(newCompleted);
    await User.updateOne({ _id: userId }, { $set: { armyBonus } });
    sessionStore.delete(sessionKey(userId, levelId));
    res.json({ success: true, levelsCompleted: newCompleted });
  } catch (error: unknown) {
    console.error('Packet Breach claim error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
