# Current Task: Implement Research Feature System - Eliminate Mock Data

## Priority: Feature Implementation - Research Feature States & Purchase Flow

**STATUS**: IN PROGRESS - Understanding feature states and eliminating mock data

## Problem
The research feature system currently uses mock data and doesn't properly distinguish between "unlocked" (can be purchased) and "enabled" (actually functional). We need to implement the proper flow and eliminate all mock data.

## Feature State Understanding
**UNLOCKED** = "Can Purchase Feature" (feature is available for purchase)
**LOCKED** = "Cannot Purchase Feature" (feature is not available)
**ENABLED** = "Feature is Active" (requires purchase + timer countdown)

## Feature State Implementation
### **State 1: Locked & Disabled**
- **Appearance**: Lock icon (🔒) + disabled overlay covering entire card
- **Meaning**: Has not met requirements, so locked. Has not been purchased, so disabled.
- **Price Visibility**: Price is covered by overlay (`zIndex: 0`)
- **Styling**: Gray background, muted colors, reduced opacity

### **State 2: Unlocked & Disabled** 
- **Appearance**: No lock icon + disabled overlay covering entire card
- **Meaning**: Has met requirements, so unlocked. Has not been purchased, so disabled.
- **Price Visibility**: Price shows clearly above overlay (`zIndex: 2`)
- **Styling**: Normal background, price shown in blue/red based on affordability

### **State 3: Unlocked & Enabled**
- **Appearance**: No lock icon + no overlay (clean appearance)
- **Meaning**: Has met requirements, so unlocked. Has been purchased, so enabled.
- **Price Visibility**: No price shown (feature is active)
- **Styling**: Green background, full opacity, success colors

## Overlay System Implementation
- **Disabled Overlay**: Always present for disabled states (States 1 & 2)
- **Z-Index Logic**: 
  - `zIndex: 0` for locked features (price under overlay)
  - `zIndex: 2` for unlocked features (price above overlay)
- **Overlay Styling**: 
  - Light Mode: `rgba(0, 0, 0, 0.15)` - subtle darkening
  - Dark Mode: `rgba(0, 0, 0, 0.4)` - appropriate darkening

