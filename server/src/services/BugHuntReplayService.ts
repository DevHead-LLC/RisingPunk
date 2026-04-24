import { BattleReplay } from '../models/BattleReplay';
import { calculateNodePositions, type NodeIndex } from './NodeService';
import { NETWORK_CONNECTIONS, calculateLineProperties } from '../config/networkConfig';
import {
  BATTLE_REPLAY_SCHEMA_VERSION,
  REPLAY_HEADLESS_CANONICAL_HEIGHT,
  REPLAY_HEADLESS_CANONICAL_WIDTH,
  REPLAY_SNAPSHOT_INTERVAL_MS,
  type BattleReplaySnapshotFrame,
} from '../../../shared/battleReplay';

type BugHuntEndReason = 'bug-death' | 'hunter-death' | 'timeout' | 'canceled';

const COUNTDOWN_SECONDS = 3;
const BATTLE_DURATION_SECONDS = 45;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundHp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function deterministicIndex(seed: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return modulo > 0 ? h % modulo : 0;
}

function buildUndirectedAdjacency(): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const edge of NETWORK_CONNECTIONS) {
    const a = Number(edge.from);
    const b = Number(edge.to);
    const aList = map.get(a) ?? [];
    const bList = map.get(b) ?? [];
    aList.push(b);
    bList.push(a);
    map.set(a, aList);
    map.set(b, bList);
  }
  return map;
}

function findPath(start: NodeIndex, target: NodeIndex): NodeIndex[] {
  if (start === target) return [start];
  const adjacency = buildUndirectedAdjacency();
  const queue: number[] = [start];
  const visited = new Set<number>([start]);
  const parent = new Map<number, number>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null) break;
    if (current === target) break;
    const neighbors = adjacency.get(current) ?? [];
    for (const next of neighbors) {
      if (visited.has(next)) continue;
      visited.add(next);
      parent.set(next, current);
      queue.push(next);
    }
  }

  if (!visited.has(target)) {
    return [start, target];
  }
  const reversePath: number[] = [target];
  let cursor: number = target;
  while (cursor !== start) {
    const p = parent.get(cursor);
    if (p == null) break;
    reversePath.push(p);
    cursor = p;
  }
  reversePath.reverse();
  return reversePath as NodeIndex[];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

function getPositionAlongNodePath(
  nodePath: NodeIndex[],
  nodePositionByIndex: Map<number, { x: number; y: number }>,
  progress: number
): { x: number; y: number } {
  if (nodePath.length === 0) {
    throw new Error('Bug-hunt replay path is empty');
  }
  if (nodePath.length === 1) {
    const point = nodePositionByIndex.get(nodePath[0]);
    if (!point) throw new Error('Bug-hunt replay missing node position');
    return point;
  }

  const clamped = clamp(progress, 0, 1);
  const segmentCount = nodePath.length - 1;
  const scaled = clamped * segmentCount;
  const segIdx = Math.min(segmentCount - 1, Math.floor(scaled));
  const segT = scaled - segIdx;
  const fromIdx = nodePath[segIdx];
  const toIdx = nodePath[segIdx + 1];
  const from = nodePositionByIndex.get(fromIdx);
  const to = nodePositionByIndex.get(toIdx);
  if (!from || !to) {
    throw new Error('Bug-hunt replay missing segment node positions');
  }
  return {
    x: lerp(from.x, to.x, segT),
    y: lerp(from.y, to.y, segT),
  };
}

function getPathPolylineLength(points: Array<{ x: number; y: number }>): number {
  if (points.length <= 1) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}

