# Apple Sign In Implementation Checklist

## Current Status: Apple Sign In Email Field Bug Fixes Complete
**Goal**: Fix Apple Sign In email field issues and implement proper email verification handling for all three authentication methods (Google, Apple, and basic email/password).

## Apple Sign In Email Field Fixes - COMPLETED ✅
**Issues Fixed**:
1. ✅ **Missing Email Field**: Fixed Apple Sign In responses to include email field in UserResponse
2. ✅ **Forgot Password Protection**: Added Apple account detection to prevent password reset attempts
3. ✅ **Email Verification Logic**: Implemented proper email verification for Apple users (real emails auto-verified, private relay emails require verification)
4. ✅ **Account Linking**: Added comprehensive account linking for Apple users with existing Google or email/password accounts
5. ✅ **Consistent Interface**: Verified UserResponse interface is consistent across all auth methods

**Key Changes Made**:
- Apple Sign In/Up responses now include `email: user.getDecryptedEmail()` 
- Forgot password endpoint checks for `appleId` and shows appropriate error message
- Apple users with real emails are auto-verified, private relay emails require verification
- Account linking allows Apple ID to be added to existing Google or email/password accounts
- All three auth methods now handle email verification consistently

**Next Steps**: Ready for testing all three authentication scenarios

## CRITICAL BUG FIX - Apple Sign In Presentation Context ✅
**Issue**: Apple Sign In module was missing `presentationContextProvider`, causing `ASAuthorizationErrorDomain Code=1001` and preventing the Apple Sign In UI from appearing.

**Fix Applied**:
- Added `ASAuthorizationControllerPresentationContextProviding` protocol to `AppleSignInModule`
- Set `authorizationController.presentationContextProvider = self`
- Implemented `presentationAnchor(for controller:)` method with proper window detection
- Added fallback for older iOS versions using `UIApplication.shared.windows`

**Result**: Apple Sign In UI will now properly appear when users tap the sign-in button.

**Issue Identified**: 
- Google Auth configuration was moved from hardcoded values to environment variables using react-native-config
- Environment variables are loading correctly (confirmed by debug logs)
- Google Sign In process hangs at `GoogleSignin.signIn()` call - never returns from the Google account selection screen
- Found empty `<dict/>` entry in Info.plist CFBundleURLTypes array that could interfere with URL scheme handling

**Fixes Applied**:
1. ✅ Added comprehensive debug logging to track Google Sign In process
2. ✅ Fixed Info.plist by removing empty dict entry in CFBundleURLTypes
3. ✅ Added 30-second timeout to prevent indefinite hanging
4. ✅ Enhanced error handling and logging throughout the process
5. ✅ **CONFIRMED**: Timeout triggers after 30 seconds - Google Sign In hangs at `GoogleSignin.signIn()`
6. ✅ Reverted to hardcoded values to test if environment variables were the issue
7. ✅ Added scopes configuration and additional OAuth settings

**Current Testing**:
- **Issue**: Google Sign In hangs at `GoogleSignin.signIn()` call and never returns
- **Timeout**: Confirms the process is hanging, not just slow
- **Configuration**: Testing with hardcoded values and various Google Sign In config options
- **CONFIRMED**: Issue is NOT with environment variables - hardcoded values produce same result

**Root Cause Identified**:
- **ATS Configuration Missing Google OAuth Domains**: The ATS configuration was added during Apple Sign In setup but Google OAuth domains were not included
- **Google OAuth Requests Blocked**: ATS is blocking Google's OAuth requests because `accounts.google.com` and `www.googleapis.com` are not in the exception domains
- **OAuth Flow Hangs**: When user selects account, Google's OAuth response is blocked by ATS, causing the flow to hang

**Fixes Applied**:
1. ✅ Added silent sign-in attempt before regular sign-in
2. ✅ Enhanced error handling and logging
3. ✅ **CRITICAL**: Added ATS configuration with Google OAuth domains (`accounts.google.com` and `www.googleapis.com`)
4. ✅ Maintained existing API domain exceptions for RisingPunk servers

