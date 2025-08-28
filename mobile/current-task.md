# Current Task: Update HomeScreen to Floor Plan Layout with Tabs

## Priority: UI Enhancement - HomeScreen Floor Plan Implementation

**STATUS**: IN PROGRESS - Phase 1 & 2 completed, Phase 3 in progress

## Problem
The current HomeScreen has a simple side-by-side layout with HackRig and BotAssembly components. We want to:
1. Convert to a floor plan layout similar to investment properties
2. Place HackRig in the bedroom section
3. Add a new garage tab for bot building
4. Implement the same panning behavior as investment properties
5. Maintain the locking/unlocking behavior for HackRig

## Implementation Analysis
✅ **Existing Components**:
- `HackRigDisplay` - Has locking/unlocking logic and navigation to hack map
- `BotAssembly` - Simple component for bot building
- `FloorPlan` component exists for investment properties with panning

✅ **Existing Patterns**:
- Investment properties use ScrollView with panning
- Tab navigation exists in ProfileScreen and FinancialStatementsScreen
- Floor plan layout with rooms already implemented

## Implementation Plan

### **Phase 1: Create Home Floor Plan Component** ✅ COMPLETED
- Create new `HomeFloorPlan` component similar to `FloorPlan`
- Design layout with bedroom (HackRig) and garage (BotAssembly) sections
- Implement tab navigation between floor plan and garage
- **Status**: ✅ COMPLETED - HomeFloorPlan component created

### **Phase 2: Update HomeScreen Layout** ✅ COMPLETED
- Replace current side-by-side layout with floor plan + tabs
- Implement ScrollView with panning behavior
- Add tab navigation between floor plan and garage
- **Status**: ✅ COMPLETED - HomeScreen updated with floor plan layout and tabs

### **Phase 3: Integrate Existing Components** 🔄 IN PROGRESS
- Move HackRigDisplay to bedroom section of floor plan
- Move BotAssembly to garage tab
- Maintain all existing functionality and navigation
- **Status**: 🔄 IN PROGRESS - Components integrated, testing needed

## Technical Requirements
- **Floor plan layout** similar to investment properties ✅
- **Panning behavior** using ScrollView with horizontal/vertical scrolling ✅
- **Tab navigation** between floor plan and garage ✅
- **HackRig locking/unlocking** behavior preserved ✅
- **Responsive design** with proper sizing and positioning ✅

## Files Modified
- `mobile/src/screens/HomeScreen.tsx` - ✅ Main layout changes completed
- `mobile/src/components/home/HomeFloorPlan.tsx` - ✅ New floor plan component created
- `mobile/src/components/home/BotAssembly.tsx` - ✅ Moved to garage tab

## Next Steps
1. ✅ **Phase 1**: Create HomeFloorPlan component - COMPLETED
2. ✅ **Phase 2**: Update HomeScreen layout with tabs and panning - COMPLETED
3. 🔄 **Phase 3**: Integrate existing components into new layout - IN PROGRESS

## Design Notes
- Bedroom section will contain HackRig with existing locking logic ✅
- Garage tab will contain BotAssembly for bot building ✅
- Floor plan will use same panning behavior as investment properties ✅
- Maintain all existing navigation and functionality ✅

## Current Status
The HomeScreen has been successfully converted to a floor plan layout with:
- Floor Plan tab showing the home layout with HackRig positioned in the bedroom
- Garage tab containing the BotAssembly component
- Panning behavior matching investment properties
- Tab navigation between the two views
- All existing functionality preserved

Ready for testing and any final adjustments needed.