function getPointAlongPolylineByDistance(
  points: Array<{ x: number; y: number }>,
  distanceFromStart: number
): { x: number; y: number } {
  if (points.length === 0) {
    throw new Error('Polyline has no points');
  }
  if (points.length === 1) {
    return points[0];
  }
  const clampedDistance = Math.max(0, distanceFromStart);
  let traversed = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const segmentLength = distance(a, b);
    const nextTraversed = traversed + segmentLength;
    if (clampedDistance <= nextTraversed || i === points.length - 1) {
      if (segmentLength <= 0) return b;
      const t = clamp((clampedDistance - traversed) / segmentLength, 0, 1);
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    }
    traversed = nextTraversed;
  }
  return points[points.length - 1];
}

function buildFrame(params: {
  t: number;
  phase: 'countdown' | 'battle' | 'complete';
  timeRemaining: number;
  winner?: 'user' | 'enemy';
  hunterCurrentHp: number;
  hunterMaxHp: number;
  bugCurrentHp: number;
  bugMaxHp: number;
  hunterNodeIndex: NodeIndex;
  bugNodeIndex: NodeIndex;
  hunterPosition?: { x: number; y: number };
  bugPosition?: { x: number; y: number };
  hunterStats: { offense: number; defense: number; speed: number; range: number };
  bugStats: { offense: number; defense: number; speed: number; range: number };
}): BattleReplaySnapshotFrame {
  const nodeTemplates = calculateNodePositions(
    REPLAY_HEADLESS_CANONICAL_WIDTH,
    REPLAY_HEADLESS_CANONICAL_HEIGHT,
    125
  );
  const nodeByIndex = new Map(nodeTemplates.map((node) => [node.index, node]));
  const maxCaptureThreshold = Math.max(1, (params.hunterMaxHp + params.bugMaxHp) * 0.5);
  const nodes = nodeTemplates.map((node) => ({
    index: node.index,
    owner: node.owner,
    tugOfWarProgress: 0,
    maxCaptureThreshold,
    position: node.position,
  }));
  const lineProperties = NETWORK_CONNECTIONS.map((conn) => {
    const from = nodeByIndex.get(conn.from);
    const to = nodeByIndex.get(conn.to);
    if (!from || !to) {
      throw new Error(`Bug-hunt replay line mapping missing node for ${conn.from}-${conn.to}`);
    }
    return calculateLineProperties(from.position, to.position);
  });

  const hunterNode = nodeByIndex.get(params.hunterNodeIndex);
  const bugNode = nodeByIndex.get(params.bugNodeIndex);
  if (!hunterNode || !bugNode) {
    throw new Error('Bug-hunt replay is missing required node positions');
  }
  const hunterPosition = params.hunterPosition ?? hunterNode.position;
  const bugPosition = params.bugPosition ?? bugNode.position;

  const hunterAlive = params.hunterCurrentHp > 0;
  const bugAlive = params.bugCurrentHp > 0;

  return {
    t: params.t,
    battleId: '',
    phase: params.phase,
    timeRemaining: params.timeRemaining,
    ...(params.winner ? { winner: params.winner } : {}),
    battalions: [
      {
        id: 'bughunt-hunter-1',
        type: 'phreak',
        quantity: hunterAlive ? 1 : 0,
        currentHealth: roundHp(params.hunterCurrentHp),
        maxHealth: roundHp(params.hunterMaxHp),
        baseHealthPerUnit: roundHp(params.hunterMaxHp),
        isDestroyed: !hunterAlive,
        ...(hunterAlive ? {} : { destroyedAt: params.t }),
        position: hunterPosition,
        isUser: true,
        mark: 1,
        stats: {
          health: roundHp(params.hunterMaxHp),
          offense: Math.max(1, Math.round(params.hunterStats.offense)),
          defense: Math.max(0, params.hunterStats.defense),
          speed: Math.max(1, Math.round(params.hunterStats.speed)),
          range: Math.max(1, Math.round(params.hunterStats.range)),
        },
      },
      {
        id: 'bughunt-ant-1',
        type: 'guardian',
        quantity: bugAlive ? 1 : 0,
        currentHealth: roundHp(params.bugCurrentHp),
        maxHealth: roundHp(params.bugMaxHp),
        baseHealthPerUnit: roundHp(params.bugMaxHp),
        isDestroyed: !bugAlive,
        ...(bugAlive ? {} : { destroyedAt: params.t }),
        position: bugPosition,
        isUser: false,
        mark: 1,
        stats: {
          health: roundHp(params.bugMaxHp),
          offense: Math.max(1, Math.round(params.bugStats.offense)),
          defense: Math.max(0, params.bugStats.defense),
          speed: Math.max(1, Math.round(params.bugStats.speed)),
          range: Math.max(1, Math.round(params.bugStats.range)),
        },
      },
    ],
    nodes,
    networkConnections: NETWORK_CONNECTIONS,
    lineProperties,
    movementStates: [],
  };
}