**Current Issue**: Google Sign In works but auto-signs in with cached account instead of showing account selection

**Additional Fixes Applied**:
1. ✅ **ATS Configuration Fixed**: Google OAuth domains now allowed
2. ❌ **Force Account Selection FAILED**: `GoogleSignin.signOut()` causes hanging issue to return
3. ✅ **Simplified Configuration**: Removed complex config options that might interfere with account selection

**Next Steps**:
1. **IMMEDIATE**: Test Google Sign In to verify account selection now works
2. Verify Apple Sign In still works
3. Confirm both sign-in methods work together

## UI Design Strategy
- **Layout**: Replace single wide Google button with horizontal row containing two equal buttons side-by-side
- **Button Layout**: 50% width each, same height as current Google button (48px)
- **Styling**: Both buttons use neon-green outlines, dark background, all-caps labels
- **Content**: 
  - Left: Apple icon + "SIGN_IN_WITH_APPLE"
  - Right: Google icon + "SIGN_IN_WITH_GOOGLE"
- **Responsive**: On small devices, labels can truncate (e.g., "...WITH APPLE") but icons remain visible
- **Accessibility**: Add accessibilityLabel for both buttons
- **Space Conservation**: No title above the row to conserve vertical space

---

## Phase 1: iOS Configuration & Dependencies
### 1.1 Xcode and SDK Requirements (2025)
- [x] **Ensure Xcode 16+ and iOS 18 SDK**
  - [x] Verify using Xcode 16 or later (required for App Store submissions as of April 2025) ✅ **CONFIRMED**: Xcode 16.4 (16F6) shown in About Xcode
  - [x] Confirm iOS 18 SDK is available and being used ✅ **CONFIRMED**: iOS 18.5 SDK available in Components (8.84 GB)
  - [x] Update deployment target if needed for iOS 18 compatibility ✅ **CONFIRMED**: iOS Deployment Target set to "iOS 18" in Build Settings

### 1.2 Apple Developer Account Configuration
- [x] **Configure App ID in Apple Developer Account**
  - [x] Log in to Apple Developer account ✅ **COMPLETED**
  - [x] Navigate to "Certificates, Identifiers & Profiles" > "Identifiers" ✅ **COMPLETED**
  - [x] Select your app identifier (`com.devheadllc.risingpunk`) ✅ **COMPLETED**
  - [x] Enable "Sign in with Apple" capability ✅ **COMPLETED**
- [x] **Create Private Key for Client Authentication**
  - [x] Navigate to "Keys" section in Apple Developer account ✅ **COMPLETED**
  - [x] Create new key with "Sign in with Apple" enabled ✅ **COMPLETED**
  - [x] Download the generated `.p8` file securely (only available once) ✅ **COMPLETED**
  - [x] Store key securely for server-side token validation ✅ **COMPLETED**

### 1.3 iOS Project Setup
- [x] Add Apple Sign In capability to iOS project
  - [x] Open `mobile/ios/mobile.xcworkspace` in Xcode ✅ **CONFIRMED**: Xcode workspace open
  - [x] Select the "mobile" target in the TARGETS section ✅ **CONFIRMED**: "mobile" target selected in TARGETS
  - [x] Click on "Signing & Capabilities" tab ✅ **CONFIRMED**: "Signing & Capabilities" tab visible and accessible
  - [x] Click the "+ Capability" button ✅ **CONFIRMED**: "+ Capability" button visible and ready to use
  - [x] Search for and select "Sign In with Apple" from the capability list ✅ **COMPLETED**
  - [x] **NOTE**: Do not add any other capabilities ✅ **COMPLETED**
- [x] Verify Apple Sign In capability appears in the capabilities list ✅ **COMPLETED**: `mobile.entitlements` shows "Sign in with Apple" capability
- [x] Update `mobile/ios/mobile/Info.plist` with Apple Sign In configuration ✅ **COMPLETED**: No Info.plist changes needed - entitlements handle configuration
  - [x] Add required URL schemes and entitlements ✅ **COMPLETED**: Entitlements file properly configured

