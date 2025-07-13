import { Battle, IBattleDocument } from '../models/Battle';
import { BattleEvent } from '../models/BattleEvent';
import { BattleTimerService } from './BattleTimer';
import { BattleCalculator } from './BattleCalculator';
import { BattleMovement } from './BattleMovement';
import { BATTLE_CONFIG } from '../config/battleConfig';
import { BattlePhase, NodeOwner, EventType } from '../types/battle';

interface BattleUpdateState {
  battleId: string;
  lastUpdate: number;
  lastSync: number;
  updateInterval?: NodeJS.Timeout;
  syncInterval?: NodeJS.Timeout;
  isActive: boolean;
}

export class BattleUpdater {
  private static instance: BattleUpdater;
  private activeBattles: Map<string, BattleUpdateState> = new Map();
  private timerService: BattleTimerService;
  private calculator: BattleCalculator;
  private movementService: BattleMovement;

  private constructor() {
    this.timerService = BattleTimerService.getInstance();
    this.calculator = new BattleCalculator();
    this.movementService = new BattleMovement();
    this.setupTimerEvents();
  }

  public static getInstance(): BattleUpdater {
    if (!BattleUpdater.instance) {
      BattleUpdater.instance = new BattleUpdater();
    }
    return BattleUpdater.instance;
  }

  /**
   * Start updating a battle
   */
  public async startBattleUpdates(battleId: string): Promise<void> {
    if (this.activeBattles.has(battleId)) {
      console.warn(`Battle updates already active for ${battleId}`);
      return;
    }

    const updateState: BattleUpdateState = {
      battleId,
      lastUpdate: Date.now(),
      lastSync: Date.now(),
      isActive: true,
    };

    this.activeBattles.set(battleId, updateState);

    // Start timer service for this battle
    this.timerService.startTimer(battleId);

    // Start update loop (every 100ms)
    updateState.updateInterval = setInterval(async () => {
      await this.performBattleUpdate(battleId);
    }, BATTLE_CONFIG.UPDATE_INTERVAL);

    // Start sync loop (every 1s)
    updateState.syncInterval = setInterval(async () => {
      await this.syncBattleToDatabase(battleId);
    }, BATTLE_CONFIG.SYNC_INTERVAL);

    console.log(`Started battle updates for ${battleId}`);
  }

  /**
   * Stop updating a battle
   */
  public async stopBattleUpdates(battleId: string): Promise<void> {
    const updateState = this.activeBattles.get(battleId);
    if (!updateState) {
      return;
    }

    // Clear intervals
    if (updateState.updateInterval) {
      clearInterval(updateState.updateInterval);
    }
    if (updateState.syncInterval) {
      clearInterval(updateState.syncInterval);
    }

    updateState.isActive = false;
    this.activeBattles.delete(battleId);

    // Stop timer service
    this.timerService.stopTimer(battleId);

    console.log(`Stopped battle updates for ${battleId}`);
  }

  /**
   * Perform a single battle update (called every 100ms)
   */
  private async performBattleUpdate(battleId: string): Promise<void> {
    const updateState = this.activeBattles.get(battleId);
    if (!updateState?.isActive) {
      return;
    }

    try {
      // Get current battle state
      const battle = await Battle.findByBattleId(battleId);
      if (!battle) {
        console.error(`Battle ${battleId} not found for update`);
        await this.stopBattleUpdates(battleId);
        return;
      }

      // Check if battle should end
      if (battle.phase === BattlePhase.COMPLETE) {
        await this.stopBattleUpdates(battleId);
        return;
      }

      // Update battle state based on current phase
      if (battle.phase === BattlePhase.ACTIVE) {
        await this.updateActiveBattle(battle);
      }

      // Check victory conditions
      await this.checkVictoryConditions(battle);

      updateState.lastUpdate = Date.now();

    } catch (error) {
      console.error(`Error updating battle ${battleId}:`, error);
    }
  }

  /**
   * Update an active battle (combat, movement, etc.)
   */
  private async updateActiveBattle(battle: IBattleDocument): Promise<void> {
    // Execute movement phase (targeting and retargeting)
    await this.executeMovementPhase(battle);

    // Update battalion positions along their paths
    await this.updateBattalionPositions(battle);

    // Retarget battalions if needed
    await this.retargetBattalions(battle);

    // Perform combat calculations
    await this.performCombatCalculations(battle);

    // Update node capture progress
    await this.updateNodeCaptureProgress(battle);

    // Save battle state
    await battle.save();
  }

  /**
   * Execute movement phase for all battalions
   */
  private async executeMovementPhase(battle: IBattleDocument): Promise<void> {
    for (const battalion of battle.battalions) {
      if (battalion.currentHealth <= 0) continue;

      // Find closest target for this battalion
      const target = this.movementService.findClosestTarget(
        battalion,
        battle.nodes,
        battle.battalions
      );

      if (target) {
        // Update battalion target
        battalion.targetNode = target.targetType === 'node' ? target.targetId as number : undefined;
        battalion.finalTarget = target.targetId as number;
      }
    }
  }

