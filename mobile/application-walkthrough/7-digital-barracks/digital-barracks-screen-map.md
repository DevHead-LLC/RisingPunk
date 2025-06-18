# Digital Barracks Screen - User Flow Documentation

> **Technical Notes**: See [digital-barracks-screen-special-notes.md](./digital-barracks-screen-special-notes.md) for implementation details, security considerations, and future improvements.

## Table of Contents
- [Overview](#overview)
- [Entry Points](#entry-points)
- [Main Components](#main-components)
  - [CloseButton](#closebutton)
  - [Balance Display](#balance-display)
  - [Title Section](#title-section)
  - [Mark Selector](#mark-selector)
  - [Total Army Container](#total-army-container)
  - [Bot Cards](#bot-cards)
  - [Army Composition Visualization](#army-composition-visualization)
  - [Locked Content Display](#locked-content-display)
- [User-Visible Features](#user-visible-features)
- [User Experience Flow](#user-experience-flow)
  - [Initial Screen Load](#initial-screen-load)
  - [Mark Level Navigation](#mark-level-navigation)
  - [Bot Information Display](#bot-information-display)
  - [Army Composition Visualization](#army-composition-visualization)
  - [Navigation and Exit](#navigation-and-exit)
- [Component Interactions](#component-interactions)
  - [Balance Display Integration](#balance-display-integration)
  - [Bot Data Management](#bot-data-management)
  - [Mark Level State Management](#mark-level-state-management)
  - [Army Composition Calculation](#army-composition-calculation)
- [Screen Layout and Positioning](#screen-layout-and-positioning)
  - [Header Section](#header-section)
  - [Mark Selector](#mark-selector)
  - [Content Area](#content-area)
  - [Bot Card Layout](#bot-card-layout)
- [Visual Specifications](#visual-specifications)
  - [Color Scheme](#color-scheme)
  - [Typography](#typography)
  - [Spacing and Layout](#spacing-and-layout)
- [Scenarios & Outcomes](#scenarios--outcomes)
  - [Standard Flow (Happy Path)](#standard-flow-happy-path)
  - [Edge Cases](#edge-cases)
  - [Error Scenarios](#error-scenarios)
  - [Mark Level Scenarios](#mark-level-scenarios)
  - [Bot Data Scenarios](#bot-data-scenarios)
  - [Army Composition Scenarios](#army-composition-scenarios)
  - [Navigation Scenarios](#navigation-scenarios)
- [Server Interactions](#server-interactions)
  - [Bot Data Fetching](#bot-data-fetching)
  - [Build State Polling](#build-state-polling)
  - [Battalion Assignment](#battalion-assignment)
  - [Error Response Formats](#error-response-formats)
  - [Data Synchronization](#data-synchronization)
- [Related Screens](#related-screens)
  - [Bot Management Flow](#bot-management-flow)
  - [Bot Data Integration](#bot-data-integration)
  - [Data Flow Connections](#data-flow-connections)
  - [Navigation Integration](#navigation-integration)

## Overview
The Digital Barracks Screen serves as the bot management and army composition interface. Users can view their bot collection, examine bot statistics and lore, and see their overall army composition. The screen features mark-level progression (MARK 1-4) with detailed bot information including stats, advantages, and historical hacker lore.

## Entry Points
- **From Turf Screen**: Via Digital Barracks location marker
- **From Home Screen**: Via bot management options
- **Direct Navigation**: Through app routing system

## Main Components

### CloseButton
- **Purpose**: Navigation control to exit screen
- **User Actions**: Tap to return to previous screen
- **Visual Elements**: "×" symbol in top-right corner
- **Positioning**: Absolute positioned in header area

### Balance Display
- **Purpose**: Shows current user balance
- **User Actions**: View current balance
- **Visual Elements**: Balance amount with currency symbol
- **Positioning**: Top-left of header area

### Title Section
- **Purpose**: Screen identification
- **User Actions**: View screen title
- **Visual Elements**: "Digital Barracks" text
- **Positioning**: Centered below header

### Mark Selector
- **Purpose**: Mark level navigation (MARK 1-4)
- **User Actions**: Switch between mark levels
- **Visual Elements**: 4 buttons for MARK 1-4
- **States**: Selected (highlighted) and unselected
- **Layout**: Horizontal row with equal spacing

### Total Army Container
- **Purpose**: Overall army statistics display
- **User Actions**: View total army size and composition
- **Visual Elements**: Total count, composition bar, legend
- **Information**: Total bot count and percentage breakdown

### Bot Cards
- **Purpose**: Individual bot type information display
- **User Actions**: View bot details, stats, and lore
- **Visual Elements**: Bot name, role, counts, stats, lore
- **Components**: 3 bot types (breacher, guardian, phreak)
- **Layout**: Vertical stack with spacing

### Army Composition Visualization
- **Purpose**: Visual representation of army makeup
- **User Actions**: View army composition percentages
- **Visual Elements**: Horizontal bar with color segments, legend
- **Colors**: Breacher (red), Guardian (green), Phreak (blue)

### Locked Content Display
- **Purpose**: Shows locked mark levels
- **User Actions**: View locked status
- **Visual Elements**: "🔒 MARK X UNITS LOCKED" text
- **Display**: Only shown for MARK 2-4

## User-Visible Features
- Bot collection management interface
- Mark level progression system (MARK 1-4)
- Detailed bot statistics and lore
- Army composition visualization
- Real-time balance display
- Bot type advantages and roles
- Historical hacker lore for each bot type
- Deployed vs available bot counts

## User Experience Flow

### Initial Screen Load
1. Screen displays with header showing balance and close button
2. "Digital Barracks" title appears centered below header
3. Mark selector shows 4 buttons (MARK 1-4) with MARK 1 selected by default
4. Total army container displays total bot count and composition bar
5. Bot cards show for MARK 1 (breacher, guardian, phreak)
6. Each bot card displays available count, deployed count, stats, and lore

### Mark Level Navigation
1. User taps different mark buttons (MARK 1-4)
2. Selected mark button highlights with green background and border
3. Previous mark button returns to normal styling
4. Bot content updates based on selected mark:
   - MARK 1: Shows all 3 bot types with full details
   - MARK 2-4: Shows "🔒 MARK X UNITS LOCKED" message

### Bot Information Display
1. Each bot card shows comprehensive information:
   - Bot name (BREACHER, GUARDIAN, PHREAK) in blue
   - Role (Infantry, Cavalry, Ranged) in gray
   - Available count in green
   - Deployed count (always 0 in this screen)
   - Historical hacker lore with purple left border
   - Advantage text (e.g., "Strong vs. Infantry, Weak vs. Ranged")
   - Detailed statistics (Health, Speed, Range, Attack Power, Defense Ability)

### Army Composition Visualization
1. Total army container shows overall statistics:
   - Total army size count in green
   - Horizontal composition bar with color segments:
     - Red: Breacher percentage
     - Green: Guardian percentage
     - Blue: Phreak percentage
   - Legend showing exact percentages for each bot type

### Navigation and Exit
1. Close button in top-right corner allows exit
2. Screen returns to previous screen (Turf or Home)
3. No data is lost during navigation
4. Balance display updates in real-time from context

## Component Interactions

### Balance Display Integration
- **Real-time Updates**: Balance updates automatically from BalanceContext
- **Context Integration**: Uses useBalance hook for current balance
- **Error Handling**: Graceful fallback if balance context unavailable
- **Visual Feedback**: Green color for positive balance display

### Bot Data Management
- **Context Integration**: Uses useBots hook for bot data
- **Server Synchronization**: Fetches bot counts from server on load
- **Deployed Tracking**: Shows deployed vs available bot counts
- **Real-time Updates**: Bot counts update when builds complete

### Mark Level State Management
- **Local State**: selectedMark state manages current mark level
- **Visual Feedback**: Selected mark button highlights with green styling
- **Content Switching**: Bot content changes based on selected mark
- **Access Control**: MARK 2-4 show locked status

### Army Composition Calculation
- **Real-time Calculation**: Composition percentages calculated from bot counts
- **Visual Representation**: Color-coded horizontal bar with legend
- **Dynamic Updates**: Composition updates when bot counts change
- **Percentage Display**: Exact percentages shown in legend

## Screen Layout and Positioning

### Header Section
- **Balance Display**: Top-left corner, shows current balance
- **Close Button**: Top-right corner, 44x44px circular button
- **Title**: Centered below header, "Digital Barracks" in white

### Mark Selector
- **Layout**: Horizontal row with equal spacing
- **Positioning**: Below title, full width with padding
- **Styling**: Green theme with selected state highlighting
- **Border**: Bottom border separates from content

### Content Area
- **ScrollView**: Full remaining height with proper content container
- **Total Army Container**: Top of scroll content with dark background
- **Bot Cards**: Vertical stack below total container
- **Spacing**: Consistent spacing between all elements

### Bot Card Layout
- **Header**: Bot name and role in top row
- **Count Row**: Available and deployed counts with bottom border
- **Info Container**: Two-column layout (lore and stats)
- **Lore Section**: Historical lore with purple left border
- **Stats Section**: 5 statistics in right column

## Visual Specifications

### Color Scheme
- **Primary Text**: White (#fff)
- **Secondary Text**: Gray (rgba(255, 255, 255, 0.6))
- **Bot Names**: Blue (#2196F3)
- **Counts**: Green (#00FF41)
- **Stats**: Purple (#9C27B0)
- **Lore Border**: Purple (#4717F6)
- **Composition Colors**: Red (#FF4B4B), Green (#4CAF50), Blue (#2196F3)

### Typography
- **Title**: 24px, bold, white
- **Bot Names**: H2 size, bold, blue
- **Counts**: Body size, bold, green
- **Stats**: Body size, bold, purple
- **Lore**: Small size, italic, white with opacity

### Spacing and Layout
- **Container Padding**: 20px horizontal
- **Card Spacing**: Medium spacing between cards
- **Internal Spacing**: Small spacing within cards
- **Border Radius**: 8px for cards and containers
- **Border Width**: 1px for all borders

## Scenarios & Outcomes

### Standard Flow (Happy Path)
1. **Screen Initialization**: User navigates to Digital Barracks
2. **Data Loading**: Bot data fetched from server with authentication
3. **Mark Selection**: User selects MARK 1 (default) to view available bots
4. **Bot Display**: All 3 bot types shown with complete information
5. **Composition View**: Army composition calculated and displayed
6. **Navigation**: User can switch between mark levels or exit screen

### Edge Cases
1. **No Bot Data**: User has no bots, shows 0 counts for all types
2. **Partial Bot Data**: Some bot types have 0, others have counts
3. **Large Bot Counts**: User has hundreds of bots, composition still calculates correctly
4. **Mark Level Access**: User tries to access MARK 2-4, sees locked message
5. **Network Issues**: Server unavailable, falls back to default counts (10 each)

### Error Scenarios
1. **Authentication Failure**:
   - Token expired or invalid
   - Error: Silent fallback to default bot counts
   - User sees: Default counts (10 each) with no error message
   - Recovery: Re-authentication when user performs other actions

2. **Server Connection Failure**:
   - Network unavailable or server down
   - Error: Network request fails
   - User sees: Default bot counts (10 each)
   - Recovery: Automatic retry on next screen load

3. **Invalid Bot Data**:
   - Server returns malformed bot data
   - Error: JSON parsing fails
   - User sees: Default bot counts with no error message
   - Recovery: Silent fallback to defaults

4. **Missing Context**:
   - BotsContext or BalanceContext unavailable
   - Error: Context throws error
   - User sees: Default values with no error message
   - Recovery: Graceful fallback to default values

5. **Build Queue Conflicts**:
   - Active build queue exists but data is inconsistent
   - Error: Build state polling fails
   - User sees: Current bot counts without build progress
   - Recovery: Build state syncs when connection restored

### Mark Level Scenarios
1. **MARK 1 Access**:
   - User selects MARK 1
   - Result: All 3 bot types displayed with full details
   - Visual: Green highlight on MARK 1 button
   - Content: Complete bot cards with stats and lore

2. **MARK 2-4 Access**:
   - User selects MARK 2, 3, or 4
   - Result: "🔒 MARK X UNITS LOCKED" message displayed
   - Visual: Green highlight on selected mark button
   - Content: No bot cards, only locked message

3. **Mark Switching**:
   - User switches between different mark levels
   - Result: Content updates immediately
   - Visual: Button highlighting changes
   - State: selectedMark state updates

### Bot Data Scenarios
1. **Empty Bot Collection**:
   - User has 0 bots of all types
   - Result: All counts show 0, composition bar empty
   - Visual: Empty composition bar with no segments
   - Legend: Shows 0% for all bot types

2. **Single Bot Type**:
   - User has only one type of bot (e.g., 50 breachers)
   - Result: Single color in composition bar
   - Visual: Full-width red bar (100% breacher)
   - Legend: Shows 100% breacher, 0% others

3. **Balanced Army**:
   - User has equal numbers of all bot types
   - Result: Equal segments in composition bar
   - Visual: Three equal segments (33.3% each)
   - Legend: Shows equal percentages

4. **Large Bot Counts**:
   - User has hundreds or thousands of bots
   - Result: Composition still calculates correctly
   - Visual: Accurate percentage representation
   - Performance: No performance impact

### Army Composition Scenarios
1. **Composition Calculation**:
   - Total bots: 100 (30 breacher, 40 guardian, 30 phreak)
   - Result: 30% red, 40% green, 30% blue
   - Visual: Proportional bar segments
   - Legend: Exact percentages displayed

2. **Composition Updates**:
   - Bot counts change (builds complete, battles fought)
   - Result: Composition updates in real-time
   - Visual: Bar segments adjust proportionally
   - Legend: Percentages recalculate

3. **Zero Total Bots**:
   - User has no bots at all
   - Result: Empty composition bar
   - Visual: Gray background bar with no segments
   - Legend: Shows 0% for all types

### Navigation Scenarios
1. **Screen Entry**:
   - User enters from Turf Screen
   - Result: Screen loads with current bot data
   - State: MARK 1 selected by default
   - Data: Bot counts fetched from server

2. **Screen Exit**:
   - User taps close button
   - Result: Returns to previous screen
   - State: No data loss, state preserved
   - Navigation: Smooth transition

3. **Context Switching**:
   - User switches between different screens
   - Result: Bot data remains synchronized
   - Updates: Real-time updates from context
   - Performance: No performance impact

## Server Interactions

### Bot Data Fetching
- **Endpoint**: GET `/api/bots`
- **Authentication**: Bearer token required
- **Response**: `{ bots: { breacher: number, guardian: number, phreak: number }, battalionAssignments: array }`
- **Error Handling**: Silent fallback to default counts
- **Frequency**: On screen load and context updates

### Build State Polling
- **Endpoint**: GET `/api/bots/build-state`
- **Authentication**: Bearer token required
- **Response**: `{ buildQueue: object | null, bots: object }`
- **Error Handling**: Silent error handling
- **Frequency**: Every 1 second when active builds exist

### Battalion Assignment
- **Endpoint**: POST `/api/battalions/assign`
- **Authentication**: Bearer token required
- **Request**: `{ botType: string, quantity: number, battalionId: string }`
- **Response**: `{ updatedBotCount: number, previousAssignment: object | null }`
- **Error Handling**: Logged but don't crash interface

### Error Response Formats
1. **Authentication Error (401)**:
   ```json
   { "error": "Authentication failed" }
   ```

2. **Server Error (500)**:
   ```json
   { "error": "Internal server error" }
   ```

3. **Network Error**:
   - No response, network timeout
   - Handled by fetch error handling

4. **Invalid Data Error (400)**:
   ```json
   { "error": "Invalid request parameters" }
   ```

### Data Synchronization
- **Real-time Updates**: Bot counts update when builds complete
- **Context Integration**: BotsContext manages server synchronization
- **Error Recovery**: Automatic retry and fallback mechanisms
- **State Consistency**: Server state always takes precedence

## Related Screens

### Bot Management Flow
- **[Bot Assembly Screen](../5-bot-assembly-screen/bot-assembly-screen-map.md)**: Bot building and construction interface
- **[Battle Screen](../6-battle-screen/battle-screen-map.md)**: Bot deployment and combat system
- **[Turf Screen](../3-turf-screen/turf-screen-map.md)**: Main navigation hub for accessing Digital Barracks

### Bot Data Integration
- **Bot Assembly**: Provides bots that appear in Digital Barracks
- **Battle System**: Uses bot data for battalion deployment
- **Turf Navigation**: Central hub for accessing bot management
- **Home Screen**: Alternative entry point for bot management

### Data Flow Connections
- **Build Completion**: Bots built in Assembly appear in Barracks
- **Battle Deployment**: Bots deployed in battles affect available counts
- **Real-time Sync**: All screens share synchronized bot data
- **Progression Tracking**: Mark level progression affects all bot screens

### Navigation Integration
- **Entry Points**: Turf Screen and Home Screen provide access
- **Exit Points**: Close button returns to previous screen
- **State Preservation**: Bot data preserved across navigation
- **Context Switching**: Seamless transitions between related screens 