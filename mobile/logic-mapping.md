# Battalion Attack Animation

## Short Description
Handles attack flash animations and visual feedback when battalions attack targets

## Associated Files
- `AnimatedBattalion.tsx`

# Battalion Damage Animation  

## Short Description
Manages damage flash animations and visual feedback when battalions take damage

## Associated Files
- `AnimatedBattalion.tsx`

# Battalion Health Display

## Short Description
Renders health bars and manages health percentage calculations and critical health logging

## Associated Files
- `AnimatedBattalion.tsx`

# Battalion Visual Rendering

## Short Description
Handles the core visual appearance, positioning, and type/mark indicators for battalions

## Associated Files
- `AnimatedBattalion.tsx`

# Battalion Animation Ref System

## Short Description
Provides external access to battalion animation methods through React refs for battle coordination

## Associated Files
- `AnimatedBattalion.tsx`, `useBattleMovementAndAttacks.ts`

# Battalion Performance Optimization

## Short Description
Implements React.memo optimization and smart re-render logic to prevent unnecessary updates

## Associated Files
- `AnimatedBattalion.tsx`

# Battalion Styling System

## Short Description
Contains all StyleSheet definitions for battalion appearance, colors, and visual styling

## Associated Files
- `AnimatedBattalion.tsx`

# Battalion Deployment Zone Display

## Short Description
Renders the deployment zones on battle screen showing available battalions for each side

## Associated Files
- `BattalionDeploymentZone.tsx`

# Battalion Deployment Zone Styling

## Short Description
Contains styling for deployment zone positioning and battalion indicators within zones

## Associated Files
- `BattalionDeploymentZone.tsx`

# Battalion Slot Management

## Short Description
Handles individual battalion slot states including locked, active, enemy, and assignment display

## Associated Files
- `BattalionSlot.tsx`

# Battalion Slot Interaction

## Short Description
Manages touch interactions and visual feedback for battalion slot selection and deployment

## Associated Files
- `BattalionSlot.tsx`

# Battalion Assignment Display

## Short Description
Renders battalion assignment information including bot type, mark level, and quantity

## Associated Files
- `BattalionSlot.tsx`

# Battalion Slot Styling

## Short Description
Contains styling for different slot states including active, locked, enemy, and assignment displays

## Associated Files
- `BattalionSlot.tsx`

# Battle Animation Core System

## Short Description
Implements core animation timing principles with 60fps loop and battalion speed-based animations

## Associated Files
- `BattleAnimationSystem.tsx`

# Battle Animation Performance

## Short Description
Manages animation frame timing and cleanup for optimal battle animation performance

## Associated Files
- `BattleAnimationSystem.tsx`

# Battle Header Display

## Short Description
Renders battle status text and timer display for countdown and battle progress

## Associated Files
- `BattleHeader.tsx`

# Battle Header Styling

## Short Description
Contains styling for battle header positioning and text appearance

## Associated Files
- `BattleHeader.tsx`

# Battle Network Rendering

## Short Description
Renders the complete battle network with nodes and connection lines for battle visualization

## Associated Files
- `BattleNetwork.tsx`

# Battle Network Node Management

## Short Description
Manages individual network nodes with control states, health, and damage animations

## Associated Files
- `BattleNetwork.tsx`, `NetworkNode.tsx`

# Battle Network Control System

## Short Description
Handles node control state changes and progress tracking for battle objectives

## Associated Files
- `BattleNetwork.tsx`, `NetworkNode.tsx`, `useBattleControl.ts`, `BattleScreen.tsx`

# Battle Overlay Management

## Short Description
Manages countdown and results overlays with proper z-index layering for battle UI

## Associated Files
- `BattleOverlays.tsx`

# Battle Overlay Styling

## Short Description
Contains styling for overlay positioning and layering above battle elements

## Associated Files
- `BattleOverlays.tsx`

# Battle Results Display

## Short Description
Renders battle outcome with winner announcement and loss statistics for both sides

## Associated Files
- `BattleResultsOverlay.tsx`

# Battle Results Interaction

## Short Description
Handles continue button interaction and tiebreaker logic for battle completion

## Associated Files
- `BattleResultsOverlay.tsx`

# Battle Results Styling

## Short Description
Contains styling for results overlay with victory/defeat text and statistics display

## Associated Files
- `BattleResultsOverlay.tsx`

# Battle Units Rendering

## Short Description
Renders all battalions and deployment zones with proper layering and opacity controls