  /**
   * Update battalion positions along their movement paths
   */
  private async updateBattalionPositions(battle: IBattleDocument): Promise<void> {
    for (const battalion of battle.battalions) {
      if (battalion.currentHealth <= 0) continue;

      // If battalion has a movement path, move along it
      if (battalion.remainingPath && battalion.remainingPath.length > 0) {
        const result = this.movementService.moveAlongPath(
          battalion,
          battalion.remainingPath,
          battle.nodes
        );

        // Update battalion with new position
        Object.assign(battalion, result.battalion);

        // Log movement event if position changed
        if (result.battalion.position.nodeIndex !== battalion.position.nodeIndex) {
          await this.logBattleEvent(battle.battleId, EventType.BATTALION_MOVE, {
            battalionId: battalion.id,
            fromNode: battalion.position.nodeIndex,
            toNode: result.battalion.position.nodeIndex,
            path: battalion.remainingPath,
          });
        }
      }
    }
  }

  /**
   * Retarget battalions when their targets are captured/destroyed
   */
  private async retargetBattalions(battle: IBattleDocument): Promise<void> {
    for (const battalion of battle.battalions) {
      if (battalion.currentHealth <= 0) continue;

      // Check if current target is still valid
      const needsRetargeting = this.movementService.checkRetargetingNeeded(
        battalion,
        battle.nodes,
        battle.battalions
      );

      if (needsRetargeting) {
        // Find new target
        const newTarget = this.movementService.findClosestTarget(
          battalion,
          battle.nodes,
          battle.battalions
        );

        if (newTarget) {
          // Update battalion target and path
          battalion.targetNode = newTarget.targetType === 'node' ? newTarget.targetId as number : undefined;
          battalion.finalTarget = newTarget.targetId as number;
          battalion.remainingPath = newTarget.path;

          // Log retargeting event
          await this.logBattleEvent(battle.battleId, EventType.BATTALION_MOVE, {
            battalionId: battalion.id,
            newTargetType: newTarget.targetType,
            newTargetId: newTarget.targetId,
            path: newTarget.path,
          });
        }
      }
    }
  }

  /**
   * Perform combat calculations using BattleCalculator
   */
  private async performCombatCalculations(battle: IBattleDocument): Promise<void> {
    // Process battalion vs battalion combat
    for (let i = 0; i < battle.battalions.length; i++) {
      const attacker = battle.battalions[i];
      if (attacker.currentHealth <= 0) continue;

      // Find targets for this battalion
      const targets = this.findTargetsForBattalion(attacker, battle.battalions, battle.nodes);
      
      for (const target of targets) {
        if (target.type === 'battalion') {
          // Battalion vs battalion combat
          const damage = this.calculator.calculateDamage(attacker, target.battalion);
          const result = this.calculator.applyDamage(target.battalion, damage);
          
          // Update target battalion
          Object.assign(target.battalion, result.battalion);

          // Log combat event
          await this.logBattleEvent(battle.battleId, EventType.BATTALION_ATTACK, {
            attackerId: attacker.id,
            targetId: target.battalion.id,
            damage: damage,
            unitsLost: target.battalion.quantity - result.battalion.quantity,
          });

        } else if (target.type === 'node') {
          // Battalion vs node combat (tug-of-war)
          // Create a single battalion array for the attacker
          const attackingBattalions = [attacker];
          const defendingBattalions: any[] = []; // No defenders for neutral nodes
          const isUserAttacking = attacker.owner === NodeOwner.USER;
          
          const newProgress = this.calculator.calculateNodeCapture(
            attackingBattalions,
            defendingBattalions,
            target.node,
            isUserAttacking
          );
          
          // Update node capture progress
          target.node.captureProgress = newProgress;

          // Check if node is captured
          const captureResult = this.calculator.checkNodeCapture(target.node);
          if (captureResult.captured) {
            target.node.owner = captureResult.newOwner === 'user' ? NodeOwner.USER : NodeOwner.ENEMY;
            
            await this.logBattleEvent(battle.battleId, EventType.NODE_CAPTURED, {
              nodeIndex: target.node.index,
              newOwner: target.node.owner,
              finalProgress: target.node.captureProgress,
            });
          }

          await this.logBattleEvent(battle.battleId, EventType.BATTALION_ATTACK, {
            attackerId: attacker.id,
            targetNodeIndex: target.node.index,
            progressChange: newProgress - target.node.captureProgress,
          });
        }
      }
    }

    // Remove destroyed battalions
    battle.battalions = battle.battalions.filter(battalion => battalion.currentHealth > 0);
  }

