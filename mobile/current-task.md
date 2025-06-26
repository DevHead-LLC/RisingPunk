## Step 1: Plan to make a new hook called `useBattalionRefsAndState.ts`

### battalionRefs
**References:** `BattalionRefs > interface definition`

### attackIntervals
**References:** `AttackIntervals > interface definition`

### nodeRefs
**References:** `NodeRefs > interface definition`

### battleInitializedRef

### retargetCooldowns

### recentlyCapturedNodes

### battalionsRef, nodesRef

### Type definitions
**References:** `BattalionRefs > interface`, `NodeRefs > interface`, `AttackIntervals > interface`, `OnBattalionLoss > type definition`

### Battalion ID generation logic

**Why: This keeps all shared ref containers and non-render state in one place. You return them from this custom hook and use them across others.**

## Step 2: useTargeting.ts

### findAvailableTargets

### findNewTarget

### retargetAllBattalions

### handleNodeCapture

### Target validation and retargeting logic

**Why: These are all concerned with target acquisition, prioritization, cooldowns, and retargeting.**

## Step 3: useMovement.ts

### moveBattalionAlongPath

### getAnimatedPosition

### calculateMovementDuration

### cleanupBattalion

### Path calculation and following

### Movement animation and positioning

### Post-movement validation and continuation

### Debug flag and logging system
**References:** `DEBUG_BATTLE > debug flag constant`, `debugLog > debug logging function`

### Infinite loop detection system
**References:** `checkForInfiniteLoop > infinite loop detection function`, `loopDetection > loop tracking Map`

**Why: These functions are all related to how battalions move and when they should be repositioned. This domain also handles infinite loop protection and debugging.**

## Step 4: useCombat.ts

### setupAttacks

### setupBattalionAttacks

### handleBattalionDamage

### Range checking and attack triggering

**Why: This contains all combat resolution logic, from attack intervals to damage application and follow-up retargeting.**

## Step 5: useBattleEngine.ts

### The actual useBattleMovementAndAttacks hook

### useEffect that handles:

### Battle initialization

### Attack scheduling

### Target node selection

### Cleanup

### Pulls in all the sub-hooks above