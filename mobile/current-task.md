# Android TurfScreen Centering Implementation

## Goal
Implement centering functionality for Android on TurfScreen to match iOS behavior.

## Current Issue
- iOS: Screen centers on digital turf where home location and digital barracks are located
- Android: Only picks up view where it was left off and initializes at top-left-most part of clamped area

## Centering Events to Fix
1. Initial view of TurfScreen
2. Returning from ProfileScreen
3. Returning from FinancialStatementScreen (wallet view)
4. Returning from HomeScreen (home location)
5. Returning from DigitalBarracksScreen (Digital Barracks Location)

## Analysis
- iOS uses ScrollView with contentOffset centering
- Android uses GesturePanView with offsetX/offsetY shared values
- Need to implement Android centering logic similar to iOS

## Implementation Plan
1. Add Android centering function
2. Update navigation handlers for Android
3. Test all centering scenarios

## Implementation Complete ✅

### Changes Made:
1. **Created `centerAndroidView()` function** - Sets offsetX and offsetY to center the Android view
2. **Updated `centerView()` function** - Now handles both iOS and Android centering
3. **Updated navigation handlers** - All screen transitions now center Android view when returning from specific screens
4. **Updated onboarding handlers** - Both complete and skip handlers now center Android view
5. **Updated turf intro handlers** - Both complete and skip handlers now center Android view
6. **Updated position capture** - Android now properly captures and restores view positions for research and investment properties

### Key Implementation Details:
- Android centering uses `offsetX.value = -CENTER_X` and `offsetY.value = 0`
- Position capture for Android uses `{ x: -offsetX.value, y: -offsetY.value }`
- Position restoration for Android uses `offsetX.value = -turfViewPosition.x` and `offsetY.value = -turfViewPosition.y`
- All centering events now work consistently between iOS and Android

### Testing Required:
- Test initial view centering on Android
- Test returning from ProfileScreen, HomeScreen, DigitalBarracksScreen
- Test onboarding completion centering
- Test turf intro completion centering
- Test research and investment property position restoration

## Status: Ready for Testing ✅
All implementation is complete and linting errors resolved. The Android centering functionality should now work consistently with iOS behavior across all specified scenarios.

## Additional Fix Applied ✅
**FinancialStatementsScreen Centering**: Updated `AppContent.tsx` to handle Android centering when returning from FinancialStatementsScreen:
- Added Platform import to AppContent.tsx
- Updated `centerTurfView()` function to use `centerAndroidView()` for Android
- Exposed `centerAndroidView` function from TurfScreen via `useImperativeHandle`
- FinancialStatementsScreen now properly centers on Android when closing
