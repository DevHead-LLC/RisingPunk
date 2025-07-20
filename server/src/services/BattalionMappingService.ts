/**
 * @file BattalionMappingService.ts
 * @description Battalion data transformation from Mongoose format to client-friendly format
 */

import { IBattalion, ClientBattalion } from '../types/battle';

export class BattalionMappingService {
  /**
   * Transform Mongoose battalion objects to client-friendly format
   */
  static mapBattalionsForClient(battalions: IBattalion[]): ClientBattalion[] {
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
    }));
  }
} 