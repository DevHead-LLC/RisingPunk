## Step 1: User Login Flow

See: [`1-user-login-flow.md`](1-user-login-flow.md)

- User enters handle and access key in login form
- User clicks "JACK_IN" button
- App validates credentials and shows loading state
- Upon successful authentication, user is automatically taken to the Turf Screen (main game interface)

## Step 2: Turf to Home Navigation

See: [`2-turf-to-home-navigation.md`](2-turf-to-home-navigation.md)

- User sees the Turf Screen with various location icons (Home, Digital Barracks, Profile)
- User clicks on the "HOME" location icon (house icon with "HOME" label)
- Screen transitions from TurfScreen to HomeScreen, showing the Hack Rig and Bot Assembly modules

## Step 3: Hack Rig Exploit Prompt

See: [`3-hack-rig-exploit-prompt.md`](3-hack-rig-exploit-prompt.md)

- User sees the Hack Rig module on the HomeScreen with "HACK RIG" title and "Access the network" description
- User clicks on the Hack Rig module
- System shows an alert dialog with "System Breach Detected" message and cyberpunk-themed warning text
- Alert presents two options: "Cancel" or "EXECUTE EXPLOIT"
- If user clicks "EXECUTE EXPLOIT", screen transitions to Battle Preparation Screen
- If user clicks "Cancel", alert closes and user remains on HomeScreen

## Step 4: Battle Preparation to Battle

See: [`4-battle-preparation-to-battle.md`](4-battle-preparation-to-battle.md)

- User sees the Battle Preparation Screen with "BATTLE PREPARATION" title
- Screen shows two sections: "USER FORCES" and "ENEMY FORCES" (swipeable)
- User can assign bots to Battalion A and B slots (currently functional but not connected)
- **Future Implementation**: Battalion assignments from this screen will be mapped to specific node positions in battle (currently defaults to single battalion of each bot type per node)
- User clicks the "DEPLOY PURGE" button at the bottom
- Screen transitions to BattleGridScreen where the pre-battle countdown overlay will begin

## Step 5: Pre-Battle Countdown

See: [`5-pre-battle-countdown.md`](5-pre-battle-countdown.md)

- User arrives at BattleGridScreen after clicking "DEPLOY PURGE"
- Screen immediately shows a full-screen countdown overlay with dark background
- Large animated countdown number appears (3, 2, 1) with "BATTLE STARTING" text
- Countdown numbers fade in/scale up with spring animations
- After 3 seconds, countdown overlay disappears and battle phase begins
- Battle timer (20 seconds) starts immediately after countdown completes

## Step 6a: Battle Phase Transition

See: [`6a-battle-initial-setup.md`](6a-battle-initial-setup.md)

- Countdown overlay disappears after 3 seconds
- Battle timer (20 seconds) begins counting down immediately
- BattleGridScreen shows network with nodes and battalion positions
- User battalions appear on left side (nodes 0, 1, 2) with single battalion of each bot type per node (default configuration)
- Enemy battalions appear on right side (nodes 6, 7, 8) with single battalion of each bot type per node (default configuration)
- Neutral nodes (3, 4, 5) are in center with health bars showing 75% of total army strength
- Node ownership is visually indicated: blue for user nodes, red for enemy nodes, gray for neutral nodes

## Step 6b: Node Advantages Activation

See: [`6b-node-advantages-activation.md`](6b-node-advantages-activation.md)

- **Current behavior**: No node advantages are currently active - all battalions fight with base stats only
- **Future implementation**: When neutral nodes are captured, they will provide small stat bonuses to battalions attacking along connected network lines
- **No starting advantages**: User-owned nodes (0, 1, 2) and enemy-owned nodes (6, 7, 8) do not provide any bonuses to their respective battalions
- **Future visual indicators**: When implemented, controlled nodes will show subtle visual effects indicating active bonuses
- **Future dynamic updates**: When neutral nodes are captured later, they will immediately begin providing bonuses to battalions attacking along their connected network lines
- **Future network-based distribution**: Bonuses will only affect battalions attacking along network lines connected to controlled nodes

## Step 6c: Type Advantage System Activation

See: [`6c-type-advantage-system.md`](6c-type-advantage-system.md)

- **Type advantage calculation**: Rock-Paper-Scissors system affects all combat damage calculations (Guardian > Breacher > Phreak > Guardian)
- **Combat bonuses**: Advantaged types deal bonus damage and receive reduced damage from disadvantaged types
- **Equipment bonuses**: Attack, defense, health, and speed bonuses from equipment are added to base stats before combat
- **Visual indicators**: Combat animations show enhanced effects when type advantage is applied
- **Damage integration**: Type advantages and equipment bonuses are applied before final damage calculation

## Step 7: Initial Targeting Logic

See: [`7-initial-targeting.md`](7-initial-targeting.md)

