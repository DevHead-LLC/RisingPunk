import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { User } from '../models/User';
import { PacketBreachSession } from '../models/PacketBreachSession';
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

function docToSessionData(doc: { solution: string[]; antiSolution: string[]; attemptsLeft: number; nodePool: NodeDef[]; slots: number; firstAttemptPaid: boolean; decoyNodeId?: string }): SessionData {
  return {
    solution: [...doc.solution],
    antiSolution: [...doc.antiSolution],
    attemptsLeft: doc.attemptsLeft,
    nodePool: doc.nodePool.map((n) => ({ id: n.id, protocol: n.protocol, port: n.port })),
    slots: doc.slots,
    firstAttemptPaid: doc.firstAttemptPaid,
    ...(doc.decoyNodeId != null && { decoyNodeId: doc.decoyNodeId }),
  };
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

/** Tier 13+: pool of 5 nodes (1–5), one random node is the decoy. Solution/anti use 3 from the other 4. */
function generateDigitsPuzzleWithDecoy5(): {
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
    { id: '5', protocol: 'dns', port: 5 },
  ];
  const allIds = ['1', '2', '3', '4', '5'];
  const decoyIndex = Math.floor(Math.random() * 5);
  const decoyNodeId = allIds[decoyIndex];
  const activeIds = allIds.filter((_, i) => i !== decoyIndex);
  const randActive = () => activeIds[Math.floor(Math.random() * 4)];
  const solution: string[] = [randActive(), randActive(), randActive()];
  let antiSolution: string[] = [randActive(), randActive(), randActive()];
  while (antiSolution.every((d, i) => d === solution[i])) {
    antiSolution = [randActive(), randActive(), randActive()];
  }
  return { nodePool, solution, antiSolution, decoyNodeId };
}

/** Generate node pool and solution/anti. Tiers 1–6: 3-node. Tier 7–12: 4-node with decoy. Tier 13+: 5-node with decoy. */
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
  if (params.slots === 3 && params.nodeTypes === 5 && params.tier >= 13) {
    return generateDigitsPuzzleWithDecoy5();
  }
  if (params.slots !== 3 || (params.nodeTypes !== 3 && params.nodeTypes !== 4 && params.nodeTypes !== 5)) {
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
    let sessionDoc = await PacketBreachSession.findOne({ userId: user._id, levelId }).lean();
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
      const puzzle = generatePuzzle(levelId);
      const { nodePool, solution, antiSolution } = puzzle;
      const session: SessionData = {
        solution,
        antiSolution,
        attemptsLeft: params.attempts,
        nodePool,
        slots: params.slots,
        firstAttemptPaid: false,
        ...(puzzle.decoyNodeId != null && { decoyNodeId: puzzle.decoyNodeId }),
      };
      try {
        await PacketBreachSession.create({
          userId: user._id,
          levelId,
          ...session,
        });
      } catch (createErr: unknown) {
        const code = (createErr as { code?: number })?.code;
        if (code === 11000) {
          const existing = await PacketBreachSession.findOne({ userId: user._id, levelId }).lean();
          if (existing) {
            const existingSession = docToSessionData(existing);
            res.json({
              nodePool: existingSession.nodePool,
              slots: existingSession.slots,
              attemptsLeft: existingSession.attemptsLeft,
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
        await PacketBreachSession.deleteOne({ userId: user._id, levelId });
        res.status(500).json({ error: 'Server error' });
        return;
      }
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
    const session = docToSessionData(sessionDoc);
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
    const sessionDoc = await PacketBreachSession.findOne({ userId: req.user!._id, levelId });
    if (!sessionDoc) {
      res.status(400).json({ error: 'No active session; start a session first' });
      return;
    }
    const session = docToSessionData(sessionDoc);
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
      await PacketBreachSession.updateOne(
        { userId: req.user!._id, levelId },
        { $set: { firstAttemptPaid: true } }
      );
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
      await PacketBreachSession.deleteOne({ userId: req.user!._id, levelId });
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
    /** Winning sequence never contains decoy; solution does not use decoy node by design. */
    const win =
      !decoyUsed &&
      session.solution.length === sequence.length &&
      session.solution.every((id, i) => id === sequence[i]);
    const feedback = decoyUsed
      ? { routed: 0, misrouted: 0, rejected: 0 }
      : computeFeedback(session.solution, sequence);
    session.attemptsLeft--;
    if (session.attemptsLeft === 0) {
      await PacketBreachSession.deleteOne({ userId: req.user!._id, levelId });
    } else {
      await PacketBreachSession.updateOne(
        { userId: req.user!._id, levelId },
        { $set: { attemptsLeft: session.attemptsLeft } }
      );
    }
    if (win) {
      await User.updateOne(
        { _id: userId },
        { $addToSet: { 'packetBreach.pendingClaimLevelIds': levelId } }
      );
    }
    if (decoyUsed) {
      res.json({
        decoyUsed: true,
        attemptsLeft: session.attemptsLeft,
        win: false,
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
    const pendingClaimLevelIds: string[] = Array.isArray(user.packetBreach?.pendingClaimLevelIds)
      ? user.packetBreach.pendingClaimLevelIds
      : [];
    if (levelsCompleted.includes(levelId)) {
      await PacketBreachSession.deleteOne({ userId: user._id, levelId });
      await User.updateOne(
        { _id: userId },
        { $pull: { 'packetBreach.pendingClaimLevelIds': levelId } }
      );
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
    if (!pendingClaimLevelIds.includes(levelId)) {
      res.status(403).json({ error: 'Win the level before claiming' });
      return;
    }
    await User.updateOne(
      { _id: userId },
      { $pull: { 'packetBreach.pendingClaimLevelIds': levelId } }
    );
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
    await PacketBreachSession.deleteOne({ userId: user._id, levelId });
    res.json({ success: true, levelsCompleted: newCompleted });
  } catch (error: unknown) {
    console.error('Packet Breach claim error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
