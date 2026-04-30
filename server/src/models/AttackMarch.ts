import mongoose, { Document, Schema } from 'mongoose';
import type {
  AttackMarchArmySnapshot,
  AttackMarchBugHuntContract,
  AttackMarchType,
  AttackMarchState,
  ConsumedBattalionAssignmentRow,
} from '../types/attackMarch';

const consumedBattalionAssignmentSchema = new Schema(
  {
    battalionId: { type: String, required: true },
    botType: { type: String, required: true },
    quantity: { type: Number, required: true },
    markLevel: { type: Number, required: true },
  },
  { _id: false }
);

export interface IAttackMarchDocument extends Document, AttackMarchBugHuntContract {
  marchId: string;
  attackerId: string;
  defenderId: string;
  defenderNpcSlug?: string;
  defenderNpcInstanceId?: string;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  distanceDu: number;
  secondsPerDu: number;
  totalTravelSeconds: number;
  armySnapshot: AttackMarchArmySnapshot;
  /** Assignment rows consumed at launch (restored on outbound cancel). */
  consumedBattalionAssignments: ConsumedBattalionAssignmentRow[];
  /** FIFO + single `resolving` slot per defender (`npc:instanceId` / `pvp:userId`). */
  defenderQueueKey?: string;
  /** Set when entering `resolving` (stale watchdog + ops). */
  resolvingSince?: Date;
  /** Wall-clock when this march actually reached the target (`outbound` → `arrived`). Stuck-at-target recovery uses this, not `arriveAt` (scheduled time can be far in the past for late sweeps). */
  atTargetSince?: Date;
  state: AttackMarchState;
  departAt: Date;
  arriveAt: Date;
  resolvedAt?: Date;
  returnArriveAt?: Date;
  /** When set, return-leg animation starts here (hack map cell coords) instead of the original target tile. */
  returnLegStartX?: number;
  returnLegStartY?: number;
  /** True only for user-cancelled outbound marches; inventory refunds when return leg completes. */
  returningAfterCancel?: boolean;
  /** Diagnostic reason when a march is terminally cancelled by system or user-facing flows. */
  cancelReason?: string;
  battleId?: string;
  /** Set for Swarm marches to link settlement/report fan-out to the session. */
  swarmSessionId?: string;
  /** Solo (default) vs swarm launch. */
  attackType?: AttackMarchType;
  bugInstanceId?: string;
  hunterRosterId?: string;
  hunterVisualKey?: string;
  bugHuntItemDrops?: string[];
  bugHuntHunterXpGranted?: number;
  bugHuntEndReason?: 'bug-death' | 'hunter-death' | 'timeout' | 'canceled';
  bugHuntRemainingHpPercent?: number;
  bugHuntBattleDurationSeconds?: number;
  bugHuntTokenRefundedAt?: Date;
  hackMapCellX: number;
  hackMapCellY: number;
  createdAt: Date;
}

const attackMarchSchema = new Schema<IAttackMarchDocument>(
  {
    marchId: { type: String, required: true, unique: true },
    attackerId: { type: String, required: true },
    defenderId: { type: String, required: true },
    defenderNpcSlug: { type: String, required: false },
    defenderNpcInstanceId: { type: String, required: false },
    originX: { type: Number, required: true },
    originY: { type: Number, required: true },
    targetX: { type: Number, required: true },
    targetY: { type: Number, required: true },
    distanceDu: { type: Number, required: true },
    secondsPerDu: { type: Number, required: true },
    totalTravelSeconds: { type: Number, required: true },
    armySnapshot: { type: Schema.Types.Mixed, required: true },
    consumedBattalionAssignments: { type: [consumedBattalionAssignmentSchema], required: true },
    defenderQueueKey: { type: String, required: false },
    resolvingSince: { type: Date, required: false },
    atTargetSince: { type: Date, required: false },
    state: {
      type: String,
      enum: ['outbound', 'arrived', 'queued', 'resolving', 'returning', 'done', 'cancelled'],
      required: true,
    },
    departAt: { type: Date, required: true },
    arriveAt: { type: Date, required: true },
    resolvedAt: { type: Date, required: false },
    returnArriveAt: { type: Date, required: false },
    returnLegStartX: { type: Number, required: false },
    returnLegStartY: { type: Number, required: false },
    returningAfterCancel: { type: Boolean, required: false },
    cancelReason: { type: String, required: false },
    battleId: { type: String, required: false },
    swarmSessionId: { type: String, required: false },
    attackType: { type: String, required: false, enum: ['solo', 'swarm', 'bug_hunt'], default: 'solo' },
    bugInstanceId: { type: String, required: false },
    hunterRosterId: { type: String, required: false },
    hunterVisualKey: { type: String, required: false },
    bugHuntItemDrops: { type: [String], required: false },
    bugHuntHunterXpGranted: { type: Number, required: false, min: 0 },
    bugHuntEndReason: {
      type: String,
      required: false,
      enum: ['bug-death', 'hunter-death', 'timeout', 'canceled'],
    },
    bugHuntRemainingHpPercent: { type: Number, required: false, min: 0, max: 100 },
    bugHuntBattleDurationSeconds: { type: Number, required: false, min: 0 },
    bugHuntTokenRefundedAt: { type: Date, required: false },
    hackMapCellX: { type: Number, required: true },
    hackMapCellY: { type: Number, required: true },
    createdAt: { type: Date, required: true },
  },
  { collection: 'attack_marches' }
);

attackMarchSchema.index({ defenderId: 1, state: 1 });
attackMarchSchema.index({ attackerId: 1, state: 1 });
attackMarchSchema.index({ arriveAt: 1 });
attackMarchSchema.index({ state: 1, arriveAt: 1 });
attackMarchSchema.index({ state: 1, returnArriveAt: 1 });
attackMarchSchema.index({ defenderQueueKey: 1, state: 1 });
attackMarchSchema.index({ state: 1, resolvingSince: 1 });
attackMarchSchema.index({ state: 1, atTargetSince: 1 });
attackMarchSchema.index({ state: 1, createdAt: 1 });
attackMarchSchema.index({ swarmSessionId: 1 }, { sparse: true });
attackMarchSchema.index({ bugInstanceId: 1, state: 1 }, { sparse: true });

export const AttackMarch = mongoose.model<IAttackMarchDocument>('AttackMarch', attackMarchSchema);