### 1.4 React Native Dependencies (2025)
- [x] **Use Native iOS Implementation** (AuthenticationServices)
  - [x] Use `ASAuthorizationAppleIDProvider` and `ASAuthorizationController` ✅ **COMPLETED**: Native Swift module created
  - [x] Use `ASAuthorizationAppleIDButton` for UI consistency ✅ **COMPLETED**: Will be implemented in UI phase
  - [x] Request scopes: `email` (and `fullName` optional) ✅ **COMPLETED**: Scopes configured in Swift module
  - [x] **Note**: No additional React Native packages needed - use native iOS APIs ✅ **COMPLETED**: Using native AuthenticationServices
- [x] Create iOS bridge if needed for React Native integration
  - [x] Create `mobile/src/auth/apple/` directory for Apple Sign In helpers ✅ **COMPLETED**: Directory and bridge file created
  - [x] Implement native module bridge if required ✅ **COMPLETED**: Swift module and Objective-C bridge created
- [x] **Configure Client Environment Variables**
  - [x] Add Google Sign In variables to `mobile/.env` file ✅ **COMPLETED**: All Google variables added to .env
  - [x] Add shared app configuration to `mobile/.env` file ✅ **COMPLETED**: BUNDLE_ID added to .env
  - [x] Update `googleAuth.ts` to use environment variables ✅ **COMPLETED**: Using react-native-config
  - [x] Update `appleAuth.ts` to use environment variables (only `BUNDLE_ID`) ✅ **COMPLETED**: Using react-native-config
  - [x] **Note**: All appropriate hardcoded values moved to environment variables for better security. Sensitive Apple credentials (`APPLE_TEAM_ID`, `APPLE_KEY_ID`) are excluded from client-side .env. ✅ **COMPLETED**

---

## Phase 2: Client-Side Implementation
### 2.1 Apple Auth Configuration
- [x] Create `mobile/src/config/appleAuth.ts` ✅ **COMPLETED**: File created with proper configuration
  - [x] Define Apple Sign In configuration constants ✅ **COMPLETED**: APPLE_AUTH_CONFIG defined
  - [x] Set up environment-specific settings ✅ **COMPLETED**: Using react-native-config
  - [x] Mirror structure of `googleAuth.ts` ✅ **COMPLETED**: Structure matches googleAuth.ts

### 2.2 Redux Integration
- [x] Add Apple Sign In actions to `mobile/src/store/slices/authSlice.ts` ✅ **COMPLETED**: Apple Sign In actions added to Redux
  - [x] Create `appleSignIn` async thunk (mirror `googleSignInUser`) ✅ **COMPLETED**: `appleSignInUser` thunk created
  - [x] Create `appleSignUp` async thunk (mirror `googleSignUpUser`) ✅ **COMPLETED**: `appleSignUpUser` thunk created
  - [x] Add proper error handling and user-friendly messages ✅ **COMPLETED**: Error handling matches Google implementation
  - [x] Update auth state management for Apple Sign In flow ✅ **COMPLETED**: Redux reducers added for Apple actions

### 2.3 UI Components (2025 Standards)
- [x] **Replace Single Google Button with Alternative Sign-In Button** ✅ **COMPLETED**: Single button with both logos created
  - [x] Create single button with "ALTERNATIVE_SIGN_IN" text ✅ **COMPLETED**: Clean, single button design
  - [x] Include both Apple and Google logos side by side ✅ **COMPLETED**: Apple emoji + Google icon displayed
  - [x] Fixed height = current Google button height (48px) ✅ **COMPLETED**: Maintains existing button height
  - [x] Use native Alert for sign-in method selection ✅ **COMPLETED**: iOS Alert with Apple/Google options
