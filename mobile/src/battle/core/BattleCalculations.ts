// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Battalion-Stats
// Core calculations for the battalion stats system

import { BattalionType, BattalionStats, CombatCalculationParams, Position, TargetInfo, TargetingParams, TargetingResult, AttackPositionParams, NodeOwnership, NodeInfo, NodeControlState } from './types';

// Fixed stats per unit type as defined in @battle-core-mechanics.mdc
const BASE_STATS: Record<BattalionType, BattalionStats> = {
  [BattalionType.Guardian]: {
    speed: 9,
    range: 4,
    offense: 8,
    defense: 6,
    health: 14
  },
  [BattalionType.Phreak]: {
    speed: 7,
    range: 9,
    offense: 6,
    defense: 5,
    health: 12
  },
  [BattalionType.Breacher]: {
    speed: 5,
    range: 5,
    offense: 7,
    defense: 8,
    health: 18
  }
};

export function calculateBattalionStats(type: BattalionType): BattalionStats {
  const stats = BASE_STATS[type];
  if (!stats) {
    throw new Error('Invalid battalion type');
  }
  return { ...stats };
}

// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Battalion-Combat
export function calculateCombatDamage({
  attackerType,
  attackerQuantity,
  defenderType,
  defenderQuantity,
}: CombatCalculationParams): number {
  if (!BASE_STATS[attackerType] || !BASE_STATS[defenderType]) {
    throw new Error('Invalid battalion type');
  }
  
  if (attackerQuantity <= 0 || defenderQuantity <= 0) {
    throw new Error('Battalion quantity must be positive');
  }

  // Calculate total attack first (base offense * quantity)
  // This ensures proper scaling with attacker quantity
  const totalAttack = BASE_STATS[attackerType].offense * attackerQuantity;
  
  // Apply defense reduction (defense is percentage-based reduction)
  // Defense value represents percentage reduction (e.g. 5 means 5% reduction)
  // Defense is not scaled by defender quantity as per battle-core-mechanics rule
  const defenseMultiplier = 1 - (BASE_STATS[defenderType].defense / 100);
  
  // Apply defense reduction and round down to nearest integer
  const damage = Math.floor(totalAttack * defenseMultiplier);
  
  // Ensure minimum damage of 1 as per battle-core-mechanics rule
  return Math.max(1, damage);
}

// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Universal-Targeting
function validatePosition(position: Position): void {
  if (typeof position.x !== 'number' || typeof position.y !== 'number' ||
      isNaN(position.x) || isNaN(position.y)) {
    throw new Error('Invalid position coordinates');
  }
}

