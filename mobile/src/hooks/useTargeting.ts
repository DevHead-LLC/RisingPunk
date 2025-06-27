import { useCallback } from 'react';
import { BattleNode, BattalionPosition, BattleTarget } from '../types/battle';
import { getConnectedNodes } from '../utils/networkConstants';
import { getAnimatedPosition } from './useMovement';

// Constants for targeting
const RETARGET_COOLDOWN = 2000; // 2 seconds
const CAPTURE_MEMORY_DURATION = 5000; // 5 seconds

export const useTargeting = (
  nodes: BattleNode[],
  retargetCooldowns: React.MutableRefObject<{ [key: string]: number }>,
  recentlyCapturedNodes: React.MutableRefObject<Set<number>>,
  battalionsRef: React.MutableRefObject<{ user: BattalionPosition[]; enemy: BattalionPosition[] }>,
  findBattalionIndexAndId: (battalion: BattalionPosition, isUser: boolean, userBattalions: BattalionPosition[], enemyBattalions: BattalionPosition[]) => { battalionIndex: number; battalionId: string },
  moveBattalionAlongPath: (battalion: BattalionPosition, target: BattleTarget, isUser: boolean, userBattalions?: BattalionPosition[], enemyBattalions?: BattalionPosition[]) => void
) => {
  const findAvailableTargets = useCallback((
    battalion: BattalionPosition,
    isUser: boolean,
    userBattalions: BattalionPosition[],
    enemyBattalions: BattalionPosition[]
  ): BattleTarget[] => {
    if (!battalion || battalion.quantity <= 0 || battalion.currentHealth <= 0) return [];
    if (!nodes || !Array.isArray(nodes)) return [];
    
    const currentPos = getAnimatedPosition(battalion.position);
    const allTargets: BattleTarget[] = [];
    
    // Check neutral nodes first (primary targets)
    // CLARIFICATION: Only neutral nodes can be targeted. Once a node is controlled by either party, 
    // it cannot be retargeted or changed for the rest of the battle.
    const connectedNodeIndices = getConnectedNodes(battalion.nodeIndex);
    
    nodes.forEach((node, index) => {
      if (!node || !connectedNodeIndices.includes(index)) return;
      // Only target neutral nodes - controlled nodes are permanent
      if (node.controlState !== 'neutral') return;
      if (index === battalion.nodeIndex) return;
      
      const distance = Math.sqrt(
        Math.pow(node.x - currentPos.x, 2) + 
        Math.pow(node.y - currentPos.y, 2)
      );
      
      if (!isNaN(distance)) {
        allTargets.push({
          type: 'node',
          index,
          distance,
          position: { x: node.x, y: node.y }
        });
      }
    });

    // If no neutral nodes found, check enemy battalions
    // CLARIFICATION: When no neutral nodes are available, battalions attack enemy battalions directly
    if (allTargets.length === 0) {
      const enemyBatts = isUser ? enemyBattalions : userBattalions;
      
      if (enemyBatts && Array.isArray(enemyBatts)) {
        enemyBatts.forEach((enemyBattalion, index) => {
          if (!enemyBattalion || enemyBattalion.quantity <= 0 || enemyBattalion.currentHealth <= 0) {
            return;
          }
          
          const enemyPos = getAnimatedPosition(enemyBattalion.position);
          const distance = Math.sqrt(
            Math.pow(enemyPos.x - currentPos.x, 2) + 
            Math.pow(enemyPos.y - currentPos.y, 2)
          );
          
          if (!isNaN(distance)) {
            allTargets.push({
              type: 'battalion',
              index,
              distance,
              position: enemyPos
            });
          }
        });
      }
    }
    
    // Sort targets by distance only - priority is handled by order of checking
    const validTargets = allTargets
      .filter(target => !isNaN(target.distance))
      .sort((a, b) => a.distance - b.distance);
    
    return validTargets;
  }, [nodes]);

  const findNewTarget = useCallback((battalion: BattalionPosition, isUser: boolean) => {
    if (!battalion || !battalionsRef.current) return;
    
    // Generate battalion ID
    const { battalionId } = findBattalionIndexAndId(battalion, isUser, battalionsRef.current.user, battalionsRef.current.enemy);
    
    // Check cooldown
    const now = Date.now();
    const lastRetarget = retargetCooldowns.current[battalionId] || 0;
    if (now - lastRetarget < RETARGET_COOLDOWN) {
      return; // Still in cooldown
    }
    
    // Get all available targets
    const allTargets = findAvailableTargets(
      battalion,
      isUser,
      battalionsRef.current.user,
      battalionsRef.current.enemy
    );

    // Unified target selection - all battalion types behave identically
    // CLARIFICATION: Both user and enemy battalions prioritize neutral nodes first, then enemy battalions
    // Once a node is controlled by either party, it cannot be retargeted for the rest of the battle
    let targets: typeof allTargets = [];
    
    // All battalions prioritize neutral nodes, then enemy battalions
    targets = allTargets.filter(target => {
      if (target.type === 'node') {
        const node = nodes[target.index];
        // Only target neutral nodes, not captured ones
        return node && node.controlState === 'neutral' && !recentlyCapturedNodes.current.has(target.index);
      }
      return false;
    });
    
    // If no neutral nodes, attack enemy battalions
    if (targets.length === 0) {
      targets = allTargets.filter(target => target.type === 'battalion');
    }
    
    if (targets.length > 0) {
      const target = targets[0];
      
      // Set cooldown
      retargetCooldowns.current[battalionId] = now;
      
      // If targeting a node, mark it as recently captured
      if (target.type === 'node') {
        recentlyCapturedNodes.current.add(target.index);
        setTimeout(() => {
          recentlyCapturedNodes.current.delete(target.index);
        }, CAPTURE_MEMORY_DURATION);
      }
      
      moveBattalionAlongPath(
        battalion,
        target,
        isUser,
        battalionsRef.current.user,
        battalionsRef.current.enemy
      );
    }
  }, [nodes, findAvailableTargets, retargetCooldowns, recentlyCapturedNodes, battalionsRef, findBattalionIndexAndId, moveBattalionAlongPath]);

  // Node capture handling with retargeting
  const handleNodeCapture = useCallback((
    nodeIndex: number, 
    newControlState: 'user' | 'enemy',
    nodesRef: React.MutableRefObject<BattleNode[]>,
    CAPTURE_MEMORY_DURATION: number
  ) => {
    // Update node control state
    nodesRef.current[nodeIndex].controlState = newControlState;
    
    // Mark as recently captured to prevent immediate retargeting
    recentlyCapturedNodes.current.add(nodeIndex);
    setTimeout(() => {
      recentlyCapturedNodes.current.delete(nodeIndex);
    }, CAPTURE_MEMORY_DURATION);
    
    // Retarget all battalions
    retargetAllBattalions();
  }, [recentlyCapturedNodes, retargetCooldowns, battalionsRef, findBattalionIndexAndId, moveBattalionAlongPath]);

  // Retarget all battalions after node capture
  const retargetAllBattalions = useCallback(() => {
    if (!battalionsRef.current) return;
    
    // Retarget user battalions
    if (battalionsRef.current.user && Array.isArray(battalionsRef.current.user)) {
      battalionsRef.current.user.forEach((battalion, index) => {
        if (battalion && battalion.quantity > 0 && battalion.currentHealth > 0) {
          findNewTarget(battalion, true);
        }
      });
    }
    
    // Retarget enemy battalions
    if (battalionsRef.current.enemy && Array.isArray(battalionsRef.current.enemy)) {
      battalionsRef.current.enemy.forEach((battalion, index) => {
        if (battalion && battalion.quantity > 0 && battalion.currentHealth > 0) {
          findNewTarget(battalion, false);
        }
      });
    }
  }, [battalionsRef, findNewTarget]);

  return { findAvailableTargets, findNewTarget, handleNodeCapture, retargetAllBattalions };
}; 