import { BattalionRef } from '../components/battle/AnimatedBattalion';

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

export { DEBUG_BATTLE, debugLog };
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

export { generateBattalionId, findBattalionIndexAndId }; 