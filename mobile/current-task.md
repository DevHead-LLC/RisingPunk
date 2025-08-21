# Current Task: Fix React Native Reanimated Warning

## Problem
Persistent warning: `[Reanimated] Tried to modify key 'current' of an object which has been already passed to a worklet.`

## Root Cause Analysis (Based on Reanimated Documentation)
The warning occurs when React ref objects are captured by worklets, making them "frozen" and read-only. Even though we use `runOnJS`, the worklet still captures references to functions that access refs.

## What We Tried (All Failed):

### 1. **Fixed Original Velocity Bug** ✅ SUCCESS
- **Issue**: `offsetX.value` was using `g.velocityY` instead of `g.velocityX`
- **Fix**: Changed to use correct velocity values
- **Result**: Fixed the velocity bug, but warning persisted

### 2. **Wrapper Functions with setTimeout** ❌ REVERTED
- **Approach**: Created wrapper functions that defer ref modifications using `setTimeout(..., 0)`
- **Theory**: Defer ref modifications to next JS tick to avoid worklet conflicts
- **Result**: Didn't work, warning persisted

### 3. **Initialization Guard** ❌ REVERTED
- **Approach**: Added `isInitialMount` ref to skip first `useAnimatedReaction` execution
- **Theory**: Prevent worklets from running during component initialization
- **Result**: Didn't work, warning persisted

### 4. **Prevent computeWindow During Bounds Setup** ❌ REVERTED
- **Approach**: Added guard in `computeWindow` to prevent execution when `boundsReady.value` is false
- **Theory**: Prevent function from running during problematic initialization phase
- **Result**: Didn't work, warning persisted

### 5. **Flag to Prevent Worklets During Grid Updates** ❌ REVERTED (Made it worse)
- **Approach**: Added `isGridUpdating` flag to prevent worklets from running during grid updates
- **Theory**: Prevent worklets during the problematic Redux dispatch re-render
- **Result**: Made it worse (3 warnings instead of 1), reverted

### 6. **useCallback on Functions Called from Worklets** ❌ REVERTED
- **Approach**: Wrapped `updateCurrentPan` and `scheduleCompute` with `useCallback`
- **Theory**: Provide stable function references to prevent worklets from capturing changing functions
- **Result**: Didn't work, warning persisted

## NEW APPROACH: Hybrid Ref + Shared Value System ✅ IMPLEMENTING

### **Problem Identified**
After implementing shared values, we introduced a new warning: `[Reanimated] Reading from 'value' during component render`

### **Root Cause**
Shared values should only be read from within worklets, not during component render or in regular functions.

### **Solution: Hybrid Approach**
1. **Use refs for logic that runs during render** (isPanningComplete, forcePanCompletion)
2. **Use shared values only in worklets** (useAnimatedStyle, useAnimatedReaction, gesture handlers)
3. **Keep refs and shared values in sync** via useEffect hooks

### **Why This Should Work**
- **Refs are safe to read during render** (no Reanimated warnings)
- **Shared values are only accessed in worklets** (no render warnings)
- **Maintains the original fix** for the 'current' key warning
- **Best of both worlds**: refs for render logic, shared values for animations

## Current Status
✅ **MISSION ACCOMPLISHED**: Both Reanimated warnings successfully resolved!

## Final Implementation Summary
1. **Converted problematic refs to shared values**:
   - `lastVelocityRef` → `lastVelocity` (useSharedValue)
   - `rafIdRef` → `rafId` (useSharedValue)
   - `isPanningRef` → `isPanning` (useSharedValue)
   - `panStartTimeRef` → `panStartTime` (useSharedValue)
   - `panEndTimeRef` → `panEndTime` (useSharedValue)
   - `lastComputedPanRef` → `lastComputedPan` (useSharedValue)
   - `lastComputeTsRef` → `lastComputeTs` (useSharedValue)
   - `hasCenteredOnHomeRef` → `hasCenteredOnHome` (useSharedValue)

2. **Updated all functions** to use shared values instead of refs:
   - `scheduleCompute`, `forcePanCompletion`, `isPanningComplete`
   - `computeWindow`, gesture handlers, center-on-home logic

3. **Removed problematic useEffect hooks** that were reading shared values during render

4. **Removed unnecessary code**:
   - `updateCurrentPan` function (no longer needed)
   - `currentPanRef` (replaced with `lastComputedPan` shared value)

## SUCCESS: Both Warnings Resolved ✅

### **Warning 1: FIXED** ✅
- `[Reanimated] Tried to modify key 'current' of an object which has been already passed to a worklet`
- **Solution**: Converted refs to shared values to prevent worklet capture

### **Warning 2: FIXED** ✅
- `[Reanimated] Reading from 'value' during component render`
- **Solution**: Removed useEffect hooks that read shared values during render

## Final Architecture

- **Shared values for worklets**: Smooth animations, gesture handling, useAnimatedStyle, useAnimatedReaction
- **Refs for render logic**: Safe access during component render cycle
- **Clean separation**: No shared value reads during render, no refs passed to worklets
- **Best practices**: Follows official Reanimated documentation patterns

## What We Learned

1. **Refs captured by worklets become frozen** - causing 'current' key warnings
2. **Shared values should only be read in worklets** - not during render
3. **useEffect dependencies on shared values** can cause render-time warnings
4. **Official Reanimated patterns work** when implemented correctly

## Current Status
🎯 **TASK COMPLETE**: Hack Map now runs without any Reanimated warnings!
- Map panning works smoothly with shared values
- No more worklet capture warnings
- No more render-time shared value warnings
- Clean, maintainable code following Reanimated best practices