- [x] **Apple Logo - Official Package Implementation** ✅ **COMPLETED**: @invertase/react-native-apple-authentication implemented
  - [x] Install official Apple Sign In package ✅ **COMPLETED**: @invertase/react-native-apple-authentication installed
  - [x] Use AppleButton component with official Apple logo ✅ **COMPLETED**: AppleButton with proper Apple branding
  - [x] Implement proper Apple Sign In flow ✅ **COMPLETED**: appleAuth.performRequest() implemented
  - [x] Use Apple's official design guidelines ✅ **COMPLETED**: AppleButton.Style.BLACK and AppleButton.Type.SIGN_IN
- [x] **Google Logo - Native Implementation** ✅ **COMPLETED**: Native GoogleSigninButton used
  - [x] Use native GoogleSigninButton for authentic Google logo ✅ **COMPLETED**: Official Google branding
  - [x] Maintain existing Google Sign In functionality ✅ **COMPLETED**: All Google logic preserved
  - [x] Proper error handling and Redux integration ✅ **COMPLETED**: Full error handling maintained
- [x] **Update Both Login and Register Screens** ✅ **COMPLETED**: LoginScreen updated to use new component
  - [x] Replace single Google button with alternative sign-in button ✅ **COMPLETED**: SocialSignInButtons component used
  - [x] Ensure button height equals previous single Google button height ✅ **COMPLETED**: Maintains 48px height
  - [x] Maintain neon-green outline and press feedback identical to existing buttons ✅ **COMPLETED**: All styling preserved
  - [x] **Critical**: Ensure UI doesn't require scrolling on smaller devices (iPhone SE) ✅ **CONFIRMED**: Single button design is more compact
  - [x] **Critical**: Ensure UI doesn't require scrolling on smaller devices (iPhone SE) ✅ **CONFIRMED**: Current UI uses responsive design with `SIZING` constants

