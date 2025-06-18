# Profile Screen - Special Notes & Technical Implementation

> **User Flow Documentation**: See [profile-screen-map.md](./profile-screen-map.md) for user experience flows, scenarios, and screen interactions.

## Table of Contents
- [Overview](#overview)
- [Implementation Details](#implementation-details)
  - [Component Architecture](#component-architecture)
  - [State Management](#state-management)
  - [Data Flow](#data-flow)
  - [Error Handling](#error-handling)
- [Security Considerations](#security-considerations)
  - [Authentication](#authentication)
  - [Data Protection](#data-protection)
  - [Access Control](#access-control)
- [Performance Considerations](#performance-considerations)
  - [Data Loading](#data-loading)
  - [Memory Management](#memory-management)
  - [Rendering Optimization](#rendering-optimization)
- [Server-Side Notes](#server-side-notes)
  - [API Endpoints](#api-endpoints)
    - [Profile Data Endpoint](#profile-data-endpoint)
    - [Balance Endpoint (Integration)](#balance-endpoint-integration)
  - [Authentication Requirements](#authentication-requirements)
  - [Data Flow Patterns](#data-flow-patterns)
  - [Error Handling Strategies](#error-handling-strategies)
  - [Database Operations](#database-operations)
- [Future Considerations](#future-considerations)
  - [Error Handling Improvements](#error-handling-improvements)
  - [Security Enhancements](#security-enhancements)
  - [Performance Optimizations](#performance-optimizations)
  - [User Experience](#user-experience)
  - [Technical Debt](#technical-debt)
  - [Integration Opportunities](#integration-opportunities)
- [Cross-References](#cross-references)
  - [Related Screen Documentation](#related-screen-documentation)
  - [Context Integration](#context-integration)
  - [Server Integration Points](#server-integration-points)
  - [Navigation Architecture](#navigation-architecture)

## Overview
The Profile Screen is a simple display interface that shows user account information and provides logout functionality. It integrates with the server's profile endpoint and uses the AuthContext for authentication state management.

## Implementation Details

### Component Architecture
- **ProfileScreen**: Main container component
- **AuthContext Integration**: Uses `useAuth()` hook for user data and logout
- **BalanceContext Integration**: Uses `useBalance()` for real-time balance display
- **Navigation**: Uses React Navigation for screen transitions

### State Management
- **User Data**: Retrieved from AuthContext (handle, email, level)
- **Balance Data**: Retrieved from BalanceContext (real-time updates)
- **Authentication State**: Managed by AuthContext
- **No Local State**: Screen is primarily display-only

### Data Flow
1. **Profile Data**: AuthContext → ProfileScreen (user info)
2. **Balance Data**: BalanceContext → ProfileScreen (balance display)
3. **Logout**: ProfileScreen → AuthContext → AsyncStorage cleanup

### Error Handling
- **Network Failures**: Silent fallback to stored data
- **Authentication Errors**: Automatic logout and redirect
- **Server Errors**: Display with default/empty data
- **No User Feedback**: Errors handled silently for simplicity

## Security Considerations

### Authentication
- ✅ **Token Validation**: AuthContext validates stored tokens
- ✅ **Secure Storage**: Tokens stored in AsyncStorage
- ✅ **Automatic Logout**: Invalid tokens trigger logout
- ⚠️ **No Server Logout**: Client-side only logout process

### Data Protection
- ✅ **No Sensitive Display**: Only public user info shown
- ✅ **Secure Logout**: Complete token and data removal
- ⚠️ **Default User**: Server creates default user if none exists

### Access Control
- ✅ **Context Validation**: useAuth hook validates context
- ✅ **Navigation Guards**: AuthContext handles unauthorized access
- ⚠️ **Profile Endpoint**: No authentication required (uses default user)

## Performance Considerations

### Data Loading
- **Single Fetch**: Profile data loaded once on screen mount
- **Context Caching**: User data cached in AuthContext
- **Balance Updates**: Real-time updates from BalanceContext
- **No Refreshing**: Static data display only

### Memory Management
- **No Local State**: Minimal memory footprint
- **Context Sharing**: Reuses existing context data
- **No Timers**: No active polling or intervals
- **Clean Unmount**: No cleanup required

### Rendering Optimization
- **Simple Layout**: Minimal component tree
- **No Animations**: Static display only
- **Efficient Styling**: CSS-in-JS with theme reuse
- **No Re-renders**: Data changes handled by contexts

## Server-Side Notes

### API Endpoints

#### Profile Data Endpoint
```typescript
GET /api/profile
```
- **Authentication**: Not required (uses default user)
- **Response**: User object with complete profile data
- **Error Handling**: Creates default user if none exists
- **Data Structure**:
  ```typescript
  {
    handle: string;
    email: string;
    level: number;
    experience: { current: number; nextLevel: number };
    armyBonus: { strength: number; defense: number; speed: number; health: number };
    balance: { total: number; ratePerSecond: number; lastUpdated: Date };
    unlockedFeatures: { hackRig: boolean };
  }
  ```

#### Balance Endpoint (Integration)
```typescript
GET /api/balance
```
- **Authentication**: Required (Bearer token)
- **Real-time Calculation**: Updates balance based on time elapsed
- **Rate Accumulation**: `total += (secondsElapsed * ratePerSecond)`
- **Error Response**: 404 if user not found, 500 for server errors

### Authentication Requirements
- **Profile Endpoint**: No authentication (development setup)
- **Balance Endpoint**: Bearer token required
- **Token Validation**: Server middleware validates JWT tokens
- **User Lookup**: Uses `req.user._id` from auth middleware

### Data Flow Patterns
1. **Profile Fetch**: Single request on screen load
2. **Balance Integration**: Real-time updates via BalanceContext
3. **Logout Process**: Client-side only (no server call)
4. **Error Recovery**: Fallback to stored data on failure

### Error Handling Strategies
- **Network Failures**: Silent fallback to cached data
- **Server Errors**: Display with default values
- **Authentication Failures**: Automatic logout and redirect
- **Data Validation**: Server validates user existence

### Database Operations
- **User Model**: Mongoose schema with timestamps
- **Default User Creation**: Automatic creation if none exists
- **Balance Updates**: Real-time calculation and persistence
- **Collection Name**: Explicitly set to 'users'

## Future Considerations

### Error Handling Improvements
- **User Feedback**: Add error messages for network failures
- **Retry Logic**: Implement automatic retry for failed requests
- **Loading States**: Add proper loading indicators
- **Offline Support**: Cache profile data for offline viewing

### Security Enhancements
- **Server Logout**: Implement proper server-side logout endpoint
- **Token Refresh**: Add automatic token refresh mechanism
- **Session Management**: Implement proper session tracking
- **Rate Limiting**: Add API rate limiting for profile endpoints

### Performance Optimizations
- **Data Caching**: Implement proper caching strategy
- **Lazy Loading**: Load profile data only when needed
- **Background Updates**: Update data in background
- **Optimistic Updates**: Update UI before server confirmation

### User Experience
- **Profile Editing**: Allow users to edit profile information
- **Avatar Support**: Add profile picture functionality
- **Settings Integration**: Link to app settings
- **Achievement Display**: Show user achievements and stats

### Technical Debt
- **Default User**: Remove hardcoded "Bert Toast" user
- **Error Boundaries**: Add error boundaries for better error handling
- **Type Safety**: Improve TypeScript type definitions
- **Testing**: Add unit and integration tests

### Integration Opportunities
- **Analytics**: Track profile view and logout events
- **Push Notifications**: Notify users of profile updates
- **Social Features**: Add friend system integration
- **Achievement System**: Display user achievements and progress

## Cross-References

### Related Screen Documentation
- **[Login Screen](../2-login-screen/login-screen-special-notes.md)**: Authentication flow and token management
- **[Turf Screen](../3-turf-screen/turf-screen-special-notes.md)**: Navigation entry point and user context
- **[Home Screen](../4-home-screen/home-screen-special-notes.md)**: Balance context integration and user data sharing
- **[Bot Assembly Screen](../5-bot-assembly-screen/bot-assembly-screen-special-notes.md)**: Balance context usage and user progression

### Context Integration
- **AuthContext**: Shared authentication state across all screens
- **BalanceContext**: Real-time balance updates used by multiple screens
- **User Data Flow**: Consistent user data across the application

### Server Integration Points
- **Profile Endpoint**: Used by Profile Screen for user data display
- **Balance Endpoint**: Shared with Home and Bot Assembly screens
- **Authentication Middleware**: Consistent across all protected endpoints

### Navigation Architecture
- **Entry Point**: Turf Screen provides navigation to Profile
- **Exit Point**: Profile provides logout to Login Screen
- **State Management**: AuthContext handles authentication state transitions 