  /**
   * Find targets for a battalion
   */
  private findTargetsForBattalion(
    battalion: any,
    allBattalions: any[],
    nodes: any[]
  ): Array<{ type: 'battalion'; battalion: any } | { type: 'node'; node: any }> {
    const targets: Array<{ type: 'battalion'; battalion: any } | { type: 'node'; node: any }> = [];

    // Find enemy battalions in range
    const enemyBattalions = allBattalions.filter(b => 
      b.owner !== battalion.owner && b.currentHealth > 0
    );

    // Find neutral nodes
    const neutralNodes = nodes.filter(n => n.owner === NodeOwner.NEUTRAL);

    // Add closest targets (simplified targeting for now)
    // TODO: Implement proper targeting logic in Phase 6
    if (enemyBattalions.length > 0) {
      targets.push({ type: 'battalion', battalion: enemyBattalions[0] });
    }
    if (neutralNodes.length > 0) {
      targets.push({ type: 'node', node: neutralNodes[0] });
    }

    return targets;
  }

  /**
   * Update node capture progress (tug-of-war system)
   */
  private async updateNodeCaptureProgress(battle: IBattleDocument): Promise<void> {
    // This is handled in performCombatCalculations
    // Placeholder for any additional node-specific updates
  }

  /**
   * Check victory conditions
   */
  private async checkVictoryConditions(battle: IBattleDocument): Promise<void> {
    // Check for complete elimination
    const userBattalions = battle.battalions.filter(b => b.owner === NodeOwner.USER && b.currentHealth > 0);
    const enemyBattalions = battle.battalions.filter(b => b.owner === NodeOwner.ENEMY && b.currentHealth > 0);

    let winner: NodeOwner | null = null;

    if (userBattalions.length === 0) {
      winner = NodeOwner.ENEMY;
    } else if (enemyBattalions.length === 0) {
      winner = NodeOwner.USER;
    }

    // Check timer-based victory (handled by timer service)
    const timeRemaining = this.timerService.getTimeRemaining(battle.battleId);
    if (timeRemaining && timeRemaining.battleTime >= BATTLE_CONFIG.BATTLE_DURATION) {
      // Time limit reached - determine winner by losses
      const userLosses = this.calculateTotalLosses(battle.battalions.filter(b => b.owner === NodeOwner.USER));
      const enemyLosses = this.calculateTotalLosses(battle.battalions.filter(b => b.owner === NodeOwner.ENEMY));
      
      if (userLosses < enemyLosses) {
        winner = NodeOwner.USER;
      } else {
        winner = NodeOwner.ENEMY; // Enemy wins on tie (defender advantage)
      }
    }

    if (winner) {
      await this.endBattle(battle, winner);
    }
  }

  /**
   * Calculate total losses for a side
   */
  private calculateTotalLosses(battalions: any[]): number {
    return battalions.reduce((total, battalion) => {
      const maxQuantity = battalion.maxHealth / battalion.stats.health;
      return total + (maxQuantity - battalion.quantity);
    }, 0);
  }

  /**
   * End a battle
   */
  private async endBattle(battle: IBattleDocument, winner: NodeOwner): Promise<void> {
    battle.phase = BattlePhase.COMPLETE;
    battle.winner = winner;
    battle.endTime = new Date();

    await battle.save();

    await this.logBattleEvent(battle.battleId, EventType.BATTLE_END, {
      winner,
      finalBattleTime: battle.battleTime,
    });

    // Stop updates for this battle
    await this.stopBattleUpdates(battle.battleId);

    console.log(`Battle ${battle.battleId} ended. Winner: ${winner}`);
  }

  /**
   * Sync battle state to database (called every 1s)
   */
  private async syncBattleToDatabase(battleId: string): Promise<void> {
    const updateState = this.activeBattles.get(battleId);
    if (!updateState?.isActive) {
      return;
    }

    try {
      const battle = await Battle.findByBattleId(battleId);
      if (battle) {
        await battle.save();
        updateState.lastSync = Date.now();
      }
    } catch (error) {
      console.error(`Error syncing battle ${battleId} to database:`, error);
    }
  }

  /**
   * Log a battle event
   */
  private async logBattleEvent(battleId: string, eventType: EventType, data: Record<string, any>): Promise<void> {
    try {
      const event = new BattleEvent({
        battleId,
        eventType,
        timestamp: new Date(),
        data,
      });
      await event.save();
    } catch (error) {
      console.error(`Error logging battle event:`, error);
    }
  }

  /**
   * Setup timer service events
   */
  private setupTimerEvents(): void {
    this.timerService.on('phaseChange', async (data) => {
      try {
        const battle = await Battle.findByBattleId(data.battleId);
        if (battle) {
          battle.phase = data.phase;
          battle.countdown = data.countdown;
          await battle.save();

          await this.logBattleEvent(data.battleId, EventType.PHASE_CHANGE, {
            newPhase: data.phase,
            countdown: data.countdown,
          });
        }
      } catch (error) {
        console.error(`Error handling phase change for battle ${data.battleId}:`, error);
      }
    });

    this.timerService.on('battleEnd', async (data) => {
      console.log(`Battle ${data.battleId} ended by timer`);
    });
  }

  /**
   * Get active battle IDs
   */
  public getActiveBattleIds(): string[] {
    return Array.from(this.activeBattles.keys());
  }

  /**
   * Get update statistics
   */
  public getUpdateStats(): { activeBattles: number; lastUpdate: number } {
    return {
      activeBattles: this.activeBattles.size,
      lastUpdate: Date.now(),
    };
  }
} 