# Application Foundation - User Flow Documentation

> **Technical Notes**: See [foundation-special-notes.md](./foundation-special-notes.md) for implementation details, security considerations, and future improvements.

## Table of Contents
1. [Overview](#overview)
2. [User Experience Flow](#user-experience-flow)
3. [Global State Management](#global-state-management)
4. [Component Interactions](#component-interactions)
5. [Scenarios & Outcomes](#scenarios--outcomes)
   - [Happy Path](#happy-path)
   - [Edge Cases](#edge-cases)
   - [Error Messages](#error-messages)
6. [Server Details](#server-details)
7. [Future Considerations](#future-considerations)
8. [Related Screens](#related-screens)

## Overview
The Application Foundation provides the core state management and service providers for the entire app. It includes authentication, balance, and bot management, ensuring all user and gameplay data is synchronized and accessible across screens. This layer is critical for session persistence, real-time updates, and secure access control.

## User Experience Flow
Although these providers are not directly visible to users, they underpin every user interaction in the app:
1. **App Launch**: User opens the app. Authentication provider checks for existing session.
2. **Login**: User logs in. Auth state updates, triggering balance and bot data fetch.
3. **Navigation**: As user navigates, balance and bot data remain up to date in the background.
4. **Logout**: User logs out. All sensitive state is cleared, and user is returned to login.

**Scenarios:**
- If authentication fails, user cannot access balance or bot features.
- If balance data fails to load, user sees an error or fallback state in UI.
- Bot management features are only available when authenticated and balance is loaded.

## Global State Management
1. Authentication State
   - Manages user login status
   - Stores user profile data
   - Handles session persistence
   - Controls feature access
   > **Implementation**: See [Auth Provider](./foundation-special-notes.md#auth-provider) for details

2. Balance Management
   - Tracks user balance
   - Handles transactions
   - Updates in real-time
   - Manages rate calculations
   > **Implementation**: See [Balance Provider](./foundation-special-notes.md#balance-provider) for details

3. Bot Management
   - Tracks bot inventory
   - Handles bot building
   - Manages deployments
   - Updates in real-time
   > **Implementation**: See [Bots Provider](./foundation-special-notes.md#bots-provider) for details

## Component Interactions
- **Authentication is foundational**: Balance and bot management depend on a valid authenticated user.
- **Data flow**: When authentication state changes (login/logout), balance and bot providers update or clear their data accordingly.
- **Error propagation**: Errors in authentication prevent access to balance and bot features; errors in balance/bot providers are surfaced to the user via UI components.

## Scenarios & Outcomes
### Happy Path
- User launches app, is authenticated, and sees up-to-date balance and bot data throughout their session.
- User logs out, and all sensitive data is cleared.

### Edge Cases
- **Network Failure**: User sees error messages such as "NETWORK_ERROR" or fallback UI when data cannot be fetched.
- **Session Expired**: User is logged out and sees "SESSION_EXPIRED" message, must log in again.
- **Auth Required**: If not authenticated, user sees "AUTH_REQUIRED" and is redirected to login.
- **Partial Data**: If only some data loads, user sees partial UI with error banners or retry options.

### Error Messages
- "SESSION_EXPIRED"
- "NETWORK_ERROR"
- "AUTH_REQUIRED"
- "BALANCE_FETCH_FAILED"
- "BOT_DATA_UNAVAILABLE"

## Server Details
- **Data Fetched**: User profile, balance, and bot inventory are fetched from the server after authentication.
- **Actions Triggering Requests**:
  - Login: Auth request, then profile/balance/bot fetch
  - Logout: Session termination, state cleared
  - App launch: Session check, data fetch if valid
  - Manual refresh: User-initiated data reload
- **Expected Responses**:
  - Success: Data is updated in the app
  - Failure: User sees error messages and may retry
- **Session Management**: Session tokens are used for all requests; if invalid, user is logged out.

## Future Considerations
- See [Future Improvements](./foundation-special-notes.md#future-improvements) for technical and implementation priorities.

## Related Screens
- [Login Screen](../2-login-screen/login-screen-map.md)
- [Turf Screen](../3-turf-screen/turf-screen-map.md)
- [Battle Screen](../6-battle-screen/battle-screen-map.md) 