# Battle Sequence Flow Documentation

## Documentation Rules

**Format for each step:**
1. **User Experience Behavior** - What user sees/experiences
2. **Feature Description** - Code features with clickable file paths:
   - Mobile files: `src/...` (from main doc) or `../src/...` (from step files)
   - Server files: `../server/src/...` (from main doc) or `../../server/src/...` (from step files)
   - Format: [`filename.ts`](path) - description
3. **Source of Truth** - Authoritative data files with clickable paths
4. **Implementation Analysis** - File structure assessment with consolidated information:
   - **Existing Files & Connection Status**: Each file entry includes:
     - File path with clickable link and line count
     - Connection status (properly connected vs not connected)
     - **Client/Server Responsibilities**: Specific responsibilities for that file
     - **Code Status**: EXISTS/NEEDS IMPLEMENTATION/NEEDS REFACTORING/NEEDS UPDATE
     - **Security/Anti-Cheat**: Server-side validation, client-side display only, etc.
     - **Constraints**: Network constraints, architectural requirements, etc.
   - **File Size Check**: If >250 lines, create new file and import
   - **Recommended File Structure**: 
     - Files to create (with reasons: doesn't exist OR current file over limit)
     - Import strategy (where new files should be imported and how)
     - Connection requirements (what needs to be connected vs already connected)

**File Structure:**
- Main doc: Rules + step links only
- Step files: `battle-ux-flow/[step-number]-[step-name].md` with full 4-point analysis

**Key Principles:**
- **File-centric approach**: All information about a file (responsibilities, status, constraints) grouped together
- **Eliminate redundancy**: No separate sections for client/server responsibilities, code status, or constraints
- **Clear ownership**: Each file entry shows exactly what it handles and what it needs
- **Implementation focus**: Clear distinction between what exists, what needs connection, and what needs creation

=====================================================================================================================================================================

## Battle Sequence Flow Analysis

### Step 0: User Experience Behavior Overview

See: [`battle-ux-flow/0-user-experience-behavior-overview.md`](battle-ux-flow/0-user-experience-behavior-overview.md)

### Step 1: User Login Flow

See: [`battle-ux-flow/1-user-login-flow.md`](battle-ux-flow/1-user-login-flow.md)

### Step 2: Turf to Home Navigation

See: [`battle-ux-flow/2-turf-to-home-navigation.md`](battle-ux-flow/2-turf-to-home-navigation.md)

### Step 3: Hack Rig Exploit Prompt

See: [`battle-ux-flow/3-hack-rig-exploit-prompt.md`](battle-ux-flow/3-hack-rig-exploit-prompt.md)

### Step 4: Battle Preparation to Battle

See: [`battle-ux-flow/4-battle-preparation-to-battle.md`](battle-ux-flow/4-battle-preparation-to-battle.md)

### Step 5: Pre-Battle Countdown

See: [`battle-ux-flow/5-pre-battle-countdown.md`](battle-ux-flow/5-pre-battle-countdown.md)

### Step 6a: Battle Phase Transition

See: [`battle-ux-flow/6a-battle-initial-setup.md`](battle-ux-flow/6a-battle-initial-setup.md)

### Step 6b: Node Advantages Activation (Future Feature)

See: [`battle-ux-flow/6b-node-advantages-activation.md`](battle-ux-flow/6b-node-advantages-activation.md)

**⚠️ FUTURE TODO ITEM - NOT CURRENTLY IMPLEMENTED ⚠️**

### Step 6c: Type Advantage System Activation

See: [`battle-ux-flow/6c-type-advantage-system.md`](battle-ux-flow/6c-type-advantage-system.md)

### Step 7: Initial Targeting Logic

See: [`battle-ux-flow/7-initial-targeting.md`](battle-ux-flow/7-initial-targeting.md)

### Step 8a: Movement Initiation Logic

See: [`battle-ux-flow/8a-movement-initiation-logic.md`](battle-ux-flow/8a-movement-initiation-logic.md)

### Step 8b: Network Constraint Validation

See: [`battle-ux-flow/8b-network-constraint-validation.md`](battle-ux-flow/8b-network-constraint-validation.md)

### Step 9: Attack Range Positioning System

See: [`battle-ux-flow/9-attack-range-positioning.md`](battle-ux-flow/9-attack-range-positioning.md)

### Step 10: Movement Completion

See: [`battle-ux-flow/10-movement-completion.md`](battle-ux-flow/10-movement-completion.md)

### Step 11a: Tug-of-War Combat System

See: [`battle-ux-flow/11a-tug-of-war-combat-system.md`](battle-ux-flow/11a-tug-of-war-combat-system.md)

### Step 11b: Node Ownership Management

See: [`battle-ux-flow/11b-node-ownership-management.md`](battle-ux-flow/11b-node-ownership-management.md)

### Step 12: Node Capture Completion & Ownership Transfer

See: [`battle-ux-flow/12-node-capture-completion.md`](battle-ux-flow/12-node-capture-completion.md)

### Step 13: Battalion Retargeting After Node Capture

See: [`battle-ux-flow/13-battalion-retargeting-after-node-capture.md`](battle-ux-flow/13-battalion-retargeting-after-node-capture.md)

### Step 14a: Battalion Movement to Attack Range

See: [`battle-ux-flow/14a-battalion-movement-to-attack-range.md`](battle-ux-flow/14a-battalion-movement-to-attack-range.md)

### Step 14b: Battalion Combat Engagement

See: [`battle-ux-flow/14b-battalion-combat-engagement.md`](battle-ux-flow/14b-battalion-combat-engagement.md)

### Step 15a: Battalion Destruction System

See: [`battle-ux-flow/15a-battalion-destruction-system.md`](battle-ux-flow/15a-battalion-destruction-system.md)

### Step 15b: Victory Determination System

See: [`battle-ux-flow/15b-victory-determination-system.md`](battle-ux-flow/15b-victory-determination-system.md)

### Step 16a: Victory Overlay Display

See: [`battle-ux-flow/16a-victory-overlay-display.md`](battle-ux-flow/16a-victory-overlay-display.md)

### Step 16b: Post-Battle Navigation

See: [`battle-ux-flow/16b-post-battle-navigation.md`](battle-ux-flow/16b-post-battle-navigation.md)

---

## Implementation Reference

### Implementation Reference Data

See: [`battle-ux-flow/appendix-a-implementation-reference.md`](battle-ux-flow/appendix-a-implementation-reference.md)

**Complete implementation specifications including:**
- Bot type complete specifications with stats, lore, and advantages
- Mathematical formulas for all calculations
- Network topology complete mapping
- Visual design specifications with exact color codes
- Performance specifications and timing requirements
- Type advantage system and equipment bonuses
- Victory conditions and tie-breaker mechanics