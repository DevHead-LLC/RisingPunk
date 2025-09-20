# Single Device Login Enforcement

## Core Goal
**Only 1 user can log into 1 account at a time on a single device.**

### Required Behavior:
1. **User logs into account**: System checks for other logins, sees none, allows login
2. **Another device logs in**: System finds old login, logs old user out with modal saying "someone else logged in", user clicks "OK" and gets logged out, new login stays active

### Key Constraint:
- **Preserve existing GlobalErrorHandler functionality** - it handles database issues that force logout
- **Revert failed changes** - If an attempt doesn't work, revert the changes before trying the next approach
- **Add account switching on top** - log out old users when new device logs in

## Implementation Status: IN PROGRESS

### What We've Built:
- ✅ Server-side device session tracking in User model
- ✅ Auth middleware validates device sessions, returns `ACCOUNT_SWITCHED` error
- ✅ Login endpoints clear old sessions when new device logs in
- ✅ AccountSwitchedModal component created
- ✅ Mobile auth slice handles account switching state
- ✅ AppContent renders AccountSwitchedModal

### Current Issue:
**Modal not showing** - Token invalidation is working (old account can't access database), but old user is not seeing AccountSwitchedModal. Need to debug the error flow to see where the ACCOUNT_SWITCHED error is getting lost.

### Attempt #1: Exclude ACCOUNT_SWITCHED from GlobalErrorHandler
**Status**: Implemented
**What we did**: Modified `GlobalErrorHandler.isDatabaseError()` to exclude `ACCOUNT_SWITCHED` errors
**Result**: Fixed modal selection issue

### Attempt #2: Fix AccountSwitchedModal import/sizing errors
**Status**: Implemented
**What we did**: Fixed incorrect SIZING property references in AccountSwitchedModal styles
**Result**: Modal loads without errors

### Attempt #3: Fix device session validation logic
**Status**: FAILED - Need to revert
**Problem**: Both devices can stay logged in - single-device enforcement not working
**Root cause**: `isDeviceSessionValid` was checking JWT tokenId, but JWT tokens are unique each time
**What we did**: 
- Modified `isDeviceSessionValid` to only check deviceId (not tokenId)
- Added debug logging to auth middleware
**Result**: Server logs show "No deviceId provided" - deviceId header not being sent from client
**Issue**: Device ID header not reaching server despite being set in baseApi

### Attempt #4: Debug device ID header transmission
**Status**: ABANDONED - Too complex
**Problem**: Device ID header not reaching server despite CORS fixes
**Result**: Complex device session tracking approach was unreliable

### Attempt #5: Simple Token Invalidation Approach
**Status**: PARTIALLY WORKING
**Problem**: Complex device session tracking was overkill and unreliable
**Solution**: Simple approach - invalidate ALL tokens when user logs in anywhere
**What we did**:
- Replaced `deviceSession` with simple `currentTokenId` field
- When user logs in → set `currentTokenId` to new token (invalidates all old tokens)
- When old token used → check if it matches `currentTokenId`, if not → `ACCOUNT_SWITCHED`
- Removed device ID header logic (no longer needed)
- Simplified auth middleware to just check token validity
- **Cleaned up remaining device session references** that were causing TypeScript errors
**Result**: ✅ Token invalidation working - old account can't access database
**Issue**: ❌ Old user not seeing AccountSwitchedModal - need to debug error flow

### Attempt #6: Debug Modal Display Issue
**Status**: PARTIALLY FIXED
**Problem**: Old user not seeing AccountSwitchedModal when logged out
**Root cause**: `authApi` was using its own `authBaseQuery` that bypassed our `ACCOUNT_SWITCHED` error handling
**What we did**:
- Added debug logging to baseApi and authApi to see what errors are received
- Added debug logging to auth slice to see if action is dispatched
- **Fixed authApi error handling** - Updated `authBaseQuery` to check for `ACCOUNT_SWITCHED` before calling GlobalErrorHandler
**Result**: Now both baseApi and authApi handle `ACCOUNT_SWITCHED` errors consistently

### Attempt #7: Fix Race Condition
**Status**: PARTIALLY FIXED
**Problem**: Race condition causing new user to get logged out immediately after login
**Root cause**: Using JWT token as session ID created circular validation - token was invalidating itself
**What we did**:
- **Separated session ID from JWT token** - Generate unique sessionId, store in JWT payload
- **Updated auth middleware** - Check sessionId from JWT instead of JWT token itself
- **Updated all login endpoints** - Use sessionId pattern consistently
- **Added detailed debugging** - Track sessionId vs currentTokenId validation
**Result**: ✅ Fixed race condition, but created new issue

### Attempt #8: Fix verify-token Endpoint Mismatch
**Status**: PARTIALLY FIXED
**Problem**: verify-token endpoint not using sessionId validation, causing mismatch with auth middleware
**Root cause**: verify-token was using old JWT validation (no sessionId check), but auth middleware expects sessionId
**What we did**:
- **Updated verify-token endpoint** - Added sessionId validation to match auth middleware
- **Made sessionId optional** - Handle both old tokens (no sessionId) and new tokens (with sessionId)
- **Added ACCOUNT_SWITCHED response** - Return same error as auth middleware for consistency
**Result**: ✅ Fixed mismatch, but created new issue

### Attempt #9: Fix Old Token Compatibility
**Status**: PARTIALLY FIXED
**Problem**: User logging in with old token (no sessionId) but auth middleware expecting sessionId
**Root cause**: Old stored tokens don't have sessionId, but auth middleware was checking sessionId for all tokens
**What we did**:
- **Updated auth middleware** - Only check sessionId if token has one (new tokens)
- **Updated verify-token endpoint** - Same logic for consistency
- **Added backward compatibility** - Old tokens without sessionId are still valid
- **Added detailed debugging** - Track hasSessionId vs isValid logic
**Result**: ✅ Fixed old token compatibility, but modal still not showing

### Attempt #10: Fix Multiple API Error Handling
**Status**: COMPLETED
**Problem**: Multiple API files calling GlobalErrorHandler directly, bypassing ACCOUNT_SWITCHED handling
**Root cause**: balanceApi, botsApi, mapApi were calling globalErrorHandler.handleDatabaseError directly without checking for ACCOUNT_SWITCHED
**What we did**:
- **Updated balanceApi** - Added ACCOUNT_SWITCHED check before calling GlobalErrorHandler
- **Updated botsApi** - Added ACCOUNT_SWITCHED check before calling GlobalErrorHandler  
- **Updated mapApi** - Added ACCOUNT_SWITCHED check before calling GlobalErrorHandler
- **Consistent error handling** - All API files now handle ACCOUNT_SWITCHED the same way
**Result**: ✅ Old account now gets logged out properly

### Attempt #11: Replace Modal with Banner Notification
**Status**: PARTIALLY WORKING
**Problem**: Modal was too intrusive for account switching notification
**Solution**: Replace modal with 5-second banner notification on login screen
**What we did**:
- **Added banner state** - `showAccountSwitchedBanner` to auth slice
- **Updated handleAccountSwitched** - Set banner instead of modal
- **Added banner reducer** - `setShowAccountSwitchedBanner` action
- **Updated AppContent** - Show NotificationBanner with 5-second duration
- **Better UX** - Less intrusive notification that auto-dismisses
**Result**: ✅ Banner state is being set correctly, but there are other issues

### Current Issues Identified:
1. **React Hooks Order Error** - RentalHousingLocation component has hooks order issue causing crashes
2. **Infinite Auth Validation Loop** - Continuous auth validation calls causing performance issues
3. **Banner May Not Be Visible** - Due to crashes, banner might not be displaying properly

### Attempt #12: Fix React Hooks Order Issue
**Status**: COMPLETED
**Problem**: RentalHousingLocation component has hooks order issue causing crashes
**Root cause**: Conditional hook call - `useAppSelector` was called conditionally inside a ternary operator
**What we did**:
- **Fixed conditional hook** - Moved `useAppSelector` to always be called unconditionally
- **Separated logic** - Get Redux balance first, then use it in the ternary
- **Maintained functionality** - Same behavior but follows Rules of Hooks
**Result**: ✅ Fixed React hooks order error that was causing crashes

### Attempt #13: Fix Banner Display Timing
**Status**: COMPLETED
**Problem**: Banner showing on new account instead of old account that got logged out
**Root cause**: Both accounts were getting ACCOUNT_SWITCHED errors, causing infinite logout loop
**What we did**:
- **Reverted API changes** - Removed authentication checks from API files
- **Fixed handleAccountSwitched logic** - Only show banner if user was authenticated when error occurred
- **Added authentication check** - `const wasAuthenticated = !!state.token` before clearing token
- **Smart banner display** - `state.showAccountSwitchedBanner = wasAuthenticated`
- **Prevented infinite loop** - New user (not authenticated) won't show banner
**Result**: ✅ Banner only shows for old authenticated user, prevents infinite logout loop

### Attempt #14: Fix Banner Persistence Through Navigation
**Status**: COMPLETED
**Problem**: Banner disappears when user gets navigated to login screen
**Root cause**: Banner was only rendered in authenticated section, not on login screen
**What we did**:
- **Moved banner to login screen** - Banner now renders in `!token` section (login screen)
- **Removed duplicate banner** - Removed banner from authenticated section
- **Persistent notification** - Banner now follows user to login screen after logout
- **Proper timing** - Banner shows on login screen where user can see it
**Result**: ✅ Banner now persists through navigation and shows on login screen

### Attempt #15: Fix Race Condition in Account Switching
**Status**: COMPLETED
**Problem**: Inconsistent logout behavior - sometimes immediate, sometimes delayed, sometimes with banner, sometimes without
**Root cause**: Multiple API calls triggering `handleAccountSwitched` simultaneously, causing race conditions
**What we did**:
- **Added duplicate call prevention** - `handleAccountSwitched` now checks if user already logged out
- **Added debounce mechanism** - Prevents multiple rapid `ACCOUNT_SWITCHED` dispatches
- **Consistent behavior** - First API call triggers logout, subsequent calls are ignored
- **2-second reset** - Debounce resets after 2 seconds to allow future account switches
**Result**: ✅ Consistent logout behavior with reliable banner display

### Attempt #16: Improve Banner Design
**Status**: COMPLETED
**Problem**: Banner design needed improvement for better visual appeal
**What we did**:
- **Pink border** - Added 2px pink border (#A239CA) with rounded corners
- **Blank background** - Changed from colored background to transparent
- **Green text** - Changed text color to matrix green (#00FF41)
- **Smaller size** - Reduced font size and padding, max width 300px
- **Vertical center** - Positioned banner in center of screen using top: 50% and transform
- **Better spacing** - Improved padding and margins for cleaner look
**Result**: ✅ Modern, clean banner design that's visually appealing and properly centered

### Files Modified:
- `server/src/models/User.ts` - Replaced device session with simple currentTokenId field
- `server/src/routes/auth.ts` - Updated login endpoints to set currentTokenId (invalidates old tokens)
- `server/src/middleware/auth.ts` - Simplified to check token validity against currentTokenId
- `mobile/src/store/api/baseApi.ts` - Added ACCOUNT_SWITCHED error handling and debug logging
- `mobile/src/store/api/authApi.ts` - **FIXED** - Added ACCOUNT_SWITCHED error handling to authBaseQuery
- `mobile/src/store/slices/authSlice.ts` - Added account switching state, actions, and debug logging
- `mobile/src/components/modals/AccountSwitchedModal.tsx` - New modal component
- `mobile/src/components/AppContent.tsx` - Added modal to render
- `mobile/src/services/GlobalErrorHandler.ts` - Excluded ACCOUNT_SWITCHED from database errors

### Next Steps:
1. Test the current implementation
2. If still showing wrong modal, investigate error flow further
3. If working, verify complete behavior works as expected
4. Document final working solution

### Process of Elimination:
- ✅ Server sending correct error
- ✅ Mobile receiving error  
- 🔄 Testing if GlobalErrorHandler exclusion fixes modal issue
- ⏳ If not, check error transformation in API layer
- ⏳ If not, check if error is being handled elsewhere
