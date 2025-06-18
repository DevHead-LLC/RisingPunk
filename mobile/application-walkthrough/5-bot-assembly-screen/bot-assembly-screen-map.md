# Bot Assembly Screen - User Flow Documentation

> **Technical Notes**: See [bot-assembly-screen-special-notes.md](./bot-assembly-screen-special-notes.md) for implementation details, security considerations, and future improvements.

## Table of Contents
- [Overview](#overview)
- [Entry Points](#entry-points)
- [Main Components](#main-components)
  - [BotAssemblyHeader](#botassemblyheader)
  - [LevelSection](#levelsection)
  - [BotTypeCard](#bottypecard)
  - [BuildSection](#buildsection)
  - [BuildControls](#buildcontrols)
  - [BuildProgressBar](#buildprogressbar)
  - [BuildStatus](#buildstatus)
  - [BuildTimer](#buildtimer)
  - [BotDescription](#botdescription)
- [User Experience Flow](#user-experience-flow)
  - [Initial Screen Load](#initial-screen-load)
  - [Bot Selection Process](#bot-selection-process)
  - [Building Process](#building-process)
  - [Build Completion](#build-completion)
- [Scenarios & Outcomes](#scenarios--outcomes)
  - [Standard Flow (Happy Path)](#standard-flow-happy-path)
  - [Edge Cases](#edge-cases)
  - [Error Scenarios](#error-scenarios)
  - [Form Validation Scenarios](#form-validation-scenarios)
  - [Network Failure Scenarios](#network-failure-scenarios)
  - [Screen State Management Scenarios](#screen-state-management-scenarios)
  - [Animation and Performance Scenarios](#animation-and-performance-scenarios)
- [Complex Subsystems Analysis](#complex-subsystems-analysis)
  - [Build Queue Management System](#build-queue-management-system)
  - [Real-time Progress Tracking System](#real-time-progress-tracking-system)
  - [Bot Type System with Level Unlocking](#bot-type-system-with-level-unlocking)
  - [Balance Integration System](#balance-integration-system)
  - [Component State Coordination System](#component-state-coordination-system)
- [Screen Transitions](#screen-transitions)
- [Related Screens](#related-screens)
  - [Home Screen](#home-screen)
  - [Turf Screen](#turf-screen)
  - [Battle Screen](#battle-screen)
  - [Profile Screen](#profile-screen)
- [Server Details](#server-details)
  - [Data Fetched](#data-fetched)
  - [Server Requests Triggered](#server-requests-triggered)
  - [Expected Server Responses](#expected-server-responses)
  - [Error States User Might See](#error-states-user-might-see)
  - [Token/Session Management](#tokensession-management)
- [Screen Layout](#screen-layout)
- [User-Visible Features](#user-visible-features)

## Overview
The Bot Assembly Screen allows users to build different types of bots (breacher, guardian, phreak) at various levels (1-4). Users can select bot types, specify quantities, and initiate building processes that consume balance and take time to complete.

## Entry Points
- **From Home Screen**: Via bot assembly button/area
- **From Turf Screen**: Via bot management options
- **Direct Navigation**: Through app routing system

## Main Components

### BotAssemblyHeader
- **Purpose**: Screen title and navigation controls
- **User Actions**: Close button to exit screen
- **Visual Elements**: "BOT_ASSEMBLY" title, balance display, close button
- **Positioning**: Top of screen, 100px height

### LevelSection
- **Purpose**: Groups bot types by level (MARK 1-4)
- **User Actions**: Displays level title and bot grid
- **Visual Elements**: "MARK X" title, 3 bot cards per level
- **State**: Levels 2-4 show as locked (🔒 LOCKED)
- **Layout**: Vertical stack with spacing between levels

### BotTypeCard
- **Purpose**: Individual bot type selection interface
- **User Actions**: Tap to select bot type (if unlocked)
- **Visual Elements**: Bot type name, owned count, locked status
- **States**: Normal, Selected, Locked
- **Visual Feedback**: 
  - Selected: Brighter background and border
  - Locked: Reduced opacity, "🔒 LOCKED" text
  - Normal: Standard green theme styling

### BuildSection
- **Purpose**: Main building interface and progress display
- **User Actions**: View selected bot info, build controls, progress
- **Visual Elements**: Build title, selected bot info, controls, status
- **Layout**: Right panel (65% width), left border separator

### BuildControls
- **Purpose**: Quantity input and build initiation
- **User Actions**: Enter quantity, press BUILD button
- **Visual Elements**: Numeric input field, BUILD button
- **States**: 
  - Enabled: When bot selected and no active build
  - Disabled: When no selection or build in progress
- **Input Validation**: Numeric only, minimum 1

### BuildProgressBar
- **Purpose**: Visual progress indicator for active builds
- **User Actions**: View build progress
- **Visual Elements**: Progress bar with fill animation
- **Display**: Only shown during active builds
- **Progress Range**: 0-100%

### BuildStatus
- **Purpose**: Current build information and costs
- **User Actions**: View build details and status
- **Visual Elements**: Cost information, build status text
- **Updates**: Real-time status updates

### BuildTimer
- **Purpose**: Time remaining display for active builds
- **User Actions**: View estimated completion time
- **Visual Elements**: Time remaining text
- **Calculation**: Based on build progress and total time

### BotDescription
- **Purpose**: Bot type information and statistics
- **User Actions**: View bot details
- **Visual Elements**: Bot description text
- **Display**: Only shown when bot type is selected

## User Experience Flow

### Initial Screen Load
1. Screen displays with header showing balance and title
2. Left panel shows 4 level sections (MARK 1-4)
3. MARK 1 shows 3 bot types (breacher, guardian, phreak) as selectable
4. MARK 2-4 show bot types as locked with 🔒 LOCKED text
5. Right panel shows "BUILD CONTROLS" with "NO BOT SELECTED"
6. Build controls are disabled until bot selection

### Bot Selection Process
1. User taps on unlocked bot type in MARK 1
2. BotTypeCard changes to selected state (brighter background)
3. Right panel updates to show selected bot name
4. BotDescription component displays bot information
5. Build controls become enabled
6. Quantity input becomes editable

### Building Process
1. User enters quantity in numeric input field
2. User presses BUILD button
3. Balance is deducted (1 credit per bot)
4. Build progress begins (0% to 100%)
5. BuildProgressBar appears with animated fill
6. BuildTimer shows estimated completion time
7. Build controls become disabled during build
8. Quantity input becomes non-editable
9. Real-time progress updates every second

### Build Completion
1. Progress reaches 100%
2. BuildProgressBar and BuildTimer disappear
3. Bot count increases for selected type
4. Build controls become enabled again
5. Quantity input becomes editable
6. User can start new build or select different bot

## Scenarios & Outcomes

### Standard Flow (Happy Path)
1. **Bot Selection**: User selects breacher bot type
2. **Quantity Entry**: User enters "5" in quantity field
3. **Build Initiation**: User presses BUILD button
4. **Balance Deduction**: 5 credits deducted from balance
5. **Build Start**: Build progress begins at 0%
6. **Progress Tracking**: Progress updates every second (0% → 100%)
7. **Completion**: After 5 seconds, build completes
8. **Bot Addition**: 5 breacher bots added to inventory
9. **UI Reset**: Build controls re-enable, progress indicators disappear

### Edge Cases
1. **Zero Quantity**: User enters "0" → BUILD button remains disabled
2. **Negative Quantity**: User enters "-1" → BUILD button remains disabled
3. **Large Quantity**: User enters "999" → Build proceeds normally (if balance sufficient)
4. **Decimal Quantity**: User enters "5.5" → System treats as "5"
5. **Empty Quantity**: User clears field → BUILD button becomes disabled

### Error Scenarios
1. **Insufficient Balance**:
   - User has 3 credits, tries to build 5 bots
   - Error: "Insufficient balance"
   - Build does not start, balance unchanged
   - BUILD button remains enabled

2. **Network Failure During Build**:
   - Build in progress, network connection lost
   - Progress bar stops updating
   - Build continues on server
   - When connection restored, progress syncs to current state

3. **Server Error During Build Start**:
   - User presses BUILD, server returns 500 error
   - Error: "Failed to start build"
   - Balance not deducted
   - BUILD button remains enabled

4. **Authentication Error**:
   - Token expires during build process
   - Error: "Authentication error"
   - Build continues on server
   - User prompted to re-authenticate

5. **Invalid Bot Type**:
   - Server receives invalid bot type
   - Error: "Invalid build parameters"
   - Build does not start
   - BUILD button remains enabled

### Form Validation Scenarios
1. **Numeric Input Only**: Non-numeric characters ignored
2. **Minimum Quantity**: Values less than 1 disabled
3. **Maximum Quantity**: No client-side limit (server handles balance check)
4. **Empty Field**: BUILD button disabled
5. **Invalid Characters**: Only numbers allowed in input

### Network Failure Scenarios
1. **Initial Load Failure**: 
   - Screen shows default bot counts (10 each)
   - Silent error handling, no user notification
   - Retry on next app interaction

2. **Build State Polling Failure**:
   - Progress updates stop
   - Build continues on server
   - Progress resumes when connection restored

3. **Balance Update Failure**:
   - Balance display may be stale
   - Server-side validation prevents over-spending
   - Balance syncs on next successful request

### Screen State Management Scenarios
1. **Build in Progress on Screen Load**:
   - Screen detects existing build queue
   - Progress indicators appear immediately
   - Build controls disabled
   - Timer shows remaining time

2. **Screen Close During Build**:
   - Build continues on server
   - Progress preserved when screen reopens
   - No data loss

3. **App Background During Build**:
   - Build continues on server
   - Progress syncs when app returns to foreground
   - Timer adjusts for elapsed time

### Animation and Performance Scenarios
1. **Progress Bar Animation**:
   - Smooth fill animation from 0% to 100%
   - Updates every second during active builds
   - Disappears instantly on completion

2. **Button State Transitions**:
   - BUILD button opacity changes (0.5 when disabled)
   - Smooth transitions between enabled/disabled states
   - Visual feedback on press

3. **Component Re-renders**:
   - Minimal re-renders during progress updates
   - React.memo optimization prevents unnecessary updates
   - Efficient state propagation

## Complex Subsystems Analysis

### Build Queue Management System
**Purpose**: Server-side processing of bot building requests with time-based completion

**User Experience**:
- Build requests queued on server with start/completion timestamps
- Real-time progress calculation based on elapsed time
- Automatic bot distribution as build progresses
- Build completion triggers UI state changes

**Technical Implementation**:
- **Database Schema**: BuildQueue with type, quantity, totalCost, startedAt, completesAt, botsBuilt
- **Progress Calculation**: `(elapsedTime / totalTime) * 100`
- **Bot Distribution**: Incremental bot addition based on progress percentage
- **Completion Handling**: Automatic cleanup when progress reaches 100%

**Complex Behaviors**:
- **Time-based Processing**: Builds continue even if client disconnects
- **Incremental Distribution**: Bots added gradually as build progresses
- **State Persistence**: Build queue survives app restarts and crashes
- **Concurrent Safety**: Database operations prevent race conditions

### Real-time Progress Tracking System
**Purpose**: Client-side synchronization with server build state via polling

**User Experience**:
- Progress bar updates every second during active builds
- Timer shows remaining time with human-readable format
- Build status displays current cost and type information
- UI state changes based on build progress

**Technical Implementation**:
- **Polling Mechanism**: 1-second intervals for build state checks
- **Timer Component**: Complex time calculation with days/hours/minutes/seconds
- **Progress Bar**: CSS-based fill animation with percentage width
- **State Synchronization**: Client state mirrors server build queue

**Complex Behaviors**:
- **Adaptive Time Display**: Formats time as "2d 5h 30m 15s remaining"
- **Progress Synchronization**: Client progress matches server calculation
- **Timer Accuracy**: Accounts for network latency and processing time
- **State Recovery**: Resumes progress tracking after connection loss

### Bot Type System with Level Unlocking
**Purpose**: Hierarchical bot availability system with progression mechanics

**User Experience**:
- 4 levels (MARK 1-4) with different bot availability
- Level 1 unlocked by default, levels 2-4 currently locked
- Visual feedback for locked vs unlocked states
- Bot selection affects build interface state

**Technical Implementation**:
- **Level Structure**: Hardcoded level system with unlocking logic
- **State Management**: Level state affects component rendering
- **Visual Feedback**: Opacity and text changes for locked states
- **Selection Logic**: Only unlocked bots can be selected

**Complex Behaviors**:
- **Progressive Unlocking**: Future system for level progression
- **State Coordination**: Level state affects multiple components
- **Visual Hierarchy**: Clear distinction between available and locked options
- **Selection Validation**: Prevents selection of locked bot types

### Balance Integration System
**Purpose**: Real-time balance management with server-side validation

**User Experience**:
- Balance displayed in header with real-time updates
- Cost calculation shows total build cost before initiation
- Insufficient balance prevents build start
- Balance deduction occurs before build begins

**Technical Implementation**:
- **Balance Context**: Shared balance state across components
- **Cost Calculation**: Real-time cost updates based on quantity
- **Server Validation**: Balance check before build initiation
- **State Synchronization**: Balance updates reflect immediately

**Complex Behaviors**:
- **Pre-validation**: Server checks balance before processing build
- **Atomic Operations**: Balance deduction and build start as single transaction
- **Error Recovery**: Balance restored if build fails
- **Real-time Updates**: Balance changes reflect across all screens

### Component State Coordination System
**Purpose**: Complex state management across 9 specialized components

**User Experience**:
- Seamless interaction between bot selection and build controls
- Real-time updates across all components during builds
- Consistent state representation across UI elements
- Smooth transitions between different states

**Technical Implementation**:
- **Context Integration**: BotsContext, BalanceContext, AuthContext coordination
- **Component Communication**: Props and callbacks for state updates
- **React.memo Optimization**: Prevents unnecessary re-renders
- **State Propagation**: Changes flow from context to all components

**Complex Behaviors**:
- **State Synchronization**: All components reflect current build state
- **Performance Optimization**: Minimal re-renders during updates
- **Error Boundaries**: Graceful handling of component failures
- **Memory Management**: Proper cleanup of timers and intervals

## Screen Transitions
- **Entry Points**: Home Screen, Turf Screen, direct navigation
- **Exit Points**: Close button returns to previous screen
- **Navigation Triggers**: Close button press
- **State Preservation**: Build progress preserved across navigation
- **Form Switching**: No form switching behavior (single build interface)

## Related Screens

### Home Screen
- **Connection**: Bot assembly accessed via Home Screen button/area
- **Data Flow**: Built bots appear in Home Screen bot counts
- **State Sync**: Balance updates reflected in Home Screen display
- **Navigation**: Close button returns to Home Screen

### Turf Screen
- **Connection**: Bot management options in Turf Screen
- **Data Flow**: Built bots available for battalion assignment
- **State Sync**: Bot counts synchronized with Turf Screen displays
- **Navigation**: Alternative entry point for bot assembly

### Battle Screen
- **Connection**: Built bots used in battle formations
- **Data Flow**: Bot availability affects battle unit deployment
- **State Sync**: Bot counts impact battle preparation options
- **Dependencies**: Battle system depends on bot assembly output

### Profile Screen
- **Connection**: Bot statistics may appear in user profile
- **Data Flow**: Build history could be tracked in profile
- **State Sync**: No direct state synchronization
- **Indirect**: Profile may show bot-related achievements

## Server Details

### Data Fetched
- **Bot Counts**: Current inventory of each bot type
- **Build Queue**: Active build status and progress
- **Battalion Assignments**: Bots assigned to battle units
- **Balance**: Current user balance for cost validation

### Server Requests Triggered
- **GET /api/bots**: Fetches current bot counts and assignments
- **POST /api/balance/deduct**: Deducts balance before building
- **POST /api/bots/build**: Initiates build process
- **GET /api/bots/build-state**: Polls build progress (every 1 second)

### Expected Server Responses
- **Bot Counts**: `{ bots: { breacher: 10, guardian: 5, phreak: 3 } }`
- **Build Queue**: `{ buildQueue: { type: 'breacher', quantity: 5, progress: 60 } }`
- **Balance Deduction**: `{ total: 95 }` (after 5 credit deduction)
- **Build Start**: `{ buildQueue: { type: 'breacher', quantity: 5, startedAt: '...' } }`

### Error States User Might See
- **"Insufficient balance"**: When trying to build more bots than credits available
- **"Invalid build parameters"**: When server receives invalid data
- **"Failed to start build"**: When server encounters internal error
- **"Authentication error"**: When token is invalid or expired
- **Silent failures**: Network issues handled gracefully without user notification

### Token/Session Management
- **Authentication Required**: All API calls require valid JWT token
- **Token Usage**: Token included in Authorization header for all requests
- **Session Persistence**: Build progress continues even if app is closed
- **Token Refresh**: No automatic refresh - user must re-authenticate if token expires

## Screen Layout
- **Left Panel**: Bot selection by level (35% width)
- **Right Panel**: Build controls and progress (65% width)
- **Header**: Title and close functionality
- **Scrollable**: Bot selection area supports scrolling

## User-Visible Features
- Bot type selection (breacher, guardian, phreak)
- Level-based bot availability (1-4)
- Quantity specification for building
- Real-time build progress tracking
- Balance deduction for bot costs
- Build queue management
- Bot count displays
- Level unlocking system 