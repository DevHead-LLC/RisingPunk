**NOTE: For the latest architectural decisions and action items, see recent-assessment.md.**

**NOTE: User will manually run and test all changes. AI will not execute any commands. User will report logs and visual verification results.**

# Battle Sequence Alignment: Initial Targeting Restrictions

**NOTE: This file tracks the alignment of battle-sequence.md with intended-battle-sequence.md**

## Current Situation
The battle sequence documentation describes how the battle currently works, but we need to align it with the intended behavior that uses the proper node ownership system (arrays instead of controlState).

## Key Focus: Initial Targeting Restrictions

### Step 1a: Battle Initialization - Targeting Scope
**Current (battle-sequence.md):**
- "All nodes start with `controlState: 'neutral'` but only nodes 3, 4, 5 are actually targetable"

**Intended (intended-battle-sequence.md):**
- "`neutralNodes = [3, 4, 5]` - ONLY these nodes can be targeted for capture during initial targeting"
- "User/enemy controlled nodes are completely off-limits for targeting"
- "Battalions can ONLY target nodes in the `neutralNodes` array"

**Core Requirement:**
- During initial targeting phase, battalions should ONLY be able to target neutral nodes (3, 4, 5)
- User nodes (0, 1, 2) and enemy nodes (6, 7, 8) should NEVER be targetable
- This is about the initial "tug-of-war" targeting, not retargeting (which comes later)

## Phase 1: Step 1a Initial Targeting Restrictions (Small Testable Batch)

**Goal:** Ensure only neutral nodes are targetable during initial battle targeting phase

**Tasks:**
1. **Update BattleNode type** - Remove `controlProgress` and `isLocked` properties (not needed for initial targeting)
2. **Update useBattleInitialization** - Remove `isLocked` setting during health assignment (only neutral nodes get health)
3. **Update NetworkNode component** - Remove `controlProgress` and `isLocked` props, use array-based logic only
4. **Update BattleNetwork component** - Remove `controlProgress` and `isLocked` prop passing
5. **Update battle-sequence.md step 1a** - Remove controlState references, add array initialization and targeting restrictions

**Testing Criteria:**
- Battle screen loads without errors
- Nodes display correct colors (user/enemy/neutral) based on array membership
- Neutral nodes (3, 4, 5) show health bars, controlled nodes don't
- No console errors related to missing properties
- **CRITICAL:** Only neutral nodes (3, 4, 5) appear as potential targets during initial targeting
- User nodes (0, 1, 2) and enemy nodes (6, 7, 8) are completely excluded from targeting

**Files to Modify:**
- `src/types/battle.ts` - Remove controlProgress and isLocked
- `src/hooks/useBattleInitialization.ts` - Remove isLocked setting
- `src/components/battle/NetworkNode.tsx` - Remove controlProgress/isLocked props
- `src/components/battle/BattleNetwork.tsx` - Remove prop passing
- `battle-sequence.md` - Update step 1a description

## Success Criteria
- Step 1a in both files matches exactly
- No controlState references in step 1a code
- Battle initialization works identically to before
- **CRITICAL:** Only neutral nodes (3, 4, 5) are targetable during initial targeting
- Ready to proceed to step 1b

## Notes
- Focus ONLY on initial targeting restrictions - don't touch retargeting logic yet
- Keep changes minimal and testable
- Maintain backward compatibility where possible
- Document any breaking changes clearly
- This is about the "tug-of-war" initial targeting phase only