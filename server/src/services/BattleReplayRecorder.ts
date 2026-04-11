import { BattleController } from '../controllers/BattleController';
import { ENABLE_BATTLE_REPLAY_RECORDING } from '../config/env';
import { IBattleDocument } from '../models/Battle';
import { BattleReplay } from '../models/BattleReplay';
import { BattleTimerService } from './BattleTimer';
import { NodeOwner } from '../types/battle';
import { mapBattleStateResponseToWire } from '../utils/mapBattleStateResponseToWire';
import {
  BATTLE_REPLAY_SCHEMA_VERSION,
  REPLAY_SNAPSHOT_INTERVAL_MS,
  type BattleReplayDocument,
  type BattleReplaySnapshotFrame,
  type BattleState,
  type BattleWireMovementState,
} from '../../../shared/battleReplay';

/** Same idea as client `REPLAY_WALL_CLOCK_START_TIME_THRESHOLD_MS`: Unix wall ms vs virtual battle ms. */
const REPLAY_WALL_CLOCK_MOVEMENT_START_THRESHOLD_MS = 1_000_000_000_000;

type Session = {
  battleId: string;
  attackerId: string;
  defenderId: string;
  isNpc: boolean;
  canonicalWidth: number;
  canonicalHeight: number;
  epochMs: number;
  snapshots: BattleReplaySnapshotFrame[];
  activeInterval?: NodeJS.Timeout;
  listeners: Array<{ event: string; handler: (...args: any[]) => void }>;
  captureChain: Promise<void>;
  /** Headless march: wall-clock captures disabled; virtual timeline only. */
  syntheticReplayMode?: boolean;
  /** Largest bucket index (floor(t/250)) that has been written for synthetic ACTIVE cadence. */
  lastSyntheticBucket?: number;
  /** High-water virtual ms along the synthetic timeline (for finalize). */
  syntheticVirtualMax?: number;
};

/**
 * Live-battle replay capture (env {@link ENABLE_BATTLE_REPLAY_RECORDING}).
 * Snapshots use the same pipeline as GET /state + wire mapper (R1 contract).
 */
export class BattleReplayRecorder {
  private static instance: BattleReplayRecorder;

  private readonly timerService = BattleTimerService.getInstance();

  private readonly sessions = new Map<string, Session>();

  static getInstance(): BattleReplayRecorder {
    if (!BattleReplayRecorder.instance) {
      BattleReplayRecorder.instance = new BattleReplayRecorder();
    }
    return BattleReplayRecorder.instance;
  }

  async onBattleCreated(battle: IBattleDocument): Promise<void> {
    if (!ENABLE_BATTLE_REPLAY_RECORDING) return;

    const battleId = battle.battleId;
    if (this.sessions.has(battleId)) {
      console.warn(`[BattleReplayRecorder] Session already exists for ${battleId}`);
      return;
    }

    const canonicalWidth = battle.screenWidth;
    const canonicalHeight = battle.screenHeight;
    if (!canonicalWidth || !canonicalHeight) {
      throw new Error(`BattleReplayRecorder: battle ${battleId} missing screenWidth/screenHeight`);
    }

    if (process.env.NODE_ENV !== 'production' && canonicalWidth < canonicalHeight) {
      console.warn(
        `[BattleReplayRecorder] battle ${battleId}: canonical screen ${canonicalWidth}×${canonicalHeight} is portrait-shaped; replays expect landscape logical coords`
      );
    }

    const epochMs = battle.startTime.getTime();
    const session: Session = {
      battleId,
      attackerId: String(battle.attackerId),
      defenderId: String(battle.defenderId),
      isNpc: Boolean(battle.defenderNpcSlug),
      canonicalWidth,
      canonicalHeight,
      epochMs,
      snapshots: [],
      listeners: [],
      captureChain: Promise.resolve(),
    };
    this.sessions.set(battleId, session);

    const onCountdown = (data: { battleId: string }) => {
      if (data.battleId !== battleId) return;
      this.enqueueCapture(battleId);
    };
    this.timerService.on('countdownUpdate', onCountdown);
    session.listeners.push({ event: 'countdownUpdate', handler: onCountdown });

    const onPhase = (data: { battleId: string; phase: unknown }) => {
      if (data.battleId !== battleId) return;
      if (session.syntheticReplayMode) return;
      this.enqueueCapture(battleId);
      const p = String(data.phase);
      if (p === 'active') {
        if (session.activeInterval) clearInterval(session.activeInterval);
        session.activeInterval = setInterval(() => {
          this.enqueueCapture(battleId);
        }, REPLAY_SNAPSHOT_INTERVAL_MS);
      }
    };
    this.timerService.on('phaseChange', onPhase);
    session.listeners.push({ event: 'phaseChange', handler: onPhase });

    const onBattleEnd = (data: { battleId: string }) => {
      if (data.battleId !== battleId) return;
      if (session.activeInterval) {
        clearInterval(session.activeInterval);
        session.activeInterval = undefined;
      }
      // Do not snapshot here — handleBattleEnd runs async; finalizeAfterBattleEnd does the last frame.
    };
    this.timerService.on('battleEnd', onBattleEnd);
    session.listeners.push({ event: 'battleEnd', handler: onBattleEnd });

    this.enqueueCapture(battleId);
  }

