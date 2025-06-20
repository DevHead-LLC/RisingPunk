# Battle Screen - User Flow Documentation

> **Technical Notes**: See [battle-screen-special-notes.md](./battle-screen-special-notes.md) for implementation details, security considerations, and future improvements.

## Table of Contents
- [Overview](#overview)
- [Entry Points](#entry-points)
- [Main Components](#main-components)
  - [BattleHeader](#battleheader)
  - [BattleNetwork](#battlenetwork)
  - [NetworkNode](#networknode)
  - [BattleUnits](#battleunits)
  - [AnimatedBattalion](#animatedbattalion)
  - [BattleOverlays](#battleoverlays)
  - [CountdownOverlay](#countdownoverlay)
  - [BattleResultsOverlay](#battleresultsoverlay)
  - [DataStream](#datastream)
  - [NetworkLines](#networklines)
  - [BattalionBotSelector](#battalionbotselector)
  - [BattalionDeploymentZone](#battaliondeploymentzone)
  - [BattalionSlot](#battalionslot)
  - [BattalionVisual](#battalionvisual)
- [User Experience Flow](#user-experience-flow)
  - [Initial Battle Load](#initial-battle-load)
  - [Pre-Battle Countdown](#pre-battle-countdown)
  - [Battle Execution](#battle-execution)
  - [Node Capture Mechanics](#node-capture-mechanics)
  - [Combat System](#combat-system)
  - [Battle Completion](#battle-completion)
- [Scenarios & Outcomes](#scenarios--outcomes)
  - [Standard Flow (Happy Path)](#standard-flow-happy-path)
  - [Edge Cases](#edge-cases)
  - [Error Scenarios](#error-scenarios)
  - [Battle Outcome Scenarios](#battle-outcome-scenarios)
  - [Node Capture Scenarios](#node-capture-scenarios)
  - [Battalion Combat Scenarios](#battalion-combat-scenarios)
  - [Animation and Performance Scenarios](#animation-and-performance-scenarios)
- [Screen Transitions](#screen-transitions)
- [Related Screens](#related-screens)
  - [Pre-Battle Screens](#pre-battle-screens)
  - [Battle Flow Integration](#battle-flow-integration)
  - [Post-Battle Navigation](#post-battle-navigation)
- [Technical Interactions](#technical-interactions)
  - [Animation System](#animation-system)
  - [State Machine](#state-machine)
  - [Combat System](#combat-system)
  - [Battle Calculator](#battle-calculator)
  - [Performance Monitoring](#performance-monitoring)
- [Screen Layout](#screen-layout)
- [User-Visible Features](#user-visible-features)
- [Complex Subsystems (Phase 5)](#complex-subsystems-phase-5)
  - [Advanced Animation System](#advanced-animation-system)
    - [Animation Controller Architecture](#animation-controller-architecture)
    - [Battalion Movement Animations](#battalion-movement-animations)
    - [Visual Effect Coordination](#visual-effect-coordination)
  - [State Machine Architecture](#state-machine-architecture)
    - [Phase Management](#phase-management)
    - [State Synchronization](#state-synchronization)
    - [Real-time Updates](#real-time-updates)
  - [Performance Monitoring System](#performance-monitoring-system)
    - [Frame Rate Monitoring](#frame-rate-monitoring)
    - [Memory Management](#memory-management)
    - [Network Performance](#network-performance)
  - [Combat Engine Architecture](#combat-engine-architecture)
    - [Damage Calculation System](#damage-calculation-system)
    - [Targeting and Movement](#targeting-and-movement)
    - [Combat Timing](#combat-timing)
  - [Network Topology System](#network-topology-system)
    - [Node Connection Matrix](#node-connection-matrix)
    - [Capture Mechanics](#capture-mechanics)
    - [Node Health System](#node-health-system)
  - [Victory Determination Engine](#victory-determination-engine)
    - [Loss Point Calculation](#loss-point-calculation)
    - [Real-time Scoring](#real-time-scoring)
    - [Performance Impact](#performance-impact)

## Overview
The Battle Screen is a complex real-time combat system where users engage in strategic battles against enemy forces. The screen features a network of nodes that can be captured, battalion deployment and movement, real-time combat animations, and victory determination based on loss calculations.

## Entry Points
- **From Turf Screen**: Via battle initiation button/area
- **From Battle Preparation Screen**: After setting up battalions
- **Direct Navigation**: Through app routing system

## Main Components

### BattleHeader
- **Purpose**: Battle timer and status information display
- **User Actions**: View battle timer and status text
- **Visual Elements**: Status text ("BATTLE STARTING" or "SYSTEM BREACH IN PROGRESS"), timer display
- **Positioning**: Absolute positioned at top of screen, centered
- **States**: Countdown mode (shows countdown number) or battle mode (shows seconds remaining)

### BattleNetwork
- **Purpose**: Network of 9 nodes with capture mechanics and connections
- **User Actions**: View network topology and node states
- **Visual Elements**: 9 nodes arranged in 3x3 grid, connection lines between nodes
- **Network Topology**: 
  - Horizontal connections: [0,3], [3,6], [1,4], [4,7], [2,5], [5,8]
  - Diagonal connections: [0,4], [1,3], [1,5], [2,4], [3,7], [4,6], [4,8], [5,7]
- **Layout**: Full screen overlay with z-index 1

### NetworkNode
- **Purpose**: Individual node with health, control states, and capture mechanics
- **User Actions**: View node health, control progress, and capture animations
- **Visual Elements**: Circular node with border, health bar, control progress bar, damage animations
- **States**: 
  - Neutral: Gray color, progress bar shows capture progress
  - User: Blue color (#4717F6), controlled by user
  - Enemy: Red color (#FF4141), controlled by enemy
- **Animations**: Pulse animation, damage flash animation, control progress bar

### BattleUnits
- **Purpose**: Battalion deployment and movement visualization
- **User Actions**: View battalion positions, health, and movement
- **Visual Elements**: Animated battalions, deployment zones, health indicators
- **Deployment Zones**: User side (left) and enemy side (right) with battalion slots
- **Battalion Display**: Shows type, quantity, health percentage, and mark level

### AnimatedBattalion
- **Purpose**: Individual battalion with movement and combat animations
- **User Actions**: View battalion movement, attacks, and health
- **Visual Elements**: Battalion icon, health bar, movement animations, attack effects
- **States**: Moving, attacking, damaged, destroyed
- **Animations**: Movement along paths, attack animations, damage effects

### BattleOverlays
- **Purpose**: UI overlays for countdown, results, and battle information
- **User Actions**: View countdown, battle results, and close battle
- **Visual Elements**: Countdown overlay, results overlay, close button
- **Z-Index**: 10 (appears above all other elements)

### CountdownOverlay
- **Purpose**: Pre-battle countdown timer (3-2-1)
- **User Actions**: View countdown before battle starts
- **Visual Elements**: Large countdown numbers, fade animations
- **Timing**: 1-second intervals, triggers battle start on completion

### BattleResultsOverlay
- **Purpose**: Victory/defeat results display with statistics
- **User Actions**: View battle results and close battle
- **Visual Elements**: Winner announcement, loss points, continue button
- **Information**: Winner (user/enemy), user loss points, enemy loss points

### DataStream
- **Purpose**: Visual data stream effects for atmosphere
- **User Actions**: View atmospheric visual effects
- **Visual Elements**: Animated data streams, particle effects
- **Performance**: Optimized for smooth animation

### NetworkLines
- **Purpose**: Connection lines between network nodes
- **User Actions**: View network topology connections
- **Visual Elements**: Lines connecting nodes based on network topology
- **Connections**: Predefined connection matrix for 9-node network

### BattalionBotSelector
- **Purpose**: Bot selection interface for battalion configuration
- **User Actions**: Select bot types and quantities for battalions
- **Visual Elements**: Bot type cards, quantity selectors, deployment controls
- **Components**: BotTypeCard, QuantitySelector, deployment interface

### BattalionDeploymentZone
- **Purpose**: Battalion deployment area with slots
- **User Actions**: View deployment zones and battalion assignments
- **Visual Elements**: Deployment slots, battalion assignments, side indicators
- **Layout**: Left side (user), right side (enemy)

### BattalionSlot
- **Purpose**: Individual battalion slot interface
- **User Actions**: View battalion information and status
- **Visual Elements**: Slot container, battalion info, status indicators
- **Information**: Bot type, quantity, health, status

### BattalionVisual
- **Purpose**: Battalion visual representation
- **User Actions**: View battalion appearance and status
- **Visual Elements**: Battalion icon, health bar, status indicators
- **States**: Healthy, damaged, destroyed

## User Experience Flow

### Initial Battle Load
1. Screen displays with battle header showing "BATTLE STARTING"
2. Countdown overlay appears with "3" and begins countdown
3. Network nodes appear in initial positions (user controls left 3 nodes)
4. Battalion deployment zones show on left and right sides
5. Battle timer shows 20 seconds remaining

### Pre-Battle Countdown
1. Countdown displays "3" for 1 second
2. Countdown changes to "2" for 1 second
3. Countdown changes to "1" for 1 second
4. Countdown disappears and battle begins
5. Header changes to "SYSTEM BREACH IN PROGRESS"

### Battle Execution
1. Battalions begin moving toward enemy positions
2. Network nodes show health bars and control progress
3. Battalions engage in combat with attack animations
4. Nodes take damage and show capture progress
5. Control states change as nodes are captured
6. Battle timer counts down from 20 seconds

### Node Capture Mechanics
1. Neutral nodes show progress bars for capture
2. User attacks increase blue progress bar
3. Enemy attacks increase red progress bar
4. When progress reaches 100%, node changes control
5. Captured nodes show new color and lock state
6. Battalions targeting captured nodes find new targets

### Combat System
- **useBattleMovementAndAttacks Hook**: Handles combat calculations, damage, and battalion movement
- **Damage Calculation**: Base damage × battalion quantity
- **Attack Intervals**: 1-second attack cycles with damage application
- **Target Management**: Automatic target selection and switching

### Battle Completion
1. Timer reaches 0 seconds
2. Battle results overlay appears
3. Winner determined by loss point calculation
4. Results show winner, user loss points, enemy loss points
5. Continue button allows user to close battle
6. Battle completion callback triggered

## Scenarios & Outcomes

### Standard Flow (Happy Path)
1. **Battle Initialization**: Screen loads with countdown overlay
2. **Countdown Sequence**: 3-2-1 countdown with fade animations
3. **Battle Start**: Battalions begin movement and combat
4. **Node Capture**: Neutral nodes captured by user and enemy forces
5. **Combat Resolution**: Battalions engage in real-time combat
6. **Timer Expiration**: 20-second timer reaches zero
7. **Victory Determination**: Loss points calculated to determine winner
8. **Results Display**: Battle results overlay shows winner and statistics

### Edge Cases
1. **All Nodes Captured Early**: Battle continues until timer expires
2. **No Battalions Remaining**: Battle ends immediately with loss point calculation
3. **Timer Expires During Animation**: Battle completion waits for animation finish
4. **Equal Loss Points**: Defending party (enemy) wins ties
5. **Single Node Remaining**: Final node capture determines control

### Error Scenarios
1. **Animation Failure**:
   - Animation system fails to initialize
   - Error: Battle continues without animations
   - Fallback: Static display with functional gameplay
   - Recovery: Animations resume on next battle

2. **State Synchronization Error**:
   - Component state becomes inconsistent
   - Error: Visual glitches or incorrect displays
   - Fallback: State reset to last known good state
   - Recovery: Automatic state correction

3. **Performance Degradation**:
   - Too many concurrent animations
   - Error: Frame rate drops, animations stutter
   - Fallback: Reduced animation complexity
   - Recovery: Animation throttling and cleanup

4. **Memory Leak**:
   - Timers or intervals not properly cleaned up
   - Error: Increasing memory usage over time
   - Fallback: Automatic cleanup on component unmount
   - Recovery: Memory usage returns to normal

5. **Component Render Failure**:
   - Individual components fail to render
   - Error: Missing visual elements
   - Fallback: Error boundaries prevent full crash
   - Recovery: Component re-renders on state change

### Battle Outcome Scenarios
1. **User Victory**:
   - User loss points < Enemy loss points
   - Result: "VICTORY" displayed with user statistics
   - Animation: Victory celebration effects
   - Callback: onBattleComplete('user') triggered

2. **Enemy Victory**:
   - User loss points > Enemy loss points
   - Result: "DEFEAT" displayed with enemy statistics
   - Animation: Defeat effects
   - Callback: onBattleComplete('enemy') triggered

3. **Tie Game**:
   - User loss points = Enemy loss points
   - Result: "DEFEAT" (defending party wins ties)
   - Animation: Defeat effects
   - Callback: onBattleComplete('enemy') triggered

### Node Capture Scenarios
1. **User Node Capture**:
   - User attacks neutral node
   - Progress bar fills blue (positive direction)
   - At 100%: Node changes to blue, locks, user gains control
   - Battalions targeting node find new targets

2. **Enemy Node Capture**:
   - Enemy attacks neutral node
   - Progress bar fills red (negative direction)
   - At -100%: Node changes to red, locks, enemy gains control
   - Battalions targeting node find new targets

3. **Contested Node**:
   - Both user and enemy attack same node
   - Progress bar fluctuates between positive and negative
   - Winner determined by total damage dealt
   - Node locks when one side reaches 100%

4. **Node Health Depletion**:
   - Node takes damage from multiple sources
   - Health bar decreases with each attack
   - Node becomes vulnerable to capture
   - Capture progress accelerates with lower health

### Battalion Combat Scenarios
1. **Battalion Destruction**:
   - Battalion health reaches 0
   - Battalion disappears from battlefield
   - Loss points calculated based on mark level
   - Remaining battalions find new targets

2. **Battalion Movement**:
   - Battalions move along network connections
   - Movement animations show progress along paths
   - Battalions stop at target nodes
   - Movement speed varies by battalion type

3. **Battalion Targeting**:
   - Battalions automatically target nearest enemies
   - Range calculations determine valid targets
   - Targeting updates when enemies move or are destroyed
   - Attack animations show targeting

4. **Battalion Health Management**:
   - Health bars update in real-time
   - Damage calculations reduce health gradually
   - Visual effects show damage taken
   - Health affects combat effectiveness

### Animation and Performance Scenarios
1. **Smooth Animation Performance**:
   - All animations run at 60fps
   - Hardware acceleration enabled
   - Minimal frame drops during battle
   - Memory usage remains stable

2. **Animation Coordination**:
   - Multiple animations synchronized
   - Transitions between battle phases smooth
   - Animation completion triggers state changes
   - Proper cleanup prevents memory leaks

3. **Animation Failure Recovery**:
   - Failed animations don't crash battle
   - Fallback animations provide visual feedback
   - State updates continue despite animation issues
   - Performance monitoring detects issues

## Screen Transitions
- **Entry Points**: Turf Screen, Battle Preparation Screen, direct navigation
- **Exit Points**: Continue button in results overlay
- **Navigation Triggers**: Battle completion callback
- **State Preservation**: Battle state not preserved (fresh start each time)
- **Form Switching**: No form switching behavior (single battle interface)

## Related Screens

### Pre-Battle Screens
- **[Turf Screen](../3-turf-screen/turf-screen-map.md)**: Main hub for accessing battle preparation
- **[Home Screen](../4-home-screen/home-screen-map.md)**: Access to Hack Rig and battle initiation
- **[Bot Assembly Screen](../5-bot-assembly-screen/bot-assembly-screen-map.md)**: Bot management and battalion preparation

### Battle Flow Integration
- **Battle Preparation**: Users configure battalions before entering battle
- **Bot Assembly**: Provides bots needed for battalion creation
- **Turf Navigation**: Central hub for accessing all battle-related features
- **Home Screen**: Alternative entry point for battle initiation

### Post-Battle Navigation
- **Results Processing**: Battle results affect user progression
- **Return to Turf**: Users return to main hub after battle completion
- **Bot Management**: Battle losses may require rebuilding bots
- **Progression Tracking**: Battle outcomes unlock new features

## Technical Interactions

### Animation System
- **useBattleAnimations Hook**: Manages all battle-related animations
- **Animation Values**: networkOpacity, deploymentOpacity, battalionOpacity, countdownOpacity, resultsOpacity
- **Animation Functions**: startBattleTransition(), showBattleResults(), showNetwork()
- **Coordination**: Parallel animations for smooth transitions

### State Machine
- **useBattleStateMachine Hook**: Manages battle phase transitions
- **Phases**: initializing → deployment → countdown → active → complete → results
- **Transitions**: Automatic phase progression with animation coordination
- **State Management**: Centralized state for all battle components

### Combat System
- **useBattleMovementAndAttacks Hook**: Handles combat calculations, damage, and battalion movement
- **Damage Calculation**: Base damage × battalion quantity
- **Attack Intervals**: 1-second attack cycles with damage application
- **Target Management**: Automatic target selection and switching

### Battle Calculator
- **resolveBattle Function**: Determines battle winner
- **Loss Point Calculation**: Mark-based point system (Mark 1=1pt, Mark 2=2pts, etc.)
- **Range Checking**: Distance-based attack range validation
- **Battalion Power**: Type-based power calculations

### Performance Monitoring
- **Animation Performance**: Frame rate monitoring and optimization
- **Memory Management**: Proper cleanup of timers and intervals
- **State Synchronization**: Consistent state across all components
- **Error Recovery**: Graceful handling of failures

## Screen Layout
- **Header**: Battle timer and status (top, absolute positioned)
- **Network Area**: 9-node network with connections (center, full screen)
- **Battalion Area**: Battalion deployment and movement (overlay, z-index 5)
- **Overlays**: Countdown, results, and UI elements (absolute positioned, z-index 10)
- **Full Screen**: Immersive battle experience

## User-Visible Features
- Real-time battle timer (20 seconds)
- Network of 9 nodes with capture mechanics
- Battalion movement and combat animations
- Node health and control progress tracking
- Victory determination based on loss points
- Pre-battle countdown (3-2-1)
- Battle results with winner/loser display
- Visual effects and animations throughout battle
- Attack range indicators
- Data stream visual effects

## Complex Subsystems (Phase 5)

### Advanced Animation System
The Battle Screen implements a sophisticated animation system that coordinates multiple concurrent animations with performance optimization and fallback mechanisms.

#### Animation Controller Architecture
- **Frame Management**: Uses requestAnimationFrame with 60fps target and fallback to 10fps
- **Animation Queue**: Manages multiple concurrent animations with proper timing
- **Performance Monitoring**: Tracks frame timing and warns when frames exceed 16ms
- **Fallback System**: Automatic fallback to interval-based updates when animation frames fail

#### Battalion Movement Animations
- **Path Interpolation**: Smooth movement along network connections using cubic easing
- **Position Updates**: Real-time position updates with 60fps precision
- **Animation Completion**: Proper cleanup and state updates when animations finish
- **Attack Animations**: Special attack sequences with return-to-position logic

#### Visual Effect Coordination
- **Damage Animations**: Flash effects on nodes when taking damage
- **Capture Progress**: Animated progress bars for node capture
- **Pulse Effects**: Continuous pulse animations for active nodes
- **Transition Effects**: Smooth transitions between battle phases

### State Machine Architecture
The battle system uses a sophisticated state machine that manages complex phase transitions and state synchronization.

#### Phase Management
- **6 Battle Phases**: initializing → deployment → countdown → active → complete → results
- **Transition Validation**: Ensures only valid phase transitions occur
- **State Persistence**: Maintains state across component re-renders
- **Subscriber System**: Notifies all components of state changes

#### State Synchronization
- **Update Queue**: Queues state updates to prevent race conditions
- **Batch Processing**: Processes multiple updates efficiently
- **Error Recovery**: Handles failed state updates gracefully
- **Memory Management**: Proper cleanup of timers and subscriptions

#### Real-time Updates
- **Timer Management**: 20-second battle timer with automatic phase transitions
- **Node Control**: Tracks node capture progress and control changes
- **Battalion Health**: Real-time health updates with damage calculations
- **Victory Conditions**: Automatic victory determination when timer expires

### Performance Monitoring System
A comprehensive performance monitoring system tracks and optimizes battle performance in real-time.

#### Frame Rate Monitoring
- **60fps Target**: Maintains target frame rate with automatic detection
- **Frame Drop Detection**: Logs when frame rate drops below 55fps
- **Performance Metrics**: Tracks average frame time and performance trends
- **Real-time Alerts**: Warns when performance degrades significantly

#### Memory Management
- **Memory Usage Tracking**: Monitors JavaScript heap usage
- **Memory Warnings**: Alerts when memory usage exceeds thresholds
- **Garbage Collection**: Tracks memory cleanup and optimization
- **Memory Leak Detection**: Identifies potential memory leaks

#### Network Performance
- **Latency Monitoring**: Tracks network request latency
- **Error Tracking**: Counts and categorizes network errors
- **Connection Quality**: Monitors connection stability
- **Retry Logic**: Handles network failures gracefully

### Combat Engine Architecture
The combat system implements real-time damage calculations and battalion management with complex targeting logic.

#### Damage Calculation System
- **Base Damage**: Type-based damage calculations (breacher: 8, guardian: 6, phreak: 7)
- **Quantity Multipliers**: Damage scales with battalion quantity
- **Node Control Bonuses**: 1.5x damage multiplier for controlled nodes
- **Health Tracking**: Real-time health updates with destruction detection

#### Targeting and Movement
- **Automatic Targeting**: Battalions automatically target nearest enemies
- **Range Calculations**: Distance-based attack range validation
- **Pathfinding**: Movement along network connections with obstacle avoidance
- **Target Switching**: Automatic target changes when enemies are destroyed

#### Combat Timing
- **Attack Intervals**: 1-second attack cycles with damage application
- **Animation Synchronization**: Combat animations synchronized with damage
- **State Updates**: Real-time state updates during combat
- **Performance Optimization**: Efficient combat calculations

### Network Topology System
The 9-node network implements complex connection management and capture mechanics.

#### Node Connection Matrix
- **16 Connections**: 6 horizontal + 10 diagonal connections
- **Connection Validation**: Ensures valid connections between nodes
- **Pathfinding Support**: Provides routes for battalion movement
- **Visual Representation**: Lines drawn between connected nodes

#### Capture Mechanics
- **Progress Tracking**: Real-time capture progress for neutral nodes
- **Control Thresholds**: 75% capture threshold for node control
- **Damage Accumulation**: Tracks damage by team for capture calculation
- **State Transitions**: Smooth transitions between neutral, user, and enemy control

#### Node Health System
- **Health Tracking**: Individual node health with damage accumulation
- **Vulnerability**: Nodes become more vulnerable to capture when damaged
- **Recovery**: Health regeneration when not under attack
- **Destruction**: Complete node destruction with loss of control

### Victory Determination Engine
A sophisticated system that calculates battle outcomes based on multiple factors.

#### Loss Point Calculation
- **Mark-based Scoring**: Mark 1=1pt, Mark 2=2pts, Mark 3=3pts, Mark 4=4pts
- **Battalion Destruction**: Points awarded for destroying enemy battalions
- **Node Control**: Points for controlling nodes at battle end
- **Tie Resolution**: Defending party wins in case of ties

#### Real-time Scoring
- **Live Updates**: Score updates in real-time during battle
- **Visual Feedback**: Score display with winner prediction
- **Final Calculation**: Comprehensive scoring at battle end
- **Result Display**: Clear victory/defeat determination

#### Performance Impact
- **Efficient Calculations**: Optimized scoring algorithms
- **Memory Management**: Minimal memory footprint for scoring
- **Real-time Updates**: Smooth score updates without performance impact
- **Error Handling**: Graceful handling of calculation errors 