## Associated Files
- `BattleUnits.tsx`

# Battle Units Health Calculation

## Short Description
Calculates health percentages for battalions based on current health and max health values

## Associated Files
- `BattleUnits.tsx`

# Battle Units Attack Setup

## Short Description
Handles attack setup between battalions with proper targeting and user/enemy identification

## Associated Files
- `BattleUnits.tsx`

# Battle Units Styling

## Short Description
Contains styling for battle units overlay container and battalion positioning

## Associated Files
- `BattleUnits.tsx`

# Circle Slot Display

## Short Description
Renders circular locked slots with different visual states for user and enemy sides

## Associated Files
- `CircleSlot.tsx`

# Circle Slot Styling

## Short Description
Contains styling for circular slot appearance with user/enemy color differentiation

## Associated Files
- `CircleSlot.tsx`

# Battle Countdown Display

## Short Description
Renders countdown timer overlay with large animated text for battle start sequence

## Associated Files
- `CountdownOverlay.tsx`

# Battle Countdown Styling

## Short Description
Contains styling for countdown overlay with centered text and background effects

## Associated Files
- `CountdownOverlay.tsx`

# Data Stream Animation

## Short Description
Creates animated data particles that flow between two points with looping animation sequences

## Associated Files
- `DataStream.tsx`

# Data Stream Calculation

## Short Description
Calculates angle and distance for particle movement along network connections

## Associated Files
- `DataStream.tsx`

# Data Stream Styling

## Short Description
Contains styling for data stream particles with positioning and visual appearance

## Associated Files
- `DataStream.tsx`

# Network Lines Rendering

## Short Description
Renders SVG network connection lines between nodes with proper positioning and styling

## Associated Files
- `NetworkLines.tsx`

# Network Lines Data Streams

## Short Description
Integrates data stream animations with network lines for dynamic network visualization

## Associated Files
- `NetworkLines.tsx`

# Network Lines Performance

## Short Description
Uses useMemo optimization for efficient network line and data stream rendering

## Associated Files
- `NetworkLines.tsx`

# Network Node Damage System

## Short Description
Handles damage application, damage animations, and control progress tracking for network nodes

## Associated Files
- `NetworkNode.tsx`

# Network Node Visual Rendering

## Short Description
Renders network nodes with control states, pulse animations, and progress bars

## Associated Files
- `NetworkNode.tsx`

# Network Node Ref System

## Short Description
Provides external access to node damage and animation methods through React refs

## Associated Files
- `NetworkNode.tsx`

# Network Node Styling

## Short Description
Contains styling for network nodes including control states, animations, and progress bars

## Associated Files
- `NetworkNode.tsx`

# Battle Control Logic

## Short Description
Manages node control state transitions, damage application, and victory condition checking

## Associated Files
- `useBattleControl.ts`

# Battle Victory Detection

## Short Description
Checks victory conditions based on controlled node counts for both user and enemy sides

## Associated Files
- `useBattleControl.ts`

# Battle Initialization System

## Short Description
Handles initial battle setup including node positioning, battalion creation, and health calculations

## Associated Files
- `useBattleInitialization.ts`

# Battle Node Positioning

## Short Description
Manages initial node positions and control states for user, neutral, and enemy nodes

## Associated Files
- `useBattleInitialization.ts`

# Battle Battalion Setup

## Short Description
Creates initial battalion configurations with positioning, health, and animated values

## Associated Files
- `useBattleInitialization.ts`

# Battle Screen Orchestration

## Short Description
Coordinates all battle components, state management, and screen lifecycle for the main battle interface

## Associated Files
- `BattleScreen.tsx`

# Battle Timer Management

## Short Description
Handles battle countdown timer, time remaining display, and battle completion timing

## Associated Files
- `BattleScreen.tsx`

# Battle Loss Tracking

## Short Description
Tracks battalion losses, calculates loss points, and determines battle victor based on losses

## Associated Files
- `BattleScreen.tsx`

# Battle State Coordination

## Short Description
Manages battle initialization, phase transitions, and coordination between different battle systems

## Associated Files
- `BattleScreen.tsx`

# Battle Screen Styling

## Short Description
Contains styling for the main battle screen layout and component positioning

## Associated Files
- `BattleScreen.tsx`

# Authentication API

## Short Description
Handles user authentication, registration, profile management, and hack rig unlocking via API endpoints

## Associated Files
- `authApi.ts`

# Authentication State Management

## Short Description
Manages authentication tokens, user data, and API request headers for authenticated requests

