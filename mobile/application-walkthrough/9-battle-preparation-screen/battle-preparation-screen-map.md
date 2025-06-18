# Battle Preparation Screen - User Flow Documentation

> **Technical Notes**: See [battle-preparation-screen-special-notes.md](./battle-preparation-screen-special-notes.md) for implementation details, security considerations, and future improvements.

## Table of Contents
- [Overview](#overview)
- [User Experience Flow](#user-experience-flow)
- [Main Components](#main-components)
  - [Battle Preparation Header](#battle-preparation-header)
  - [Swipeable Screens Container](#swipeable-screens-container)
  - [User Forces Screen](#user-forces-screen)
  - [Enemy Forces Screen](#enemy-forces-screen)
  - [Battalion Slots](#battalion-slots)
  - [Circle Slots](#circle-slots)
  - [Swipe Indicator](#swipe-indicator)
  - [Deploy Button](#deploy-button)
  - [Bot Selector Modal](#bot-selector-modal)
  - [Bot Type Cards](#bot-type-cards)
  - [Quantity Selector](#quantity-selector)
- [Scenarios & Outcomes](#scenarios--outcomes)
  - [Standard Flow (Happy Path)](#standard-flow-happy-path)
  - [Bot Assignment Scenarios](#bot-assignment-scenarios)
  - [Error Scenarios](#error-scenarios)
  - [Validation Scenarios](#validation-scenarios)
  - [Screen Navigation Scenarios](#screen-navigation-scenarios)
  - [Data Synchronization Scenarios](#data-synchronization-scenarios)
- [Screen Transitions](#screen-transitions)
- [Server Details](#server-details)
  - [Bot Assignment Endpoint](#bot-assignment-endpoint)
  - [Bot Data Fetching](#bot-data-fetching)
  - [Assignment Process](#assignment-process)
  - [Error Handling](#error-handling)
  - [Data Models](#data-models)
- [Related Screens](#related-screens)
  - [Navigation Flow](#navigation-flow)
  - [Data Dependencies](#data-dependencies)
  - [User Journey Integration](#user-journey-integration)
  - [Functional Relationships](#functional-relationships)
- [Complex Subsystems](#complex-subsystems)
  - [Advanced Animation System](#advanced-animation-system)
  - [State Synchronization Engine](#state-synchronization-engine)
  - [Assignment Validation System](#assignment-validation-system)
  - [Modal State Management](#modal-state-management)
  - [Cleanup and Resource Management](#cleanup-and-resource-management)
  - [Advanced Error Handling](#advanced-error-handling)
  - [Data Flow Architecture](#data-flow-architecture)

## Overview
The Battle Preparation Screen allows users to deploy their bot forces across available battalions before entering battle. Users can view both their forces and enemy forces across two swipeable screens, assign bots to battalions A and B, and initiate battle deployment.

## User Experience Flow
1. User navigates to Battle Preparation Screen from previous screen
2. Screen displays "BATTLE PREPARATION" title with animated swipe indicator
3. User sees their forces on first screen with available battalions A and B
4. User can swipe to view enemy forces on second screen
5. User can tap battalions A or B to assign bots via selector modal
6. User can tap "DEPLOY PURGE" button to start battle
7. User can close screen to return to previous screen

## Main Components

### Battle Preparation Header
- **Fixed Position**: Stays at top of screen during swipe navigation
- **Title**: "BATTLE PREPARATION" in blue (#4717F6) with text shadow
- **Styling**: Bold font, 32px size, centered alignment
- **Z-Index**: Positioned above all other content

### Swipeable Screens Container
- **Horizontal Scroll**: Full-width screens with paging enabled
- **Two Screens**: User Forces and Enemy Forces
- **Swipe Navigation**: Smooth horizontal scrolling between screens
- **No Indicators**: Hidden horizontal scroll indicators

### User Forces Screen
- **Title**: "[USER FORCES]" in green (#00FF41)
- **Layout**: 4 columns of battalion slots and circle slots
- **Available Battalions**: A and B (interactive, blue styling)
- **Locked Battalions**: C, D, E, F (grayed out, locked icon)
- **Circle Slots**: 3 special slots on right side (locked)

### Enemy Forces Screen
- **Title**: "[ENEMY FORCES]" in red (#FF4141)
- **Layout**: Mirrored layout with enemy styling
- **Enemy Battalions**: A and B (red styling, scan error text)
- **Locked Battalions**: C, D, E, F (grayed out, enemy styling)
- **Circle Slots**: 3 special slots on left side (enemy styling)

### Battalion Slots
- **Interactive Slots**: A and B (user forces) - touchable with blue border
- **Locked Slots**: C, D, E, F - grayed out with lock icon (🔒)
- **Enemy Slots**: Red styling with "[scan error]" text
- **Assignment Display**: Shows bot type, mark level, and quantity when assigned
- **Visual States**: Active (blue), Locked (gray), Enemy (red)

### Circle Slots
- **User Forces**: 3 slots on right side with lock icon (🔒)
- **Enemy Forces**: 3 slots on left side with "???" text
- **Styling**: Circular design with transparent background
- **Purpose**: Special unit slots (currently locked/unavailable)

### Swipe Indicator
- **Animated Arrow**: "⟶" symbol with pulse animation
- **Text**: "ENEMY FORCES" label
- **Position**: Top-right of User Forces screen
- **Animation**: 2 pulse cycles then steady low opacity
- **Color**: Green (#00FF41) to match User Forces theme

### Deploy Button
- **Text**: "DEPLOY PURGE" in blue (#4717F6)
- **Position**: Fixed at bottom of screen
- **Styling**: Blue border with transparent background
- **Action**: Initiates battle deployment
- **Accessibility**: Full-width touch target

### Bot Selector Modal
- **Trigger**: Tap on battalion A or B
- **Modal Type**: Full-screen overlay with fade animation
- **Title**: "SELECT BOTS" with battalion name
- **Bot Type Cards**: Breacher, Guardian, Phreak with available counts
- **Quantity Selector**: +/- buttons and direct input
- **Assignment Button**: "ASSIGN BOTS" (disabled until valid selection)

### Bot Type Cards
- **Types**: Breacher, Guardian, Phreak
- **Display**: Type name with available count in parentheses
- **Selection**: Visual feedback with blue glow and shadow
- **Interaction**: Tap to select bot type
- **Styling**: Dark background with blue border when selected

### Quantity Selector
- **Controls**: -25, -1, +1, +25 buttons with direct input
- **Input Field**: Number input with 3-digit limit
- **Validation**: Cannot exceed available bots or max battalion size (250)
- **Info Display**: Shows available count and maximum allowed
- **Real-time Updates**: Quantity updates immediately on input

## Scenarios & Outcomes

### Standard Flow (Happy Path)
1. **Screen Entry**: User navigates to Battle Preparation Screen
2. **Initial Load**: Screen displays with animated swipe indicator
3. **User Forces View**: User sees available battalions A and B
4. **Bot Assignment**: User taps battalion A or B
5. **Modal Opens**: Bot selector modal appears with available bot types
6. **Bot Selection**: User selects bot type (Breacher, Guardian, or Phreak)
7. **Quantity Selection**: User sets quantity using controls or direct input
8. **Assignment**: User taps "ASSIGN BOTS" to confirm assignment
9. **Modal Closes**: Assignment is saved and modal closes
10. **Visual Update**: Battalion slot shows assigned bots
11. **Battle Initiation**: User taps "DEPLOY PURGE" to start battle

### Bot Assignment Scenarios
1. **First Assignment**:
   - User selects battalion A
   - Chooses bot type and quantity
   - Assignment appears in battalion slot
   - Available bot count decreases

2. **Reassignment**:
   - User taps battalion with existing assignment
   - Previous assignment is cleared automatically
   - User can assign new bots
   - Previous bots return to available pool

3. **Zero Assignment**:
   - User sets quantity to 0
   - Assignment is cleared from battalion
   - Bots return to available pool
   - Battalion shows "+ Deploy" text

### Error Scenarios
1. **Network Failure During Assignment**:
   - Assignment fails silently
   - User can continue using the screen
   - Error logged to console
   - No user feedback shown

2. **Insufficient Bots**:
   - User tries to assign more bots than available
   - Quantity selector prevents invalid input
   - Maximum quantity limited to available count
   - Clear feedback shows available vs maximum

3. **Authentication Failure**:
   - Token expires during assignment
   - Assignment fails silently
   - User can continue using screen
   - No automatic logout triggered

4. **Server Error**:
   - Assignment returns 500 error
   - Error logged to console
   - User can retry assignment
   - No user feedback shown

### Validation Scenarios
1. **Quantity Limits**:
   - Cannot assign more than available bots
   - Cannot assign more than 250 bots per battalion
   - Cannot assign negative quantities
   - Direct input validates against limits

2. **Bot Type Validation**:
   - Only valid bot types (breacher, guardian, phreak)
   - Type selection required before quantity
   - Assignment button disabled until valid selection

3. **Battalion Limits**:
   - Only battalions A and B are assignable
   - C, D, E, F are locked and non-interactive
   - Enemy battalions are display-only

### Screen Navigation Scenarios
1. **Swipe Between Screens**:
   - User can swipe left to see enemy forces
   - User can swipe right to return to user forces
   - Smooth paging animation
   - No data loss during navigation

2. **Modal Interaction**:
   - Modal blocks background interaction
   - Close button dismisses modal
   - Assignment preserves state
   - No navigation during modal open

3. **Screen Exit**:
   - Close button returns to previous screen
   - Deploy button initiates battle
   - Assignments preserved during navigation
   - Cleanup runs on unmount

### Data Synchronization Scenarios
1. **Initial Load**:
   - Screen fetches current assignments
   - Clears any existing assignments
   - Shows fresh state
   - Handles missing data gracefully

2. **Assignment Updates**:
   - Real-time server synchronization
   - Local state updates immediately
   - Server confirms assignment
   - Handles concurrent updates

3. **Cleanup Process**:
   - Screen unmount triggers cleanup
   - Resets all battalion assignments
   - Non-blocking cleanup
   - Handles cleanup failures gracefully

## Screen Transitions
- **Entry Point**: [Previous Screen] → Battle Preparation Screen
- **Exit Points**: 
  - Close button → Previous screen
  - Deploy button → [Battle Screen](../6-battle-screen/battle-screen-map.md)
- **State Preservation**: Battalion assignments preserved during navigation
- **Navigation Behavior**: Modal-based bot selection, swipe navigation between screens

## Server Details

### Bot Assignment Endpoint
- **Endpoint**: `POST /api/battalions/assign`
- **Authentication**: Required (Bearer token)
- **Request Body**: `{ botType, quantity, battalionId }`
- **Response**: `{ success, updatedBotCount, previousAssignment }`
- **Error Handling**: 400 for insufficient bots, 500 for server errors

### Bot Data Fetching
- **Endpoint**: `GET /api/bots`
- **Authentication**: Required (Bearer token)
- **Response**: `{ bots, battalionAssignments }`
- **Data Flow**: Fetched on screen load and after assignments

### Assignment Process
1. **Validation**: Check available bots vs requested quantity
2. **Previous Assignment**: Return existing assignment to pool
3. **New Assignment**: Deduct bots from available pool
4. **Database Update**: Save assignment to battalionAssignments array
5. **Response**: Return updated bot count and previous assignment

### Error Handling
- **Network Failures**: Silent handling with console logging
- **Authentication Errors**: Logged but don't block user
- **Validation Errors**: 400 status with error message
- **Server Errors**: 500 status with generic error message

### Data Models
- **Bot Model**: Contains bots count and battalionAssignments array
- **Assignment Structure**: `{ battalionId, botType, quantity, markLevel }`
- **Bot Types**: breacher, guardian, phreak
- **Battalion IDs**: A, B (assignable), C, D, E, F (locked)

## Related Screens

### Navigation Flow
- **From**: [Home Screen](../4-home-screen/home-screen-map.md) - Battle initiation entry point
- **To**: [Battle Screen](../6-battle-screen/battle-screen-map.md) - Deploy button transitions here
- **Context**: [Bot Assembly Screen](../5-bot-assembly-screen/bot-assembly-screen-map.md) - Bot supply source

### Data Dependencies
- **BotsContext**: Shared with [Bot Assembly Screen](../5-bot-assembly-screen/bot-assembly-screen-map.md) for bot management
- **AuthContext**: Shared with all authenticated screens for token management
- **Bot Data**: Retrieved from same endpoints used by [Bot Assembly Screen](../5-bot-assembly-screen/bot-assembly-screen-map.md)
- **Assignment Data**: Unique to Battle Preparation Screen

### User Journey Integration
- **Pre-Battle**: Users build bots in [Bot Assembly Screen](../5-bot-assembly-screen/bot-assembly-screen-map.md)
- **Deployment**: Users assign bots in Battle Preparation Screen
- **Battle**: Users engage in combat in [Battle Screen](../6-battle-screen/battle-screen-map.md)
- **Post-Battle**: Users return to [Home Screen](../4-home-screen/home-screen-map.md)

### Functional Relationships
- **Bot Supply Chain**: [Bot Assembly Screen](../5-bot-assembly-screen/bot-assembly-screen-map.md) → Battle Preparation Screen → [Battle Screen](../6-battle-screen/battle-screen-map.md)
- **Battle Flow**: Home → Battle Preparation → Battle → Home
- **Data Consistency**: Bot counts synchronized across all screens
- **State Management**: Assignments preserved during navigation between screens

## Complex Subsystems

### Advanced Animation System
- **Multi-Stage Animation**: 2 pulse cycles followed by steady state
- **Interpolation**: Horizontal translation with opacity changes
- **Native Driver**: Uses native driver for 60fps performance
- **Cleanup Management**: Automatic cleanup on component unmount
- **Timing Precision**: 1500ms cycles with 500ms final transition

### State Synchronization Engine
- **Dual State Management**: Local assignments + server assignments
- **Atomic Operations**: Server updates with rollback capability
- **Concurrent Update Handling**: Race condition prevention
- **State Reconciliation**: Automatic sync between client and server
- **Error Recovery**: Graceful degradation on sync failures

### Assignment Validation System
- **Multi-Level Validation**: Client-side + server-side validation
- **Resource Tracking**: Real-time available bot calculation
- **Constraint Enforcement**: Battalion size limits and bot availability
- **Type Safety**: Strict TypeScript typing for all assignment data
- **Cross-Reference Validation**: Ensures data consistency across contexts

### Modal State Management
- **Complex Modal Lifecycle**: Open → Selection → Validation → Assignment → Close
- **State Reset Logic**: Automatic quantity reset on bot type change
- **Validation Integration**: Real-time validation feedback
- **Error Handling**: Graceful modal closure on assignment failures
- **Accessibility**: Proper focus management and keyboard navigation

### Cleanup and Resource Management
- **Multi-Phase Cleanup**: Local state + server state cleanup
- **Non-Blocking Operations**: Async cleanup that doesn't block UI
- **Error Isolation**: Cleanup failures don't affect user experience
- **Resource Tracking**: Proper memory and network resource cleanup
- **State Restoration**: Clean slate for next screen visit

### Advanced Error Handling
- **Silent Error Strategy**: Errors logged but don't block user flow
- **Graceful Degradation**: Functionality continues despite failures
- **Error Categorization**: Network, authentication, validation, server errors
- **Recovery Mechanisms**: Automatic retry and fallback strategies
- **User Experience Preservation**: No error messages shown to user

### Data Flow Architecture
- **Context Integration**: Seamless integration with BotsContext and AuthContext
- **Real-Time Updates**: Immediate UI updates with server confirmation
- **Optimistic Updates**: UI updates before server response
- **Rollback Capability**: Automatic rollback on server failures
- **Data Consistency**: Ensures consistency across all related screens 