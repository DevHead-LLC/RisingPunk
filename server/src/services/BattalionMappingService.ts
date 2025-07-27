/**
 * @file BattalionMappingService.ts
 * @description Battalion data transformation from Mongoose format to client-friendly format
 * 
 * AUTHORITY: Battalion data transformation for client display
 * OVERLAPS: Uses battalion.position.nodeIndex - CRITICAL for retargeting position updates
 * CONFLICTS: Position updates in retargeting MUST be reflected here for client sync
 * DEPENDENCIES: MovementState for position data, BattalionService position updates
 * 
 * PHASE 1 EXTENSION: Added mapping for new battalion combat properties
 */

import { IBattalion, ClientBattalion } from '../types/battle';
import { MovementState } from '../types/battle';
import { NodeOwner } from '../types/battle';

export class BattalionMappingService {
  // Track last logging time and destroyed battalions to prevent spam
  private static lastLogTime: number = 0;
  private static lastDestroyedBattalions: string = '';
  private static readonly LOG_INTERVAL = 10000; // Only log every 10 seconds after battle end

  /**
   * Transform Mongoose battalion objects to client-friendly format
   * PHASE 1: Now includes battalion combat properties for client display
   * PHASE 5: Now filters out destroyed battalions for client-side visibility management
   * FIXED: Added logging frequency control to prevent spam after battle end
   */
  static mapBattalionsForClient(battalions: IBattalion[], movementStates?: Map<string, MovementState>): ClientBattalion[] {
    // Filter out destroyed battalions for client display
    const aliveBattalions = battalions.filter(battalion => !battalion.isDestroyed);
    const destroyedBattalions = battalions.filter(battalion => battalion.isDestroyed);
    
    // Create a hash of destroyed battalions to detect changes
    const destroyedHash = destroyedBattalions.map(b => `${b.id}-${b.position.nodeIndex}`).sort().join('|');
    
    // Check if we should log (only if enough time passed AND destroyed battalions changed)
    const now = Date.now();
    const shouldLog = (now - this.lastLogTime >= this.LOG_INTERVAL) && (destroyedHash !== this.lastDestroyedBattalions);
    
    if (shouldLog) {
      console.log(`📊 BATTALION MAPPING: Filtering ${battalions.length} total battalions → ${aliveBattalions.length} alive battalions for client`);
      
      if (destroyedBattalions.length > 0) {
        console.log(`💀 DESTROYED BATTALIONS: ${destroyedBattalions.length} battalions filtered from client view:`);
        destroyedBattalions.forEach(battalion => {
          console.log(`💀   - ${battalion.owner} ${battalion.type} (${battalion.id}) destroyed at node ${battalion.position.nodeIndex}`);
        });
      }
      
      // Update tracking
      this.lastLogTime = now;
      this.lastDestroyedBattalions = destroyedHash;
    }

    // Transform alive battalions to client format
    return aliveBattalions.map(battalion => {
      const movementState = movementStates?.get(battalion.id);
      
      return {
        id: battalion.id,
        type: battalion.type,
        quantity: battalion.quantity,
        currentHealth: battalion.currentHealth,
        maxHealth: battalion.maxHealth,
        baseHealthPerUnit: battalion.baseHealthPerUnit,
        isDestroyed: battalion.isDestroyed,
        destroyedAt: battalion.destroyedAt,
        nodeIndex: battalion.position.nodeIndex,
        isUser: battalion.owner === NodeOwner.USER,
        mark: battalion.mark,
        stats: battalion.stats,
        movementState: movementState || undefined
      };
    });
  }
} 