## Associated Files
- `authApi.ts`, `baseApi.ts`

# Base API Configuration

## Short Description
Provides centralized API configuration, base URL, and common request headers for all API calls

## Associated Files
- `baseApi.ts`

# API Error Handling

## Short Description
Manages API error responses, status code handling, and error logging for network requests

## Associated Files
- `baseApi.ts`

# Bots API Management

## Short Description
Handles bot fetching, build state management, and battalion assignment via API endpoints

## Associated Files
- `botsApi.ts`

# Bot Build System

## Short Description
Manages bot building requests, build queue, and bot type assignments for battalion creation

## Associated Files
- `botsApi.ts`

# Map API Management

## Short Description
Handles map data fetching and player position updates via API endpoints

## Associated Files
- `mapApi.ts`

# Player Position Tracking

## Short Description
Manages player position updates and map state synchronization for navigation

## Associated Files
- `mapApi.ts`

# State Persistence System

## Short Description
Manages Redux state persistence to AsyncStorage with selective state saving and rehydration

## Associated Files
- `storage.ts`

# State Rehydration

## Short Description
Handles loading persisted state from AsyncStorage and error handling for state restoration

## Associated Files
- `storage.ts`

# Battle State Management

## Short Description
Manages Redux state for battle phases, battalions, nodes, and battle progression

## Associated Files
- `battleSlice.ts`

# Battalion State Management

## Short Description
Handles battalion deployment, positioning, targeting, and health updates in Redux state

## Associated Files
- `battleSlice.ts`

# Battle Node State Management

## Short Description
Manages node control states, team assignments, and control progress in Redux state

## Associated Files
- `battleSlice.ts`

# UI State Management

## Short Description
Manages UI state including map legend, modal visibility, and screen navigation

## Associated Files
- `uiSlice.ts`

# Map UI State Management

## Short Description
Handles map legend expansion state and map-related UI interactions

## Associated Files
- `uiSlice.ts`

# Modal State Management

## Short Description
Manages modal visibility states for hack rig alerts, battle results, and bot selector

## Associated Files
- `uiSlice.ts`

# Battle Type Definitions

## Short Description
Defines core TypeScript types and interfaces for the battle system including battalions, nodes, and targets

## Associated Files
- `battle.ts`

# Battalion Type System

## Short Description
Defines battalion types, positions, and path following properties for battle movement logic

## Associated Files
- `battle.ts`

# Battle Target System

## Short Description
Defines target types and properties for node and battalion targeting in battle scenarios

## Associated Files
- `battle.ts`

# Battle Resolution System

## Short Description
Calculates battle outcomes based on army composition, node control, and battalion effectiveness

## Associated Files
- `battleCalculator.ts`

# Battalion Power Calculation

## Short Description
Calculates battalion combat power based on type, quantity, and node control bonuses

## Associated Files
- `battleCalculator.ts`

# Battle Range Detection

## Short Description
Determines if units are within attack range using distance calculations between positions

## Associated Files
- `battleCalculator.ts`

# Battle Timing Constants

## Short Description
Defines timing constants for battle animations, cooldowns, delays, and attack intervals

## Associated Files
- `battleConstants.ts`

# Battle Configuration Constants

## Short Description
Defines battle system configuration including range multipliers, positioning offsets, and targeting priorities

## Associated Files
- `battleConstants.ts`

# Battle Calculation Utilities

## Short Description
Provides utility functions for calculating movement duration, attack intervals, ranges, and damage values

## Associated Files
- `battleUtils.ts`

# Battle Node Navigation

## Short Description
Handles node availability calculations and battalion movement pathfinding between nodes

## Associated Files
- `battleUtils.ts`

# Battle Key Management

## Short Description
Creates unique keys for battalion refs, attack intervals, and battle system identification

## Associated Files
- `battleUtils.ts`

# Battle Priority System

## Short Description
Sorts battalions by type priority for targeting and combat decision making

## Associated Files
- `battleUtils.ts`

# Battalion Health Calculation

## Short Description
Calculates battalion max health based on bot type and quantity for health management

## Associated Files
- `healthUtils.ts`

# Battalion Health Management

## Short Description
Handles battalion health updates, damage application, and destruction detection

## Associated Files
- `healthUtils.ts`

# Battalion Loss Tracking

## Short Description
Tracks battalion losses, updates quantities, and manages loss callbacks for battle statistics

## Associated Files
- `healthUtils.ts`, `useBattleMovementAndAttacks.ts`