function calculateDistance(a: Position, b: Position): number {
  validatePosition(a);
  validatePosition(b);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateTargetingPriority(params: TargetingParams): TargetingResult {
  const { attackerPosition, targets, currentTargetId } = params;

  // Validate inputs
  validatePosition(attackerPosition);
  
  if (!targets.length) {
    throw new Error('No targets available');
  }

  // Validate target types and positions
  for (const target of targets) {
    if (!BASE_STATS[target.type]) {
      throw new Error('Invalid battalion type');
    }
    validatePosition(target.position);
  }

  // If we have a current target and it's still in the target list, maintain it
  if (currentTargetId) {
    const currentTarget = targets.find(t => t.id === currentTargetId);
    if (currentTarget) {
      const distance = calculateDistance(attackerPosition, currentTarget.position);
      // Only maintain current target if it's within range
      if (distance <= BASE_STATS[currentTarget.type].range) {
        return { selectedTarget: currentTarget };
      }
    }
  }

  // Find closest target that's within range
  let validTarget: TargetInfo | null = null;
  let minDistance = Infinity;

  for (const target of targets) {
    const distance = calculateDistance(attackerPosition, target.position);
    const range = BASE_STATS[target.type].range;
    
    // Check if target is within range and closer than current best
    if (distance <= range && distance < minDistance) {
      minDistance = distance;
      validTarget = target;
    }
  }

  // If no valid target found within range, find the closest target overall
  if (!validTarget) {
    validTarget = targets[0];
    minDistance = calculateDistance(attackerPosition, validTarget.position);

    for (const target of targets.slice(1)) {
      const distance = calculateDistance(attackerPosition, target.position);
      if (distance < minDistance) {
        minDistance = distance;
        validTarget = target;
      }
    }
  }

  return { selectedTarget: validTarget };
}

// Implementation of @battle-movement-system.mdc#Core-Movement-Properties
export function calculateMovementSpeed(type: BattalionType): number {
  // Validate battalion type
  if (!BASE_STATS[type]) {
    throw new Error('Invalid battalion type');
  }

  // Return the speed from base stats
  return BASE_STATS[type].speed;
}

// Implementation of @battle-movement-system.mdc#Movement-Constraints
function isValidPosition(position: Position): boolean {
  return typeof position.x === 'number' && typeof position.y === 'number';
}

export function isHorizontalOrVertical(start: Position, end: Position): boolean {
  // Movement must be either horizontal (same y) or vertical (same x)
  return start.x === end.x || start.y === end.y;
}

export function validateMovementPath(path: Position[]): void {
  // Validate each position in the path
  for (const position of path) {
    if (!isValidPosition(position)) {
      throw new Error('Invalid position coordinates');
    }
  }

  // Check movement constraints between each pair of positions
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];

    // Movement must follow network lines (horizontal or vertical only)
    if (!isHorizontalOrVertical(current, next)) {
      throw new Error('Invalid movement: Must follow network lines');
    }
  }
}

export function calculatePathDistance(path: Position[]): number {
  let totalDistance = 0;

  // Calculate total distance along the path
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];

    // Calculate Manhattan distance (since movement is only horizontal/vertical)
    const dx = Math.abs(next.x - current.x);
    const dy = Math.abs(next.y - current.y);
    totalDistance += dx + dy;
  }

  return totalDistance;
}

// Implementation of @battle-movement-system.mdc#Attack-Range-Behavior
export function calculateAttackPosition(params: AttackPositionParams): Position {
  const { attackerType, attackerPosition, targetPosition } = params;

  // Validate inputs
  validatePosition(attackerPosition);
  validatePosition(targetPosition);
  if (!BASE_STATS[attackerType]) {
    throw new Error('Invalid battalion type');
  }

  // Get attack range for battalion type
  const range = BASE_STATS[attackerType].range;

  // Calculate current distance to target
  const currentDistance = calculateDistance(attackerPosition, targetPosition);

  // If already in range, stay in current position
  if (currentDistance <= range) {
    return attackerPosition;
  }

  // Calculate direction vector
  const dx = targetPosition.x - attackerPosition.x;
  const dy = targetPosition.y - attackerPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Calculate position at edge of range
  // Move towards target by (currentDistance - range) units
  const scale = (currentDistance - range) / currentDistance;
  return {
    x: Math.round(attackerPosition.x + dx * scale),
    y: Math.round(attackerPosition.y + dy * scale)
  };
}

// Implementation of @battle-movement-system.mdc#Network-Structure#Initial-Node-Control
// Define node ownership and valid initial movements
export const NODES: NodeInfo[] = [
  { position: { x: 0, y: 0 }, ownership: NodeOwnership.User },    // Node 0
  { position: { x: 10, y: 0 }, ownership: NodeOwnership.User },   // Node 1
  { position: { x: 20, y: 0 }, ownership: NodeOwnership.User },   // Node 2
  { position: { x: 0, y: 10 }, ownership: NodeOwnership.Neutral }, // Node 3
  { position: { x: 10, y: 10 }, ownership: NodeOwnership.Neutral }, // Node 4
  { position: { x: 20, y: 10 }, ownership: NodeOwnership.Neutral }, // Node 5
  { position: { x: 0, y: 20 }, ownership: NodeOwnership.Enemy },   // Node 6
  { position: { x: 10, y: 20 }, ownership: NodeOwnership.Enemy },  // Node 7
  { position: { x: 20, y: 20 }, ownership: NodeOwnership.Enemy }   // Node 8
];

