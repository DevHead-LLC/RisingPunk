# Battle Event Queue System Implementation Plan

## Current Architecture Assessment

**Current Flow:** BattleTimer → BattalionService.updateBattleMovement() → MovementService.updateBattleMovement() + AttackService.processActiveAttacks() (every 100ms)

**Current Problems:**
- Attacks triggered immediately when battalions reach attack range (`AttackService.startAttacking()`)
- Node captures processed immediately in attack loop (`AttackService.processActiveAttacks()`)
- Retargeting triggered immediately via `queueBattalionDestructionRetargeting()` and manual queue processing
- Movement interruption happens immediately but battalions get stuck without proper retargeting
- Race conditions: simultaneous events (capture, destruction, movement) cause unpredictable behaviors

## Is Queue Architecture the Right Solution?

**YES, for these reasons:**

1. **Current code already attempts queuing:** `AttackService` has `retargetingQueue` but it's limited and buggy
2. **Event-driven pattern proven in game engines:** Research shows event-driven architectures prevent race conditions in real-time systems
3. **Store-Process-and-Forward pattern:** Exactly what we need - sequential processing of battle events
4. **Better than alternatives:** 
   - Multi-threaded locks would be nightmare for real-time game
   - Current immediate processing creates race conditions
   - State machines alone won't handle dynamic pursuit scenarios

**Key Insight:** We're not over-engineering. We're fixing a fundamentally broken concurrent system.

## What We Need to Create:

**File: `server/src/services/BattleEventQueueService.ts`** (new authority - estimated 275+ lines)

## Manual Testing Implementation Plan

**Note:** Each phase creates a complete, testable system with meaningful manual testing opportunities. No intermediate "untestable" states.

### Phase 1: Queue Foundation + Attack Event Processing
**Goal:** Create queue system and make individual attacks go through queue instead of immediate processing

**Files Created:**
- `server/src/services/BattleEventQueueService.ts` (new authority ~275 lines)

**Files Modified:**
- `AttackService.ts`: Replace immediate attack processing with queue events
- `BattalionService.ts`: Replace `processActiveAttacks()` call with queue processing

**Current trigger points to replace:**
```typescript
// Current: AttackService.processActiveAttacks() - immediate damage processing
// Becomes: Queue individual ATTACK_EVENT for each attack

// Current: MovementService line ~160
AttackService.startAttacking(battalion, targetNode.index);
// Becomes: 
BattleEventQueueService.addEvent({
  type: 'ATTACK_EVENT',
  priority: 'HIGH',
  data: { attackerId: battalion.id, targetId: targetNode.index }
});
```

**Manual Test:** Start battle, verify attacks are processed sequentially through queue
- **Expected:** Attack logs show "QUEUE: Processing ATTACK_EVENT" before damage
- **Expected:** No race conditions between multiple attacking battalions
- **Expected:** Battalion destruction still triggers retargeting (existing queue)

**Test Commands:**
```bash
# Start server
cd server && npm run dev

# Start client 
cd mobile && npx react-native start --reset-cache
# (In separate terminal) npx react-native run-android

# Deploy battle with multiple battalions attacking same target
# Watch logs for sequential queue processing
```

**Success Criteria:**
- All attacks go through queue (logged with "QUEUE: Processing ATTACK_EVENT")
- No immediate attack processing logs
- Battalion destruction and node capture still work via existing retargeting queue
- Battle completes successfully with winner determination

---

### Phase 2: Node Capture + Battalion Destruction Events  
**Goal:** Move node capture and battalion destruction to IMMEDIATE priority queue events

**Files Modified:**
- `AttackService.ts`: Replace immediate capture/destruction with IMMEDIATE queue events
- `BattleEventQueueService.ts`: Add IMMEDIATE priority processing for capture/destruction

**Current trigger points to replace:**
```typescript
// Current: AttackService.processActiveAttacks() 
// When node captured or battalion destroyed - immediate processing

// Becomes: IMMEDIATE priority events that jump to front of queue
BattleEventQueueService.addEvent({
  type: 'NODE_CAPTURE',
  priority: 'IMMEDIATE',
  data: { nodeIndex, newOwner, affectedBattalionIds }
});

BattleEventQueueService.addEvent({
  type: 'BATTALION_DESTRUCTION',
  priority: 'IMMEDIATE', 
  data: { destroyedBattalionId, targetingBattalionIds }
});
```

