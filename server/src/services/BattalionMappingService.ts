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

export class BattalionMappingService {
  /**
   * Transform Mongoose battalion objects to client-friendly format
   * PHASE 1: Now includes battalion combat properties for client display
   * PHASE 5: Now filters out destroyed battalions for client-side visibility management
   */
  static mapBattalionsForClient(battalions: IBattalion[], movementStates?: Map<string, MovementState>): ClientBattalion[] {
    // PHASE 5: Filter out destroyed battalions before mapping - they should not be visible to client
    // This ensures destroyed battalions disappear from the battlefield immediately
    // and cannot be interacted with in any way on the client side
    
    // TRANSITION FIX: Handle battalions that should be destroyed but might not have isDestroyed flag set
    // This handles the case where existing battles were saved before the schema was updated
    const aliveBattalions = battalions.filter(battalion => {
      // Primary check: explicit isDestroyed flag
      if (battalion.isDestroyed === true) {
        return false; // Filter out explicitly destroyed battalions
      }
      
      // TRANSITION CHECK: Battalions with 0 health or 0 units should be considered destroyed
      // This handles legacy battles where isDestroyed might not be set correctly
      if (battalion.currentHealth <= 0 || battalion.quantity <= 0) {
        console.log(`🔧 TRANSITION FIX: Treating ${battalion.owner} ${battalion.type} as destroyed (health: ${battalion.currentHealth}, units: ${battalion.quantity})`);
        return false; // Filter out battalions with no health or units
      }
      
      return true; // Keep alive battalions
    });
    
    console.log(`📊 BATTALION MAPPING: Filtering ${battalions.length} total battalions → ${aliveBattalions.length} alive battalions for client`);
    
    // DEBUGGING: Log each battalion's destruction status for troubleshooting
    battalions.forEach(battalion => {
      console.log(`🔍 BATTALION STATUS: ${battalion.owner} ${battalion.type} (${battalion.id}) - destroyed: ${battalion.isDestroyed}, health: ${battalion.currentHealth}, units: ${battalion.quantity}`);
    });
    
    // If any battalions were filtered out, log the destruction details for tracking
    const destroyedCount = battalions.length - aliveBattalions.length;
    if (destroyedCount > 0) {
      const destroyedBattalions = battalions.filter(battalion => battalion.isDestroyed);
      console.log(`💀 DESTROYED BATTALIONS: ${destroyedCount} battalions filtered from client view:`);
      destroyedBattalions.forEach(battalion => {
        console.log(`💀   - ${battalion.owner} ${battalion.type} (${battalion.id}) destroyed at node ${battalion.position.nodeIndex}`);
      });
    }
    
    return aliveBattalions.map(battalion => ({
      id: battalion.id,
      type: battalion.type,
      quantity: battalion.quantity,                    // PHASE 1: Updates dynamically with health damage
      currentHealth: battalion.currentHealth,          // PHASE 1: Current health total (decreases with damage)
      maxHealth: battalion.maxHealth,                  // Maximum health when at full strength
      
      // PHASE 1 PROPERTIES for battalion combat (kept for debugging/future use):
      baseHealthPerUnit: battalion.baseHealthPerUnit,  // Original health per unit for calculations
      isDestroyed: battalion.isDestroyed,              // Should always be false here due to filtering
      destroyedAt: battalion.destroyedAt,              // Should always be undefined here
      
      nodeIndex: battalion.position.nodeIndex, // Extract from nested position
      isUser: battalion.owner === 'user', // Convert string enum to boolean
      mark: battalion.mark,
      stats: battalion.stats,
      movementState: movementStates?.get(battalion.id) // Add movement state to battalion data
    }));
  }
} 