// Valid initial movements from each user node
const VALID_INITIAL_MOVES: Record<number, number[]> = {
  0: [3, 4],       // Node 0 can target nodes 3 and 4
  1: [3, 4, 5],    // Node 1 can target nodes 3, 4, and 5
  2: [4, 5]        // Node 2 can target nodes 4 and 5
};

export function validateInitialMovement(fromNodeIndex: number, toNodeIndex: number): void {
  // Validate node indices
  if (fromNodeIndex < 0 || fromNodeIndex >= NODES.length || 
      toNodeIndex < 0 || toNodeIndex >= NODES.length) {
    throw new Error('Invalid node index');
  }

  // Validate target node is neutral
  if (NODES[toNodeIndex].ownership !== NodeOwnership.Neutral) {
    throw new Error('Invalid initial movement: Can only target neutral nodes');
  }

  // Check if movement is valid for the starting node
  const validTargets = VALID_INITIAL_MOVES[fromNodeIndex];
  if (!validTargets || !validTargets.includes(toNodeIndex)) {
    throw new Error('Invalid initial movement: Target node not accessible');
  }
}

// Implementation of @battle-movement-system.mdc#Pathfinding
interface PathNode {
  index: number;
  previous: number | null;
}

function findShortestPath(fromIndex: number, toIndex: number): number[] {
  const visited = new Set<number>();
  const queue: PathNode[] = [{ index: fromIndex, previous: null }];
  const previousNode = new Map<number, number>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.index === toIndex) {
      // Reconstruct path
      const path: number[] = [];
      let nodeIndex = toIndex;
      while (nodeIndex !== fromIndex) {
        path.unshift(nodeIndex);
        nodeIndex = previousNode.get(nodeIndex)!;
      }
      path.unshift(fromIndex);
      return path;
    }

    if (!visited.has(current.index)) {
      visited.add(current.index);
      const adjacent = getAdjacentNodes(current.index);
      
      for (const nextIndex of adjacent) {
        if (!visited.has(nextIndex)) {
          previousNode.set(nextIndex, current.index);
          queue.push({ index: nextIndex, previous: current.index });
        }
      }
    }
  }

  throw new Error('No valid path available between nodes');
}

export function findPath(fromNodeIndex: number, toNodeIndex: number): Position[] {
  // Validate node indices
  if (fromNodeIndex < 0 || fromNodeIndex >= NODES.length || 
      toNodeIndex < 0 || toNodeIndex >= NODES.length) {
    throw new Error('Invalid node index');
  }

  // Check if target node is reachable
  const fromNode = NODES[fromNodeIndex];
  const toNode = NODES[toNodeIndex];

  // Enemy nodes are not reachable
  if (toNode.ownership === NodeOwnership.Enemy) {
    throw new Error('No valid path available between nodes');
  }

  // Find the shortest path through the network
  const nodeIndices = findShortestPath(fromNodeIndex, toNodeIndex);
  
  // Convert node indices to positions
  return nodeIndices.map(index => NODES[index].position);
}

function getAdjacentNodes(nodeIndex: number): number[] {
  const node = NODES[nodeIndex];
  const adjacent: number[] = [];

  // Check all nodes for adjacency
  NODES.forEach((otherNode, index) => {
    if (index !== nodeIndex) {
      const isAdjacent = 
        (node.position.x === otherNode.position.x && Math.abs(node.position.y - otherNode.position.y) === 10) ||
        (node.position.y === otherNode.position.y && Math.abs(node.position.x - otherNode.position.x) === 10);
      if (isAdjacent) {
        adjacent.push(index);
      }
    }
  });

  return adjacent;
}

