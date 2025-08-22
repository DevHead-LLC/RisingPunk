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

---

# NEW CRITICAL ISSUE: Map Loading at 0,0 After Battle

## 🚨 **REAL ROOT CAUSE DISCOVERED: Grid Effect Resetting Coordinates!**

**What I Found**: There's a `useEffect` that runs whenever the `grid` changes (line 756 dependency array includes `grid`). When the map data is refetched after battle, the grid changes, which triggers this effect, which resets the `offsetX` and `offsetY` values to 0,0 BEFORE the restore effect can run.

**The Sequence**:
1. **Battle ends** → `refetch()` called → **Grid changes**
2. **Grid effect runs** → `offsetX.value = clamped.x` (which is 0,0) 
3. **Restore effect runs** → Tries to set coordinates but they're already reset to 0,0

**The Culprit Code**:
```typescript
useEffect(() => {
  // ... bounds setup ...
  const clamped = {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, lastComputedPan.value.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, lastComputedPan.value.y)),
  };
  offsetX.value = clamped.x;  // ❌ This resets coordinates to 0,0
  offsetY.value = clamped.y;  // ❌ This resets coordinates to 0,0
}, [grid, ...]);  // ❌ Runs when grid changes after battle
```

**The Fix Applied**: Prevent this effect from resetting pan position when returning from battle:
```typescript
// Don't reset pan position if we're returning from battle with a specific restore position
if (!restorePan) {
  const clamped = {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, lastComputedPan.value.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, lastComputedPan.value.y)),
  };
  offsetX.value = clamped.x;
  offsetY.value = clamped.y;
  lastComputedPan.value = clamped;
  computeWindow(clamped.x, clamped.y, containerSize.width, containerSize.height);
}
```

**Expected Result**: After this fix:
- **Grid effect won't reset coordinates when returning from battle** ✅
- **Restore effect can properly set the battle location** ✅ 
- **Map loads at correct battle location** ✅
- **No more blank map at 0,0** ✅

## 🚨 **NEW ISSUE: Tiles Not Loading After Battle**

**What's Happening**: The map now loads at the correct location after battle, but the tiles aren't rendering until you pan. This suggests the `computeWindow` call isn't triggering the tile loading properly.

**The Problem**: After restoring the pan position, the tiles don't load because there's no actual pan movement to trigger the tile loading system.

**The Fix Applied**: Added a forced pan trigger after the restore to ensure tiles load:
```typescript
// Force a small pan movement to trigger tile loading
requestAnimationFrame(() => {
  // First compute the window at the restored position
  computeWindow(clampedX, clampedY, containerSize.width, containerSize.height);
  
  // Then trigger a tiny pan movement to force tile loading
  const tinyPanX = clampedX + 1;
  const tinyPanY = clampedY + 1;
  offsetX.value = tinyPanX;
  offsetY.value = tinyPanY;
  lastComputedPan.value = { x: tinyPanX, y: tinyPanY };
  
  // Compute window again with the tiny pan
  computeWindow(tinyPanX, tinyPanY, containerSize.width, containerSize.height);
  
  // Finally, restore to the exact position
  requestAnimationFrame(() => {
    offsetX.value = clampedX;
    offsetY.value = clampedY;
    lastComputedPan.value = { x: clampedX, y: clampedY };
    computeWindow(clampedX, clampedY, containerSize.width, containerSize.height);
  });
});
```

**Expected Result**: After this fix:
- **Map loads at correct battle location** ✅ (already working)
- **Tiles load immediately** ✅ (forced pan triggers loading)
- **No more blank screen** ✅ (tiles render without manual panning)
- **Smooth user experience** ✅ (everything loads automatically)

## 🚨 **FORCED PAN APPROACH FAILED - Trying Virtual Viewport Refresh**

**What Happened**: The forced pan sequence didn't work. The logs show:
```
[Map] Restoring pan to grid coordinates: 29 19 pan coordinates: -1224.5 -932.5
[Map] Phase 7A: Virtual viewport calculated - 190 tiles visible out of 190 total
```

The map is restoring to the correct coordinates and calculating 190 visible tiles, but the tiles still aren't rendering.

**New Theory**: The issue might be that `computeWindow` isn't triggering the tile loading system properly. Instead, we need to force a direct refresh of the virtual viewport and tile rendering.

**New Fix Applied**: Force tile loading by triggering a virtual viewport refresh:
```typescript
// Force tile loading by triggering a virtual viewport refresh
requestAnimationFrame(() => {
  // First compute the window at the restored position
  computeWindow(clampedX, clampedY, containerSize.width, containerSize.height);
  
  // Force a virtual viewport refresh to ensure tiles load
  const forceRefresh = () => {
    // Trigger virtual viewport calculation
    calculateVirtualViewport(clampedX, clampedY, containerSize.width, containerSize.height);
    
    // Force a re-render by updating the virtual viewport state
    setVirtualViewport(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1
    }));
  };
  
  // Execute the force refresh
  forceRefresh();
});
```

**Expected Result**: After this fix:
- **Map loads at correct battle location** ✅ (already working)
- **Virtual viewport refreshes** ✅ (forced calculation)
- **Tiles render immediately** ✅ (forced re-render)
- **No more blank screen** ✅ (direct tile loading trigger)

Now run the battle again - this approach should force the virtual viewport to refresh and the tiles to render immediately!
