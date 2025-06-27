import React, { useRef, useEffect } from 'react';
import { BattalionRef } from '../components/battle/AnimatedBattalion';
import { BattleNode, BattalionPosition } from '../types/battle';

// ============================================================================
// CONSTANTS
// ============================================================================

const ATTACK_DELAY = 300;
const CAPTURE_MEMORY_DURATION = 5000;

// Debug flag - set to false to disable all debugging
const DEBUG_BATTLE = true;

// Debug function
const debugLog = (message: string) => {
  if (DEBUG_BATTLE) {
    console.log(message);
  }
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Battalion references for animations */
interface BattalionRefs {
  [key: string]: BattalionRef;
}

/** Node references for damage animations */
interface NodeRefs {
  [key: string]: {
    triggerDamageAnimation: () => void;
    applyDamage: (damage: number, isUser: boolean) => boolean;
  } | null;
}

/** Attack intervals tracking */
interface AttackIntervals {
  [key: string]: NodeJS.Timeout;
}

/** Battalion loss callback type */
type OnBattalionLoss = (
  side: 'user' | 'enemy',
  battalionId: string,
  quantity: number,
  mark: number
) => void;

export { DEBUG_BATTLE, debugLog, ATTACK_DELAY, CAPTURE_MEMORY_DURATION };
export type { BattalionRefs, NodeRefs, AttackIntervals, OnBattalionLoss };

// ============================================================================
// BATTALION ID GENERATION LOGIC
// ============================================================================

/**
 * Generate a consistent battalion ID based on array index or node index
 */
const generateBattalionId = (
  battalion: { type: string; nodeIndex: number },
  isUser: boolean,
  battalionArray: any[],
  battalionIndex: number
): string => {
  return battalionIndex >= 0 
    ? `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalionIndex}`
    : `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalion.nodeIndex}`; // fallback
};

/**
 * Find battalion index and generate ID
 */
const findBattalionIndexAndId = (
  battalion: { type: string; nodeIndex: number },
  isUser: boolean,
  userBattalions?: any[],
  enemyBattalions?: any[]
): { battalionIndex: number; battalionId: string } => {
  const battalionArray = isUser ? (userBattalions || []) : (enemyBattalions || []);
  const battalionIndex = battalionArray.findIndex(b => b === battalion);
  const battalionId = generateBattalionId(battalion, isUser, battalionArray, battalionIndex);
  
  return { battalionIndex, battalionId };
};

// ============================================================================
// REFS AND STATE MANAGEMENT
// ============================================================================

export const useBattalionRefsAndState = (
  nodes: BattleNode[],
  userBattalions: BattalionPosition[],
  enemyBattalions: BattalionPosition[]
) => {
  // IMPORTANT: Keep refs for animations and intervals
  const battalionRefs = useRef<BattalionRefs>({});
  const attackIntervals = useRef<AttackIntervals>({});
  const nodeRefs = useRef<NodeRefs>({});
  const battleInitializedRef = useRef(false);
  const battalionsRef = useRef({ user: userBattalions, enemy: enemyBattalions });
  const nodesRef = useRef(nodes);

  // Add retargeting cooldown tracking
  const retargetCooldowns = useRef<{[key: string]: number}>({});
  const recentlyCapturedNodes = useRef<Set<number>>(new Set());

  // Ref to store the real findAvailableTargets function
  const findAvailableTargetsRef = useRef<(
    battalion: BattalionPosition,
    isUser: boolean,
    userBattalions: BattalionPosition[],
    enemyBattalions: BattalionPosition[]
  ) => any[]>(() => []);

  // Update refs when battalions change
  useEffect(() => {
    battalionsRef.current = { user: userBattalions, enemy: enemyBattalions };
  }, [userBattalions, enemyBattalions]);

  // Update nodes ref when nodes change
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  return {
    // Refs
    battalionRefs,
    attackIntervals,
    nodeRefs,
    battleInitializedRef,
    battalionsRef,
    nodesRef,
    retargetCooldowns,
    recentlyCapturedNodes,
    findAvailableTargetsRef,
    
    // Utility functions
    generateBattalionId,
    findBattalionIndexAndId,
    
    // Constants
    ATTACK_DELAY,
    CAPTURE_MEMORY_DURATION,
    DEBUG_BATTLE,
    debugLog
  };
};

export { generateBattalionId, findBattalionIndexAndId }; 