# Node Health Initialization

## Short Description
Calculates initial node health based on total army composition for battle balance

## Associated Files
- `healthUtils.ts`

# Network Topology Definition

## Short Description
Defines the battle network structure with node connections and topology layout

## Associated Files
- `networkConstants.ts`

# Network Connection Management

## Short Description
Manages active connections, data streams, and node connectivity for battle network

## Associated Files
- `networkConstants.ts`

# Network Pathfinding Utilities

## Short Description
Provides utilities for finding connected nodes and network traversal for battalion movement

## Associated Files
- `networkConstants.ts`

# Battle Pathfinding Algorithm

## Short Description
Implements Dijkstra's algorithm for finding shortest paths between battle network nodes

## Associated Files
- `pathfinding.ts`, `useBattleMovementAndAttacks.ts`

# Path Reconstruction System

## Short Description
Reconstructs optimal paths from pathfinding results for battalion movement planning

## Associated Files
- `pathfinding.ts`

# Input Rendering Utility

## Short Description
Provides reusable input component with corner decoration for consistent UI styling

## Associated Files
- `renderInputWithCorner.tsx`

# Input Styling System

## Short Description
Handles input field styling, placeholder colors, and visual corner decorations

## Associated Files
- `renderInputWithCorner.tsx`

# Battle Movement and Attack System

## Short Description
Manages battalion movement, attack logic, targeting, and path following for both user and enemy battalions

## Associated Files
- `useBattleMovementAndAttacks.ts`

# Battle Targeting Logic

## Short Description
Implements target selection, retargeting, and prioritization for battalion actions

## Associated Files
- `useBattleMovementAndAttacks.ts`

# Battle Path Following

## Short Description
Implements path following, movement continuation, and path-based navigation for battalions

## Associated Files
- `useBattleMovementAndAttacks.ts`, `pathfinding.ts`

# Battle Attack Interval Management

## Short Description
Manages attack intervals, cleanup, and recurring attack logic for battalion and node combat

## Associated Files
- `useBattleMovementAndAttacks.ts`

# Battle Node Capture Handling

## Short Description
Handles node capture events, retargeting, and recently captured node memory

## Associated Files
- `useBattleMovementAndAttacks.ts`

# Battle Debug Logging

## Short Description
Provides debug logging and diagnostics for battle movement, targeting, and attack logic

## Associated Files
- `useBattleMovementAndAttacks.ts`

# Battle Performance Optimization

## Short Description
Uses memoization and ref management for performance in movement, targeting, and attack calculations

## Associated Files
- `useBattleMovementAndAttacks.ts`

# Battle State Machine

## Short Description
Manages battle phase transitions, state coordination, and animation value orchestration

## Associated Files
- `useBattleStateMachine.ts`

# Battle Phase Management

## Short Description
Handles battle phase state, countdowns, and transitions between deployment, countdown, active, and results

## Associated Files
- `useBattleStateMachine.ts`

# Battle Animation State Management

## Short Description
Owns and coordinates Animated.Value objects for network, deployment, battalion, countdown, and results overlays

## Associated Files
- `useBattleStateMachine.ts`


#POTENTIAL CONFLICTS?

# Battalion Animation Ref System

## Short Description
Provides external access to battalion animation methods through React refs for battle coordination

## Associated Files
- `AnimatedBattalion.tsx`, `useBattleMovementAndAttacks.ts`
# Battle Network Node Management

## Short Description
Manages individual network nodes with control states, health, and damage animations

## Associated Files
- `BattleNetwork.tsx`, `NetworkNode.tsx`
# Battle Network Control System

## Short Description
Handles node control state changes and progress tracking for battle objectives

## Associated Files
- `BattleNetwork.tsx`, `NetworkNode.tsx`, `useBattleControl.ts`, `BattleScreen.tsx`
# Battalion Loss Tracking

## Short Description
Tracks battalion losses, updates quantities, and manages loss callbacks for battle statistics

## Associated Files
- `healthUtils.ts`, `useBattleMovementAndAttacks.ts`
# Battle Pathfinding Algorithm

## Short Description
Implements Dijkstra's algorithm for finding shortest paths between battle network nodes

## Associated Files
- `pathfinding.ts`, `useBattleMovementAndAttacks.ts`
# Battle Path Following

## Short Description
Implements path following, movement continuation, and path-based navigation for battalions

## Associated Files
- `useBattleMovementAndAttacks.ts`, `pathfinding.ts`