// Implementation of @battle-node-control.mdc#Node-States-and-Control
export function getNodeOwnership(nodeIndex: number): NodeOwnership {
  // Validate node index
  if (nodeIndex < 0 || nodeIndex >= NODES.length) {
    throw new Error('Invalid node index');
  }

  return NODES[nodeIndex].ownership;
}

// Implementation of @battle-node-control.mdc#Capture-System#Capture-Requirements
export function calculateCaptureThreshold(totalArmyHealth: number): number {
  if (totalArmyHealth <= 0) {
    throw new Error('Invalid total health');
  }

  // Capture threshold is 75% of total army health
  return Math.floor(totalArmyHealth * 0.75);
}

/**
 * Updates the control state of a node based on damage dealt
 * Implementation of @battle-node-control.mdc#Capture-System#Control-Progress
 */
export function updateNodeControl(
  nodeIndex: number,
  userDamage: number,
  enemyDamage: number,
  captureThreshold: number
): NodeControlState {
  if (nodeIndex < 0 || nodeIndex >= NODES.length) {
    throw new Error('Invalid node index');
  }

  const node = NODES[nodeIndex];
  
  // Initialize control state if it doesn't exist
  if (!node.controlState) {
    node.controlState = {
      ownership: node.ownership,
      userDamage: 0,
      enemyDamage: 0,
      captureThreshold
    };
  }

  const currentState = node.controlState;
  currentState.userDamage = userDamage;
  currentState.enemyDamage = enemyDamage;
  currentState.captureThreshold = captureThreshold;

  // Check for node capture
  if (userDamage >= captureThreshold && userDamage > enemyDamage) {
    node.ownership = NodeOwnership.User;
    currentState.ownership = NodeOwnership.User;
  } else if (enemyDamage >= captureThreshold && enemyDamage > userDamage) {
    node.ownership = NodeOwnership.Enemy;
    currentState.ownership = NodeOwnership.Enemy;
  }

  return currentState;
}

/**
 * Validates if a direct network line exists between two nodes
 * Implementation of @battle-node-control.mdc#Network-Effects#Network-Connectivity
 */
export function validateNetworkLine(fromNodeIndex: number, toNodeIndex: number): boolean {
  if (fromNodeIndex < 0 || fromNodeIndex >= NODES.length || 
      toNodeIndex < 0 || toNodeIndex >= NODES.length) {
    throw new Error('Invalid node index');
  }

  const fromNode = NODES[fromNodeIndex];
  const toNode = NODES[toNodeIndex];

  // Nodes are adjacent if they share an x or y coordinate and are 10 units apart
  const dx = Math.abs(fromNode.position.x - toNode.position.x);
  const dy = Math.abs(fromNode.position.y - toNode.position.y);
  
  return (dx === 0 && dy === 10) || (dy === 0 && dx === 10);
}

/**
 * Gets all nodes that are directly connected to the given node
 * Implementation of @battle-node-control.mdc#Network-Effects#Network-Connectivity
 */
export function getConnectedNodes(nodeIndex: number): number[] {
  if (nodeIndex < 0 || nodeIndex >= NODES.length) {
    throw new Error('Invalid node index');
  }

  const connectedNodes: number[] = [];
  
  // Check all nodes for valid network lines
  for (let i = 0; i < NODES.length; i++) {
    if (i !== nodeIndex && validateNetworkLine(nodeIndex, i)) {
      connectedNodes.push(i);
    }
  }

  return connectedNodes;
}

/**
 * Checks if a target node is accessible from a source node based on ownership
 * Implementation of @battle-node-control.mdc#Network-Effects#Strategic-Impact
 */
