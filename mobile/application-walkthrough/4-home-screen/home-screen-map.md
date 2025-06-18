# Home Screen - User Flow Documentation

> **Technical Notes**: See [home-screen-special-notes.md](./home-screen-special-notes.md) for implementation details, security considerations, and future improvements.

## Table of Contents
1. [Overview](#overview)
2. [User Experience Flow](#user-experience-flow)
3. [Main Components](#main-components)
4. [Component Interactions](#component-interactions)
5. [Screen Transitions](#screen-transitions)
6. [Scenarios & Outcomes](#scenarios--outcomes)
   - [Standard Flow](#standard-flow)
   - [Edge Cases](#edge-cases)
   - [Error Scenarios](#error-scenarios)
7. [Server Interactions](#server-interactions)
8. [Error Scenarios](#error-scenarios-1)
   - [Network Error Scenarios](#network-error-scenarios)
   - [State Management Errors](#state-management-errors)
   - [UI/UX Error Scenarios](#uiux-error-scenarios)
   - [Specific Error Messages](#specific-error-messages)
9. [Related Screens](#related-screens)
   - [Navigation Flow](#navigation-flow)
   - [Screen Relationships](#screen-relationships)
10. [Future Considerations](#future-considerations)
    - [Enhanced User Experience](#enhanced-user-experience)
    - [Performance Optimizations](#performance-optimizations)
    - [Technical Enhancements](#technical-enhancements)
    - [Feature Extensions](#feature-extensions)

## Overview
The Home Screen serves as the main game hub accessed from the Turf Screen via the HOME location marker. It provides access to two core game systems: the Hack Rig (for hacking operations) and Bot Assembly (for bot management and construction). The screen features cyberpunk-themed UI elements with state-dependent interactions and smooth navigation transitions.

## User Experience Flow
1. **Entry from Turf Screen**
   - User taps HOME location marker on Turf Screen
   - Smooth fade transition to Home Screen
   - Screen loads with Hack Rig and Bot Assembly modules
   - Close button appears in top-right corner

2. **Module Interaction**
   - **Hack Rig Module**: 
     - If unlocked: User can tap to access Hack Map
     - If locked: Animated warning appears with alert dialog
   - **Bot Assembly Module**: User can tap to access bot management
   - **Close Button**: Always available to return to Turf Screen

3. **State-Dependent Navigation**
   - Hack Rig state determines available actions
   - Locked state shows warning and battle initiation option
   - Unlocked state allows direct navigation to Hack Map
   - Bot Assembly always accessible for bot management

## Main Components
1. **Close Button**
   - Positioned absolutely in top-right corner
   - Fixed position: top: SIZING.spacing.lg, right: SIZING.spacing.lg
   - Dimensions: 44x44 pixels, circular design
   - Z-index: 1000 (above all other content)
   - Background: #b39ddb with COLORS.secondary border
   - Text: "×" symbol, 28px font size
   - Always visible and accessible
   - Returns user to Turf Screen on press
   - Smooth fade transition on press

2. **Hack Rig Display**
   - Positioned in left side of content area
   - Dimensions: 45% width, 1:1 aspect ratio
   - Background: rgba(10, 10, 10, 0.9) with COLORS.secondary border
   - Border radius: 8px, overflow hidden
   - State-dependent styling:
     - Unlocked: Full opacity, normal border
     - Locked: 50% opacity, warning border (#FF4500) when alert active
   - Image container: 1.5:1 aspect ratio with matrix border
   - Lock overlay: Semi-transparent with 🔒 emoji when locked
   - Text: "HACK RIG" title and "Access the network" description
   - Animation: Pulse effect (scale 1.0 to 1.1) when locked and alert active

3. **Bot Assembly Module**
   - Positioned in right side of content area
   - Dimensions: 45% width, 1:1 aspect ratio
   - Background: rgba(10, 10, 10, 0.9) with COLORS.secondary border
   - Border radius: 8px, overflow hidden
   - Image container: 1.5:1 aspect ratio with matrix border
   - Text: "BOT ASSEMBLY" title and "Build your army" description
   - Always accessible regardless of other states
   - No state-dependent styling or animations

4. **Content Layout**
   - Flex container with row direction
   - Justify content: space-evenly
   - Align items: center
   - Padding: SIZING.spacing.lg horizontal
   - Background: COLORS.background

## Component Interactions
1. **Close Button Interactions**
   - Single tap triggers onClose navigation
   - No state dependencies or animations
   - Always functional regardless of other component states
   - Immediate response with no delays

2. **Hack Rig Display Interactions**
   - **Unlocked State**: Single tap navigates to Hack Map
   - **Locked State**: 
     - Single tap triggers alert dialog
     - Pulse animation starts (scale 1.0 to 1.1, 1-second duration)
     - Warning border appears (#FF4500)
     - System alert shows with "Cancel" and "EXECUTE EXPLOIT" options
     - Cancel: Stops animation, resets scale, closes alert
     - Execute: Navigates to battle, stops animation, resets scale

3. **Bot Assembly Interactions**
   - Single tap navigates to Bot Assembly screen
   - No state dependencies or animations
   - Always functional regardless of Hack Rig state
   - Immediate response with no delays

4. **State Synchronization**
   - Hack Rig state updates in real-time from AuthContext
   - User.unlockedFeatures.hackRig determines locked/unlocked state
   - State changes trigger immediate UI updates
   - No manual refresh required

## Screen Transitions
1. **Entry Points**
   - **From Turf Screen**: HOME location marker tap
   - **Navigation Props**: Required for proper functionality
   - **State Preservation**: Maintains user context

2. **Exit Points**
   - **To Turf Screen**: Close button tap
   - **To Hack Map**: Hack Rig tap (when unlocked)
   - **To Battle**: Exploit execution (when locked)
   - **To Bot Assembly**: Bot Assembly module tap

## Scenarios & Outcomes

### Standard Flow
1. **Successful Entry**: User enters from Turf, sees both modules
2. **Hack Rig Unlocked**: User can access Hack Map directly
3. **Bot Assembly Access**: User can manage bots anytime
4. **Return to Turf**: Close button always available

### Edge Cases
1. **Missing Navigation Props**
   - User may be unable to leave Home Screen
   - Navigation buttons become non-functional
   - Error state with limited functionality

2. **Hack Rig State Sync Issues**
   - User sees incorrect lock/unlock state
   - Navigation may fail or show wrong options
   - State mismatch between client and server

3. **Network Connectivity Issues**
   - State updates may fail
   - User sees cached or stale information
   - Navigation may be delayed or fail

### Error Scenarios
1. **Locked Hack Rig**
   - Animated warning appears
   - Alert dialog shows options
   - User can cancel or execute exploit
   - Battle initiation if exploit chosen

2. **Navigation Failures**
   - Props missing: Navigation disabled
   - State errors: Incorrect options shown
   - Network issues: Delayed or failed navigation

## Server Interactions
1. **User Profile Data**
   - Fetched to determine Hack Rig lock/unlock state
   - Updates in real-time when state changes
   - Cached for offline functionality
   - Error handling for fetch failures

2. **Bot Inventory Data**
   - Fetched for Bot Assembly module
   - Shows current bot collection
   - Updates when bots are built or modified
   - Cached for performance

3. **State Management**
   - Hack Rig unlock state synchronization
   - Bot inventory updates
   - User progress tracking
   - Error state recovery

## Error Scenarios

### Network Error Scenarios
1. **API Connection Failures**
   - Error: "Network error: Cannot connect to server"
   - User sees cached state or fallback UI
   - Retry mechanism available
   - Graceful degradation of functionality

2. **Server Response Errors**
   - Error: "Server error (500): Internal Server Error"
   - Error: "Server error (404): User not found"
   - Error: "Server error (401): Authentication failed"
   - User sees error message with retry option

3. **Invalid Response Format**
   - Error: "Invalid response from server"
   - Fallback to cached data
   - Error logging for debugging
   - User notification of data sync issues

### State Management Errors
1. **Hack Rig Unlock Failures**
   - Error: "Failed to unlock hack rig"
   - Error: "Error unlocking hack rig"
   - User remains in locked state
   - Retry mechanism available

2. **Authentication Failures**
   - Error: "Authentication failed"
   - User redirected to login
   - Session invalidation
   - Token refresh attempts

3. **State Synchronization Issues**
   - Client/server state mismatch
   - Cached data conflicts
   - Manual refresh required
   - Error state with recovery options

### UI/UX Error Scenarios
1. **Animation Failures**
   - Pulse animation fails to start
   - Animation cleanup issues
   - Performance degradation
   - Fallback to static UI

2. **Navigation Failures**
   - Missing navigation props
   - Navigation function errors
   - Screen transition failures
   - Dead end scenarios

3. **Component Rendering Errors**
   - Component mount failures
   - Image loading errors
   - Style application issues
   - Error boundary activation

### Specific Error Messages
1. **Locked Hack Rig Alert**:
   - Title: "System Breach Detected"
   - Message: "TESLA_GRID has root access to your system. Shell injection detected in Hack Rig kernel.\n\nInitiate countermeasures to regain control."
   - Options: "Cancel" (style: cancel), "EXECUTE EXPLOIT" (style: destructive)

2. **Network Errors**:
   - "Network error: Cannot connect to server"
   - "Server error (500): Internal Server Error"
   - "Invalid response from server"

3. **State Errors**:
   - "Failed to unlock hack rig"
   - "Error unlocking hack rig"
   - "Authentication failed"

## Related Screens

### Navigation Flow
- **Previous Screen**: [Turf Screen](../3-turf-screen/turf-screen-map.md) - User arrives here after tapping HOME location marker
- **Next Screens**:
  - [Hack Map Screen](../10-hack-map-screen/hack-map-screen-map.md) - Accessible via Hack Rig (when unlocked)
  - [Battle Screen](../6-battle-screen/battle-screen-map.md) - Accessible via Hack Rig exploit (when locked)
  - [Bot Assembly Screen](../5-bot-assembly-screen/bot-assembly-screen-map.md) - Accessible via Bot Assembly module

### Screen Relationships
1. **Turf Screen → Home Screen**: Main game hub access
   - Provides access to Hack Rig and Bot Assembly
   - State-dependent navigation based on user progress
   - Maintains turf position for return

2. **Home Screen → Hack Map**: Hacking interface access
   - Requires Hack Rig to be unlocked
   - Provides network hacking capabilities
   - Returns to Home Screen via close button

3. **Home Screen → Battle**: Combat system access
   - Triggered by Hack Rig exploit execution
   - Provides combat mechanics and battle system
   - Returns to Home Screen after battle completion

4. **Home Screen → Bot Assembly**: Bot management access
   - Always accessible regardless of other states
   - Provides bot building and management
   - Returns to Home Screen via close button

> **Technical Details**: See [Screen Transitions](./home-screen-special-notes.md#api-integration) for implementation specifics.

## Future Considerations

### Enhanced User Experience
1. **Custom Alert System**:
   - Replace native system alerts with cyberpunk-themed dialogs
   - Animated warning overlays for locked states
   - Interactive confirmation dialogs
   - Sound effects and haptic feedback integration

2. **Visual Improvements**:
   - Dynamic lighting effects on modules
   - Particle effects for state transitions
   - Enhanced animation sequences
   - Improved visual feedback for interactions

3. **Accessibility Enhancements**:
   - Screen reader support for all components
   - High contrast mode for visual accessibility
   - Adjustable text sizes
   - Reduced motion options for animations

### Performance Optimizations
1. **Animation System**:
   - Hardware acceleration improvements
   - Frame rate optimization for complex animations
   - Memory-efficient animation cycles
   - Performance monitoring integration

2. **State Management**:
   - Optimized state synchronization
   - Efficient caching strategies
   - Reduced re-render frequency
   - Memory leak prevention

3. **Navigation Optimization**:
   - Preloading of destination screens
   - Smooth transition animations
   - State preservation optimization
   - Error recovery improvements

### Technical Enhancements
1. **Error Handling**:
   - Comprehensive error boundary implementation
   - Enhanced error recovery mechanisms
   - Better user feedback for errors
   - Automated error reporting

2. **Security Improvements**:
   - Enhanced authentication validation
   - Secure state management
   - Input validation strengthening
   - Security monitoring integration

3. **Testing and Quality**:
   - Comprehensive unit test coverage
   - Integration testing for navigation flows
   - Performance testing for animations
   - Accessibility testing compliance

### Feature Extensions
1. **Advanced State Management**:
   - Real-time state synchronization across devices
   - Offline state management
   - State persistence strategies
   - State migration capabilities

2. **Enhanced Navigation**:
   - Deep linking support
   - Navigation history management
   - Breadcrumb navigation
   - Quick access shortcuts

3. **Analytics and Monitoring**:
   - User interaction tracking
   - Performance metrics collection
   - Error rate monitoring
   - Usage pattern analysis

> **Implementation Priority**: Medium - Focus on custom alert system and accessibility improvements first, followed by performance optimizations and technical enhancements.

> **Technical Details**: See [Future Considerations](./home-screen-special-notes.md#future-considerations) for implementation specifics. 