- After countdown ends, battalions automatically select their first target
- Each battalion picks a random neutral node that is reachable via network connections from their starting position
- Targeting follows network topology - battalions can only target nodes connected to their network path
- Each battalion can only target ONE node at a time (single target rule)
- Multiple battalions can target the SAME node simultaneously (multiple attackers)
- This is the only time targeting is random - all subsequent targeting will be based on proximity
- No user input required - this is automatic targeting behavior
- Visual feedback shows which node each battalion is targeting

## Step 8a: Movement Initiation Logic

See: [`8a-movement-initiation-logic.md`](8a-movement-initiation-logic.md)

- Battalions immediately begin moving along network lines after random target assignment from Step 7
- Movement is constrained to network connections - battalions cannot move off-network
- Movement speed is determined by bot type stats (Guardian=9, Breacher=5, Phreak=7)
- Visual feedback shows battalions moving along network lines toward their randomly assigned targets
- Movement is continuous and smooth along the network path
- No diagonal or off-network movement allowed - strict network topology adherence

## Step 8b: Network Constraint Validation

See: [`8b-network-constraint-validation.md`](8b-network-constraint-validation.md)

- Movement is strictly constrained to network connections - battalions cannot move off-network
- No diagonal or off-network movement allowed - strict network topology adherence
- Visual feedback shows battalions moving along network lines toward their randomly assigned targets
- Movement is continuous and smooth along the network path
- Network topology enforcement prevents any movement outside the defined node connections

## Step 9: Attack Range Positioning System

See: [`9-attack-range-positioning.md`](9-attack-range-positioning.md)

- Battalions stop when their attack range intersects the target's center along the network path
- Attack range is determined by bot type stats (Guardian=4, Breacher=5, Phreak=9)
- Attack range is network-constrained - only extends along network lines, not as a circular radius
- Battalions stop partway along network lines when attack range reaches target center
- Visual feedback shows network-constrained attack range and positioning
- No off-network attack range projection - everything stays on network lines

## Step 10: Movement Completion

See: [`10-movement-completion.md`](10-movement-completion.md)

- Battalions complete their movement to the calculated attack range positions
- Movement follows the network paths established during initial movement initiation
- Battalions reach their final attack positions and prepare for combat
- Visual feedback shows movement completion and final positioning for combat

## Step 11a: Tug-of-War Combat System

See: [`11a-tug-of-war-combat-system.md`](11a-tug-of-war-combat-system.md)

- Battalions continuously attack neutral nodes (3, 4, 5) once they reach attack range
- **Speed-based attack timing**: Each battalion attacks at intervals based on their bot type's speed stat
  - Fast bots (high speed) attack more frequently with shorter delays
  - Slow bots (low speed) attack less frequently with longer delays
- **Tug-of-war mechanics**: Each attack adds progress based on damage/health ratio toward capture threshold
- Visual progress bars show capture progress from -100% (enemy control) to +100% (user control)
- Progress moves toward user side (blue) or enemy side (red) based on attack strength vs node health
- Captured nodes cannot be attacked or recaptured for the rest of the battle

## Step 11b: Node Ownership Management

See: [`11b-node-ownership-management.md`](11b-node-ownership-management.md)

- **Node health system**: Neutral nodes have health equal to 75% of total army strength, providing capture resistance
- **Capture threshold**: When progress reaches ±100%, node is captured and changes color permanently (blue=user, red=enemy)
- Captured nodes cannot be attacked or recaptured for the rest of the battle
- Node ownership is tracked in ownership arrays - prevents recapture during battle
- Visual feedback shows node color changes and permanent ownership state

## Step 12: Node Capture Completion & Ownership Transfer

See: [`12-node-capture-completion.md`](12-node-capture-completion.md)

- When a neutral node's progress bar reaches +100% (user) or -100% (enemy), the node is instantly captured
- The node changes color to indicate new ownership (blue for user, red for enemy)
- The progress bar locks and is no longer updated
- Node ownership is permanently transferred to the capturing side in ownership arrays
- **Multi-battalion retargeting**: ALL battalions attacking the captured node (from any side) stop attacking and immediately retarget
- **Capture event**: Node emits a captured event that triggers retargeting for all attacking battalions simultaneously
- **Single ownership**: Only one side can capture a node - tug-of-war ensures clear winner, no simultaneous captures possible
- Captured nodes cannot be attacked or recaptured for the rest of the battle
- Visual feedback: color transition, progress bar lock, all attacking battalions retargeting

## Step 13: Battalion Retargeting After Node Capture

See: [`13-battalion-retargeting-after-node-capture.md`](13-battalion-retargeting-after-node-capture.md)

- When a neutral node is captured, all battalions attacking that node immediately stop attacking
- Battalions automatically scan for new available targets (remaining neutral nodes or enemy battalions)
- **Proximity-based targeting**: Battalions select the closest available target via network pathfinding with no preference between neutral nodes and enemy battalions
- **Neutral node targeting**: Remaining neutral nodes always use tug-of-war system until captured, then become unavailable for targeting
- **Battalion targeting**: Enemy battalions use direct combat system (Steps 14a-14b) with dynamic positioning
- **Dynamic pathfinding**: Each battalion calculates shortest path to their new target using network connections
- Visual feedback shows battalions retargeting with new movement paths
- **Speed-based movement**: Battalions begin moving toward new targets at their bot type's movement speed
- **No user input required**: Retargeting is automatic and immediate

