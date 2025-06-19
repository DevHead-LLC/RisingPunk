# Application Entry Points - User Flow Documentation

> **Technical Notes**: See [entry-point-special-notes.md](./entry-point-special-notes.md) for implementation details, security considerations, and future improvements.

## Table of Contents
1. [Overview](#overview)
2. [User Experience Flow](#user-experience-flow)
3. [1. Native Entry Point (`index.js`)](#1-native-entry-point-indexjs)
4. [2. Configuration (`app.json`)](#2-configuration-appjson)
5. [3. Root Component (`App.tsx`)](#3-root-component-apptsx)
6. [Application Structure and Flow](#application-structure-and-flow)
   - [Component Hierarchy](#component-hierarchy)
   - [Authentication Flow](#authentication-flow)
   - [State Management](#state-management)
7. [Component Interactions](#component-interactions)
8. [Scenarios & Outcomes](#scenarios--outcomes)
   - [Happy Path](#happy-path)
   - [Edge Cases](#edge-cases)
   - [Error Messages](#error-messages)
9. [Server Details](#server-details)
10. [Future Considerations](#future-considerations)
11. [Related Screens](#related-screens)
12. [Key Differences from Web React](#key-differences-from-web-react)
13. [Application Flow](#application-flow)

## Overview
The Application Entry Points define how the app launches and initializes, bridging the native platform (iOS/Android) with the React Native JavaScript environment. This includes the native entry file (`index.js`), configuration (`app.json`), and the root React component (`App.tsx`). These entry points set up the initial application structure, providers, and navigation flow.

## User Experience Flow
- **App Launch**: User taps the app icon. The native platform loads `index.js`, which registers the app and loads configuration from `app.json`.
- **Initialization**: The root component (`App.tsx`) is loaded, initializing the Redux store and the main app structure.
- **Authentication**: On startup, the app checks for a stored token. If present, the user is automatically logged in and taken to the main screen. If not, the login screen is shown.
- **Navigation**: Once authenticated, the user can navigate through the app. The entry points ensure that all state and configuration are available to every screen.
- **Logout**: When the user logs out, the app clears stored tokens and returns to the login screen.

**Scenarios:**
- If the app fails to load configuration, the user sees an error or fallback UI.
- If authentication fails, the user is prompted to log in again.
- If the app is updated, the entry points ensure the new structure is loaded on next launch.

## 1. Native Entry Point (`index.js`)
The application starts at `index.js`, which serves as the bridge between the native platform (iOS/Android) and the React Native JavaScript environment. Here's what happens:

1. `index.js` imports the main `App` component and the app name from `app.json`
2. It uses `AppRegistry.registerComponent()` to register the root component
3. The app name from `app.json` ("mobile") is used as the unique identifier for the app

> **Technical Details**: See [Core Components](./entry-point-special-notes.md#core-components) for implementation details.

## 2. Configuration (`app.json`)
This file contains basic configuration for the React Native app:
- `name`: Used as the unique identifier for the app in the native environment
- `displayName`: The name shown on the device

## 3. Root Component (`App.tsx`)
Unlike web React applications that use an HTML file as the entry point, React Native uses `App.tsx` as the root component. This is because React Native renders directly to native views rather than HTML.

The `App.tsx` component:
1. Is imported and registered in `index.js`
2. Serves as the root of your component tree
3. Sets up the initial application structure and Redux store

> **Technical Details**: See [Design Considerations](./entry-point-special-notes.md#design-considerations) for implementation details.

## Application Structure and Flow

#### Component Hierarchy
```
App.tsx
├── ErrorBoundary
│   └── Redux Provider
│       └── AppContent
│           ├── LoginScreen (if !token)
│           └── TurfScreen (if token)
```

#### Authentication Flow
1. The app checks for an existing token in AsyncStorage on startup
2. If a token exists, the user is automatically logged in
3. The token is used to conditionally render either:
   - `LoginScreen` (when no token exists)
   - `TurfScreen` (when token exists)

> **Technical Details**: See [Authentication Implementation](./entry-point-special-notes.md#authentication-implementation) for security and implementation details.

#### State Management
- `auth` slice: Manages authentication state and user data
- `balance` slice: Manages user balance state
- `bots` slice: Manages bot-related state
- All state is managed globally via Redux Toolkit and accessed with hooks.

## Component Interactions
- **index.js** is the true entry point, responsible for registering the app and loading configuration.
- **app.json** provides the app's identity and display name, which are used by index.js and the native platform.
- **App.tsx** is the root of the component tree, initializing all providers and setting up the app's structure.
- All three work together to ensure the app launches correctly, loads the right configuration, and provides a seamless user experience from the first tap.
- If any entry point fails (e.g., missing config, registration error), the user will see an error or fallback UI.

## Scenarios & Outcomes
### Happy Path
- User launches the app, configuration loads, authentication is successful, and the main app is displayed.
- User logs out, and the app returns to the login screen.

### Edge Cases
- **Config Load Failure**: User sees "CONFIG_LOAD_FAILED" error and a fallback UI.
- **Token Missing/Invalid**: User sees "TOKEN_INVALID" and is prompted to log in again.
- **AsyncStorage Failure**: User sees "STORAGE_ERROR" and is prompted to restart the app.
- **App Registration Error**: User sees "APP_REGISTRATION_ERROR" and cannot proceed.
- **Partial Initialization**: If the Redux store fails to initialize, user sees partial UI with error banners or retry options.

### Error Messages
- "CONFIG_LOAD_FAILED"
- "TOKEN_INVALID"
- "STORAGE_ERROR"
- "APP_REGISTRATION_ERROR"

## Server Details
- **Data Fetched**: Token and user profile are fetched from the server during login. Configuration is loaded from local files.
- **Actions Triggering Requests**:
  - Login: Auth request, then profile fetch
  - Logout: Session termination, state cleared
  - App launch: Session check, data fetch if valid
  - Manual refresh: User-initiated data reload
- **Expected Responses**:
  - Success: Data is updated in the app
  - Failure: User sees error messages and may retry
- **Session Management**: Session tokens are used for all requests; if invalid, user is logged out.

## Future Considerations
- See [Future Improvements](./entry-point-special-notes.md#future-improvements) for technical and implementation priorities.

## Related Screens
- [Foundation Layer](../0-foundation/foundation-map.md)
- [Login Screen](../2-login-screen/login-screen-map.md)
- [Turf Screen](../3-turf-screen/turf-screen-map.md)

## Key Differences from Web React
- No HTML file: React Native doesn't use HTML/CSS for rendering
- Native Views: Instead of DOM elements, React Native uses native UI components
- Platform-specific: The app runs directly on the device's native runtime
- Entry Point: The flow goes from native code → `index.js` → `App.tsx` → rest of the application

## Application Flow
```
Native Platform (iOS/Android)
        ↓
    index.js (Entry Point)
        ↓
    app.json (Configuration)
        ↓
    App.tsx (Root Component)
        ↓
    Rest of Application
``` 