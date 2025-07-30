import { IBattalion, ClientBattalion } from '../types/battle';
import { MovementState, NodeOwner } from '../types/battle';

export class BattalionMappingService {
  private static lastLogTime: number = 0;
  private static lastDestroyedBattalions: string = '';
  private static readonly LOG_INTERVAL = 10000;
  private static battalionCache = new Map<string, ClientBattalion>();

  static mapBattalionsForClient(battalions: IBattalion[], movementStates?: Map<string, MovementState>): ClientBattalion[] {
    // Clear cache if battalions array changes significantly
    if (this.battalionCache.size > battalions.length * 2) {
      this.battalionCache.clear();
    }

    const aliveBattalions = battalions.filter(battalion => !battalion.isDestroyed);
    const destroyedBattalions = battalions.filter(battalion => battalion.isDestroyed);
    
    const destroyedHash = destroyedBattalions.map(b => `${b.id}-${b.position.nodeIndex}`).sort().join('|');
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
      
      this.lastLogTime = now;
      this.lastDestroyedBattalions = destroyedHash;
    }

    // Use cached mapping when possible to avoid redundant object creation
    return aliveBattalions.map(battalion => {
      const movementState = movementStates?.get(battalion.id) || undefined;
      const cacheKey = `${battalion.id}-${battalion.currentHealth}-${battalion.quantity}-${battalion.position.nodeIndex}-${movementState ? JSON.stringify(movementState) : 'undefined'}`;
      
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
        nodeIndex: battalion.position.nodeIndex,
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