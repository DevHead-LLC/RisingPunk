/**
 * @file BattleSetupService.ts
 * @description Battle creation and initialization logic
 */

import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, IBattalion, INode, BotType } from '../types/battle';
import { createNodesWithTugOfWar } from '../services/NodeService';
import { BattalionService } from './BattalionService';
import { PointTrackingService } from './PointTrackingService';
import { BotService } from './BotService';
import { NPCService } from './NPCService';
import { Map as MapModel } from '../models/Map';
import { User } from '../models/User';
import { findCellByNpcInstanceId, getCell } from './CellAccessorService';
import mongoose from 'mongoose';
import { BattleInventorySettlementService } from './BattleInventorySettlementService';
import { syncAndResolveUserBotProgrammingBonuses } from '../utils/syncUserBotProgrammingBonuses';
import { getCrewArmyBonusTotalsForUser, mergeCrewArmyIntoArmyBonus } from '../utils/researchFeatureUtils';
import { parseInventoryKeyToFamilyAndMark } from '../utils/botInventoryKeys';
import { normalizeNpcBattalionMarkLevel } from '../utils/npcMarkMixConfig';

export class BattleSetupService {

  static async createBattle(
    attackerId: string,
    defenderId: string,
    screenWidth: number,
    screenHeight: number,
    userBattalions?: Array<{ type: string; quantity: number; markLevel?: number }>,
    defenderNpcSlug?: string,
    unlockHackRigOnWin?: boolean,
    defenderNpcInstanceId?: string,
    hackMapCellX?: number,
    hackMapCellY?: number,
    marchMeta?: { marchSourcedAttack: boolean; sourceMarchId: string }
  ): Promise<IBattleDocument> {
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get attacker level and army/guardian/phreak bonus (e.g. Packet Breach, RCH, Binary Bank Crack) for bot stat calculations.
    // Bugbot: guardian bonus is passed to BotService.getUserBotStats (userTotal loop) and to BattalionService.createUserBattalions below.
    let userLevel = 1;
    let attackerArmyBonus: { strength: number; defense: number; speed: number; health: number } | undefined;
    let attackerGuardianBonus: { strength: number; defense: number; speed: number; health: number } | undefined;
    let attackerPhreakBonus: { strength: number; defense: number; speed: number; health: number } | undefined;
    if (attackerId !== 'computer-opponent') {
      try {
        const resolved = await syncAndResolveUserBotProgrammingBonuses(attackerId);
        const crew = await getCrewArmyBonusTotalsForUser(attackerId);
        userLevel = resolved.userLevel;
        attackerArmyBonus = mergeCrewArmyIntoArmyBonus(resolved.armyBonusForStats, crew);
        attackerGuardianBonus = mergeCrewArmyIntoArmyBonus(resolved.guardianBonusForStats, crew);
        attackerPhreakBonus = mergeCrewArmyIntoArmyBonus(resolved.phreakBonusForStats, crew);
      } catch (error) {
        console.warn('Could not fetch user level, using default level 1:', error);
      }
    }
    
    if (!userBattalions || userBattalions.length === 0) {
      throw new Error('userBattalions is required and must contain at least one battalion');
    }
    
    const MAX_USER_BATTALIONS = 6;
    if (userBattalions.length > MAX_USER_BATTALIONS) {
      throw new Error(`Maximum ${MAX_USER_BATTALIONS} battalions allowed`);
    }
    
    // Check if defender is a user (not NPC)
    // A user defender is when we have a defenderId that's not 'computer-opponent' and doesn't look like an NPC ID
    const isUserDefender = defenderId !== 'computer-opponent' && 
                          !defenderId.startsWith('npc-') && 
                          !defenderId.startsWith('computer');
    
    
    // Validate defender exists and has inventory for user-vs-user battles
    if (isUserDefender) {
      // First check if defender user exists
      const defender = await User.findById(defenderId);
      if (!defender) {
        throw new Error(`Defender user ${defenderId} not found. Cannot create battle with non-existent user.`);
      }
      
      // User exists, validate inventory
      const inventoryValidation = await BattleInventorySettlementService.validateDefenderInventory(defenderId);
      if (!inventoryValidation.valid) {
        console.warn(`Defender ${defenderId} has no bots available for defense: ${inventoryValidation.error}`);
        // Don't throw error - allow battle to start but defender won't be able to deploy
      }
    }
    
    // Optionally load NPC for enemy side (only for NPC battles)
    let npc = !isUserDefender && defenderNpcSlug ? await NPCService.getNPCBySlug(defenderNpcSlug) : null;
    let actualDefenderNpcSlug = defenderNpcSlug;
    
    // If NPC lookup failed or no slug provided, select a random level 1 NPC
    // This handles cases like the first HackRig battle where NPC doesn't exist or isn't specified
    if (!isUserDefender && defenderId === 'computer-opponent' && !npc) {
      const level1NPCs = await NPCService.getNPCsByLevel(1);
      if (level1NPCs.length === 0) {
        throw new Error('No level 1 NPCs found in database. Cannot create battle without NPC configuration.');
      }
      // Select random level 1 NPC
      const randomIndex = Math.floor(Math.random() * level1NPCs.length);
      npc = level1NPCs[randomIndex];
      actualDefenderNpcSlug = npc.slug;
    }
    
    // Ensure we have an NPC for computer-opponent battles (no defaults allowed)
    if (!isUserDefender && defenderId === 'computer-opponent' && !npc) {
      throw new Error('Computer-opponent battle requires an NPC configuration. No NPC found or specified.');
    }

    /** Client should send this for map NPCs; if missing but hack map coords + slug match a cell, resolve from DB (aligns with map route npcInstanceId synthesis). */
    let effectiveDefenderNpcInstanceId = defenderNpcInstanceId;
    let defenderNpcInstanceIdVerifiedByCoords = false;
    if (
      !isUserDefender &&
      actualDefenderNpcSlug &&
      !effectiveDefenderNpcInstanceId &&
      typeof hackMapCellX === 'number' &&
      Number.isFinite(hackMapCellX) &&
      typeof hackMapCellY === 'number' &&
      Number.isFinite(hackMapCellY)
    ) {
      const mapDoc = await MapModel.findOne({ name: 'main' });
      if (mapDoc) {
        const cell = await getCell(mapDoc, hackMapCellX, hackMapCellY);
        if (
          cell &&
          cell.occupiedBy === 'npc' &&
          String((cell as any).npcSlug || '') === actualDefenderNpcSlug
        ) {
          const raw = (cell as any).npcInstanceId;
          effectiveDefenderNpcInstanceId =
            raw != null && String(raw).trim() !== ''
              ? String(raw)
              : `${actualDefenderNpcSlug}-${hackMapCellX}-${hackMapCellY}`;
          defenderNpcInstanceIdVerifiedByCoords = true;
        }
      }
    }

    // Validate that NPC instance exists on map if instance ID is provided (only for NPC battles)
    if (!isUserDefender && effectiveDefenderNpcInstanceId && actualDefenderNpcSlug && !defenderNpcInstanceIdVerifiedByCoords) {
      const mapDoc = await MapModel.findOne({ name: 'main' });
      if (!mapDoc) {
        throw new Error('Map not found');
      }
      const npcCell = await findCellByNpcInstanceId(mapDoc, effectiveDefenderNpcInstanceId, actualDefenderNpcSlug);
      if (!npcCell) {
        throw new Error(`NPC instance ${effectiveDefenderNpcInstanceId} not found on map`);
      }
    }
    
    // Calculate total army health using new BotService (attacker army bonus applied for breacher)
    let userTotal = 0;
    for (const battalion of userBattalions) {
      if (!battalion.quantity || battalion.quantity <= 0) {
        continue;
      }
      const botType = battalion.type as BotType;
      const markLevel =
        typeof battalion.markLevel === 'number' && battalion.markLevel >= 2 ? 2 : 1;
      const botConfig = await BotService.getUserBotStats(
        botType,
        userLevel,
        attackerArmyBonus,
        attackerGuardianBonus,
        attackerPhreakBonus,
        markLevel as 1 | 2
      );
      userTotal += botConfig.stats.health * battalion.quantity;
    }
    
    let enemyTotal = 0;
    if (isUserDefender) {
      // For user defenders, calculate total health based on their inventory and level
      // Defender existence already validated above - will throw error if not found
      const defender = await User.findById(defenderId);
      if (!defender) {
        // This should never happen due to validation above, but include for safety
        throw new Error(`Defender user ${defenderId} not found. Cannot calculate enemy total.`);
      }
      
      const defenderResolved = await syncAndResolveUserBotProgrammingBonuses(defenderId);
      const defenderCrew = await getCrewArmyBonusTotalsForUser(defenderId);
      const defenderLevel = defenderResolved.userLevel;
      const BotModel = mongoose.model('Bot');
      const defenderBots = await BotModel.findOne({ userId: defenderId });
      
      const defenderArmyBonus = mergeCrewArmyIntoArmyBonus(defenderResolved.armyBonusForStats, defenderCrew);
      const defenderGuardianBonus = mergeCrewArmyIntoArmyBonus(defenderResolved.guardianBonusForStats, defenderCrew);
      const defenderPhreakBonus = mergeCrewArmyIntoArmyBonus(defenderResolved.phreakBonusForStats, defenderCrew);
      if (defenderBots && defenderBots.bots) {
        for (const [invKey, quantity] of Object.entries(defenderBots.bots)) {
          if (typeof quantity !== 'number' || quantity <= 0) {
            continue;
          }
          const parsed = parseInventoryKeyToFamilyAndMark(invKey);
          if (!parsed) {
            continue;
          }
          const botConfig = await BotService.getUserBotStats(
            parsed.family,
            defenderLevel,
            defenderArmyBonus,
            defenderGuardianBonus,
            defenderPhreakBonus,
            parsed.markLevel
          );
          enemyTotal += botConfig.stats.health * quantity;
        }
      }
      // If no bots found, enemyTotal remains 0 - defender won't be able to deploy
    } else if (npc) {
      // Use NPC's userLevelAssociation for bot stat scaling instead of statMultipliers
      const npcLevel = npc.userLevelAssociation || 1;
      for (const battalion of npc.battalions) {
        const validatedType = BattalionService.validateEnemyBotType(battalion.type);
        const ml = normalizeNpcBattalionMarkLevel(battalion.markLevel);
        const botConfig = await BotService.getEnemyBotStats(validatedType, npcLevel, ml);
        enemyTotal += botConfig.stats.health * battalion.quantity;
      }
    } else {
      // This should never happen - we should have either a user defender, NPC, or have thrown an error
      throw new Error('Cannot create battle: No valid defender configuration found. Must have either a user defender, NPC, or computer-opponent with NPC.');
    }
    
    const totalArmyHealth = userTotal + enemyTotal;
    
    // Now create nodes with the correct total army health
    const nodes = createNodesWithTugOfWar(totalArmyHealth, screenWidth, screenHeight);
    
    const userBattalionsList = await BattalionService.createUserBattalions(nodes, userLevel, userBattalions, attackerArmyBonus, attackerGuardianBonus, attackerPhreakBonus);

    let enemyBattalions: IBattalion[];
    if (isUserDefender) {
      // For user defenders, don't create enemy battalions upfront - they'll be spawned in waves
      enemyBattalions = [];
    } else if (npc) {
      // Pass NPC level for proper bot stat scaling
      const npcLevel = npc.userLevelAssociation || 1;
      enemyBattalions = await BattalionService.createEnemyBattalionsFromNPC(nodes, npcLevel, {
        battalions: npc.battalions as any,
        statMultipliers: { health: 1, speed: 1, offense: 1, defense: 1, range: 1 }, // Legacy parameter, not used
      });
    } else {
      // This should never happen - we should have either a user defender or NPC
      throw new Error('Cannot create enemy battalions: No valid defender configuration found. Must have either a user defender or NPC.');
    }
    const battalions = [...userBattalionsList, ...enemyBattalions];
    
    // Store starting battalion states for loss tracking
    // For user defenders, only track attacker battalions initially since defender battalions spawn in waves
    const startingBattalions = battalions.map(battalion => ({
      ...battalion,
      id: battalion.id,
      quantity: battalion.quantity,
      currentHealth: battalion.currentHealth,
      isDestroyed: false
    }));

    const battle = new Battle({
      battleId,
      attackerId,
      defenderId,
      phase: BattlePhase.COUNTDOWN,
      countdown: 3,
      battleTime: 0,
      startingBattalions,
      battalions,
      nodes,
      winner: null,
      startTime: new Date(),
      endTime: null,
      screenWidth,
      screenHeight,
      ...(unlockHackRigOnWin ? { unlockHackRigOnWin: true } as any : {}),
      ...(actualDefenderNpcSlug ? { defenderNpcSlug: actualDefenderNpcSlug } as any : {}),
      ...(effectiveDefenderNpcInstanceId ? { defenderNpcInstanceId: effectiveDefenderNpcInstanceId } as any : {}),
      ...(isUserDefender ? { 
        isUserDefender: true,
        defenderDeployedTotals: {
          guardian: 0,
          breacher: 0,
          phreak: 0,
          guardianM2: 0,
          breacherM2: 0,
          phreakM2: 0,
        },
        defenderDeploymentExhausted: false,
        lastTickProcessed: 0
      } as any : {}),
      ...(typeof hackMapCellX === 'number' &&
      Number.isFinite(hackMapCellX) &&
      typeof hackMapCellY === 'number' &&
      Number.isFinite(hackMapCellY)
        ? { hackMapCellX, hackMapCellY }
        : {}),
      ...(marchMeta?.marchSourcedAttack === true && marchMeta.sourceMarchId
        ? {
            marchSourcedAttack: true,
            sourceMarchId: marchMeta.sourceMarchId,
          }
        : {}),
    });

    return await battle.save();
  }
} 