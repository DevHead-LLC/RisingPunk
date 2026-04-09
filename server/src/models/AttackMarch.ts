import mongoose, { Document, Schema } from 'mongoose';
import type {
  AttackMarchArmySnapshot,
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

export interface IAttackMarchDocument extends Document {
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
  battleId?: string;
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
    battleId: { type: String, required: false },
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
attackMarchSchema.index({ state: 1, createdAt: 1 });

export const AttackMarch = mongoose.model<IAttackMarchDocument>('AttackMarch', attackMarchSchema);