export function isNodeAccessible(fromNodeIndex: number, toNodeIndex: number): boolean {
  if (fromNodeIndex < 0 || fromNodeIndex >= NODES.length || 
      toNodeIndex < 0 || toNodeIndex >= NODES.length) {
    throw new Error('Invalid node index');
  }

  const fromNode = NODES[fromNodeIndex];
  const toNode = NODES[toNodeIndex];

  // Must have a valid network line
  if (!validateNetworkLine(fromNodeIndex, toNodeIndex)) {
    return false;
  }

  // Enemy nodes are not accessible from user nodes and vice versa
  if ((fromNode.ownership === NodeOwnership.User && toNode.ownership === NodeOwnership.Enemy) ||
      (fromNode.ownership === NodeOwnership.Enemy && toNode.ownership === NodeOwnership.User)) {
    return false;
  }

  return true;
}

/**
 * Represents the current victory points for each side
 */
export interface VictoryPoints {
  user: number;
  enemy: number;
  neutral: number;
}

/**
 * Represents the battle resolution result
 */
export interface BattleResult {
  winner: NodeOwnership;
  points: VictoryPoints;
}

/**
 * Calculates current victory points for each side based on node ownership
 * Implementation of @battle-node-control.mdc#Victory-Conditions#Control-Points
 */
export function calculateVictoryPoints(): VictoryPoints {
  const points: VictoryPoints = {
    user: 0,
    enemy: 0,
    neutral: 0
  };

  // Count nodes owned by each side
  NODES.forEach(node => {
    switch (node.ownership) {
      case NodeOwnership.User:
        points.user++;
        break;
      case NodeOwnership.Enemy:
        points.enemy++;
        break;
      case NodeOwnership.Neutral:
        points.neutral++;
        break;
    }
  });

  return points;
}

/**
 * Resets the battle state to initial conditions
 * Implementation of @battle-node-control.mdc#Victory-Conditions#Battle-Resolution
 */
export function resetBattleState(): void {
  // Reset node ownership to initial state
  NODES.forEach((node, index) => {
    if (index <= 2) {
      node.ownership = NodeOwnership.User;
    } else if (index >= 6) {
      node.ownership = NodeOwnership.Enemy;
    } else {
      node.ownership = NodeOwnership.Neutral;
    }

    // Reset control state
    if (node.controlState) {
      node.controlState.userDamage = 0;
      node.controlState.enemyDamage = 0;
    }
  });
}

/**
 * Determines the battle winner based on node control majority
 * Implementation of @battle-node-control.mdc#Victory-Conditions#Victory-Determination
 */
export function resolveBattle(): BattleResult {
  const points = calculateVictoryPoints();
  
  // Determine winner based on majority control
  let winner: NodeOwnership;
  if (points.user > points.enemy) {
    winner = NodeOwnership.User;
  } else if (points.enemy > points.user) {
    winner = NodeOwnership.Enemy;
  } else {
    winner = NodeOwnership.Neutral; // Tie scenario
  }

  return {
    winner,
    points
  };
}

// Implementation of @battle-core-mechanics.mdc#Node-Control#Damage-Calculation
export function calculateNodeDamage(params: {
  battalions: Array<{ type: BattalionType; quantity: number }>;
  side?: 'user' | 'enemy';
}): number {
  let totalDamage = 0;

  for (const battalion of params.battalions) {
    if (!BASE_STATS[battalion.type]) {
      throw new Error('Invalid battalion type');
    }

    if (battalion.quantity <= 0) {
      throw new Error('Battalion quantity must be positive');
    }

    // Calculate damage contribution based on offense and quantity
    const baseDamage = BASE_STATS[battalion.type].offense * battalion.quantity;
    
    // Apply side-specific modifiers if specified
    const modifier = params.side === 'enemy' ? 0.9 : 1; // Enemy battalions deal 90% damage to nodes
    
    totalDamage += Math.floor(baseDamage * modifier);
  }

  return Math.max(1, totalDamage); // Minimum damage of 1
}

// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Attack-Timing
export function calculateAttackInterval(type: BattalionType): number {
  if (!BASE_STATS[type]) {
    throw new Error('Invalid battalion type');
  }

  // Attack interval is inversely proportional to speed
  // Base interval of 1000ms divided by speed stat
  return Math.floor(1000 / BASE_STATS[type].speed);
} 