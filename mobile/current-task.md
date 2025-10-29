# Fix Android Panning for Floor Plans

## Goal
Fix Android panning on Investment Property Screen and HomeScreen (floor plan + garage) to allow free panning (X and Y axes) instead of only horizontal scrolling. iOS is working correctly.

## Root Cause
- Screens use basic `ScrollView` with `horizontal` prop
- On Android, this limits scrolling to horizontal only
- TurfScreen was fixed with the same issue using gesture handlers for Android

## Solution Applied
Applied the same pattern as TurfScreen:
- **iOS**: Uses ScrollView (removed `horizontal` prop, allows both directions)
- **Android**: Uses `GesturePanView` with react-native-gesture-handler and react-native-reanimated

## Implementation Details

### InvestmentPropertyScreen
- Floor plan dimensions: 1250x950
- Android header size: 24dp (accounted for in bounds calculation)
- Bounds calculated separately for X and Y axes (non-square floor plan)
- Initial centering: Centers on top-center to show Property label

### HomeScreen
- Floor plan dimensions: 1250x950
- Garage dimensions: 1200x900
- Separate gesture handlers for floor plan and garage tabs
- Android header size: 24dp for both views
- Floor plan centers on top-center, garage centers in middle

## Changes Made
1. ✅ InvestmentPropertyScreen: Added gesture handler support
2. ✅ InvestmentPropertyScreen: Created GesturePanView component
3. ✅ InvestmentPropertyScreen: Added Android-specific gesture state
4. ✅ InvestmentPropertyScreen: Implemented bounds calculation with 24dp header adjustment
5. ✅ HomeScreen: Added gesture handler support for both floor plan and garage
6. ✅ HomeScreen: Created separate gesture handlers for each view
7. ✅ HomeScreen: Implemented bounds calculations for both views
8. ✅ Both screens: Updated render to conditionally use iOS ScrollView vs Android GesturePanView
9. ✅ Both screens: Updated centering logic for both platforms

## Bug Fix: iOS Panning Issue
- **Issue**: ScrollView in React Native only supports horizontal OR vertical, not both
- **Root Cause**: Removing `horizontal` prop made iOS ScrollView vertical-only, breaking horizontal panning
- **Solution**: Use gesture handlers for BOTH iOS and Android (not just Android)
- **Changes**: 
  - Both platforms now use GesturePanView with gesture handlers
  - Removed iOS ScrollView implementation
  - Updated bounds calculations to work for both platforms
  - Unified centering logic for both platforms

## Testing
Ready for manual testing on both iOS and Android devices.

