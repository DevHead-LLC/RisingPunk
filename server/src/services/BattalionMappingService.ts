/**
 * @file BattalionMappingService.ts
 * @description Battalion data transformation from Mongoose format to client-friendly format
 * 
 * AUTHORITY: Battalion data transformation for client display
 * OVERLAPS: Uses battalion.position.nodeIndex - CRITICAL for retargeting position updates
 * CONFLICTS: Position updates in retargeting MUST be reflected here for client sync
 * DEPENDENCIES: MovementState for position data, BattalionService position updates
 */

import { IBattalion, ClientBattalion } from '../types/battle';
import { MovementState } from '../types/battle';

export class BattalionMappingService {
  /**
   * Transform Mongoose battalion objects to client-friendly format
   */
  static mapBattalionsForClient(battalions: IBattalion[], movementStates?: Map<string, MovementState>): ClientBattalion[] {
    return battalions.map(battalion => ({
      id: battalion.id,
      type: battalion.type,
      quantity: battalion.quantity,
      currentHealth: battalion.currentHealth,
      maxHealth: battalion.maxHealth,
      nodeIndex: battalion.position.nodeIndex, // Extract from nested position
      isUser: battalion.owner === 'user', // Convert string enum to boolean
      mark: battalion.mark,
      stats: battalion.stats,
      movementState: movementStates?.get(battalion.id) // Add movement state to battalion data
    }));
  }
} 