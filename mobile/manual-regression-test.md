# Manual Regression Test Checklist
## Steps 1.1 - 3.2

### Step 1.1: Node Ownership System
**Jest Coverage:** ✅ Array system, ownership logic, color updates
**Manual Checks Needed:**
- [ ] **Visual Verification:** Nodes change color immediately when battalions move over them
- [ ] **Color Accuracy:** User nodes are blue, enemy nodes are red, neutral nodes are gray
- [ ] **Smooth Transitions:** Color changes happen smoothly without flickering
- [ ] **Performance:** No lag when multiple nodes change ownership simultaneously

### Step 1.2: Control State Removal
**Jest Coverage:** ✅ No controlState references in code
**Manual Checks Needed:**
- [ ] **No Console Errors:** No "controlState is undefined" errors in console
- [ ] **App Stability:** App doesn't crash when battalions move or nodes change ownership
- [ ] **State Management:** All state updates work correctly without controlState dependency

### Step 1.3: Battalion Targeting Logic
**Jest Coverage:** ✅ Targeting calculations, distance logic
**Manual Checks Needed:**
- [ ] **Target Selection:** Battalions consistently target the closest enemy node
- [ ] **Target Switching:** Battalions switch targets when a closer enemy appears
- [ ] **Visual Feedback:** Battalions visibly move toward their targets
- [ ] **No Stuck Battalions:** All battalions are actively moving toward targets

### Step 1.4: Network Visualization
**Jest Coverage:** ✅ Network rendering, connection logic
**Manual Checks Needed:**
- [ ] **Network Visibility:** All network lines are visible and properly connected
- [ ] **Line Quality:** Network lines are crisp and not pixelated
- [ ] **Connection Accuracy:** Lines connect exactly between node centers
- [ ] **Performance:** Network renders smoothly without lag

### Step 2.1: Animation Coordination
**Jest Coverage:** ❌ No meaningful coverage (structural only)
**Manual Checks Needed:**
- [ ] **Deployment Phase:** Deployment zone fades in smoothly (500ms)
- [ ] **Countdown Transition:** Deployment fades out, network/battalions fade in (300ms/500ms)
- [ ] **Countdown Timer:** 3-second countdown displays and counts down correctly
- [ ] **Active Phase:** Countdown overlay fades out smoothly when reaching 0
- [ ] **Animation Smoothness:** No jerky or stuttering animations
- [ ] **Memory Management:** No performance degradation after multiple battle cycles

### Step 2.2: Battle Coordination Hook Activation
**Jest Coverage:** ❌ No coverage
**Manual Checks Needed:**
- [ ] **Hook Activation:** Battalions start moving immediately when countdown reaches 0
- [ ] **No Premature Movement:** Battalions don't move during countdown phase
- [ ] **Synchronization:** All battalions start moving at the same time
- [ ] **State Consistency:** Battle state properly transitions from countdown to active

### Step 2.3: Visual Transition Verification
**Jest Coverage:** ❌ No coverage
**Manual Checks Needed:**
- [ ] **Header Text:** Battle header shows "SYSTEM BREACH IN PROGRESS" during active phase
- [ ] **Timer Display:** 20-second battle timer is visible and counting down
- [ ] **UI Visibility:** All UI elements (network, battalions, timer) are fully visible
- [ ] **No Hidden Elements:** No partially visible or hidden UI components

### Step 3.1: Attack Range Intersection Precision
**Jest Coverage:** ✅ Range calculations, tolerance logic
**Manual Checks Needed:**
- [ ] **Precise Positioning:** Battalions stop exactly at attack range edge (not overshooting)
- [ ] **Visual Accuracy:** Battalions appear to be touching the target node edge
- [ ] **Consistent Behavior:** All battalions stop at the same relative distance from targets
- [ ] **No Overshooting:** No battalions move beyond their intended attack range

### Step 3.2: Network Line Movement Validation
**Jest Coverage:** ✅ Path validation utilities, network line detection
**Manual Checks Needed:**
- [ ] **Battalion Path Adherence:** Visually confirm that battalions only move along visible network lines (never "cut corners" or move directly between non-connected nodes).
- [ ] **No Off-Network Movement:** Confirm battalions never leave the network lines, even during rapid or complex path changes.
- [ ] **Path Correction:** If a battalion is forced to retarget or reroute, it still follows only valid network connections.
- [ ] **Visual Debug:** (Optional) Enable debug logs and confirm that "Network line adherence" logs show `isOnNetworkLine: true` and `pathValid: true` during all movement phases.
- [ ] **Multi-step Movement Paths:** For paths not valid in the current network topology (e.g., [0, 3, 4, 5, 8]), manually verify in the app that battalions do not attempt to traverse invalid connections.

### Step 3.3: Initial Targeting and Movement Setup (Manual Verification)
**Jest Coverage:** ✅ Initialization logic, target selection, movement calculations, attack setup
**Manual Checks Needed:**
- [ ] **Battalion Initialization:** Confirm all user and enemy battalions appear and are properly positioned at their starting nodes (0,1,2 for user; 6,7,8 for enemy).
- [ ] **Initial Target Selection:** Verify battalions only target neutral nodes (3,4,5) and follow network connections for targeting.
- [ ] **Movement Animation:** Confirm battalions smoothly animate along network lines toward their targets with proper speed.
- [ ] **Attack Initiation:** Confirm battalions immediately begin attacking once in position at attack range intersection.
- [ ] **Multiple Targeting:** Verify multiple battalions can target the same neutral node simultaneously.
- [ ] **Fallback Targeting:** If no connected neutral nodes are available, verify battalions target any available neutral node.

---

## How to Run This Checklist

1. **Start a new battle** from the Digital Barracks screen
2. **Deploy battalions** and observe Step 1.1-1.4 behaviors
3. **Watch the countdown** and verify Step 2.1-2.3 animations
4. **Observe battalion movement** and verify Step 3.1 precision
5. **Check console** for any errors or warnings
6. **Test multiple battles** to ensure consistency

## Expected Timeline
- **Steps 1.1-1.4:** Immediate (deployment phase)
- **Steps 2.1-2.3:** 3-5 seconds (countdown and transition)
- **Step 3.1:** 10-20 seconds (battalion movement to targets)

## Failure Indicators
- **Visual glitches:** Flickering, jerky animations, incorrect colors
- **Timing issues:** Delayed responses, out-of-sync animations
- **Positioning errors:** Battalions overshooting or undershooting targets
- **Performance problems:** Lag, stuttering, memory leaks
- **Console errors:** Any JavaScript errors or warnings 