**Manual Test:** Start battle, capture nodes and destroy battalions
- **Expected:** "QUEUE: Processing NODE_CAPTURE (IMMEDIATE)" logs appear before any interruptions
- **Expected:** "QUEUE: Processing BATTALION_DESTRUCTION (IMMEDIATE)" logs show immediate processing
- **Expected:** Movements are interrupted immediately when targets are captured/destroyed
- **Expected:** Affected battalions retarget properly after interruption

**Success Criteria:**
- Node captures jump to front of queue and process immediately
- Battalion destructions jump to front of queue and process immediately  
- Movement interruption happens through queue events (no immediate calls)
- Retargeting still works correctly after interruptions

---

### Phase 3: Movement Integration
**Goal:** Route all movement events (start, complete, interruption) through queue system

**Files Modified:**
- `MovementService.ts`: Replace immediate movement triggers with queue events
- `RetargetingService.ts`: Generate MOVEMENT_START events instead of calling MovementService directly
- `BattleEventQueueService.ts`: Add movement event processing

**Current trigger points to replace:**
```typescript
// Current: Movement completion triggers immediate attack check
// Becomes: MOVEMENT_COMPLETE event that processes through queue

// Current: Retargeting triggers immediate movement
// Becomes: RETARGET_REQUEST → MOVEMENT_START sequence through queue
```

**Manual Test:** Deploy battle, watch movement patterns during captures
- **Expected:** "QUEUE: Processing MOVEMENT_START" when new targets assigned
- **Expected:** "QUEUE: Processing MOVEMENT_COMPLETE" when battalions arrive
- **Expected:** No immediate movement calls in logs
- **Expected:** Dynamic pursuit behavior when battalion-to-battalion targeting occurs

**Success Criteria:**
- All movement initiation goes through queue
- Movement completion goes through queue
- Movement interruption goes through queue
- Battalion-to-battalion pursuit works correctly via queue

---

### Phase 4: Position Tracking + Dynamic Pursuit
**Goal:** Implement exact position tracking and real-time pursuit coordination through queue

**Files Modified:**
- `BattleEventQueueService.ts`: Add BATTALION_MOVEMENT_START for dynamic pursuit
- `MovementService.ts`: Track exact positions during movement
- `RetargetingService.ts`: Use exact current positions for retargeting

**Manual Test:** Create battalion vs battalion scenarios
- **Expected:** When battalion moves, pursuing battalions get "QUEUE: Processing BATTALION_MOVEMENT_START (IMMEDIATE)"
- **Expected:** Position interruptions show exact coordinates, not next node
- **Expected:** Pursuing battalions adjust paths dynamically to moving targets
- **Expected:** No more "targeting captured nodes" or "targeting destroyed battalions"

**Success Criteria:**
- Exact position tracking during movement interruption
- Dynamic pursuit behavior between battalions
- Real-time path adjustment when targets move
- Zero cases of targeting invalid targets

---

### Phase 5: Main Loop Replacement + Complete Queue System
**Goal:** Replace timer-driven service calls with pure queue processing

**Files Modified:**
- `BattleTimer.ts`: Call queue processing instead of service methods
- `BattalionService.ts`: Remove `updateBattleMovement()`, become queue event processor only
- All services: Remove direct calls, only respond to queue events

**Current flow:**
```
Timer (100ms) → BattalionService.updateBattleMovement() → MovementService + AttackService
```

**New flow:**
```
Timer (100ms) → BattleEventQueueService.processQueue() → Sequential event handling
```

**Manual Test:** Full battle scenarios with complex interactions
- **Expected:** Timer logs show "QUEUE: Processing battle tick" instead of service calls
- **Expected:** All battle actions flow through queue system
- **Expected:** Clean, sequential event logs with clear causality
- **Expected:** No race condition bugs under any battle scenario

**Success Criteria:**
- Complete elimination of immediate processing calls
- All battle actions processed through queue
- Deterministic behavior (same inputs = same outputs)
- Zero race conditions in complex multi-battalion scenarios

