# AI DIRECTIVES - RETARGETING & MOVEMENT IMPLEMENTATION

**CRITICAL RULES:**
- Work in SMALL batches - one phase at a time
- NEVER run server or client - user will test manually
- Use CLEAR debug logs to verify each piece
- Follow intended.md behavior exactly
- NO duplicate logic - single authority per feature
- Clear semantic naming to avoid conflicts
- VERY CLEAR comments throughout explaining connections

---

## CLARIFIED REQUIREMENTS FROM DISCUSSION

### TARGET RULES:
- **ONLY neutral nodes can be targeted** (no enemy-owned nodes ever)
- **Future:** Battalion-to-battalion combat (not this implementation)
- **Equidistant targets:** Random selection
- **Captured nodes become un-attackable** and owned by capturing party

### MOVEMENT & COMBAT RULES:
- **Battalions must stop to attack** - cannot attack while moving
- **Only battalions attacking captured node retarget** - others continue current attacks
- **Movement interruption:** Stop immediately and retarget if capture occurs during movement
- **Network lock-in:** ALL movement follows NETWORK_CONNECTIONS node-to-node
- **Attack range positioning:** Move to closest network node with line-of-sight to target

### RETARGETING TRIGGER:
- **Single trigger:** Node capture of the specific node being attacked
- **Future:** Multiple triggers (battalion destruction, multiple captures)

---

## 🚨 LOGIC HOLES IDENTIFIED AGAINST INTENDED.MD

### HOLE #1: MISSING MOVEMENT INTERRUPTION INTEGRATION
**INTENDED.MD:** "If movement is interrupted by another capture, stop immediately and retarget"
**CURRENT PLAN:** Movement interruption logic exists but no integration with capture triggers
**MISSING:** AttackService must check for moving battalions and interrupt them during captures

### HOLE #2: CROSS-NETWORK TARGETING & LINE-OF-SIGHT VALIDATION
**INTENDED.MD:** "Cross-network targeting is valid: Battalion at 0-3 line can target enemy at 5-8 line"
**CURRENT PLAN:** Line-of-sight validation was too restrictive - only checking direct connections
**CLARIFIED:** Line-of-sight means "reachable via network pathfinding" not "directly connected"
**SOLUTION:** PathfindingService validates network reachability, not direct line-of-sight

### HOLE #3: MOVEMENT SPEED STAT INTEGRATION
**INTENDED.MD:** "Movement follows their speed stats and takes time"
**CURRENT PLAN:** Uses MovementCalculationService.calculateMovementDuration(battalion)
**MISSING:** Verification that speed stats properly affect sequential movement timing
**SOLUTION:** Step-specific duration calculation based on distance and battalion.stats.speed

### HOLE #4: SIMULTANEOUS CAPTURE RACE CONDITIONS
**INTENDED.MD:** "Multiple simultaneous captures are processed in sequence to avoid race conditions"
**CURRENT PLAN:** Single capture → retargeting flow
**MISSING:** Retargeting queue system to handle rapid consecutive captures
**SOLUTION:** Implement retargeting task queue with sequential processing

### HOLE #5: SERVER AUTHORITY & CLIENT SYNCHRONIZATION
**INTENDED.MD:** "Server authority: All movement, targeting, and positioning calculated server-side"
**CURRENT PLAN:** Position updates in BattalionService
**CLARIFIED:** Server calculates everything, client receives updates for visual display only
**SOLUTION:** Enhanced server-side position tracking with structured client updates

---

## 📋 IMPLEMENTATION PHASES

### PHASE 1: FOUNDATION SETUP & OVERLAP RESOLUTION
**STATUS:** Ready to implement  
**DETAILS:** See [phase1.md](./phase1.md)
- Enhanced MovementState interface with movement type distinction
- AttackService selective battalion identification
- BattleResponseService retargeting data integration
- Service authority clarification and conflict resolution

### PHASE 2: PATHFINDING SERVICE WITH NETWORK LOCK-IN
**STATUS:** Ready to implement  
**DETAILS:** See [phase2.md](./phase2.md)
- BFS pathfinding algorithm with NETWORK_CONNECTIONS validation
- Cross-network targeting support (0→8, 1→5 via multi-hop paths)
- Network reachability validation instead of restrictive line-of-sight
- Foundation for proximity-based retargeting calculations

### PHASE 3: RETARGETING SERVICE IMPLEMENTATION
**STATUS:** Ready to implement  
**DETAILS:** See [phase3.md](./phase3.md)
- RetargetingService with proximity-based neutral node targeting
- Random tie-breaking for equidistant targets
- Retargeting queue system to prevent race conditions
- Integration with PathfindingService for distance calculations

### PHASE 4: SEQUENTIAL MOVEMENT WITH INTERRUPTION
**STATUS:** Ready to implement  
**DETAILS:** See [phase4.md](./phase4.md)
- Enhanced MovementService with initial vs retargeting movement types
- Sequential movement through multi-node paths with speed stat integration
- Movement interruption capability for capture scenarios
- Enhanced server authority with structured client position updates

### PHASE 5: TESTING FRAMEWORK & DEBUG ENDPOINTS
**STATUS:** Ready to implement  
**DETAILS:** See [phase5.md](./phase5.md)
- Debug endpoints for manual node capture and state inspection
- Combat loop temporary disable for isolated testing
- Comprehensive test scenarios for all system components
- Verification tools for cross-network targeting and movement interruption

---

## 🎯 IMPLEMENTATION APPROACH

### Work in Small Batches
- Implement one phase at a time completely before moving to the next
- Test each phase thoroughly with debug logs before proceeding
- User will manually run server and client, reporting logs and visual feedback

### Clear Communication & Comments
- Every function and service modification includes clear comments
- Debug logs explicitly show which system component is executing
- VERY CLEAR distinction between server authority and client display

### Current System State
The existing movement and targeting system works for basic scenarios. These phases extend it to support:
- **Cross-network targeting** (battalion at 0→3 line can target enemy at 5→8 line)
- **Retargeting after node capture** (proximity-based, neutral nodes only)  
- **Sequential pathfinding movement** (0 → 3 → 7 → 5 → 8 step by step)
- **Movement interruption** (stop immediately when capture occurs during movement)
- **Race condition prevention** (queue system for simultaneous captures)

### Server Authority Maintained
All calculations, pathfinding, retargeting, and position tracking happen server-side. Client receives structured updates for visual display only, ensuring no logic duplication between server and client.