## Background Image System
- **Antivirus Feature**: Uses antivirusResearch.png as background
- **Text Colors**: 
  - Light Mode: White text (#FFFFFF) for visibility on dark backgrounds
  - Dark Mode: Green text (#00FF00) for visibility on dark backgrounds
- **Reusable Pattern**: Helper functions `renderFeatureContent()` and `renderDisabledOverlay()` ensure consistency
- **Future Features**: Easy to add background images by following the documented pattern in ResearchFeaturesList.tsx

## Current Focus: Home Defense - Antivirus Feature
- **Feature**: Antivirus
- **Current State**: Should be UNLOCKED (can be purchased) when Home Defense category is unlocked
- **Price**: $25,000 (unchanged)
- **Requirements**: Level 2 (unchanged)
- **Purchase Flow**: When clicked, should show purchase modal, then timer countdown

## Implementation Steps
1. ✅ **Update Server Config**: Changed "Unlock Antivirus" → "Antivirus" in server/src/config/researchFeatures.ts
2. ✅ **Eliminate Mock Data**: Completely removed mockResearchFeatures.ts and all mock data usage
3. ✅ **Fix Server Logic**: Updated server to respect config's isUnlocked value when no user record exists
4. ✅ **Implement Real API**: ResearchScreen now uses useResearchFeatures hook for real database data
5. ✅ **Add Background Image**: Antivirus feature now uses antivirusResearch.png as background
6. ✅ **Update Text Colors**: 
   - Light Mode: White text (#FFFFFF)
   - Dark Mode: Green text (#00FF00)
   - Price colors: Blue/Green for affordable, Red for unaffordable
7. ✅ **Create Reusable Pattern**: Helper functions for consistent styling across all features
8. 🔄 **Feature State Logic**: Implement proper unlock/locked/enabled state handling

## Technical Requirements
- **No Mock Data**: All features must come from server API
- **State Management**: Proper handling of unlocked vs locked vs enabled states
- **Purchase Flow**: Click → Purchase Modal → Timer Countdown → Feature Enabled
- **Real-time Updates**: Features should update immediately when states change

## Next Steps
1. Make Antivirus automatically unlocked in Home Defense category
2. Remove mock data usage from ResearchScreen
3. Implement real API integration
4. Set up proper feature state management

---

# Previous Tasks (Archived)

## ✅ COMPLETED: Investment Property Floor Plans
**Date**: Current Session
**Status**: COMPLETED

### What Was Accomplished
- Created reusable `FloorPlan` component in `mobile/src/components/common/FloorPlan.tsx`
- Updated `InvestmentPropertyScreen` to use the new floor plan component
- Implemented consistent apartment floor plan design for all 4 investment properties
- Floor plan includes: Bathroom, Entrance, Kitchen, Bedroom, and Living Room
- Each room displays dimensions and proper labeling
- Property ID is prominently displayed at the top center
- Theme-aware styling that works with both light and dark modes
- **IMPROVED**: Added wall lines to separate rooms (vertical and horizontal walls)
- **IMPROVED**: Different colored sections for entryways and rooms for better visual separation
- **MAJOR UPGRADE**: Removed title text for cleaner appearance
- **MAJOR UPGRADE**: Enlarged floor plan to 800x600 for better visibility and panning
- **MAJOR UPGRADE**: Added panning scroll functionality for navigation
- **MAJOR UPGRADE**: Auto-centers view on Property text at top center on each visit
- **FINAL IMPROVEMENT**: Increased room sizes for better clarity and improved Property text positioning
- **CRITICAL FIX**: Significantly enlarged floor plan to 1200x900 with much more room space
- **CRITICAL FIX**: Fixed centering calculation and container dimensions for proper panning
- **FINAL CRITICAL FIX**: Implemented nested scrolling for both horizontal AND vertical panning
- **FINAL FIXES**: 
  - Moved Property text card down to fit within floor plan area
  - Implemented free panning in both directions simultaneously (not locked to one axis)
  - Fixed vertical scrolling range to allow panning to top and bottom edges
  - Properly implemented both horizontal AND vertical scrolling using ScrollView with content sizing
  - Fixed initial view centering to position at top-middle (Property text) instead of middle-middle

### Technical Details
- **Component**: `FloorPlan` - reusable across all property screens
- **Layout**: 2D floor plan with rooms positioned absolutely for precise control
- **Walls**: Thick black lines (3px) to separate rooms, matching the image design
- **Styling**: Uses theme colors for borders, backgrounds, and text
- **Size**: Very large dimensions (1200x900) for excellent visibility and smooth panning
- **Scroll**: Single ScrollView with free panning in both directions simultaneously
- **Panning**: `directionalLockEnabled={false}` allows diagonal and free movement
- **Centering**: Automatically centers view on Property text with correct X and Y calculations
- **Container**: Updated to 1250x950 to accommodate the larger floor plan
- **Property Text**: Positioned at top center within the floor plan area (not above it)
- **Integration**: Seamlessly integrated into existing `InvestmentPropertyScreen`

### Floor Plan Layout (Majorly Improved)
- **Property Text**: Fixed position at top center of screen (top: 15px margin) - smaller pill with reduced padding, stays visible during panning
- **Left Side - Stacked Colored Boxes**: 
  - **Bathroom**: +$0.01 (top-left, purple tinted, 380x280)
  - **Entrance**: No value text (middle-left, blue tinted, 380x280)
  - **Kitchen**: +$0.01 (bottom-left, purple tinted, 380x260)
- **Right Side - Stacked Colored Boxes**:
  - **Bedroom**: +$0.02 (top-right, light purple tinted, 780x430)
  - **Living Room**: +$0.02 (bottom-right, light blue tinted, 780x430)
- **Design**: Simplified with colored boxes stacked on top of each other, no extra wall lines, green dollar values instead of dimensions

### Files Modified
- `mobile/src/components/common/FloorPlan.tsx` - Enhanced component with wall lines, larger layout (1200x900), and Property text positioned within floor plan
- `mobile/src/screens/InvestmentPropertyScreen.tsx` - Added free panning functionality, removed title, updated container size to 1250x950
