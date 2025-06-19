# Application Entry Points - Technical Notes

> **User Flow**: See [entry-point-map.md](./entry-point-map.md) for user experience documentation and detailed flow descriptions.

## Table of Contents
1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Design Considerations](#design-considerations)
4. [Authentication Implementation](#authentication-implementation)
   - [Current Implementation](#current-implementation)
5. [State Management Approach](#state-management-approach)
6. [Performance Considerations](#performance-considerations)
7. [Implementation Patterns](#implementation-patterns)
8. [Component Interactions](#component-interactions)
9. [API Endpoints](#api-endpoints)
10. [Data Flow Patterns](#data-flow-patterns)
11. [Security Considerations](#security-considerations)
12. [Future Improvements](#future-improvements)
    - [Error Handling](#error-handling)
    - [UX](#ux)
    - [Security](#security)
13. [Related Screens](#related-screens)

## Overview
The Application Entry Points layer defines how the app launches and initializes, including the native entry file (`index.js`), configuration (`app.json`), and the root React component (`App.tsx`). This layer is responsible for setting up the initial application structure, providers, and navigation flow, and for ensuring secure and efficient authentication and state management.

## Core Components
- `View`: A fundamental React Native component that maps to a native view (UIView on iOS, View on Android). It's similar to a `<div>` in web development but renders to native platform views. It's used for layout and as a container for other components.

> **User Experience**: See [Native Entry Point](./entry-point-map.md#1-native-entry-point-indexjs) for how this component fits into the application flow.

## Design Considerations
1. The current provider structure is well-organized but could benefit from:
   - Adding a global error handling system
   - Implementing a proper loading state UI
   - Adding retry mechanisms for failed API calls
2. Consider implementing a proper navigation system if not already present
3. Consider adding offline support and data persistence
4. Consider implementing proper type checking for API responses

> **User Experience**: See [Root Component](./entry-point-map.md#3-root-component-apptsx) for how these considerations affect the user experience.

## Authentication Implementation

### Current Implementation
- Token is stored in AsyncStorage
- User data is stored alongside the token
- Token is used for API authentication via Bearer token
- Automatic login on app startup if token exists

> **User Experience**: See [Authentication Flow](./entry-point-map.md#authentication-flow) for how this implementation affects the user experience.

## State Management Approach
- The Redux `Provider` is initialized in `App.tsx` and wraps the main application tree.
- State is managed globally via Redux Toolkit slices (`auth`, `balance`, `bots`) and accessed with hooks.
- On app launch, the Redux store checks for a stored token and updates state accordingly.

## Performance Considerations
- App startup time depends on how quickly AsyncStorage can be accessed for the token.
- Redux store is initialized as early as possible to minimize UI delay.
- Efficient Redux usage prevents unnecessary re-renders.
- (TODO: Profile and optimize cold start performance.)

## Implementation Patterns
- Uses React Native's `AppRegistry.registerComponent` in `index.js` to bootstrap the app.
- Redux pattern is used for global state management.
- AsyncStorage is used for persistent storage of tokens and user data.
- Error boundaries are used to catch and handle initialization errors.

## Component Interactions
- `index.js` loads configuration and registers the app.
- `app.json` provides the app's identity and display name.
- `App.tsx` initializes all providers and sets up the main app structure.
- Redux store depends on the authentication state to determine what to render (login vs. main app).
- If any entry point fails, error boundaries or fallback UI are triggered.

## API Endpoints
- **Authentication**: `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`
  - Requires credentials (login), session token (logout/session)
- **Profile**: `/api/user/profile` (GET, requires session token)

## Data Flow Patterns
- On login, credentials are sent to `/api/auth/login`. On success, session token is stored in AsyncStorage.
- All subsequent requests (profile, balance, bots) include the session token for authentication.
- On logout, `/api/auth/logout` is called and local state is cleared.
- Redux store listens for auth state changes to trigger data fetch or cleanup.

## Security Considerations
1. ✅ Using AsyncStorage for token storage is standard practice for React Native
2. ✅ Token is properly used in Authorization headers
3. ✅ Proper error handling and loading states implemented
4. (TODO: Implement token refresh mechanism)
5. (TODO: Add token expiration handling)
6. (TODO: Implement biometric authentication for sensitive operations)

## Future Improvements
### Error Handling
- Add global error boundary for entry point failures
- Add more granular error messages and user feedback

### UX
- Add offline support for configuration and user data
- Optimize cold start performance

### Security
- (TODO: Implement token refresh mechanism)
- (TODO: Add token expiration handling)
- (TODO: Implement biometric authentication for sensitive operations)

## Related Screens
- [Foundation Layer Technical Notes](../0-foundation/foundation-special-notes.md)
- [Login Screen Technical Notes](../2-login-screen/login-screen-special-notes.md)
- [Turf Screen Technical Notes](../3-turf-screen/turf-screen-special-notes.md) 