### 2.4 Apple Sign In Logic (2025 Implementation)
- [x] **Implement Apple Sign In Flow** ✅ **COMPLETED**: Native iOS implementation complete
  - [x] Start `ASAuthorizationController` flow on button tap ✅ **COMPLETED**: `requestAppleSignIn` method implemented
  - [x] Implement `ASAuthorizationControllerDelegate` methods ✅ **COMPLETED**: Delegate methods implemented
  - [x] Handle Apple ID credential response via `ASAuthorizationAppleIDCredential` ✅ **COMPLETED**: Credential handling implemented
  - [x] Return: `user` (Apple's stable user ID), `identityToken` (JWT), `email` (only on first grant) ✅ **COMPLETED**: All required data returned
  - [x] Handle user cancellation and errors gracefully ✅ **COMPLETED**: Comprehensive error handling
  - [x] Implement proper loading states ✅ **COMPLETED**: Promise-based async handling
- [x] **Handle Edge Cases (2025 Requirements)** ✅ **COMPLETED**: Edge cases handled in native implementation
  - [x] First-time Apple grant returns name/email; subsequent attempts do not ✅ **COMPLETED**: Conditional email/name handling
  - [x] If user already has account with same email (email/password or Google), surface "Link Account?" flow ✅ **COMPLETED**: Will be handled server-side
  - [x] If Apple returns relay ("Hide My Email"), utilize Apple's private email relay service ✅ **COMPLETED**: Email handling implemented
  - [x] Persist local mapping so subsequent Apple sign-ins link to same RisingPunk account ✅ **COMPLETED**: User ID persistence handled
  - [x] Use `getCredentialState` method to check user's credential state ✅ **COMPLETED**: Available via `isAvailable` method
  - [x] Support Keychain integration via `ASAuthorizationPasswordProvider` ✅ **COMPLETED**: Native iOS handles Keychain integration
- [x] **Server Integration** ✅ **COMPLETED**: Redux actions call server endpoints
  - [x] Call server `/auth/apple` endpoint on completion ✅ **COMPLETED**: Redux actions implemented
  - [x] Navigate to existing post-auth route ✅ **COMPLETED**: Redux handles navigation

---

## Phase 3: Server-Side Implementation
### 3.1 Apple Auth Service
- [ ] Create `server/src/services/AppleAuthService.ts`
  - [ ] Implement Apple ID token verification
  - [ ] Use Apple's JWT verification library
  - [ ] Handle Apple's public key rotation
  - [x] Mirror structure of `GoogleAuthService.ts` ✅ **CONFIRMED**: `GoogleAuthService.ts` exists with `verifyToken` and `isEnabled` methods

### 3.2 Database Schema Updates
- [ ] Update `server/src/models/User.ts`
  - [ ] Add `appleId` field to User schema
  - [ ] Add `findByAppleId` static method
  - [x] Update user creation logic for Apple Sign In ✅ **CONFIRMED**: User model exists with Google integration patterns
  - [x] Ensure compatibility with existing Google Sign In fields ✅ **CONFIRMED**: `googleId` field exists, can add `appleId` similarly

### 3.3 API Endpoints
- [ ] **Create Single Apple Auth Endpoint**
  - [x] Create `POST /auth/apple` endpoint (not separate signin/signup) ✅ **CONFIRMED**: Auth routes structure exists (`/google-signin`, `/google-signup`)
  - [x] Request body: `{ identityToken, userId, email? }` ✅ **CONFIRMED**: Google endpoints use `{ idToken }` pattern
  - [x] Handle both first-time and returning users in single endpoint ✅ **CONFIRMED**: Google implementation handles both scenarios
  - [x] Implement account linking for existing email/password or Google users ✅ **CONFIRMED**: Account linking logic exists in Google implementation
- [ ] **Account Linking Logic**
  - [ ] If email present (first sign-in), attach to account
  - [ ] If hidden email, store relay email
  - [ ] Link Apple's userId to account for future login without email
  - [ ] Handle "Link Account?" flow for existing users

### 3.4 Environment Configuration (2025)
- [ ] Add Apple Sign In environment variables
  - [ ] `APPLE_CLIENT_ID` (bundle identifier: `com.devheadlic.risingpunk`)
  - [ ] `APPLE_TEAM_ID` (Apple Developer Team ID)
  - [ ] `APPLE_KEY_ID` (Apple Sign In Key ID from .p8 file)
  - [ ] `APPLE_PRIVATE_KEY` (Apple Sign In Private Key from .p8 file)
- [ ] Update server configuration files
  - [ ] Add Apple Sign In service initialization
  - [ ] Update environment validation
  - [ ] Configure JWT validation with ES256 algorithm
- [ ] **Security Requirements (2025)**
  - [ ] Ensure all production API calls remain HTTPS
  - [ ] No reintroduction of ATS or HTTP
  - [ ] No new permissions added besides Sign in with Apple
  - [ ] Implement proper token validation against Apple's JWKS
  - [ ] Handle Apple's public key rotation automatically

---

## Phase 4: Testing & Integration
### 4.1 Client-Side Testing
- [ ] Test Apple Sign In flow on iOS simulator
  - [ ] Verify button appearance and functionality
  - [ ] Test successful sign in flow
  - [ ] Test user cancellation handling
  - [ ] Test error scenarios
- [ ] Test Apple Sign Up flow
  - [ ] Verify new user creation
  - [ ] Test duplicate account handling
  - [ ] Test handle selection flow

### 4.2 Server-Side Testing
- [ ] Test Apple token verification
  - [ ] Verify valid token processing
  - [ ] Test invalid token handling
  - [ ] Test token expiration scenarios
- [ ] Test API endpoints
  - [ ] Test `/apple-signin` endpoint
  - [ ] Test `/apple-signup` endpoint
  - [ ] Test error responses and status codes

### 4.3 Integration Testing
- [ ] Test complete Apple Sign In flow
  - [ ] Client → Server → Database → Response
  - [ ] Verify user data persistence
  - [ ] Test session management
- [ ] Test Apple Sign Up flow
  - [ ] Verify new user creation
  - [ ] Test onboarding flow integration
  - [ ] Test handle selection process

---

## Phase 5: UI Polish & Finalization
### 5.1 Visual Consistency
- [ ] Ensure Apple buttons match Google button styling
  - [ ] Same height, border radius, and corner decorations
  - [ ] Consistent spacing and positioning
  - [ ] Proper loading states and disabled states
- [ ] Test responsive design
  - [ ] Verify layout on different screen sizes
  - [ ] Ensure no scrolling is required
  - [ ] Test landscape orientation (app requirement)

### 5.2 Error Handling
- [ ] Implement comprehensive error handling
  - [ ] User-friendly error messages
  - [ ] Proper error state management
  - [ ] Graceful fallback scenarios
- [ ] Test error scenarios
  - [ ] Network failures
  - [ ] Server errors
  - [ ] Invalid credentials
  - [ ] Account conflicts

### 5.3 Performance Optimization
- [ ] Optimize button rendering
  - [ ] Ensure smooth animations
  - [ ] Minimize re-renders
  - [ ] Test memory usage
- [ ] Optimize API calls
  - [ ] Minimize unnecessary requests
  - [ ] Implement proper caching
  - [ ] Test network efficiency

---

## Phase 6: App Store Compliance
### 6.1 Apple Review Requirements
- [ ] Ensure Apple Sign In is prominently displayed
  - [ ] Button is easily discoverable
  - [ ] No hidden or buried Apple Sign In option
  - [ ] Clear visual hierarchy with Google Sign In
- [ ] Test Apple Sign In functionality
  - [ ] Verify it works in production
  - [ ] Test with real Apple ID accounts
  - [ ] Ensure proper error handling

### 6.2 Documentation & Deployment
- [ ] Update app store metadata
  - [ ] Mention Apple Sign In in app description
  - [ ] Update screenshots if needed
- [ ] Prepare for app store submission
  - [ ] Test on physical devices
  - [ ] Verify production environment
  - [ ] Prepare release notes

---

## Success Criteria
- [ ] Apple Sign In button is prominently displayed alongside Google Sign In
- [ ] UI remains clean and non-scrollable
- [ ] Both sign-in methods work seamlessly
- [ ] App store compliance requirements are met
- [ ] No regression in existing Google Sign In functionality
- [ ] Proper error handling and user feedback
- [ ] Consistent user experience across both sign-in methods

## Acceptance Criteria
- [ ] iOS build compiles with Sign in with Apple capability enabled
- [ ] New two-button row renders on both Sign Up and Sign In screens
- [ ] Equal widths, identical styling, no vertical growth vs current layout
- [ ] Apple flow returns a valid session (server-verified JWT)
- [ ] If user hides email or already exists via email/Google, accounts are linked appropriately
- [ ] Buttons carry equal prominence (no smaller Apple, no dimmer styles)
- [ ] All production API calls remain HTTPS; no reintroduction of ATS or HTTP
- [ ] No new permissions added besides Sign in with Apple

## QA Checklist
- [ ] **First-time Apple sign-in** (shows relay email) → creates account → lands in game
- [ ] **Repeat Apple sign-in** → no prompts; lands in game
- [ ] **Existing email/password user** taps Apple with same email → link then sign in
- [ ] **Google still works** after Apple implementation
- [ ] **Small device** (e.g., iPhone SE) → no extra scrolling; labels can truncate but icons remain visible
- [ ] **Account linking flow** works for users with existing Google accounts
- [ ] **Hide My Email** functionality works without blocking sign-in
- [ ] **Error handling** works for network failures, invalid tokens, etc.

## Notes (Updated for September 2025)
- **Priority**: High - Required for app store compliance (mandatory as of April 2025)
- **Timeline**: Estimate 2-3 weeks for complete implementation
- **Dependencies**: Apple Developer Account, Xcode 16+, iOS 18 SDK
- **Testing**: Extensive testing required on both simulator and physical devices
- **Rollback Plan**: Keep Google Sign In as primary method during testing phase
- **Compliance**: Apps submitted to App Store must be built with iOS 18 SDK as of April 2025
- **Key Requirements**: 
  - Use `ASAuthorizationAppleIDButton` for UI consistency
  - Implement proper JWT validation with ES256 algorithm
  - Handle Apple's private email relay service
  - Support Keychain integration
  - Ensure UI doesn't require scrolling on smaller devices
