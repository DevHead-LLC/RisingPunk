import mongoose from 'mongoose';
import { User } from '../models/User';
import { Map as MapModel } from '../models/Map';
import { NPCService } from './NPCService';
import { ShieldService } from './ShieldService';
import { findCellByNpcInstanceId, getCell } from './CellAccessorService';

export interface ResolvedMarchLaunchTarget {
  /** Stored on `AttackMarch.defenderId` — PvP: defender user id; NPC: `'npc'`. */
  attackMarchDefenderId: string;
  defenderNpcSlug?: string;
  defenderNpcInstanceId?: string;
  hackMapCellX: number;
  hackMapCellY: number;
}

export class MarchTargetValidationError extends Error {
  constructor(
    public readonly statusCode: 400 | 403 | 404,
    message: string
  ) {
    super(message);
    this.name = 'MarchTargetValidationError';
  }
}

/**
 * Validates hack target for async march launch (PvP + NPC), aligned with `BattleSetupService` NPC/cell rules.
 */
export async function resolveMarchLaunchTarget(params: {
  attackerId: string;
  defenderIdRaw?: string;
  defenderNpcSlug?: string;
  defenderNpcInstanceId?: string;
  hackMapCellX: number;
  hackMapCellY: number;
}): Promise<ResolvedMarchLaunchTarget> {
  const { attackerId, defenderNpcSlug, defenderNpcInstanceId, hackMapCellX, hackMapCellY } = params;
  const raw = (params.defenderIdRaw ?? 'computer').trim();
  const internalDefender =
    raw === 'computer' || raw === 'computer-opponent' ? 'computer-opponent' : raw;

  const isUserDefender =
    internalDefender !== 'computer-opponent' &&
    !internalDefender.startsWith('npc-') &&
    !internalDefender.startsWith('computer');

  if (isUserDefender) {
    if (!mongoose.Types.ObjectId.isValid(internalDefender)) {
      throw new MarchTargetValidationError(400, 'Invalid defender user id');
    }
    if (String(internalDefender) === String(attackerId)) {
      throw new MarchTargetValidationError(400, 'Cannot attack yourself');
    }
    const defender = await User.findById(internalDefender);
    if (!defender) {
      throw new MarchTargetValidationError(404, 'Defender user not found');
    }
    const shielded = await ShieldService.checkAndUpdateShieldStatus(defender);
    if (shielded) {
      throw new MarchTargetValidationError(403, 'Target is shielded');
    }
    return {
      attackMarchDefenderId: String(internalDefender),
      hackMapCellX,
      hackMapCellY,
    };
  }

  let actualDefenderNpcSlug = defenderNpcSlug;
  let npc = actualDefenderNpcSlug ? await NPCService.getNPCBySlug(actualDefenderNpcSlug) : null;

  if (internalDefender === 'computer-opponent' && !npc) {
    const level1NPCs = await NPCService.getNPCsByLevel(1);
    if (level1NPCs.length === 0) {
      throw new MarchTargetValidationError(404, 'No level 1 NPCs found in database');
    }
    const randomIndex = Math.floor(Math.random() * level1NPCs.length);
    npc = level1NPCs[randomIndex];
    actualDefenderNpcSlug = npc.slug;
  }

  if (internalDefender === 'computer-opponent' && !npc) {
    throw new MarchTargetValidationError(400, 'Computer-opponent march requires an NPC configuration');
  }

  let effectiveDefenderNpcInstanceId = defenderNpcInstanceId;
  let verifiedByCoords = false;
  if (
    actualDefenderNpcSlug &&
    !effectiveDefenderNpcInstanceId &&
    Number.isFinite(hackMapCellX) &&
    Number.isFinite(hackMapCellY)
  ) {
    const mapDoc = await MapModel.findOne({ name: 'main' });
    if (mapDoc) {
      const cell = await getCell(mapDoc, hackMapCellX, hackMapCellY);
      if (
        cell &&
        cell.occupiedBy === 'npc' &&
        String((cell as { npcSlug?: string }).npcSlug || '') === actualDefenderNpcSlug
      ) {
        const rawId = (cell as { npcInstanceId?: unknown }).npcInstanceId;
        effectiveDefenderNpcInstanceId =
          rawId != null && String(rawId).trim() !== ''
            ? String(rawId)
            : `${actualDefenderNpcSlug}-${hackMapCellX}-${hackMapCellY}`;
        verifiedByCoords = true;
      }
    }
  }

  if (effectiveDefenderNpcInstanceId && actualDefenderNpcSlug && !verifiedByCoords) {
    const mapDoc = await MapModel.findOne({ name: 'main' });
    if (!mapDoc) {
      throw new MarchTargetValidationError(404, 'Map not found');
    }
    const npcCell = await findCellByNpcInstanceId(
      mapDoc,
      effectiveDefenderNpcInstanceId,
      actualDefenderNpcSlug
    );
    if (!npcCell) {
      throw new MarchTargetValidationError(404, `NPC instance ${effectiveDefenderNpcInstanceId} not found on map`);
    }
  }

  return {
    attackMarchDefenderId: 'npc',
    defenderNpcSlug: actualDefenderNpcSlug,
    defenderNpcInstanceId: effectiveDefenderNpcInstanceId,
    hackMapCellX,
    hackMapCellY,
  };
}