  /**
   * Live battle state uses Unix `Date.now()` for movement `startTime`; replay frame `t` is virtual
   * (`Date.now() - epochMs` or synthetic). Rewrite wall-clock movement times to virtual so clients can use
   * `elapsed = replayNowMs - startTime` without epoch juggling (and avoid instant completion when baselines drift).
   */
  private normalizeWireMovementTimesToReplayTimeline(wire: BattleState, epochMs: number): BattleState {
    const toVirtual = (st: number): number => {
      if (!Number.isFinite(st)) {
        throw new Error('BattleReplayRecorder: movement startTime must be finite');
      }
      if (st < REPLAY_WALL_CLOCK_MOVEMENT_START_THRESHOLD_MS) {
        return st;
      }
      if (!Number.isFinite(epochMs) || epochMs <= 0) {
        throw new Error(
          'BattleReplayRecorder: wall-clock movement startTime requires positive finite epochMs'
        );
      }
      return st - epochMs;
    };

    const normOne = (m: BattleWireMovementState): BattleWireMovementState => ({
      ...m,
      startTime: toVirtual(m.startTime),
    });

    return {
      ...wire,
      movementStates: wire.movementStates?.map((m) => normOne(m)),
      battalions: wire.battalions.map((b) => ({
        ...b,
        movementState: b.movementState ? normOne(b.movementState) : undefined,
      })),
    };
  }

  private enqueueCapture(battleId: string): void {
    const session = this.sessions.get(battleId);
    if (!session || session.syntheticReplayMode) return;
    session.captureChain = session.captureChain
      .then(() => this.appendFrame(battleId))
      .catch((err) => {
        console.error(`[BattleReplayRecorder] capture failed for ${battleId}:`, err);
      });
  }

  private async appendFrame(battleId: string): Promise<void> {
    const session = this.sessions.get(battleId);
    if (!session) return;

    const controller = new BattleController();
    const res = await controller.getBattleState(
      battleId,
      session.attackerId,
      session.canonicalWidth,
      session.canonicalHeight
    );
    if (!res) {
      console.warn(`[BattleReplayRecorder] no battle state for ${battleId}, skipping frame`);
      return;
    }

    const wire = this.normalizeWireMovementTimesToReplayTimeline(
      mapBattleStateResponseToWire(res),
      session.epochMs
    );
    const t = Math.max(0, Date.now() - session.epochMs);
    session.snapshots.push({ ...wire, t });
  }

  /**
   * Headless march resolution: discard any wall-clock frames, stop the ACTIVE interval, and switch to virtual-time capture.
   * Call from {@link BattleTimerService.runSyntheticTicksToCompletion} before emitting synthetic timer events.
   */
  async beginSyntheticReplayCapture(battleId: string): Promise<void> {
    if (!ENABLE_BATTLE_REPLAY_RECORDING) return;

    const session = this.sessions.get(battleId);
    if (!session) return;

    try {
      await session.captureChain;
    } catch (err) {
      console.error(`[BattleReplayRecorder] beginSyntheticReplayCapture: drain failed for ${battleId}:`, err);
    }

    if (session.activeInterval) {
      clearInterval(session.activeInterval);
      session.activeInterval = undefined;
    }

    session.snapshots = [];
    session.captureChain = Promise.resolve();
    session.syntheticReplayMode = true;
    session.lastSyntheticBucket = -1;
    session.syntheticVirtualMax = 0;
  }

  /**
   * Countdown / phase boundaries: one frame at the given virtual ms (wall-clock-equivalent timeline from battle start).
   */
  async syntheticExactFrame(battleId: string, virtualT: number): Promise<void> {
    if (!ENABLE_BATTLE_REPLAY_RECORDING) return;

    const session = this.sessions.get(battleId);
    if (!session?.syntheticReplayMode) return;

    const run = async () => {
      await this.appendFrameWithVirtualT(battleId, virtualT);
      const b = Math.floor(virtualT / REPLAY_SNAPSHOT_INTERVAL_MS);
      session.lastSyntheticBucket = Math.max(session.lastSyntheticBucket ?? -1, b);
      session.syntheticVirtualMax = Math.max(session.syntheticVirtualMax ?? 0, virtualT);
    };

    session.captureChain = session.captureChain.then(run).catch((err) => {
      console.error(`[BattleReplayRecorder] syntheticExactFrame failed for ${battleId}:`, err);
    });
    await session.captureChain;
  }

