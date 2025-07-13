import { Battle } from '../models/Battle';
import { BattleEvent } from '../models/BattleEvent';
import { BotType, IBattalion, INode } from '../types/battle';

export class BattleCalculator {
  /**
   * Calculate damage between two battalions
   * Formula: Attack Power = (Bot Type Strength + bonuses) × Quantity
   * Defense % = Bot Type Defense + bonuses
   * Damage = Attack Power / (Defense % × 100)
   */
  calculateDamage(attacker: IBattalion, defender: IBattalion): number {
    const startTime = Date.now();
    
    // Attack Power = (Bot Type Strength + bonuses) × Quantity
    const attackPower = (attacker.stats.offense + this.getAttackBonuses(attacker)) * attacker.quantity;
    
    // Defense % = Bot Type Defense + bonuses
    const defensePercentage = defender.stats.defense + this.getDefenseBonuses(defender);
    
    // Damage = Attack Power / (Defense % × 100)
    const damage = attackPower / (defensePercentage * 100);
    
    const calculationTime = Date.now() - startTime;
    if (calculationTime > 1) { // Log if calculation takes more than 1ms
      console.log(`Damage calculation took ${calculationTime}ms for ${attacker.id} vs ${defender.id}`);
    }
    
    return Math.max(0, Math.floor(damage));
  }
  
  /**
   * Apply damage to a battalion and return updated battalion
   */
  applyDamage(battalion: IBattalion, damage: number): { battalion: IBattalion; destroyed: boolean } {
    const updatedBattalion = { ...battalion };
    
    // Reduce health
    updatedBattalion.currentHealth = Math.max(0, battalion.currentHealth - damage);
    
    // Calculate how many units are lost
    const healthPerUnit = battalion.stats.health;
    const unitsLost = Math.floor(damage / healthPerUnit);
    const remainingUnits = Math.max(0, battalion.quantity - unitsLost);
    
    updatedBattalion.quantity = remainingUnits;
    
    // Recalculate health based on remaining units
    if (remainingUnits > 0) {
      updatedBattalion.currentHealth = Math.min(
        updatedBattalion.currentHealth,
        remainingUnits * healthPerUnit
      );
    } else {
      updatedBattalion.currentHealth = 0;
    }
    
    const destroyed = remainingUnits === 0;
    
    return { battalion: updatedBattalion, destroyed };
  }
  
  /**
   * Check if a battalion is destroyed
   */
  checkDestruction(battalion: IBattalion): boolean {
    return battalion.quantity <= 0 || battalion.currentHealth <= 0;
  }
  
  /**
   * Calculate node capture progress using tug-of-war system
   * Progress ranges from -100% (enemy control) to +100% (user control)
   * Once captured, nodes cannot be recaptured
   */
  calculateNodeCapture(
    attackingBattalions: IBattalion[], 
    defendingBattalions: IBattalion[], 
    node: INode,
    isUserAttacking: boolean
  ): number {
    // If node is already captured, no further progress
    if (node.captureProgress <= -100 || node.captureProgress >= 100) {
      return node.captureProgress;
    }
    
    const totalAttackPower = attackingBattalions.reduce((sum, battalion) => {
      return sum + (battalion.stats.offense * battalion.quantity);
    }, 0);
    
    const totalDefensePower = defendingBattalions.reduce((sum, battalion) => {
      return sum + (battalion.stats.defense * battalion.quantity);
    }, 0);
    
    // Calculate progress change based on damage/health ratio
    let progressChange = 0;
    
    if (totalDefensePower === 0) {
      // No defenders - steady progress toward attacker
      progressChange = isUserAttacking ? 5 : -5;
    } else {
      // Calculate based on attack vs defense ratio
      const ratio = totalAttackPower / totalDefensePower;
      progressChange = Math.floor(ratio * 3); // Max 3% per calculation
      
      if (!isUserAttacking) {
        progressChange = -progressChange; // Negative for enemy attacks
      }
    }
    
    // Apply progress change
    const newProgress = node.captureProgress + progressChange;
    
    // Clamp to -100 to +100 range
    return Math.max(-100, Math.min(100, newProgress));
  }
  
  /**
   * Check if a node has been captured and update ownership
   */
  checkNodeCapture(node: INode): { captured: boolean; newOwner?: 'user' | 'enemy' } {
    if (node.captureProgress >= 100) {
      return { captured: true, newOwner: 'user' };
    } else if (node.captureProgress <= -100) {
      return { captured: true, newOwner: 'enemy' };
    }
    
    return { captured: false };
  }
  
  /**
   * Check victory conditions based on intentions document
   * - Battle ends after 20 seconds OR when one side is completely eliminated
   * - Side with fewer losses wins
   * - If tied, enemy wins (defender advantage)
   */
  checkVictoryConditions(battalions: IBattalion[], nodes: INode[], battleTime: number): 'attacker' | 'defender' | 'draw' | null {
    const userBattalions = battalions.filter(b => b.owner === 'user');
    const enemyBattalions = battalions.filter(b => b.owner === 'enemy');
    
    // Check for complete elimination
    const userDestroyed = userBattalions.every(b => this.checkDestruction(b));
    const enemyDestroyed = enemyBattalions.every(b => this.checkDestruction(b));
    
    if (userDestroyed && !enemyDestroyed) {
      return 'defender';
    }
    if (enemyDestroyed && !userDestroyed) {
      return 'attacker';
    }
    if (userDestroyed && enemyDestroyed) {
      return 'draw';
    }
    
    // Check 20-second time limit
    if (battleTime >= 20) {
      // Calculate losses for each side
      const userLosses = this.calculateTotalLosses(userBattalions);
      const enemyLosses = this.calculateTotalLosses(enemyBattalions);
      
      if (userLosses < enemyLosses) {
        return 'attacker';
      } else if (enemyLosses < userLosses) {
        return 'defender';
      } else {
        // Tie - enemy wins (defender advantage)
        return 'defender';
      }
    }
    
    return null; // No victory condition met
  }
  
  /**
   * Calculate total losses for a side based on bot mark values
   */
  private calculateTotalLosses(battalions: IBattalion[]): number {
    return battalions.reduce((total, battalion) => {
      // Calculate lost units (assuming initial quantity was higher)
      // For now, use current quantity as a proxy for losses
      // In a real implementation, we'd track initial vs current quantities
      return total + (battalion.mark * battalion.quantity);
    }, 0);
  }
  
  /**
   * Calculate total army strength for a side
   */
  calculateArmyStrength(battalions: IBattalion[]): number {
    return battalions.reduce((sum, battalion) => {
      return sum + (battalion.stats.health * battalion.quantity);
    }, 0);
  }
  
  /**
   * Get attack bonuses (for future use)
   */
  private getAttackBonuses(battalion: IBattalion): number {
    // TODO: Implement attack bonuses based on terrain, upgrades, etc.
    return 0;
  }
  
  /**
   * Get defense bonuses (for future use)
   */
  private getDefenseBonuses(battalion: IBattalion): number {
    // TODO: Implement defense bonuses based on terrain, upgrades, etc.
    return 0;
  }
  
  /**
   * Log battle event
   */
  async logBattleEvent(battleId: string, eventType: string, data: any): Promise<void> {
    await new BattleEvent({
      battleId,
      timestamp: new Date(),
      eventType,
      data,
    }).save();
  }
} 