## Testing Strategy Per Phase

### Logging Requirements:
- **Queue Events:** Every event shows "QUEUE: Processing [EVENT_TYPE] (priority: [PRIORITY])"
- **Position Updates:** Show exact coordinates when movement interrupted  
- **Service Calls:** Delete logs from previous phase when moving to next phase
- **Event Flow:** Clear causality chain from trigger → queue → processing → results

### Manual Testing Focus:
- **Phase 1:** Sequential attack processing, basic queue functionality
- **Phase 2:** Immediate event handling, movement interruption
- **Phase 3:** Complete movement flow through queue
- **Phase 4:** Advanced pursuit behaviors, position precision  
- **Phase 5:** Full system integration, complex scenarios

### Success Validation:
Each phase must pass manual testing before proceeding to next phase. No skipping phases or testing incomplete integrations.

## Queue Event Types & Priorities

### IMMEDIATE Priority (Jump to Front, Process Right Now):
1. **NODE_CAPTURE** - When node reaches ±100%
   - **Immediate Actions:**
     - Stop all attacks on captured node
     - Interrupt all movements targeting captured node 
     - Update battalion positions to exact interruption point
     - Clear targeting data for captured node
   - **Queue Triggers:** Add RETARGET_REQUEST for each affected battalion
   - **Data:** `{ nodeIndex, newOwner, interruptedBattalionIds, attackingBattalionIds }`

2. **BATTALION_DESTRUCTION** - When battalion health ≤ 0
   - **Immediate Actions:**
     - Remove destroyed battalion from battle completely
     - Stop all targeting/attacking of destroyed battalion
     - Interrupt all movements targeting destroyed battalion
     - Clear all targeting data pointing to destroyed battalion
   - **Queue Triggers:** Add RETARGET_REQUEST for each targeting battalion
   - **Data:** `{ destroyedBattalionId, targetingBattalionIds }`

3. **BATTALION_MOVEMENT_START** - When battalion begins moving to new position
   - **Immediate Actions:**
     - Notify all battalions targeting this moving battalion
     - Recalculate pursuit paths to new destination
     - Update movement timing for pursuing battalions
   - **Queue Triggers:** Add MOVEMENT_UPDATE for each pursuing battalion
   - **Data:** `{ movingBattalionId, newDestination, pursuingBattalionIds }`

### HIGH Priority (Process Soon, After Immediate):
4. **ATTACK_EVENT** - Single attack from battalion to target
   - **Actions:** Apply damage, check for destruction/capture
   - **Queue Triggers:** May create NODE_CAPTURE or BATTALION_DESTRUCTION
   - **Data:** `{ attackerId, targetId, damage }`

5. **RETARGET_REQUEST** - Battalion needs new target after interruption
   - **Actions:** Find closest valid target, initiate movement
   - **Queue Triggers:** Creates MOVEMENT_START
   - **Data:** `{ battalionId, currentExactPosition, reason }`

### NORMAL Priority (FIFO Processing):
6. **MOVEMENT_UPDATE** - Pursuing battalion adjusts path to moving target
   - **Actions:** Recalculate path, update movement timing
   - **Data:** `{ battalionId, newTargetPosition, newPath }`

7. **MOVEMENT_COMPLETE** - Battalion arrives at destination
   - **Actions:** Update position, start attacking if valid target
   - **Data:** `{ battalionId, arrivedAtNode }`

### LOW Priority (Background Processing):
8. **POSITION_UPDATE** - Update battalion coordinates during movement
9. **STATE_SYNC** - Save battle state to database

## Key Implementation Details

### Event Processing Engine:
```typescript
class BattleEventQueueService {
  private immediateQueue: BattleEvent[] = [];    // NODE_CAPTURE, BATTALION_DESTRUCTION, BATTALION_MOVEMENT_START
  private highQueue: BattleEvent[] = [];         // ATTACK_EVENT, RETARGET_REQUEST  
  private normalQueue: BattleEvent[] = [];       // MOVEMENT_UPDATE, MOVEMENT_COMPLETE
  
  processQueue(battleId: string): void {
    // Process ALL immediate events first (they can add more events)
    while (this.immediateQueue.length > 0) {
      this.processEvent(this.immediateQueue.shift()!);
    }
    
    // Then process one high priority event
    if (this.highQueue.length > 0) {
      this.processEvent(this.highQueue.shift()!);
    }
    
    // Then process normal events
    if (this.normalQueue.length > 0) {
      this.processEvent(this.normalQueue.shift()!);
    }
  }
}
```

