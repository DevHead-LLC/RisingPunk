import { IBattalion, ClientBattalion } from '../types/battle';
import { MovementState, NodeOwner } from '../types/battle';

export class BattalionMappingService {
  private static battalionCache = new Map<string, ClientBattalion>();

  static mapBattalionsForClient(battalions: IBattalion[], movementStates?: Map<string, MovementState>): ClientBattalion[] {
    // Clear cache if battalions array changes significantly
    if (this.battalionCache.size > battalions.length * 2) {
      this.battalionCache.clear();
    }

    const aliveBattalions = battalions.filter(battalion => !battalion.isDestroyed);

    // Use cached mapping when possible to avoid redundant object creation
    return aliveBattalions.map(battalion => {
      const movementState = movementStates?.get(battalion.id) || undefined;
      const cacheKey = `${battalion.id}-${battalion.currentHealth}-${battalion.quantity}-${battalion.position.x}-${battalion.position.y}-${movementState ? JSON.stringify(movementState) : 'undefined'}`;
      
      if (this.battalionCache.has(cacheKey)) {
        // Return immutable copy to prevent shared mutable state
        const cached = this.battalionCache.get(cacheKey)!;
        return { ...cached };
      }

      const clientBattalion: ClientBattalion = {
        id: battalion.id,
        type: battalion.type,
        quantity: battalion.quantity,
        currentHealth: battalion.currentHealth,
        maxHealth: battalion.maxHealth,
        baseHealthPerUnit: battalion.baseHealthPerUnit,
        isDestroyed: battalion.isDestroyed,
        destroyedAt: battalion.destroyedAt,
        position: { x: battalion.position.x, y: battalion.position.y },
        isUser: battalion.owner === NodeOwner.USER,
        mark: battalion.mark,
        stats: battalion.stats,
        movementState: movementState
      };

      this.battalionCache.set(cacheKey, clientBattalion);
      return clientBattalion;
    });
  }
} 