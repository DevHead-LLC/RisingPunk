import { BattleState, Battalion, Node } from './BattleStateManager';
import { BattalionStateComponent, NodeStateComponent, TeamStateComponent, StateComponent } from './StateCoordinator';

/**
 * Base class for all state components
 */
export abstract class BaseStateComponent implements StateComponent {
  protected coordinator: any;
  
  constructor(coordinator: any) {
    this.coordinator = coordinator;
  }
  
  abstract getName(): string;
  
  abstract getState(): any;
  
  abstract updateState(update: any): void;
  
  onUpdateCycle(timestamp: number): void {
    // Default implementation does nothing
  }
}

/**
 * Implementation of the BattalionStateComponent interface
 */
export class BattalionStateComponentImpl extends BaseStateComponent implements BattalionStateComponent {
  getName(): string {
    return 'BattalionStateComponent';
  }
  
  getState(): Map<string, Battalion> {
    return this.coordinator.getState().battalions;
  }
  
  updateState(update: Map<string, Partial<Battalion>>): void {
    const state = this.coordinator.getState();
    const newBattalions = new Map(state.battalions);
    
    update.forEach((battalionUpdate, battalionId) => {
      const existingBattalion = newBattalions.get(battalionId);
      
      if (existingBattalion) {
        // Update existing battalion
        newBattalions.set(battalionId, {
          ...(existingBattalion as object),
          ...battalionUpdate
        } as Battalion);
      } else {
        // Create new battalion
        newBattalions.set(battalionId, {
          id: battalionId,
          position: battalionUpdate.position || { x: 0, y: 0 },
          team: battalionUpdate.team || '',
          type: battalionUpdate.type!,
          health: battalionUpdate.health || 100,
          quantity: battalionUpdate.quantity || 1,
          targetId: battalionUpdate.targetId || null
        } as Battalion);
      }
    });
    
    // Update state
    state.battalions = newBattalions;
  }
  
  getBattalion(battalionId: string): Battalion | undefined {
    return this.getState().get(battalionId);
  }
  
  hasBattalion(battalionId: string): boolean {
    return this.getState().has(battalionId);
  }
  
  addBattalion(battalion: Battalion): void {
    const state = this.coordinator.getState();
    const newBattalions = new Map(state.battalions);
    
    newBattalions.set(battalion.id, battalion);
    
    // Update state
    state.battalions = newBattalions;
  }
  
  applyDamage(battalionId: string, damage: number): void {
    const state = this.coordinator.getState();
    const newBattalions = new Map(state.battalions);
    
    const battalion = newBattalions.get(battalionId);
    
    if (!battalion) {
      throw new Error(`Battalion with ID ${battalionId} not found`);
    }
    
    // Apply damage
    const newHealth = Math.max(0, (battalion as Battalion).health - damage);
    
    newBattalions.set(battalionId, {
      ...(battalion as object),
      health: newHealth
    } as Battalion);
    
    // Update state
    state.battalions = newBattalions;
  }
}

/**
 * Implementation of the NodeStateComponent interface
 */
export class NodeStateComponentImpl extends BaseStateComponent implements NodeStateComponent {
  getName(): string {
    return 'NodeStateComponent';
  }
  
  getState(): Map<string, Node> {
    return this.coordinator.getState().nodes;
  }
  
  updateState(update: Map<string, Partial<Node>>): void {
    const state = this.coordinator.getState();
    const newNodes = new Map(state.nodes);
    
    update.forEach((nodeUpdate, nodeId) => {
      const existingNode = newNodes.get(nodeId);
      
      if (existingNode) {
        // Update existing node
        newNodes.set(nodeId, {
          ...(existingNode as object),
          ...nodeUpdate
        } as Node);
      } else {
        // Create new node
        newNodes.set(nodeId, {
          id: nodeId,
          position: nodeUpdate.position || { x: 0, y: 0 },
          controllingTeam: nodeUpdate.controllingTeam || null,
          controlProgress: nodeUpdate.controlProgress || 0,
          health: nodeUpdate.health || 100
        } as Node);
      }
    });
    
    // Update state
    state.nodes = newNodes;
  }
  
  getNode(nodeId: string): Node | undefined {
    return this.getState().get(nodeId);
  }
  
  addNode(node: Node): void {
    const state = this.coordinator.getState();
    const newNodes = new Map(state.nodes);
    
    newNodes.set(node.id, node);
    
    // Update state
    state.nodes = newNodes;
  }
}

/**
 * Implementation of the TeamStateComponent interface
 */
export class TeamStateComponentImpl extends BaseStateComponent implements TeamStateComponent {
  private teams: Map<string, string> = new Map();
  
  getName(): string {
    return 'TeamStateComponent';
  }
  
  getState(): Map<string, string> {
    return this.teams;
  }
  
  updateState(update: Map<string, string>): void {
    update.forEach((teamName, teamId) => {
      this.teams.set(teamId, teamName);
    });
  }
  
  getTeam(teamId: string): string | undefined {
    return this.teams.get(teamId);
  }
  
  addTeam(team: string): void {
    this.teams.set(team, team);
  }
} 