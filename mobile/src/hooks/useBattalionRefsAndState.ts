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