### Position Tracking:
- Replace movement state maps with queue-managed position updates
- Interruption events update position to EXACT interruption point
- Retargeting uses current position, not destination position

### Service Integration:
- Services become event processors, not direct callers
- `RetargetingService` called by queue, doesn't trigger movement directly
- `MovementService` receives movement commands from queue only
- `AttackService` processes individual attacks through queue

## Integration Points

### Services That Will SEND Events to Queue:
- `AttackService`: NODE_CAPTURE, BATTALION_DESTRUCTION, ATTACK_RESULT
- `MovementService`: MOVEMENT_COMPLETE, POSITION_UPDATE
- `CombatService`: ATTACK_RESULT (damage calculations)
- `BattleTimer`: BATTLE_PHASE_CHANGE

### Services That Will BE CALLED by Queue:
- `RetargetingService`: For RETARGET_REQUEST processing
- `MovementService`: For movement interruption and initiation
- `BattleService`: For state updates and validation
- `BattalionService`: For targeting state updates

## Critical Implementation Details:

### Position Tracking:
- **Exact Position Updates:** When movement is interrupted, battalion position must be updated to EXACT interruption point (not next node)
- **Real-time Coordinates:** Queue must track precise battalion coordinates during movement for accurate retargeting
- **Dynamic Pursuit:** Pursuing battalions continuously update paths based on target's real-time position

### Queue Processing Rules:
- **IMMEDIATE Events:** Jump to front, process synchronously before any other events
- **Cascade Events:** IMMEDIATE events can trigger other IMMEDIATE events (destruction → retargeting → movement)
- **No Interruption:** IMMEDIATE events cannot be interrupted by other events
- **Sequential Safety:** All events within same priority level process in strict FIFO order

### Data Consistency:
- **Fresh Battle State:** Each event processor must get latest battle state from database
- **Atomic Updates:** Position, targeting, and state changes happen atomically per event
- **Race Prevention:** Queue ensures only one event processes at a time per battle

## Critical Success Factors:

1. **Atomic Database Updates:** Each event processor must fetch fresh battle state
2. **Position Precision:** Movement interruption must calculate exact current position
3. **Event Ordering:** IMMEDIATE events must truly jump to front of queue
4. **No Bypassing:** All battle actions must go through queue (zero shortcuts)

## Expected Outcome:

- **Race Conditions Eliminated:** Sequential processing prevents simultaneous state changes
- **Deterministic Behavior:** Same events in same order = same results
- **Clean Debugging:** Event logs show exact sequence of what happened
- **Scalable Architecture:** Queue can handle any number of simultaneous battles

This is the right solution. The current system is broken by design - immediate processing of interdependent events will always create race conditions. Queue architecture fixes the fundamental problem.

## Authority Files Compliance:

### use-existing-first.mdc:
✅ **Checked existing services first** - Found `AttackService.retargetingQueue` already exists but incomplete  
✅ **Building on existing logic** - Extending current queue concept rather than replacing  
✅ **New file justified** - BattleEventQueueService will exceed 250 lines (estimated 275+)  

### use-authorities.mdc:  
✅ **Single responsibility** - BattleEventQueueService is sole authority for event sequencing  
✅ **Clear authority boundaries** - Services become event processors, queue manages flow  
✅ **Source of truth** - Queue state determines battle event processing order  

### intended.md Compliance:
✅ **Sequential Requirements:** "Multiple simultaneous captures are processed in sequence to avoid race conditions"  
✅ **Movement Interruption:** "If movement is interrupted by current target capture, stop immediately and retarget"  
✅ **Battalion Movement Dynamics:** Real-time pursuit coordination through IMMEDIATE priority events  
✅ **Server Authority:** All event processing calculated server-side

Each phase builds incrementally on intended.md requirements while maintaining testable functionality.