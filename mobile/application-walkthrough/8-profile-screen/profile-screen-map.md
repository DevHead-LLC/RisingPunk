# Profile Screen - User Flow Documentation

> **Technical Notes**: See [profile-screen-special-notes.md](./profile-screen-special-notes.md) for implementation details, security considerations, and future improvements.

## Table of Contents
- [Overview](#overview)
- [User Experience Flow](#user-experience-flow)
- [Main Components](#main-components)
- [Scenarios & Outcomes](#scenarios--outcomes)
  - [Standard Flow (Happy Path)](#standard-flow-happy-path)
  - [Error Scenarios](#error-scenarios)
  - [Logout Scenarios](#logout-scenarios)
  - [Data Display Scenarios](#data-display-scenarios)
- [Screen Transitions](#screen-transitions)
- [Server Details](#server-details)
  - [Profile Data Fetch](#profile-data-fetch)
  - [Logout Process](#logout-process)
  - [Balance Integration](#balance-integration)
- [Related Screens](#related-screens)
  - [Navigation Flow](#navigation-flow)
  - [Data Dependencies](#data-dependencies)
  - [User Journey Integration](#user-journey-integration)
- [Entry Points](#entry-points)
- [Main Components](#main-components)
  - [CloseButton](#closebutton)
  - [Header Section](#header-section)
  - [Username Display](#username-display)
  - [Level Container](#level-container)
  - [Experience Card](#experience-card)
  - [Experience Details](#experience-details)
  - [Progress Bar](#progress-bar)
  - [Army Bonuses Card](#army-bonuses-card)
  - [Bonus Grid](#bonus-grid)
  - [Bonus Items](#bonus-items)
  - [Disconnect Button](#disconnect-button)
- [User-Visible Features](#user-visible-features)
- [Component Interactions](#component-interactions)
  - [Close Button Integration](#close-button-integration)
  - [AuthContext Integration](#authcontext-integration)
  - [Profile Data Management](#profile-data-management)
  - [Progress Bar System](#progress-bar-system)
  - [Army Bonus Display](#army-bonus-display)
- [Screen Layout and Positioning](#screen-layout-and-positioning)
  - [Header Section](#header-section)
  - [Content Area](#content-area)
  - [Experience Card Layout](#experience-card-layout)
  - [Army Bonuses Card Layout](#army-bonuses-card-layout)
  - [Disconnect Button](#disconnect-button)
- [Visual Specifications](#visual-specifications)
  - [Color Scheme](#color-scheme)
  - [Typography](#typography)
  - [Spacing and Layout](#spacing-and-layout)

## Overview
The Profile Screen displays user account information and provides logout functionality. It shows the user's handle, email, level, and current balance in a clean, card-based layout.

## User Experience Flow
1. User navigates to Profile Screen from Turf Screen
2. Screen displays user information in profile card
3. User can view their account details
4. User can tap logout button to sign out
5. Upon logout, user is redirected to Login Screen

## Main Components
- **Profile Card**: Displays user handle, email, and level
- **Balance Display**: Shows current balance with rate per second
- **Logout Button**: Allows user to sign out of the application

## Scenarios & Outcomes

### Standard Flow (Happy Path)
1. **Screen Entry**: User taps Profile location on Turf Screen
2. **Data Loading**: Profile information loads automatically
3. **Display**: User sees their handle, email, level, and balance
4. **Navigation**: User can navigate back to Turf Screen or logout

### Error Scenarios
1. **Network Failure**: 
   - Profile data fails to load
   - User sees loading state indefinitely
   - No error message displayed to user
   - User can still access logout functionality

2. **Authentication Failure**:
   - If token is invalid, logout is triggered automatically
   - User is redirected to Login Screen
   - No error message shown

3. **Server Error**:
   - Profile fetch returns 500 error
   - Screen displays with empty/default data
   - User can still logout

### Logout Scenarios
1. **Successful Logout**:
   - User taps logout button
   - All stored authentication data is cleared
   - User is redirected to Login Screen
   - No confirmation dialog shown

2. **Logout with Network Issues**:
   - Local logout still succeeds
   - Authentication data cleared from device
   - User redirected to Login Screen regardless of server state

### Data Display Scenarios
1. **Complete Profile Data**:
   - Handle: "Bert Toast" (default user)
   - Email: User's email address
   - Level: Current user level (default: 1)
   - Balance: Current balance with rate per second

2. **Missing Profile Data**:
   - Server creates default user if none exists
   - Default values: Level 1, 1000 experience, 0 army bonuses

3. **Balance Calculation**:
   - Balance updates based on time elapsed since last update
   - Rate per second accumulation shown to user
   - Real-time balance display

## Screen Transitions
- **Entry Point**: [Turf Screen](../3-turf-screen/turf-screen-map.md) → Profile location tap
- **Exit Points**: 
  - Back navigation to [Turf Screen](../3-turf-screen/turf-screen-map.md)
  - Logout → [Login Screen](../2-login-screen/login-screen-map.md)
- **State Preservation**: No form data to preserve
- **Navigation Behavior**: Simple push/pop navigation

## Server Details

### Profile Data Fetch
- **Endpoint**: `GET /api/profile`
- **Authentication**: Not required (uses default user)
- **Response**: User object with handle, email, level, experience, armyBonus
- **Error Handling**: Creates default user if none exists
- **Data Flow**: Single fetch on screen load

### Logout Process
- **Client-Side Only**: No server logout endpoint
- **Data Cleared**: Token and user data removed from AsyncStorage
- **State Reset**: AuthContext state cleared
- **Navigation**: Automatic redirect to Login Screen

### Balance Integration
- **Endpoint**: `GET /api/balance` (used by BalanceContext)
- **Authentication**: Required (Bearer token)
- **Real-time Updates**: Balance accumulates based on time elapsed
- **Error Handling**: Falls back to stored balance on failure

## Related Screens

### Navigation Flow
- **From**: [Turf Screen](../3-turf-screen/turf-screen-map.md) - Profile location provides entry point
- **To**: [Login Screen](../2-login-screen/login-screen-map.md) - Logout redirects here
- **Context**: [Home Screen](../4-home-screen/home-screen-map.md) - Shares user data context

### Data Dependencies
- **AuthContext**: Shared with [Login Screen](../2-login-screen/login-screen-map.md) and [Turf Screen](../3-turf-screen/turf-screen-map.md)
- **BalanceContext**: Shared with [Home Screen](../4-home-screen/home-screen-map.md) and [Bot Assembly Screen](../5-bot-assembly-screen/bot-assembly-screen-map.md)
- **User Data**: Retrieved from same endpoints used by other authenticated screens

### User Journey Integration
- **Post-Login**: Users can access profile from [Turf Screen](../3-turf-screen/turf-screen-map.md)
- **Account Management**: Profile provides account overview and logout capability
- **Data Consistency**: Profile data reflects same user state across all screens

## Entry Points
- **From Turf Screen**: Via Profile location marker
- **From Home Screen**: Via profile management options
- **Direct Navigation**: Through app routing system

## Main Components

### CloseButton
- **Purpose**: Navigation control to exit screen
- **User Actions**: Tap to return to previous screen
- **Visual Elements**: "×" symbol in top-right corner
- **Positioning**: Absolute positioned in header area

### Header Section
- **Purpose**: User identification and level display
- **User Actions**: View username and level information
- **Visual Elements**: Username in blue, level display with label
- **Layout**: Centered alignment with vertical spacing

### Username Display
- **Purpose**: Shows user's username
- **User Actions**: View username
- **Visual Elements**: Large blue text with bold styling
- **Positioning**: Top of header section

### Level Container
- **Purpose**: Level information display
- **User Actions**: View current level
- **Visual Elements**: "LEVEL" label and level number
- **Styling**: Label in gray, level number in green

### Experience Card
- **Purpose**: Experience progress and leveling information
- **User Actions**: View experience details and progress
- **Visual Elements**: Section title, XP details, progress bar
- **Information**: Total XP, next level progress, visual progress bar

### Experience Details
- **Purpose**: Detailed experience statistics
- **User Actions**: View XP breakdown
- **Visual Elements**: Two-column layout with XP information
- **Data**: Total XP and next level progress (current/target)

### Progress Bar
- **Purpose**: Visual experience progress indicator
- **User Actions**: View progress toward next level
- **Visual Elements**: Horizontal bar with green fill
- **Calculation**: Current XP / Next Level XP * 100%

### Army Bonuses Card
- **Purpose**: Army bonus statistics display
- **User Actions**: View army bonus values
- **Visual Elements**: Section title, 2x2 grid of bonus items
- **Stats**: Strength, Defense, Speed, Health bonuses

### Bonus Grid
- **Purpose**: Army bonus values in grid layout
- **User Actions**: View individual bonus stats
- **Visual Elements**: 4 bonus items in 2x2 grid
- **Layout**: 48% width items with gap spacing

### Bonus Items
- **Purpose**: Individual army bonus display
- **User Actions**: View specific bonus values
- **Visual Elements**: Stat label and value with background
- **Styling**: Dark background with purple values

### Disconnect Button
- **Purpose**: Logout functionality
- **User Actions**: Tap to disconnect/logout
- **Visual Elements**: Red-themed button with "DISCONNECT" text
- **Functionality**: Triggers logout process

## User-Visible Features
- User profile information display
- Level and experience progression tracking
- Army bonus statistics visualization
- Progress bar for experience tracking
- Logout/disconnect functionality
- Cyberpunk-themed visual design
- Responsive layout with proper spacing

## Component Interactions

### Close Button Integration
- **Navigation Control**: Single tap triggers onClose callback
- **Visual Feedback**: Standard close button styling
- **Positioning**: Absolute positioned in top-right corner
- **No State Dependencies**: Always functional regardless of profile state

### AuthContext Integration
- **Logout Function**: Uses logout function from useAuth hook
- **Token Management**: Clears stored token and user data
- **State Reset**: Resets all authentication state
- **Error Handling**: Graceful handling of logout failures

### Profile Data Management
- **Static Data**: Currently uses hardcoded profile data
- **State Management**: Local profile state with useEffect initialization
- **Data Structure**: UserProfile interface with username, level, experience, armyBonus
- **Calculations**: Experience percentage calculated from current/next level

### Progress Bar System
- **Real-time Calculation**: Percentage calculated on each render
- **Visual Updates**: Bar width updates based on percentage
- **Color Scheme**: Green fill (#00FF41) on gray background
- **Responsive Design**: Adapts to different screen sizes

### Army Bonus Display
- **Grid Layout**: 2x2 grid with flexWrap for responsive design
- **Dynamic Rendering**: Maps through armyBonus object entries
- **Consistent Styling**: All stats use same visual treatment
- **Value Formatting**: "+" prefix for all bonus values

## Screen Layout and Positioning

### Header Section
- **Username**: Centered, large blue text with bold styling
- **Level Container**: Below username, centered alignment
- **Spacing**: Large vertical margins for visual separation

### Content Area
- **ScrollView**: Full height with medium padding
- **Cards**: Experience and Army Bonuses cards with consistent styling
- **Spacing**: Medium spacing between all elements
- **Background**: Black background with cyberpunk theme

### Experience Card Layout
- **Section Title**: "EXPERIENCE" in blue with bold styling
- **Details Row**: Two-column layout with XP information
- **Progress Bar**: Full-width bar below details
- **Styling**: Dark green background with green border

### Army Bonuses Card Layout
- **Section Title**: "ARMY BONUSES" in blue with bold styling
- **Grid Container**: Flex row with wrap for responsive layout
- **Bonus Items**: 48% width items with gap spacing
- **Styling**: Dark green background with green border

### Disconnect Button
- **Positioning**: Bottom of scroll content
- **Styling**: Red theme with red border and text
- **Functionality**: Triggers logout process
- **Visual Feedback**: TouchableOpacity with press feedback

## Visual Specifications

### Color Scheme
- **Primary Text**: White (#fff)
- **Secondary Text**: Gray (rgba(255, 255, 255, 0.6))
- **Username**: Blue (#4717F6)
- **Level**: Green (#00FF41)
- **Progress Bar**: Green (#00FF41)
- **Bonus Values**: Purple (#9C27B0)
- **Disconnect Button**: Red (#FF4B4B)

### Typography
- **Username**: H1 size, bold, blue
- **Level**: H2 size, bold, green
- **Section Titles**: H2 size, bold, blue
- **Labels**: Small size, gray
- **Values**: H2 size, bold, green/purple
- **Disconnect Text**: Body size, bold, red

### Spacing and Layout
- **Container Padding**: Medium spacing
- **Card Spacing**: Medium spacing between cards
- **Internal Spacing**: Small spacing within cards
- **Border Radius**: 8px for cards, 4px for buttons
- **Border Width**: 1px for all borders 