## Step 14a: Battalion Movement to Attack Range

See: [`14a-battalion-movement-to-attack-range.md`](14a-battalion-movement-to-attack-range.md)

- Battalions that have retargeted to enemy battalions begin moving along network lines toward their targets
- **Dynamic target tracking**: Each battalion maintains a connection to their target battalion's position
- **Real-time position updates**: When a target battalion moves, attacking battalions receive position updates
- **Network-constrained movement**: All movement follows network connections, no off-network movement
- **Speed-based movement**: Each battalion moves at their bot type's movement speed (Guardian=9, Breacher=5, Phreak=7)
- **Attack range positioning**: Battalions stop when their attack range intersects the target battalion's position
- **Visual feedback**: Movement paths update in real-time as target positions change
- **Target validation**: System continuously validates that target battalions still exist and are reachable

## Step 14b: Battalion Combat Engagement

See: [`14b-battalion-combat-engagement.md`](14b-battalion-combat-engagement.md)

- Battalions engage in direct combat when they reach attack range of enemy battalions
- **Speed-based attack timing**: Each battalion attacks at intervals based on their bot type's speed stat
  - Fast bots (high speed) attack more frequently with shorter delays
  - Slow bots (low speed) attack less frequently with longer delays
- **Real-time target monitoring**: System continuously monitors target battalion positions and health
- **Dynamic retargeting**: When a target battalion moves out of range or is destroyed, attackers immediately retarget
- **Damage calculation**: Each attack deals damage based on (Bot type strength + bonuses) × number of bots
- **Defense system**: Target battalion's defense percentage reduces incoming damage
- **Unit loss mechanics**: When a battalion takes damage, bot quantity is reduced using formula: (damage - health) ÷ (health per bot type) = units lost (rounded)
- **Visual feedback**: Health bars show battalion health decreasing, quantity numbers update in real-time
- **Combat animations**: Attack animations show battalions engaging in direct combat
- **Focus fire**: Multiple battalions can attack the same enemy battalion simultaneously

## Step 15a: Battalion Destruction System

See: [`15a-battalion-destruction-system.md`](15a-battalion-destruction-system.md)

- **Battalion destruction**: When a battalion's bot quantity reaches 0, it is instantly destroyed and removed from battle
- **Visual destruction feedback**: Destroyed battalions fade out with destruction animations and are removed from the network
- **Destruction detection**: System continuously monitors battalion health and triggers destruction when quantity reaches 0
- **Battle cleanup**: All battalions are removed, network returns to neutral state

## Step 15b: Victory Determination System

See: [`15b-victory-determination-system.md`](15b-victory-determination-system.md)

- **Victory condition monitoring**: System continuously checks for complete army elimination or 20-second timer expiration
- **Battle timer**: 20-second countdown starts immediately after 3-second countdown overlay completes and battle phase begins
- **Battle end detection**: Battle ends immediately when either all enemy battalions are destroyed OR 20-second timer reaches 0
- **Victory point calculation**: Side with fewer losses wins (based on bot mark values and units lost)
- **Tie-breaker**: If tied, enemy wins automatically (defender advantage) and user's single lowest-mark unit is 'saved' from destruction

## Step 16a: Victory Overlay Display

See: [`16a-victory-overlay-display.md`](16a-victory-overlay-display.md)

- **Victory overlay appearance**: After battle end detection, a full-screen overlay appears with dark background
- **Winner announcement**: Large text displays "VICTORY" (user wins) or "DEFEAT" (enemy wins) with appropriate styling
- **Battle statistics display**: Shows detailed battle results including units lost, victory points, battle duration, and performance metrics
- **Overlay dismissal**: User must actively choose an action to proceed - overlay cannot be dismissed by tapping outside

## Step 16b: Post-Battle Navigation

See: [`16b-post-battle-navigation.md`](16b-post-battle-navigation.md)

- **Rewards section**: Displays any rewards earned (experience, resources, achievements)
- **Action buttons**: User can choose "BATTLE AGAIN", "RETURN TO TURF", or "VIEW REPLAY"
- **Overlay dismissal**: User must actively choose an action to proceed - overlay cannot be dismissed by tapping outside

---

## Implementation Reference

See: [`appendix-a-implementation-reference.md`](appendix-a-implementation-reference.md)

**Complete implementation data including:**
- **Bot specifications**: Exact stats, lore, and advantages for Guardian/Breacher/Phreak
- **Mathematical formulas**: Node health, damage, unit loss calculations
- **Network topology**: Complete node connection mapping
- **Visual specifications**: Exact color codes and UI requirements
- **Testing configuration**: Enemy multipliers and temporary values
- **Type advantage system**: Rock-Paper-Scissors rules and multipliers