  /**
   * ACTIVE phase: append frames at each 250ms boundary crossed up to `virtualT` (matches live ACTIVE interval).
   */
  async syntheticAdvanceBucketsTo(battleId: string, virtualT: number): Promise<void> {
    if (!ENABLE_BATTLE_REPLAY_RECORDING) return;

    const session = this.sessions.get(battleId);
    if (!session?.syntheticReplayMode) return;

    const run = async () => {
      const targetBucket = Math.floor(virtualT / REPLAY_SNAPSHOT_INTERVAL_MS);
      let lb = session.lastSyntheticBucket ?? -1;
      while (lb < targetBucket) {
        lb++;
        const t = lb * REPLAY_SNAPSHOT_INTERVAL_MS;
        await this.appendFrameWithVirtualT(battleId, t);
      }
      session.lastSyntheticBucket = lb;
      session.syntheticVirtualMax = Math.max(session.syntheticVirtualMax ?? 0, virtualT);
    };

    session.captureChain = session.captureChain.then(run).catch((err) => {
      console.error(`[BattleReplayRecorder] syntheticAdvanceBucketsTo failed for ${battleId}:`, err);
    });
    await session.captureChain;
  }

  private async appendFrameWithVirtualT(battleId: string, virtualT: number): Promise<void> {
    const session = this.sessions.get(battleId);
    if (!session) return;

    const controller = new BattleController();
    const res = await controller.getBattleState(
      battleId,
      session.attackerId,
      session.canonicalWidth,
      session.canonicalHeight
    );
    if (!res) {
      console.warn(`[BattleReplayRecorder] no battle state for ${battleId}, skipping synthetic frame`);
      return;
    }

    const wire = this.normalizeWireMovementTimesToReplayTimeline(
      mapBattleStateResponseToWire(res),
      session.epochMs
    );
    const lastT = session.snapshots.length > 0 ? session.snapshots[session.snapshots.length - 1].t : -1;
    const t = Math.max(virtualT, lastT + 1);
    session.snapshots.push({ ...wire, t });
  }

  /** Drop in-memory session without persisting (e.g. battle document missing). */
  abandonRecording(battleId: string): void {
    if (!ENABLE_BATTLE_REPLAY_RECORDING) return;
    this.teardownSession(battleId);
  }

  async finalizeAfterBattleEnd(battleId: string, completedBattle: IBattleDocument): Promise<void> {
    if (!ENABLE_BATTLE_REPLAY_RECORDING) {
      return;
    }

    const session = this.sessions.get(battleId);
    if (!session) {
      return;
    }

    try {
      await session.captureChain;

      if (session.syntheticReplayMode) {
        const lastT = session.snapshots.length > 0 ? session.snapshots[session.snapshots.length - 1].t : -1;
        const endV = session.syntheticVirtualMax ?? 0;
        const tFinal = Math.max(endV, lastT + 1);
        await this.appendFrameWithVirtualT(battleId, tFinal);
      } else {
        await this.appendFrame(battleId);
      }

      const w = completedBattle.winner;
      if (w !== NodeOwner.USER && w !== NodeOwner.ENEMY) {
        throw new Error(`BattleReplayRecorder: battle ${battleId} missing winner at finalize`);
      }
      const winner = w === NodeOwner.USER ? 'user' : 'enemy';

      const lastT =
        session.snapshots.length > 0 ? session.snapshots[session.snapshots.length - 1].t : 0;

      const doc: BattleReplayDocument = {
        battleId,
        replayVersion: BATTLE_REPLAY_SCHEMA_VERSION,
        canonicalScreenWidth: session.canonicalWidth,
        canonicalScreenHeight: session.canonicalHeight,
        totalDurationMs: lastT,
        snapshotCount: session.snapshots.length,
        snapshots: session.snapshots,
        createdAt: new Date(),
        attackerId: String(completedBattle.attackerId),
        defenderId: String(completedBattle.defenderId),
        isNpc: Boolean(completedBattle.defenderNpcSlug),
        winner,
        recordingEpochMs: session.epochMs,
      };

      await BattleReplay.replaceOne({ battleId }, doc, { upsert: true });
    } catch (err) {
      console.error(`[BattleReplayRecorder] finalize failed for ${battleId}:`, err);
    } finally {
      this.teardownSession(battleId);
    }
  }

  private teardownSession(battleId: string): void {
    const session = this.sessions.get(battleId);
    if (!session) return;

    if (session.activeInterval) {
      clearInterval(session.activeInterval);
      session.activeInterval = undefined;
    }

    for (const { event, handler } of session.listeners) {
      this.timerService.off(event, handler);
    }
    this.sessions.delete(battleId);
  }
}
