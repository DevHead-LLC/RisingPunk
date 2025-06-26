# Current Task

## AI Directive & Assessment Rules

**THIS IS A PLANNING DOCUMENT.** We are breaking down one large hook (`useBattleMovementAndAttacks.ts`) into multiple smaller, focused hooks. 

**WHAT TO DO:**
1. **ANALYZE SPECIFIC FUNCTIONS AND LOGIC** from the large hook
2. **REFERENCE THE EXACT CODE PIECES** from useBattleMovementAndAttacks.ts
3. **MAP EACH CODE PIECE** to the appropriate plan section below
4. **ADD REFERENCES** showing which specific logic goes where
5. **DO NOT ADD CODE** - this is a plan, not implementation

**CRITICAL RULE: NEVER REFERENCE LINE NUMBERS** - Line numbers will change during refactoring. Only reference function names, variable names, and logical descriptions.

**FOCUSED WORK RULE: Do ONLY the direct applicable changes to the specific ## Step plans that are relevant to the specific logic/code we're working on at the time! Do not attempt to do the entire file at once.**

**THE GOAL:** Create a clear roadmap showing exactly which pieces of useBattleMovementAndAttacks.ts go into which new hooks.

**HOOK RESPONSIBILITY MAPPING:**
1. **State management** → Step 1 (useBattalionRefsAndState.ts): ID generation, ref management, shared state
2. **Targeting logic** → Step 2 (useTargeting.ts): Target validation, retargeting, target acquisition
3. **Movement logic** → Step 3 (useMovement.ts): Pathfinding, animation, position updates, cleanup
4. **Combat logic** → Step 4 (useCombat.ts): Range checking, attack setup, damage handling
5. **Orchestration** → Step 5 (useBattleEngine.ts): Main useEffect, hook coordination

**ANALYSIS PROCESS:**
- **IDENTIFY SPECIFIC CODE PIECES** from useBattleMovementAndAttacks.ts
- **REFERENCE THE EXACT FUNCTIONS/VARIABLES** that need to be moved
- **MAP EACH PIECE** to the appropriate hook above
- **ADD REFERENCES** in the plan sections below showing which code goes where
- **USE FUNCTION REFERENCES** like `functionName > specific piece` or `variableName > description`

**FUNCTION REFERENCING RULES:**
When breaking down functionality across multiple steps, reference the source function in each relevant section:
- **Whole function**: `functionName > wholeFunction`
- **Specific pieces**: `functionName > pieceDescription` (e.g., `functionName > ID generation logic`)
- **Multiple pieces**: `functionName > piece1, piece2, piece3`
- **Constants/variables**: `constantName > description`
- **Cross-references**: If a function spans multiple steps, reference it in each step with the specific pieces that belong there
- **NEVER USE LINE NUMBERS** - they will change during refactoring

**EXAMPLE:**
If `moveBattalionAlongPath` has pieces that go to multiple steps:
- Step 1: `moveBattalionAlongPath > battalion ID generation logic`
- Step 2: `moveBattalionAlongPath > target validation logic`
- Step 3: `moveBattalionAlongPath > path calculation, movement animation, post-movement validation`
- Step 4: `moveBattalionAlongPath > range checking logic`

===================================================================================================
___________________________________________________________________________________________________

AI: YOU MUST READ AND UNDERSTAND EVERYTHING ABOVE FULLY AND EXECUTE IT EXACTLY AS REQUESTED ABOVE!
___________________________________________________________________________________________________

AFTER AI HAS READ THE ABOVE, THEN WORK BELOW:

===================================================================================================

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