export async function createBugHuntReplayForResolvedEncounter(params: {
  battleId: string;
  attackerId: string;
  bugInstanceId: string;
  endReason: BugHuntEndReason;
  battleDurationSeconds: number;
  initialBugHp: number;
  finalBugHp: number;
  bugMaxHp: number;
  hunterMaxHp: number;
  finalHunterHp: number;
  hunterDps: number;
  bugDps: number;
  hunterStats: { offense: number; defense: number; speed: number; range: number };
  bugStats: { offense: number; defense: number; speed: number; range: number };
}): Promise<boolean> {
  if (params.endReason === 'canceled') {
    return false;
  }

  const bugCandidateNodes: NodeIndex[] = [3, 4, 5];
  const bugNodeIndex = bugCandidateNodes[
    deterministicIndex(params.bugInstanceId, bugCandidateNodes.length)
  ] as NodeIndex;
  const hunterCandidateNodes: NodeIndex[] = ([0, 1, 2, 6, 7, 8] as NodeIndex[]).filter(
    (idx) => idx !== bugNodeIndex
  );
  const hunterNodeIndex =
    hunterCandidateNodes[
      deterministicIndex(`${params.bugInstanceId}:hunter`, hunterCandidateNodes.length)
    ] as NodeIndex;
  const nodeTemplates = calculateNodePositions(
    REPLAY_HEADLESS_CANONICAL_WIDTH,
    REPLAY_HEADLESS_CANONICAL_HEIGHT,
    125
  );
  const nodePositionByIndex = new Map(nodeTemplates.map((node) => [node.index, node.position]));
  const hunterPathToBug = findPath(hunterNodeIndex, bugNodeIndex);
  const pathPoints = hunterPathToBug.map((idx) => {
    const p = nodePositionByIndex.get(idx);
    if (!p) throw new Error(`Missing node position for bug-hunt replay path node ${idx}`);
    return p;
  });
  const pathLength = getPathPolylineLength(pathPoints);

  const durationMs = Math.max(0, Math.round(params.battleDurationSeconds * 1000));
  const battleStartMs = COUNTDOWN_SECONDS * 1000;
  const battleEndMs = battleStartMs + durationMs;
  const winner: 'user' | 'enemy' = params.endReason === 'bug-death' ? 'user' : 'enemy';
  const snapshots: BattleReplaySnapshotFrame[] = [];
  const approachSeconds = params.battleDurationSeconds > 0
    ? Math.min(8, Math.max(1.5, params.battleDurationSeconds * 0.2))
    : 0;
  const combatSeconds = Math.max(0.1, params.battleDurationSeconds - approachSeconds);
  // Mirror client attack range display math (`BattleBattalion`: range * 8 px).
  const hunterAttackRangePx = Math.max(0, params.hunterStats.range * 8);
  const movementTravelDistance = Math.max(0, pathLength - hunterAttackRangePx);
  const visualBugDamagePerSec = Math.max(
    0,
    (params.initialBugHp - params.finalBugHp) / combatSeconds
  );
  const visualHunterDamagePerSec = Math.max(
    0,
    (params.hunterMaxHp - params.finalHunterHp) / combatSeconds
  );

  for (let i = 0; i < COUNTDOWN_SECONDS; i += 1) {
    const t = i * 1000;
    const frame = buildFrame({
      t,
      phase: 'countdown',
      timeRemaining: COUNTDOWN_SECONDS - i,
      hunterCurrentHp: params.hunterMaxHp,
      hunterMaxHp: params.hunterMaxHp,
      bugCurrentHp: params.initialBugHp,
      bugMaxHp: params.bugMaxHp,
      hunterNodeIndex,
      bugNodeIndex,
      hunterStats: params.hunterStats,
      bugStats: params.bugStats,
    });
    frame.battleId = params.battleId;
    snapshots.push(frame);
  }

  for (let t = battleStartMs; t <= battleEndMs; t += REPLAY_SNAPSHOT_INTERVAL_MS) {
    const elapsed = clamp((t - battleStartMs) / 1000, 0, params.battleDurationSeconds);
    const elapsedCombat = Math.max(0, elapsed - approachSeconds);
    const isFinal = t >= battleEndMs;
    const bugHp = isFinal
      ? params.finalBugHp
      : Math.max(0, params.initialBugHp - visualBugDamagePerSec * elapsedCombat);
    const hunterHp = isFinal
      ? params.finalHunterHp
      : Math.max(0, params.hunterMaxHp - visualHunterDamagePerSec * elapsedCombat);
    const moveProgress = approachSeconds <= 0 ? 1 : clamp(elapsed / approachSeconds, 0, 1);
    const traveledDistance = movementTravelDistance * moveProgress;
    const hunterPosition = getPointAlongPolylineByDistance(pathPoints, traveledDistance);
    const bugPosition = nodePositionByIndex.get(bugNodeIndex);
    if (!bugPosition) {
      throw new Error('Bug-hunt replay missing bug position');
    }
    const frame = buildFrame({
      t,
      phase: 'battle',
      timeRemaining: Math.max(0, BATTLE_DURATION_SECONDS - elapsed),
      hunterCurrentHp: hunterHp,
      hunterMaxHp: params.hunterMaxHp,
      bugCurrentHp: bugHp,
      bugMaxHp: params.bugMaxHp,
      hunterNodeIndex,
      bugNodeIndex,
      hunterPosition,
      bugPosition,
      hunterStats: params.hunterStats,
      bugStats: params.bugStats,
    });
    frame.battleId = params.battleId;
    snapshots.push(frame);
  }

  const completeFrame = buildFrame({
    t: battleEndMs + 1,
    phase: 'complete',
    timeRemaining: 0,
    winner,
    hunterCurrentHp: params.finalHunterHp,
    hunterMaxHp: params.hunterMaxHp,
    bugCurrentHp: params.finalBugHp,
    bugMaxHp: params.bugMaxHp,
    hunterNodeIndex,
    bugNodeIndex,
    hunterPosition: getPointAlongPolylineByDistance(pathPoints, movementTravelDistance),
    bugPosition: nodePositionByIndex.get(bugNodeIndex),
    hunterStats: params.hunterStats,
    bugStats: params.bugStats,
  });
  completeFrame.battleId = params.battleId;
  snapshots.push(completeFrame);

  await BattleReplay.replaceOne(
    { battleId: params.battleId },
    {
      battleId: params.battleId,
      replayVersion: BATTLE_REPLAY_SCHEMA_VERSION,
      canonicalScreenWidth: REPLAY_HEADLESS_CANONICAL_WIDTH,
      canonicalScreenHeight: REPLAY_HEADLESS_CANONICAL_HEIGHT,
      totalDurationMs: snapshots[snapshots.length - 1]?.t ?? 0,
      snapshotCount: snapshots.length,
      snapshots,
      createdAt: new Date(),
      attackerId: params.attackerId,
      defenderId: 'bug',
      isNpc: true,
      winner,
    },
    { upsert: true }
  );

  return true;
}
