/**
 * @file BattleSetupService.ts
 * @description Battle creation and initialization logic
 */

import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, IBattalion, INode, BotType } from '../types/battle';
import { createNodesWithTugOfWar } from '../services/NodeService';
import { BattalionService } from './BattalionService';
import { PointTrackingService } from './PointTrackingService';
import { BOT_CONFIG } from './BotService';
import { NPCService } from './NPCService';

export class BattleSetupService {

  static async createBattle(attackerId: string, defenderId: string, screenWidth: number, screenHeight: number, userBattalions?: Array<{type: string, quantity: number}>, defenderNpcSlug?: string, unlockHackRigOnWin?: boolean, defenderNpcInstanceId?: string): Promise<IBattleDocument> {
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate total army health based on expected battalion configurations
    const defaultUserBattalions = [
      { type: BotType.GUARDIAN, quantity: 10 },
      { type: BotType.BREACHER, quantity: 8 },
      { type: BotType.PHREAK, quantity: 6 },
    ];
    const defaultEnemyBattalions = [
      { type: BotType.GUARDIAN, quantity: 12 },
      { type: BotType.BREACHER, quantity: 10 },
      { type: BotType.PHREAK, quantity: 8 },
    ];
    
    const battalionConfigs = userBattalions || defaultUserBattalions;
    
    // Optionally load NPC for enemy side
    const npc = defenderNpcSlug ? await NPCService.getNPCBySlug(defenderNpcSlug) : null;
    
    // Calculate total army health using bot stats authority
    const userTotal = battalionConfigs.reduce((total, battalion) => {
      const botType = battalion.type as BotType;
      const stats = BOT_CONFIG.USER_BOT_STATS[botType].stats;
      return total + (stats.health * battalion.quantity);
    }, 0);
    
    const enemyTotal = npc
      ? npc.battalions.reduce((total, battalion: any) => {
          const validatedType = BattalionService.validateEnemyBotType(battalion.type);
          const base = BOT_CONFIG.ENEMY_BOT_STATS[validatedType].stats;
          const scaledHealth = Math.max(1, Math.round(base.health * npc.statMultipliers.health));
          return total + (scaledHealth * battalion.quantity);
        }, 0)
      : defaultEnemyBattalions.reduce((total, battalion) => {
          const botType = battalion.type as BotType;
          const stats = BOT_CONFIG.ENEMY_BOT_STATS[botType].stats;
          return total + (stats.health * battalion.quantity);
        }, 0);
    
    const totalArmyHealth = userTotal + enemyTotal;
    
    // Now create nodes with the correct total army health
    const nodes = createNodesWithTugOfWar(totalArmyHealth, screenWidth, screenHeight);
    
    const userBattalionsList = BattalionService.createUserBattalions(nodes, userBattalions);

    let enemyBattalions: IBattalion[];
    if (npc) {
      enemyBattalions = BattalionService.createEnemyBattalionsFromNPC(nodes, {
        battalions: npc.battalions as any,
        statMultipliers: npc.statMultipliers as any,
      });
    } else {
      enemyBattalions = BattalionService.createEnemyBattalions(nodes);
    }
    const battalions = [...userBattalionsList, ...enemyBattalions];
    
    // Store starting battalion states for loss tracking
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
      ...(unlockHackRigOnWin ? { unlockHackRigOnWin: true } as any : {}),
      ...(defenderNpcSlug ? { defenderNpcSlug } as any : {}),
      ...(defenderNpcInstanceId ? { defenderNpcInstanceId } as any : {}),
    });

    return await battle.save();
  }
} 