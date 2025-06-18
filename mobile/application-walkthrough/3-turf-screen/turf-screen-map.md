# Turf Screen - User Flow Documentation

> **Technical Notes**: See [turf-screen-special-notes.md](./turf-screen-special-notes.md) for implementation details, security considerations, and future improvements.

## Table of Contents
1. [Overview](#overview)
2. [User Experience Flow](#user-experience-flow)
3. [Main Components](#main-components)
4. [Component Interactions](#component-interactions)
5. [Screen Transitions](#screen-transitions)
6. [Turf Screen Scenarios](#turf-screen-scenarios)
   - [Navigation Scenarios](#navigation-scenarios)
7. [Server Interactions](#server-interactions)
8. [Error Scenarios](#error-scenarios)
   - [Screen State Management](#screen-state-management)
   - [Animation and Performance](#animation-and-performance)
   - [Component Architecture](#component-architecture)
9. [Related Screens](#related-screens)
   - [Navigation Flow](#navigation-flow)
   - [Screen Relationships](#screen-relationships)
10. [Future Considerations](#future-considerations)
    - [Enhanced User Experience](#enhanced-user-experience)
    - [Performance Enhancements](#performance-enhancements)
    - [Accessibility Improvements](#accessibility-improvements)
    - [Technical Debt](#technical-debt)
11. [Advanced Animation System](#advanced-animation-system)
    - [Diagonal Grid Animation Subsystem](#diagonal-grid-animation-subsystem)
    - [Location Marker Animation Subsystem](#location-marker-animation-subsystem)
    - [Screen Transition Animation Subsystem](#screen-transition-animation-subsystem)
12. [State Machine Architecture](#state-machine-architecture)
    - [Screen State Management](#screen-state-management-1)
    - [Data State Management](#data-state-management)
    - [Error State Machine](#error-state-machine)
13. [Performance Monitoring System](#performance-monitoring-system)
    - [Frame Rate Monitoring](#frame-rate-monitoring)
    - [Memory Management Monitoring](#memory-management-monitoring)
    - [Network Performance Monitoring](#network-performance-monitoring)

## Overview
The Turf Screen serves as the main hub after successful login, providing access to all major game features. It features a cyberpunk-themed digital ground with interactive location markers, real-time balance display, and smooth navigation between game areas.

## User Experience Flow
1. Initial Load
   - Screen centers automatically at coordinates (1000,1000)
   - Balance display updates with current user balance
   - Grid lines animate in with diagonal pattern
   - Location markers fade in and become interactive
   - Loading spinner shows during initialization

2. Navigation
   - Smooth scrolling in all directions
   - Auto-centers on load at (1000,1000)
   - Maintains position during transitions
   - Diagonal grid lines for visual depth
   - Scroll boundaries at edges of 2000x2000 area
   - No zoom or bounce effects

3. Location Access
   - Home Location: Access to Hack Rig and main features
   - Digital Barracks: Access to bot management
   - Profile: Access to user profile and stats
   - Each location has hover and press states
   - Visual feedback on interaction

> **Technical Details**: See [Turf Screen Implementation](./turf-screen-special-notes.md#turf-screen-implementation) for implementation specifics.

## Main Components
1. Balance Display
   - Shows current user balance
   - Positioned at top-left corner, fixed position
   - Z-index: 1 (above background, below markers)
   - Updates in real-time
   - Cyberpunk-themed styling
   - Error state for network issues
   - Loading state during updates

2. Digital Ground
   - Central interactive area
   - Positioned absolutely, centered in viewport
   - Dimensions: 2000x2000 pixels
   - Features diagonal grid lines
   - Contains main location markers
   - Scrollable in all directions
   - Z-index layering:
     - Background: 1
     - Grid lines: 2
     - Location markers: 3
     - Overlays: 4

3. Location Markers
   - Home Location
     - Positioned absolutely at 25% from left, 50% from top
     - Transform: translate(-60px, -80px)
     - Z-index: 3 (above grid, below overlays)
     - Access to Hack Rig and main features
     - "HOME" label
     - Hover effect: Glow animation
     - Press effect: Scale down
     - Error state: Red outline
    
   - Digital Barracks Location
     - Positioned absolutely at 75% from left, 50% from top
     - Transform: translate(60px, -80px)
     - Z-index: 3 (above grid, below overlays)
     - Access to bot management
     - "DIGITAL BARRACKS" label
     - Hover effect: Glow animation
     - Press effect: Scale down
     - Error state: Red outline
    
   - Profile Location
     - Positioned absolutely at top-right corner
     - Fixed position relative to viewport
     - Z-index: 3 (above grid, below overlays)
     - Access to user profile
     - "PROFILE" label
     - Hover effect: Glow animation
     - Press effect: Scale down
     - Error state: Red outline

4. Navigation System
   - Smooth scrolling in all directions
   - Auto-centers on load (centers at 1000,1000)
   - Maintains position during transitions
   - Diagonal grid lines for visual depth
   - Scroll boundaries at edges
   - No zoom or bounce effects
   - Performance optimized for 60fps

## Component Interactions
1. Balance Display
   - Updates in real-time with balance changes
   - Shows loading state during updates
   - Displays error state for network issues
   - Persists across screen transitions

2. Digital Ground
   - Responds to touch and drag gestures
   - Maintains scroll position during transitions
   - Updates grid line opacity based on scroll
   - Handles boundary conditions

3. Location Markers
   - Interactive touch feedback
   - Hover and press states
   - Error state handling
   - Transition animations
   - Position updates with scroll

4. Navigation System
   - Smooth transitions between screens
   - Position preservation
   - Error boundary protection
   - Memory efficient loading

## Screen Transitions
1. Home Location → Hack Rig
   - Access to:
     - Hack Map
     - Bot Assembly
     - Battle Preparation
   - Close button returns to Turf
   - Smooth fade transition
   - Position preservation

2. Digital Barracks → Bot Management
   - View and manage bot collection
   - Close button returns to Turf
   - Smooth fade transition
   - Position preservation

3. Profile Location → User Profile
   - View user stats and progress
   - Close button returns to Turf
   - Smooth fade transition
   - Position preservation

## Turf Screen Scenarios

#### Navigation Scenarios
1. Home Location Access:
   - User taps Home Location marker
   - Screen transitions to Hack Rig
   - Available actions:
     - Access Hack Map
     - Enter Bot Assembly
     - Start Battle Preparation
   - Close button returns to Turf

2. Digital Barracks Access:
   - User taps Digital Barracks marker
   - Screen transitions to Bot Management
   - View and manage bot collection
   - Close button returns to Turf

3. Profile Access:
   - User taps Profile marker
   - Screen transitions to Profile view
   - View user stats and progress
   - Close button returns to Turf

## Server Interactions
1. Balance Updates
   - Endpoint: `/api/user/balance`
   - Method: GET
   - Frequency: Every 30 seconds
   - Response: `{ balance: number, lastUpdate: string }`
   - Error: `{ error: string, code: string }`

2. Location Status
   - Endpoint: `/api/locations/status`
   - Method: GET
   - Frequency: On screen load
   - Response: `{ locations: { id: string, status: string }[] }`
   - Error: `{ error: string, code: string }`

3. Screen Transitions
   - Endpoint: `/api/screen/transition`
   - Method: POST
   - Payload: `{ from: string, to: string, position: { x: number, y: number } }`
   - Response: `{ success: boolean, data: object }`
   - Error: `{ error: string, code: string }`

## Error Scenarios
1. Network Issues
   - Balance Display:
     - Error: "NETWORK_ERROR: Unable to fetch balance"
     - Retry button appears
     - Last known balance shown
     - Auto-retry every 30 seconds

   - Location Markers:
     - Error: "NETWORK_ERROR: Unable to load locations"
     - Markers show error state
     - Retry button appears
     - Last known state preserved

2. Screen Load Failures
   - Error: "SCREEN_LOAD_ERROR: Unable to initialize screen"
   - Fallback to previous screen
   - Error message: "Failed to load Turf Screen. Please try again."
   - Retry button appears
   - Error logging enabled

3. State Management Errors
   - Error: "STATE_ERROR: Unable to preserve screen state"
   - Fallback to default position
   - Error message: "Screen position reset due to error"
   - Auto-recovery attempted
   - Error logging enabled

4. Performance Issues
   - Warning: "PERFORMANCE_WARNING: Frame rate dropping"
   - Reduced animation quality
   - Simplified visual effects
   - Performance monitoring enabled
   - Auto-recovery when possible

#### Screen State Management
1. Initial Load:
   - Screen centers automatically
   - Balance display updates
   - Grid lines animate in
   - Location markers become interactive
   > **Improvement Needed**: See [State Management Improvements](./turf-screen-special-notes.md#state-management-improvements) for optimization strategies

2. Screen Transitions:
   - Smooth fade between screens
   - State preservation where needed
   - Error boundary protection
   - Memory efficient loading
   > **Current Limitations**: Complex state transitions may impact performance

3. Scroll Behavior:
   - Free movement in all directions
   - Maintains position during transitions
   - Smooth scrolling performance
   - No zoom or bounce effects
   > **Performance Note**: State updates during scroll may need optimization

#### Animation and Performance
1. Screen Transitions:
   - Smooth fade animations between screens
   - Optimized render cycles
   - Memory-efficient component mounting
   - Cleanup on unmount

2. Grid System:
   - Diagonal line animations
   - Matrix-style grid background
   - Performance-optimized rendering
   - Responsive scaling

3. Location Markers:
   - Interactive touch feedback
   - Smooth position transitions
   - Optimized hit detection
   - Visual feedback on interaction

#### Component Architecture
1. Core Components:
   - ScrollViewMemo for optimized scrolling
   - DiagonalLines for grid visualization
   - Location markers with touch handling
   - Error boundary implementation

2. State Management:
   - Centralized screen state
   - Efficient navigation handling
   - Memory leak prevention
   - State preservation strategy

3. Performance Optimizations:
   - Memoized components
   - Efficient re-renders
   - Asset preloading
   - Memory management

## Related Screens

### Navigation Flow
- **Previous Screen**: [Login Screen](../2-login-screen/login-screen-map.md) - User arrives here after successful authentication
- **Next Screens**:
  - [Home Screen](../4-home-screen/home-screen-map.md) - Accessible via Home Location marker
  - [Digital Barracks Screen](../7-digital-barracks/digital-barracks-screen-map.md) - Accessible via Digital Barracks marker
  - [Profile Screen](../8-profile-screen/profile-screen-map.md) - Accessible via Profile marker

### Screen Relationships
1. **Login Screen → Turf Screen**: Primary entry point after authentication
   - User balance is displayed and updated
   - Location status is fetched
   - Screen position is initialized

2. **Turf Screen → Home Screen**: Main game hub access
   - Provides access to Hack Rig features
   - Bot Assembly and Battle Preparation
   - Maintains turf position for return

3. **Turf Screen → Digital Barracks**: Bot management access
   - View and manage bot collection
   - Bot assembly and customization
   - Maintains turf position for return

4. **Turf Screen → Profile Screen**: User profile access
   - View user stats and progress
   - Account management features
   - Maintains turf position for return

> **Technical Details**: See [Screen Transitions](./turf-screen-special-notes.md#api-integration) for implementation specifics.

## Future Considerations

### Enhanced User Experience
1. **Gesture Controls**:
   - Pinch-to-zoom functionality
   - Double-tap to center
   - Long-press for context menus
   - Swipe gestures for quick navigation

2. **Visual Improvements**:
   - Dynamic lighting effects
   - Particle system for atmosphere
   - Weather effects on the digital ground
   - Day/night cycle integration

3. **Interactive Elements**:
   - Hover tooltips for locations
   - Animated location markers
   - Sound effects for interactions
   - Haptic feedback integration

### Performance Enhancements
1. **Optimization Opportunities**:
   - Virtual scrolling for large areas
   - Asset preloading for faster transitions
   - Lazy loading of non-critical components
   - Memory usage optimization

2. **State Management**:
   - Implement Redux or Zustand for global state
   - Add state persistence for critical data
   - Optimize state update frequency
   - Add state debugging tools

### Accessibility Improvements
1. **Screen Reader Support**:
   - Proper accessibility labels
   - Navigation announcements
   - Error message accessibility
   - Focus management

2. **Visual Accessibility**:
   - High contrast mode
   - Adjustable text sizes
   - Color blind friendly design
   - Reduced motion options

### Technical Debt
1. **Code Quality**:
   - Refactor complex state logic
   - Improve error boundary coverage
   - Add comprehensive testing
   - Optimize bundle size

2. **Security Enhancements**:
   - Implement certificate pinning
   - Add request signing
   - Enhance token security
   - Add security monitoring

> **Implementation Priority**: Medium - Focus on performance optimizations and state management improvements first, followed by UX enhancements.

## Advanced Animation System

### Diagonal Grid Animation Subsystem
1. **Grid Line Generation**:
   - Multiple diagonal line layers with varying opacity
   - Dynamic line density based on scroll position
   - Matrix-style cyberpunk aesthetic
   - Performance-optimized rendering cycles
   - Hardware acceleration enabled

2. **Scroll-Based Animation**:
   - Grid opacity changes with scroll velocity
   - Line movement creates depth perception
   - Smooth transitions between animation states
   - Frame rate optimization for 60fps target
   - Memory-efficient animation cycles

3. **Visual Effect Layers**:
   - Background layer: Static grid foundation
   - Middle layer: Dynamic opacity lines
   - Foreground layer: Interactive elements
   - Z-index management for proper layering
   - Blend mode optimization

### Location Marker Animation Subsystem
1. **Hover Effects**:
   - Glow animation with color transitions
   - Scale transformations for feedback
   - Opacity changes for visual emphasis
   - Smooth easing functions
   - Performance-optimized hit detection

2. **Press Animations**:
   - Scale down effect on touch
   - Color intensity changes
   - Haptic feedback integration
   - Animation timing optimization
   - State preservation during animation

3. **Error State Animations**:
   - Red outline pulsing effect
   - Warning color transitions
   - Error message fade-in/out
   - Recovery animation sequences
   - State transition coordination

### Screen Transition Animation Subsystem
1. **Fade Transitions**:
   - Smooth opacity transitions between screens
   - Position preservation during transitions
   - Memory-efficient component mounting
   - Cleanup timing optimization
   - Error boundary protection

2. **Loading Animations**:
   - Spinner integration with grid system
   - Progress indication during initialization
   - Smooth state transitions
   - Performance monitoring during load
   - Error state handling

> **Technical Details**: See [Animation System Implementation](./turf-screen-special-notes.md#animation-system) for implementation specifics.

## State Machine Architecture

### Screen State Management
1. **Initialization State Machine**:
   - Loading: Screen components mounting
   - Initializing: Grid system setup
   - Ready: User interaction enabled
   - Error: Fallback state with recovery
   - Recovery: State restoration attempts

2. **Navigation State Machine**:
   - Idle: No navigation in progress
   - Transitioning: Screen change in progress
   - Preserving: State preservation active
   - Restoring: State restoration in progress
   - Error: Navigation failure handling

3. **Interaction State Machine**:
   - Passive: No user interaction
   - Hovering: Location marker hover
   - Pressing: Touch interaction active
   - Transitioning: Navigation triggered
   - Error: Interaction failure

### Data State Management
1. **Balance State Machine**:
   - Loading: Fetching balance data
   - Updated: Current balance displayed
   - Stale: Balance may be outdated
   - Error: Network failure state
   - Retrying: Auto-retry in progress

2. **Location State Machine**:
   - Loading: Location status fetch
   - Available: All locations accessible
   - Partial: Some locations unavailable
   - Error: Location fetch failure
   - Cached: Using cached location data

### Error State Machine
1. **Error Classification**:
   - Network: Connection issues
   - State: State management failures
   - Performance: Frame rate issues
   - Memory: Resource exhaustion
   - Security: Authentication failures

2. **Recovery Strategies**:
   - Auto-retry: Automatic recovery attempts
   - Fallback: Using cached/previous state
   - User intervention: Manual retry options
   - Graceful degradation: Reduced functionality
   - Complete reset: Full state restoration

> **Technical Details**: See [State Management Implementation](./turf-screen-special-notes.md#state-management) for implementation specifics.

## Performance Monitoring System

### Frame Rate Monitoring
1. **Real-Time Performance Tracking**:
   - 60fps target frame rate monitoring
   - Frame drop detection and logging
   - Performance degradation alerts
   - Automatic quality reduction triggers
   - Performance recovery monitoring

2. **Animation Performance**:
   - Grid animation frame rate tracking
   - Location marker animation performance
   - Transition animation optimization
   - Memory usage during animations
   - CPU usage monitoring

### Memory Management Monitoring
1. **Resource Tracking**:
   - Component memory usage
   - Asset memory consumption
   - State object memory footprint
   - Cache memory utilization
   - Memory leak detection

2. **Cleanup Monitoring**:
   - Component unmount timing
   - Resource cleanup verification
   - Memory release confirmation
   - Garbage collection optimization
   - Memory pressure handling

### Network Performance Monitoring
1. **API Call Performance**:
   - Request/response timing
   - Network latency tracking
   - Retry attempt monitoring
   - Cache hit/miss ratios
   - Bandwidth utilization

2. **Error Rate Monitoring**:
   - Network error frequency
   - Timeout occurrence tracking
   - Retry success rates
   - Error pattern analysis
   - Recovery success rates

> **Technical Details**: See [Performance Considerations](./turf-screen-special-notes.md#performance-considerations) for implementation specifics. 