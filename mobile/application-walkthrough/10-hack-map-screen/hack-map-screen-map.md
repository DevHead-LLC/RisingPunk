# Hack Map Screen - User Flow Documentation

> **Technical Notes**: See [hack-map-screen-special-notes.md](./hack-map-screen-special-notes.md) for implementation details, security considerations, and future improvements.

## Table of Contents
- [Overview](#overview)
- [User Experience Flow](#user-experience-flow)
- [Main Components](#main-components)
  - [Map Grid Container](#map-grid-container)
  - [Individual Cell Components](#individual-cell-components)
  - [Terrain Types and Visual Indicators](#terrain-types-and-visual-indicators)
  - [Entity Display System](#entity-display-system)
  - [Info Panel (Modal)](#info-panel-modal)
  - [Legend Panel](#legend-panel)
  - [Scrollable Map View](#scrollable-map-view)
  - [Loading Spinner](#loading-spinner)
  - [Close Button](#close-button)
- [Scenarios & Outcomes](#scenarios--outcomes)
  - [Standard User Flow Scenarios](#standard-user-flow-scenarios)
    - [1. Initial Map Load](#1-initial-map-load)
    - [2. Cell Selection and Information Display](#2-cell-selection-and-information-display)
    - [3. Legend Panel Interaction](#3-legend-panel-interaction)
    - [4. Map Scrolling and Exploration](#4-map-scrolling-and-exploration)
  - [Edge Cases and Error Scenarios](#edge-cases-and-error-scenarios)
    - [1. Server Connection Failure](#1-server-connection-failure)
    - [2. Invalid Map Data Response](#2-invalid-map-data-response)
    - [3. Empty Cell Selection](#3-empty-cell-selection)
    - [4. Legend Toggle State Persistence](#4-legend-toggle-state-persistence)
    - [5. Rapid Cell Selection](#5-rapid-cell-selection)
  - [Form Validation Scenarios](#form-validation-scenarios)
  - [Network Failure Scenarios](#network-failure-scenarios)
    - [1. Slow Network Connection](#1-slow-network-connection)
    - [2. Intermittent Network Issues](#2-intermittent-network-issues)
  - [Screen State Management Scenarios](#screen-state-management-scenarios)
    - [1. Screen Navigation Away and Back](#1-screen-navigation-away-and-back)
    - [2. App Backgrounding and Foregrounding](#2-app-backgrounding-and-foregrounding)
  - [Animation and Performance Scenarios](#animation-and-performance-scenarios)
    - [1. Smooth Scrolling Performance](#1-smooth-scrolling-performance)
    - [2. Cell Selection Animation](#2-cell-selection-animation)
- [Screen Transitions](#screen-transitions)
  - [Related Screens](#related-screens)
- [Server Details](#server-details)
  - [API Endpoints](#api-endpoints)
    - [GET /api/map/:name](#get-apimapname)
  - [Data Flow](#data-flow)
    - [1. Initial Map Load](#1-initial-map-load)
    - [2. Map Generation (Server-Side)](#2-map-generation-server-side)
    - [3. Fallback Generation (Client-Side)](#3-fallback-generation-client-side)
  - [Authentication Requirements](#authentication-requirements)
  - [Error Handling](#error-handling)
  - [Token/Session Management](#tokensession-management)
- [Future Considerations](#future-considerations)
  - [Gameplay Integration](#gameplay-integration)
  - [Technical Enhancements](#technical-enhancements)
  - [User Experience Improvements](#user-experience-improvements)
- [Complex Subsystems](#complex-subsystems)
  - [Procedural Terrain Generation System](#procedural-terrain-generation-system)
    - [Forest Cluster Generation](#forest-cluster-generation)
    - [Mountain Range Generation](#mountain-range-generation)
    - [River Generation](#river-generation)
  - [Entity Placement and Management System](#entity-placement-and-management-system)
    - [Collision Avoidance Algorithm](#collision-avoidance-algorithm)
    - [Entity Type Distribution](#entity-type-distribution)
  - [Grid Rendering and Performance Optimization](#grid-rendering-and-performance-optimization)
    - [Cell Rendering Pipeline](#cell-rendering-pipeline)
    - [Scroll Performance Management](#scroll-performance-management)
  - [State Management and Data Flow](#state-management-and-data-flow)
    - [Client-Server Synchronization](#client-server-synchronization)
    - [State Persistence Strategy](#state-persistence-strategy)
  - [Error Handling and Recovery Systems](#error-handling-and-recovery-systems)
    - [Network Failure Recovery](#network-failure-recovery)
    - [Data Validation and Sanitization](#data-validation-and-sanitization)
    - [Performance Degradation Handling](#performance-degradation-handling)
  - [Advanced Technical Architecture](#advanced-technical-architecture)
    - [Seed-Based Generation System](#seed-based-generation-system)
    - [Database Integration Pattern](#database-integration-pattern)
    - [Component Architecture Patterns](#component-architecture-patterns)
  - [Integration Points with Other Systems](#integration-points-with-other-systems)
    - [Battle System Integration](#battle-system-integration)
    - [Territory Control Integration](#territory-control-integration)
    - [User Authentication Integration](#user-authentication-integration)

## Overview
The Hack Map Screen displays a large interactive grid-based map showing terrain, player locations, and NPC entities. Users can explore the map by scrolling, tap cells to view detailed information, and see a collapsible legend explaining map symbols. The screen features a cyberpunk-themed interface with different terrain types and entity indicators.

## User Experience Flow
1. User navigates to Hack Map Screen from previous screen
2. Screen displays loading spinner while fetching map data
3. Map loads with 25x25 grid showing terrain and entities
4. User can scroll horizontally and vertically to explore the map
5. User can tap cells to view detailed information in info panel
6. User can expand/collapse legend to understand map symbols
7. User can close screen to return to previous screen

## Main Components

### Map Grid Container
- **Grid Size**: 25x25 cells (625 total cells)
- **Cell Dimensions**: 60x60 pixels per cell
- **Total Map Size**: 1500x1500 pixels (25 * 60)
- **Margin Wrapper**: 80px margins on all sides
- **Scrollable Area**: Full horizontal and vertical scrolling
- **Background**: Dark theme with grid lines

### Individual Cell Components
- **Cell Size**: 60x60 pixels with 1px borders
- **Terrain Display**: Visual representation of terrain type
- **Entity Overlay**: Player and NPC indicators
- **Selection State**: Highlighted border when selected
- **Touch Interaction**: Tap to view detailed information
- **Visual States**: Plain, water, mountain, forest terrain

### Terrain Types and Visual Indicators
- **Plain Terrain**: Default green background with subtle grid lines
- **Water Terrain**: Blue background (~ symbol) with blue borders
- **Mountain Terrain**: Gray background (▲ symbol) with gray borders
- **Forest Terrain**: Dark green background (♣ symbol) with green borders
- **Terrain Symbols**: Unicode symbols for each terrain type

### Entity Display System
- **Player Entities**: 
  - Main player: "⚡" symbol in cyan color at position (0,0)
  - Friendly players: "◉" symbol in green color
  - Names: Alpha, Beta, Gamma, Delta, Echo, Foxtrot, Helix, Iris
- **Enemy Entities**: 
  - Hostile NPCs: "⊗" symbol in red color
  - Names: Cipher, Shadow, Wraith, Phantom, Specter, Ghost, Virus, Trojan
- **Entity Positioning**: Random placement avoiding occupied cells

### Info Panel (Modal)
- **Trigger**: Tap on any cell
- **Position**: Centered on screen with dark background
- **Content**: Grid coordinates, terrain type, entity information
- **Close Button**: "×" symbol in top-right corner
- **Information Display**:
  - Grid coordinates: "GRID: (x, y)"
  - Terrain type: "TERRAIN: [TYPE]"
  - Entity name: "ENTITY: [NAME]" (if occupied)
  - Status: "STATUS: FRIENDLY/HOSTILE" (if occupied)

### Legend Panel
- **Position**: Top-left corner with collapsible design
- **Expand/Collapse**: Tap to toggle between expanded and collapsed states
- **Expanded State**: Shows all terrain and entity symbols with descriptions
- **Collapsed State**: Shows only "LEGEND [+]" button
- **Legend Items**:
  - Forest: ♣ symbol with "Forest" label
  - Water: ~ symbol with "Water" label
  - Mountain: ▲ symbol with "Mountain" label
  - Friendly: ◉ symbol with "Friendly" label
  - Hostile: ⊗ symbol with "Hostile" label

### Scrollable Map View
- **Horizontal Scroll**: Full-width scrolling for east-west exploration
- **Vertical Scroll**: Full-height scrolling for north-south exploration
- **Scroll Indicators**: Hidden scroll indicators for clean interface
- **Directional Lock**: Disabled for smooth diagonal scrolling
- **Content Size**: 1660x1660 pixels (1500 grid + 160 margins)

### Loading Spinner
- **Display**: Shows during initial map data fetch
- **Position**: Centered on screen
- **Fallback**: Local terrain generation if server fails
- **Error Handling**: Graceful degradation to local data

### Close Button
- **Position**: Standard close button position
- **Function**: Returns to previous screen
- **State**: No state preservation on exit

## Scenarios & Outcomes

### Standard User Flow Scenarios

#### 1. Initial Map Load
**User Action**: Navigate to Hack Map Screen
**Expected Behavior**:
- Loading spinner displays immediately
- Screen attempts to fetch map data from `/api/map/main`
- Map loads with 25x25 grid showing terrain and entities
- Loading spinner disappears
- User can immediately scroll and interact with map

#### 2. Cell Selection and Information Display
**User Action**: Tap on any cell in the grid
**Expected Behavior**:
- Info panel appears centered on screen with dark background
- Panel displays:
  - Grid coordinates: "GRID: (x, y)"
  - Terrain type: "TERRAIN: [plain/water/mountain/forest]"
  - Entity information (if occupied): "ENTITY: [name]"
  - Status (if occupied): "STATUS: FRIENDLY/HOSTILE"
- Close button ("×") appears in top-right corner
- User can tap close button to dismiss panel

#### 3. Legend Panel Interaction
**User Action**: Tap "LEGEND [+]" button in top-left corner
**Expected Behavior**:
- Legend expands to show all terrain and entity symbols
- Button text changes to "LEGEND [-]"
- Legend displays:
  - Forest: ♣ symbol with "Forest" label
  - Water: ~ symbol with "Water" label
  - Mountain: ▲ symbol with "Mountain" label
  - Friendly: ◉ symbol with "Friendly" label
  - Hostile: ⊗ symbol with "Hostile" label
- User can tap again to collapse legend

#### 4. Map Scrolling and Exploration
**User Action**: Scroll horizontally or vertically on the map
**Expected Behavior**:
- Map scrolls smoothly in all directions
- No scroll indicators visible (clean interface)
- Diagonal scrolling enabled for natural exploration
- Map maintains visual consistency during scroll
- All cells remain interactive during scroll

### Edge Cases and Error Scenarios

#### 1. Server Connection Failure
**Scenario**: Network unavailable or server down
**Expected Behavior**:
- Loading spinner shows for reasonable time (5-10 seconds)
- Console logs error: "Failed to fetch map data"
- Screen falls back to local terrain generation
- Map displays with procedurally generated terrain
- No error message shown to user (graceful degradation)
- User can still interact with locally generated map

#### 2. Invalid Map Data Response
**Scenario**: Server returns malformed or incomplete data
**Expected Behavior**:
- Console logs error: "Invalid map data received"
- Screen falls back to local terrain generation
- Map displays with procedurally generated terrain
- User experience continues normally

#### 3. Empty Cell Selection
**User Action**: Tap on empty cell (no entity)
**Expected Behavior**:
- Info panel shows only coordinates and terrain type
- No entity or status information displayed
- Panel closes normally with close button

#### 4. Legend Toggle State Persistence
**User Action**: Expand legend, then scroll map, then collapse legend
**Expected Behavior**:
- Legend state maintained during scroll
- Legend can be collapsed normally
- No visual artifacts or state corruption

#### 5. Rapid Cell Selection
**User Action**: Quickly tap multiple cells in succession
**Expected Behavior**:
- Only last tapped cell shows info panel
- Previous panels close automatically
- No multiple panels displayed simultaneously
- Smooth transitions between selections

### Form Validation Scenarios
*No forms present in Hack Map Screen*

### Network Failure Scenarios

#### 1. Slow Network Connection
**Scenario**: Slow internet connection during map load
**Expected Behavior**:
- Loading spinner displays for extended period
- Screen eventually loads map data or falls back to local generation
- No timeout errors shown to user
- User can interact once loading completes

#### 2. Intermittent Network Issues
**Scenario**: Network connection drops during map interaction
**Expected Behavior**:
- Existing map data remains functional
- No new server requests made
- User can continue exploring current map
- Local interactions (cell selection, legend toggle) work normally

### Screen State Management Scenarios

#### 1. Screen Navigation Away and Back
**User Action**: Navigate away from Hack Map Screen, then return
**Expected Behavior**:
- Screen reloads map data from server
- Previous cell selection state not preserved
- Legend returns to collapsed state
- Fresh map data displayed

#### 2. App Backgrounding and Foregrounding
**User Action**: Put app in background, then return to foreground
**Expected Behavior**:
- Map state preserved during backgrounding
- No automatic reload when returning to foreground
- User can continue from where they left off

### Animation and Performance Scenarios

#### 1. Smooth Scrolling Performance
**User Action**: Rapid scrolling across large map area
**Expected Behavior**:
- Smooth 60fps scrolling performance
- No visual stuttering or lag
- All cells render correctly during scroll
- Memory usage remains stable

#### 2. Cell Selection Animation
**User Action**: Tap cells rapidly to test selection responsiveness
**Expected Behavior**:
- Immediate visual feedback on cell tap
- Info panel appears with smooth animation
- No delay in panel display
- Responsive touch interaction

## Screen Transitions
- **Entry Point**: [Previous Screen] → Hack Map Screen
- **Exit Points**: 
  - Close button → Previous screen
- **State Preservation**: No state to preserve during navigation
- **Navigation Behavior**: Simple screen navigation with map exploration

### Related Screens
- **[Turf Screen](../3-turf-screen/turf-screen-map.md)**: Map exploration leads to territory control
- **[Battle Screen](../6-battle-screen/battle-screen-map.md)**: Map entities can initiate battles
- **[Battle Preparation Screen](../9-battle-preparation-screen/battle-preparation-screen-map.md)**: Map intelligence informs battle preparation
- **[Digital Barracks Screen](../7-digital-barracks/digital-barracks-screen-map.md)**: Map entities may be managed through barracks

## Server Details

### API Endpoints

#### GET /api/map/:name
**Purpose**: Fetch map data for specified map name
**Authentication**: None required (public endpoint)
**Parameters**: 
- `name`: Map identifier (default: "main")
**Response Format**:
```json
{
  "name": "main",
  "gridSize": 25,
  "cells": [
    {
      "x": 0,
      "y": 0,
      "terrain": "plain",
      "isActive": true,
      "isOccupied": false,
      "canBeOccupied": true,
      "occupiedBy": "none",
      "entityName": ""
    }
  ],
  "version": 1,
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- `500`: Server error with error message
- `404`: Map not found (triggers map generation)

### Data Flow

#### 1. Initial Map Load
1. Screen component mounts
2. `useEffect` triggers map data fetch
3. API call to `/api/map/main`
4. Server checks database for existing map
5. If map exists: returns stored map data
6. If map doesn't exist: generates new map and stores it
7. Client receives map data and updates state
8. Grid renders with received data

#### 2. Map Generation (Server-Side)
1. Server creates MapService instance with seed
2. Generates 25x25 grid with plain terrain
3. Adds forest clusters (5 clusters, 3-6 cell radius)
4. Adds mountain ranges (3 ranges, 5-12 cell length)
5. Adds rivers (2 rivers flowing top to bottom)
6. Places entities:
   - Main player at (0,0)
   - 8 friendly players randomly placed
   - 12 hostile NPCs randomly placed
7. Saves map to database
8. Returns map data to client

#### 3. Fallback Generation (Client-Side)
1. Network request fails or times out
2. Client logs error to console
3. Local terrain generation triggers
4. Similar procedural generation on client
5. Map displays with locally generated data
6. No server synchronization

### Authentication Requirements
- **Map Data Fetch**: No authentication required
- **Public Access**: Map data is publicly accessible
- **No User-Specific Data**: Map is shared across all users

### Error Handling
- **Network Errors**: Graceful fallback to local generation
- **Server Errors**: Console logging with user-friendly degradation
- **Data Validation**: Fallback if server returns invalid data
- **Timeout Handling**: Reasonable timeout with fallback

### Token/Session Management
- **No Authentication**: Map endpoint doesn't require tokens
- **Public Resource**: Map data accessible without login
- **No Session State**: Map state not tied to user sessions

## Future Considerations

### Gameplay Integration
- **Territory Control**: Map cells could become controllable territories
- **Resource Nodes**: Add resource collection points on map
- **Dynamic Events**: Real-time map events and changes
- **Player Movement**: Allow players to move between map cells

### Technical Enhancements
- **Real-time Updates**: WebSocket integration for live map changes
- **Map Persistence**: Save player positions and map state
- **Multiple Maps**: Support for different map instances
- **Map Sharing**: Allow players to share map coordinates

### User Experience Improvements
- **Mini-map**: Add overview mini-map for navigation
- **Search Function**: Find specific entities or terrain types
- **Map Filters**: Filter view by terrain or entity type
- **Bookmarks**: Save favorite map locations

> **Technical Details**: See [Implementation](./special-notes.md#implementation-details)
> 
> **Security**: See [Security Considerations](./special-notes.md#security-considerations)
> 
> **Performance**: See [Performance Considerations](./special-notes.md#performance-considerations)
> 
> **Future Work**: See [Future Considerations](./special-notes.md#future-considerations)

## Complex Subsystems

### Procedural Terrain Generation System

#### Forest Cluster Generation
**Algorithm**: Radial cluster placement with density variation
**Parameters**:
- Number of clusters: 5
- Cluster radius: 3-6 cells (random)
- Density probability: 70% per cell within radius
- Placement: Random center points with collision avoidance

**Generation Process**:
1. Select random center point (x, y)
2. Calculate cluster radius (3-6 cells)
3. Iterate through cells within radius
4. Apply 70% probability for forest placement
5. Use distance-based probability (dx² + dy² ≤ radius²)
6. Repeat for 5 total clusters

#### Mountain Range Generation
**Algorithm**: Linear range generation with branching
**Parameters**:
- Number of ranges: 3
- Range length: 5-12 cells (random)
- Branching probability: 40% per cell
- Direction variation: ±1 cell per step

**Generation Process**:
1. Select random starting point
2. Generate linear path with random direction changes
3. Apply 40% branching probability at each cell
4. Create adjacent mountain cells for branching
5. Ensure path stays within grid boundaries
6. Repeat for 3 total mountain ranges

#### River Generation
**Algorithm**: Top-to-bottom flow with meandering
**Parameters**:
- Number of rivers: 2
- Flow direction: Top to bottom
- Meandering: ±1 cell horizontal variation
- Boundary enforcement: Clamp to grid edges

**Generation Process**:
1. Start at random x-coordinate at top (y=0)
2. Flow downward with horizontal meandering
3. Apply random horizontal movement (±1 cell)
4. Clamp x-coordinate to grid boundaries
5. Continue until reaching bottom (y=24)
6. Repeat for 2 total rivers

### Entity Placement and Management System

#### Collision Avoidance Algorithm
**Purpose**: Prevent entity overlap and terrain conflicts
**Constraints**:
- No two entities in same cell
- Entities cannot occupy mountains or water
- Main player always at (0,0)
- Minimum distance between entities (optional)

**Placement Logic**:
1. Reserve (0,0) for main player
2. Check cell availability (isOccupied, canBeOccupied)
3. Random selection with validation
4. Retry logic for failed placements
5. Maximum retry attempts to prevent infinite loops

#### Entity Type Distribution
**Player Entities**: 8 friendly players
- Names: Alpha, Beta, Gamma, Delta, Echo, Foxtrot, Helix, Iris
- Symbol: ◉ (green color)
- Placement: Random with collision avoidance

**Enemy Entities**: 12 hostile NPCs
- Names: Cipher, Shadow, Wraith, Phantom, Specter, Ghost, Virus, Trojan
- Symbol: ⊗ (red color)
- Placement: Random with collision avoidance

**Main Player**: Always at (0,0)
- Symbol: ⚡ (cyan color)
- Name: "YOU"
- Fixed position, never moves

### Grid Rendering and Performance Optimization

#### Cell Rendering Pipeline
**Component Structure**:
- CellContent: Individual cell component with React.memo
- Terrain rendering: Conditional styling based on terrain type
- Entity overlay: Absolute positioning over terrain
- Selection state: Highlighted border when selected

**Rendering Optimization**:
- React.memo prevents unnecessary re-renders
- Conditional rendering for entity overlays
- Efficient CSS styling with terrain-specific classes
- Minimal DOM manipulation for smooth performance

#### Scroll Performance Management
**Scroll Container**: 1660x1660 pixels total content
**Optimization Strategies**:
- Native scroll views for hardware acceleration
- Hidden scroll indicators for clean interface
- Disabled directional lock for smooth diagonal scrolling
- Efficient viewport calculations

**Memory Management**:
- 2D array structure for O(1) cell access
- Efficient cell data structure (625 cells)
- Minimal state updates during scroll
- Garbage collection friendly component design

### State Management and Data Flow

#### Client-Server Synchronization
**Data Flow Architecture**:
1. Client requests map data from server
2. Server generates or retrieves map from database
3. Client receives complete map data
4. Local state updates with received data
5. Grid re-renders with new data

**Fallback Mechanism**:
1. Network request fails
2. Client detects failure and logs error
3. Local terrain generation triggers
4. Similar procedural generation on client
5. Map displays with locally generated data

#### State Persistence Strategy
**No State Persistence**: Map state not preserved during navigation
**Fresh Data Loading**: Each screen visit fetches fresh map data
**Server-Side Persistence**: Map data stored in database
**Client-Side Caching**: No local caching implemented

### Error Handling and Recovery Systems

#### Network Failure Recovery
**Detection**: Request timeout or network error
**Recovery Strategy**: Graceful fallback to local generation
**User Experience**: No visible error messages
**Data Consistency**: Local generation maintains similar structure

#### Data Validation and Sanitization
**Server-Side Validation**: MapService validates all generated data
**Client-Side Validation**: Fallback generation handles invalid responses
**Schema Validation**: MongoDB schema enforces data structure
**Type Safety**: TypeScript interfaces ensure data consistency

#### Performance Degradation Handling
**Large Grid Impact**: 625 cells could impact low-end devices
**Scroll Performance**: Native scroll views mitigate performance issues
**Memory Usage**: Efficient data structures minimize memory footprint
**Rendering Optimization**: React.memo and conditional rendering

### Advanced Technical Architecture

#### Seed-Based Generation System
**Purpose**: Ensure consistent map generation across requests
**Implementation**: seedrandom library with fixed seed
**Benefits**: Reproducible terrain patterns
**Limitations**: Same map for all users (shared resource)

#### Database Integration Pattern
**Schema Design**: Efficient cell and map schemas
**Indexing Strategy**: Unique index on cell coordinates
**Validation Hooks**: Pre-save hooks for terrain restrictions
**Query Optimization**: Single map lookup per request

#### Component Architecture Patterns
**Separation of Concerns**: Clear component responsibilities
**Props Interface**: Well-defined data contracts
**Error Boundaries**: Graceful error handling
**Performance Optimization**: React.memo and conditional rendering

### Integration Points with Other Systems

#### Battle System Integration
**Entity Discovery**: Map entities can initiate battles
**Terrain Impact**: Terrain types affect battle mechanics
**Position Tracking**: Entity positions inform battle positioning
**Strategic Planning**: Map intelligence guides battle preparation

#### Territory Control Integration
**Cell Ownership**: Map cells can become controllable territories
**Resource Management**: Terrain types provide different resources
**Strategic Positioning**: Entity placement affects territory control
**Dynamic Updates**: Map changes reflect territory status

#### User Authentication Integration
**Public Access**: Map data accessible without authentication
**Shared Resources**: All users access same map data
**No User State**: Map state not tied to user sessions
**Future Considerations**: User-specific map data possible 