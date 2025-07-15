# Node Behaviors and Advantages

## Node Types

### Permanent Nodes
- **User Nodes (0, 1, 2)**: Permanently controlled by user
- **Enemy Nodes (6, 7, 8)**: Permanently controlled by enemy
- **Behavior**: Cannot be captured or contested
- **Purpose**: Starting positions and safe zones for respective armies

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 1: Setup -> Node Types*

### Neutral Nodes (3, 4, 5)
- **Status**: Contestable by both sides
- **Capture Method**: Tug-of-war system (-100% to +100% progress)
- **Health**: 75% of total army strength assigned during setup
- **Purpose**: Provide tactical advantages to controlling army
- **Behavior**: Once captured, cannot be re-captured or contested

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 1: Setup -> 3-second countdown begins*
- *Referenced in battle-intentions.md -> Phase 2: Initial Targeting -> Neutral node targeting*
- *Referenced in battle-intentions.md -> Phase 3: Node Combat (Tug-of-War) -> Captured nodes cannot be attacked anymore*

## Neutral Node Capture System

### Tug-of-War Mechanics
- **Progress Range**: -100% (enemy control) to +100% (user control)
- **Starting Point**: 0% (neutral)
- **Capture Threshold**: ±100% progress
- **Attack Impact**: Each attack adds progress based on damage/health ratio

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 3: Node Combat (Tug-of-War) -> Progress system mechanics*

### Capture Process
1. **Initial State**: Neutral (0% progress)
2. **User Attacks**: Add positive progress toward +100%
3. **Enemy Attacks**: Add negative progress toward -100%
4. **Capture**: When progress reaches ±100%, node is captured
5. **Locked State**: Captured nodes cannot be recaptured during battle

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 3: Node Combat (Tug-of-War) -> Node capture mechanics*

## Node Advantages (To Be Implemented)

### Advantages
- **Controlled Nodes**: Provide stat bonuses to friendly battalions via connected network lines

## Node Health System

### Health Assignment
- **Calculation**: 75% of total army health (user + enemy)
- **Formula**: `Math.floor(total * 0.75)`
- **Timing**: Assigned during pre-battle setup phase
- **Scope**: Only neutral nodes receive health

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 1: Setup -> Neutral nodes get 75% health*

### Health Purpose
- **Capture Resistance**: Higher health = longer capture time
- **Strategic Value**: Health represents node's strategic importance
- **Balance**: Ensures nodes can't be captured too quickly

## Node Visual States

### Ownership Colors
- **User Controlled**: Blue (#4717F6)
- **Enemy Controlled**: Red (#FF4141)
- **Neutral**: Secondary color (gray)

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 3: Node Combat (Tug-of-War) -> Captured node color changes*

### Progress Indicators
- **Progress Bars**: Show capture progress during tug-of-war
- **Color Coding**: User progress (blue), enemy progress (red)
- **Visual Feedback**: Clear indication of current control state

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 3: Node Combat (Tug-of-War) -> Progress bar visual feedback*

## Network Topology

### Connection Rules
- **Fixed Connections**: Predefined network topology
- **Movement Constraint**: Battalions must follow connections

### Network Connections
- **Node 0 (top-left)**: Connects to nodes 3, 4
- **Node 1 (middle-left)**: Connects to nodes 3, 4, 5
- **Node 2 (bottom-left)**: Connects to nodes 4, 5
- **Node 6 (top-right)**: Connects to nodes 3, 4
- **Node 7 (middle-right)**: Connects to nodes 3, 4, 5
- **Node 8 (bottom-right)**: Connects to nodes 4, 5
- **Neutral nodes (3, 4, 5)**: Serve as connection hubs between user and enemy zones

**Cross-References**: 
- *Referenced in battle-intentions.md -> Phase 1: Setup -> Network Layout*
- *Referenced in battle-intentions.md -> Phase 2: Initial Targeting -> Connection constraints for targeting*

### Node Positions
- **User Zone**: Left side (nodes 0, 1, 2)
- **Neutral Zone**: Center (nodes 3, 4, 5)
- **Enemy Zone**: Right side (nodes 6, 7, 8)

**Cross-Reference**: *Referenced in battle-intentions.md -> Phase 1: Setup -> Battle screen loads showing the network*