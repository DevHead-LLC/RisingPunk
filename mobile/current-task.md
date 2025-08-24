# Current Task: Implement Rental Housing Development Feature

## Problem
We need to implement a new Rental Housing development feature in the TurfScreen that follows the same pattern as the Research Center development. This will include an empty lot, construction phase, and completed housing with a 2-hour build timer.

## Requirements
1. **Rental Housing Development**: Implement a new development location similar to Research Center
2. **Build Process**: Empty lot → Under construction → Completed housing
3. **Cost**: $100,000 for development
4. **Build Time**: 2 hours (120 minutes)
5. **Single Build Limit**: Only allow 1 build at a time
6. **Database Integration**: Ensure new users get correct initial data
7. **Persistence**: Handle screen refreshes and app restarts

## Implementation Plan

### **Phase 1: Build Empty Space and Image** ✅
- [ ] Add `rentalHousing` to User model `unlockedFeatures` and `rentalHousingBuild` fields
- [ ] **✅ Create Reusable Components** (for future buildings):
  - [x] `DevelopmentLocation.tsx` - Base container with positioning, icon, label, timer
  - [x] `BuildModal.tsx` - Reusable modal for build confirmation
  - [x] `DevelopmentIcon.tsx` - Icon container with image switching logic
  - [x] `DevelopmentLabel.tsx` - Reusable label component
  - [x] `DevelopmentTimer.tsx` - Reusable timer container
  - [x] `index.ts` - Export all reusable components
- [x] **✅ Create `DevelopmentZone.tsx`** component for left-side 4-building layout
- [x] **✅ Create `RentalHousingLocation.tsx`** component using reusable components
- [x] **✅ Add placeholder components** for 3 future buildings
- [x] **✅ Position DevelopmentZone** on left side of TurfScreen
- [x] **✅ Add component to TurfScreen** render
- [x] **✅ Layout Fixes Applied**: 
  - [x] Reduced distance underneath (moved to top: 35%)
  - [x] Fixed "4 on dice" 2x2 grid layout (2 on top, 2 on bottom)
  - [x] Made all building slots identical (using DevelopmentIcon)
  - [x] Removed "BUILDING X COMING SOON" text and dashed borders
  - [x] Moved "Rental Housing" text beneath all buildings (centered)
  - [x] **✅ Additional Improvements Applied**:
    - [x] Increased spacing between buildings (larger gap for better separation)
    - [x] Removed all dashed/dotted borders
    - [x] Added property numbers (1, 2, 3, 4) inside each location card
    - [x] Positioned "RENTAL HOUSING" text beneath houses, inside digital grounds
    - [x] **✅ Final Layout Adjustments**:
      - [x] Increased digital grounds height from 300 to 350 for better text spacing
      - [x] Adjusted property number positioning (top: 8, right: 8) to be fully inside green squares
    - [x] **✅ Property Locking System Implemented**:
      - [x] Added dark overlay (60% opacity) over properties 2-4
      - [x] Added lock icon (🔒) in center of locked properties
      - [x] Implemented unlock requirement messaging:
        - Property 2: "Unlock Property 1 to Enable"
        - Property 3: "Unlock Properties 1 and 2 to Enable"  
        - Property 4: "Unlock Properties 1-3 to Enable"
    - [x] **✅ Light Mode Property Number Styling**:
      - [x] Property numbers now use white text (#FFFFFF) in light mode
      - [x] Dark mode preserves original green matrix color
      - [x] Applied to both RentalHousingLocation and FutureBuildingPlaceholder
    - [x] **✅ Zone Label Updated**:
      - [x] Changed "RENTAL HOUSING" to "INVESTMENT PROPERTIES"
      - [x] Maintains same styling and positioning
    - [x] **✅ Custom Locked Feature Modal System**:
      - [x] Created reusable `LockedFeatureModal` component with cyberpunk aesthetic
      - [x] Handles both light and dark modes automatically
      - [x] Replaced Alert.alert calls in:
        - FutureBuildingPlaceholder (properties 2-4 unlock requirements)
        - RentalHousingLocation (loading balance, insufficient funds)
        - ResearchCenterLocation (loading balance, insufficient funds, build errors)
      - [x] Features lock icon, themed styling, and consistent button text
      - [x] **Modal Spacing Improvements**:
        - [x] Increased overall padding from `xl` to `xl * 2`
        - [x] Added minimum height (400px) for better proportions
        - [x] Enlarged lock icon container (70x70) and icon (32px)
        - [x] Improved spacing between elements for better visual balance
        - [x] Enhanced button sizing and padding for better touch targets
      - [x] **Modal Size and Layout Refinements**:
        - [x] Reduced modal size to 80% of viewport height for better proportions
        - [x] Adjusted padding from `xl * 2` back to `lg` for balanced spacing
        - [x] Added `justifyContent: 'center'` for vertical content centering
        - [x] Changed button text from "UNDERSTOOD" to "OK" for clarity
        - [x] Optimized lock icon size (60x60) and spacing for new proportions
    - [x] **✅ Hack Rig Modal System Updated**:
      - [x] Created specialized `SystemBreachModal` for Hack Rig alerts
      - [x] Replaced Alert.alert with custom cyberpunk-styled modal
      - [x] Features warning icon (⚠️), error-colored title, and dual buttons
      - [x] Maintains same functionality: Cancel and EXECUTE EXPLOIT
      - [x] Consistent with game's aesthetic and modal system
      - [x] **Modal Spacing Refinement**:
        - [x] Fixed spacing issue by using correct `SIZING.spacing.lg` instead of non-existent `xl` value
        - [x] Balanced spacing to provide separation without pushing content to edges
    - [x] **✅ Bug Fix: Inconsistent Alert Handling**:
      - [x] Fixed RentalHousingLocation "Insufficient Funds" alert inconsistency
      - [x] Replaced Alert.alert with LockedFeatureModal for insufficient funds
      - [x] Now all alerts in RentalHousingLocation use consistent modal system
      - [x] Maintains same user experience as ResearchCenterLocation component
- [x] **PHASE 1 COMPLETE**: All visual components implemented and positioned with proper layout

### **Phase 2: Modal Popup Implementation** ✅
- [x] **✅ Modal popup already implemented** in `RentalHousingLocation.tsx` component
- [x] **✅ Build confirmation dialog already implemented** with $100,000 cost display
- [x] **✅ "Build Rental Housing" button already implemented** (with proper disabled state)
- [x] **✅ Modal styling already matches** Research Center pattern
- [x] **PHASE 2 COMPLETE**: All modal functionality is fully implemented

### **Phase 3: Countdown Timer Positioning Fix** ✅
- [x] **✅ Centralized Timer Display**: Moved countdown timer from individual property cards to centralized location below "INVESTMENT PROPERTIES" label
- [x] **✅ DevelopmentZone Enhancement**: Added `buildingProperties` prop to DevelopmentZone to track all building properties
- [x] **✅ Timer Consolidation**: Single timer now displays below the entire DevelopmentZone instead of below individual cards
- [x] **✅ Property Integration**: Updated TurfScreen to pass building status data to DevelopmentZone
- [x] **✅ Component Cleanup**: Added `showTimer` prop to RentalHousingLocation to disable individual timers
- [x] **✅ Infinite Re-render Fix**: Used useCallback and useMemo to prevent infinite re-renders caused by recreating functions on every render
- [x] **✅ Build Completion Logic Fix**: Added proper checks to only complete properties that are actively building, preventing "No active build found" errors
- [x] **✅ Timer Layout Fix**: Positioned timer absolutely below the label to prevent it from pushing up the "INVESTMENT PROPERTIES" text
- [x] **✅ Timer Theme Colors**: Updated timer text to be black in light (business) mode and green in dark (hacker) mode
- [x] **✅ PHASE 3 COMPLETE**: Countdown timer now positioned correctly below the location cards as requested

### **Phase 3: Funds Validation** ✅
- [x] **✅ Balance checking already integrated** from `useFetchBalanceQuery`
- [x] **✅ Build button already disabled** if insufficient funds (< $100,000)
- [x] **✅ Appropriate error messages already implemented** for insufficient balance
- [x] **✅ Build button already enabled** only when user has sufficient funds
- [x] **PHASE 3 COMPLETE**: All funds validation is fully implemented

### **Phase 4: Database Integration & Initial Testing** ✅
- [x] **✅ Server-side API endpoints implemented**:
  - [x] `GET /api/users/rental-housing-status/:propertyId` - Check build status
  - [x] `POST /api/users/unlock-rental-housing/:propertyId` - Start build process
- [x] **✅ User model updated** with `rentalHousingBuild` schema
- [x] **✅ Balance deduction and build timer logic implemented**
- [x] **✅ Client-side API hooks added** in `authApi.ts`
- [x] **✅ API calls integrated** in component
- [x] **✅ Single build enforcement implemented** (only one property can be built at a time)
- [x] **PHASE 4 COMPLETE**: Full database integration and API endpoints working

### **Phase 5: 1-Minute Countdown Timer** ✅
- [x] **✅ Countdown timer implemented** using `BuildCountdownTimer` component
- [x] **✅ Timer completion triggers database update** - rentalHousing1 set to "true"
- [x] **✅ Image transitions implemented** - changes from under construction to completed
- [x] **✅ Investment Property Floor Plan screen created** with proper light/dark mode support
- [x] **✅ Navigation to floor plan** when property is completed
- [x] **PHASE 5 COMPLETE**: Timer functionality fully implemented and tested

### **Phase 6: Property Progression System** 🔄 **CURRENT PHASE - BROKEN**
- [x] **✅ Server-side progression logic implemented** - Property 2 requires Property 1 to be unlocked
- [x] **✅ Cache invalidation implemented** - Property 2 cache is invalidated when Property 1 completes
- [x] **❌ BROKEN: Property 2 visual state** - Currently shows as enabled (green border) when it should be disabled
- [x] **❌ BROKEN: Property 2 progression** - Not automatically enabling when Property 1 completes
- [ ] **FIX REQUIRED**: Property 2 should show disabled overlay (like properties 3 and 4) when Property 1 is locked
- [ ] **FIX REQUIRED**: Property 2 should automatically enable and show build modal when Property 1 completes
- [ ] **FIX REQUIRED**: Property 2 should transition from FutureBuildingPlaceholder to RentalHousingLocation when unlocked

**CURRENT BROKEN STATE:**
- Property 1: ✅ Working correctly (builds, completes, unlocks)
- Property 2: ❌ Shows as enabled but doesn't work (should be disabled until Property 1 unlocks)
- Property 3: ✅ Correctly shows as disabled with overlay
- Property 4: ✅ Correctly shows as disabled with overlay

**WHAT NEEDS TO BE FIXED:**
1. **Pre-Property-1 build**: Property 2 should show disabled overlay with "Unlock Property 1 to Enable" message
2. **Post-Property-1 build**: Property 2 should automatically enable and show build modal when clicked
3. **Visual consistency**: Property 2 should look like properties 3 and 4 when locked, then transition to enabled state

**IMPLEMENTATION APPROACH:**
- Use existing FutureBuildingPlaceholder logic for locked state (already working for properties 3 and 4)
- Dynamically switch to RentalHousingLocation when Property 1 unlocks
- Maintain existing progression system and cache invalidation

### **Phase 7: Persistence Testing**
- [ ] Test screen refreshes during build process
- [ ] Verify timer continues counting when app is backgrounded
- [ ] Test app restart during build process
- [ ] Ensure build status persists in database

### **Phase 8: Single Build Enforcement**
- [ ] Implement server-side validation to prevent multiple builds
- [ ] Add client-side checks to disable build button during construction
- [ ] Test concurrent build attempts are properly blocked
- [ ] Verify only one rental housing build can be active at a time

## Technical Implementation Details

### **Database Schema Updates**
```typescript
// User model additions
unlockedFeatures: {
  hackRig: boolean;
  researchCenter: boolean;
  rentalHousing1: boolean; // NEW - Property 1
  rentalHousing2: boolean; // NEW - Property 2
  rentalHousing3: boolean; // NEW - Property 3
  rentalHousing4: boolean; // NEW - Property 4
},
rentalHousingBuilds: { // NEW - Individual property builds
  property1: { startedAt: Date | null; completesAt: Date | null };
  property2: { startedAt: Date | null; completesAt: Date | null };
  property3: { startedAt: Date | null; completesAt: Date | null };
  property4: { startedAt: Date | null; completesAt: Date | null };
}
```

### **New User Data Initialization**
```typescript
// Ensure new users have all rental housing fields initialized
unlockedFeatures: {
  hackRig: false,
  researchCenter: false,
  rentalHousing1: false, // NEW - Property 1
  rentalHousing2: false, // NEW - Property 2
  rentalHousing3: false, // NEW - Property 3
  rentalHousing4: false, // NEW - Property 4
},
rentalHousingBuilds: { // NEW - Individual property builds
  property1: { startedAt: null, completesAt: null },
  property2: { startedAt: null, completesAt: null },
  property3: { startedAt: null, completesAt: null },
  property4: { startedAt: null, completesAt: null }
}
```

### **API Endpoints**
- `GET /api/users/rental-housing-status/:propertyId` - Returns build status and unlock state for specific property (1-4)
- `POST /api/users/unlock-rental-housing/:propertyId` - Starts build process for specific property, deducts balance

### **MongoDB Commands for Existing Users**
```javascript
// Update existing user to add rental housing fields
db.users.updateOne(
  { "_id": ObjectId('68a0a15fd6d999828c46b26c') },
  {
    $set: {
      "unlockedFeatures.rentalHousing1": false,
      "unlockedFeatures.rentalHousing2": false,
      "unlockedFeatures.rentalHousing3": false,
      "unlockedFeatures.rentalHousing4": false,
      "rentalHousingBuilds.property1": { "startedAt": null, "completesAt": null },
      "rentalHousingBuilds.property2": { "startedAt": null, "completesAt": null },
      "rentalHousingBuilds.property3": { "startedAt": null, "completesAt": null },
      "rentalHousingBuilds.property4": { "startedAt": null, "completesAt": null }
    }
  }
)

// Individual property unlock commands
db.users.updateOne(
  { "_id": ObjectId('68a0a15fd6d999828c46b26c') },
  { $set: { "unlockedFeatures.rentalHousing1": true } }
)
```

### **Component Structure**
- `RentalHousingLocation.tsx` - Main component with modal and build logic
- Uses existing `BuildCountdownTimer` component
- Follows same pattern as `ResearchCenterLocation.tsx`

### **New User Registration Requirement**
- **Auth System Update**: Must modify user registration to initialize all 4 rental housing properties
- **Default State**: All properties start as `false` with no active builds
- **Individual Control**: Each property can be unlocked independently without affecting others

### **Image Assets**
- **Empty Lot**: `emptyResidential.png` ✅ (provided by user)
- **Under Construction**: `residentialUnderConstruction.png` ✅ (provided by user)  
- **Completed Housing**: `residentialLvl1.png` ✅ (provided by user)

### **Positioning & Layout**
- **Left Side Development Zone**: 4 buildings in "4 on dice" 2x2 grid pattern on the left side of TurfScreen
- **Container Style**: Green opaque container similar to Research Center, but more like Home/Digital Barracks "digital turf" style
- **Positioning**: Beneath Research Center (similar distance as Research Center is beneath Home/Digital Barracks)
- **Building Layout (2x2 Grid)**: 
  - Top Left: Building 2 (placeholder)
  - Top Right: Building 3 (placeholder)
  - Bottom Left: Building 1 - Rental Housing (bottom center of the 4)
  - Bottom Right: Building 4 (placeholder)
- **Spacing**: Generous margins between buildings like Home/Digital Barracks separation
- **Right Side**: Reserved for different building types later
- Use responsive positioning with proper z-index layering

## Current Status
✅ **PHASE 1 COMPLETE**: All visual components implemented and positioned!
✅ **PHASE 2 COMPLETE**: All modal functionality is fully implemented!
✅ **PHASE 3 COMPLETE**: All funds validation is fully implemented!
✅ **PHASE 4 COMPLETE**: Full database integration and API endpoints working!
✅ **PHASE 5 COMPLETE**: Timer functionality fully implemented and tested!
🔄 **CURRENT PHASE**: Extend to 2-Hour Build

**PHASE 5 COMPLETED**: Successfully implemented:
- Timer completion triggers database update (rentalHousing1 → true)
- Image transitions from construction to completed
- Investment Property Floor Plan screen with light/dark mode
- Navigation to floor plan when property completes
- Full timer completion workflow

**READY FOR**: Phase 6 - Extend build time to 2 hours for production

## Dependencies
- ✅ **User Requirements**: Clear and complete
- ✅ **Technical Plan**: Comprehensive 8-phase implementation
- ✅ **House Images**: All three states provided (empty, under construction, completed)
- ✅ **Reusable Components**: All development components created
- ✅ **Phase 1**: DevelopmentZone, RentalHousingLocation, and placeholders implemented
- 🔄 **Ready for Phase 2**: Modal popup implementation

## Next Steps
1. ✅ **House images received** - ready to proceed
2. Update User model with rental housing fields
3. Create RentalHousingLocation component using reusable components
4. Position on TurfScreen (suggested: bottom center area)
5. Begin Phase 1 implementation

---

## PREVIOUS TASKS (COMPLETED)

### **Battle Screen Light Mode Implementation** ✅
- All battle components now support both light and dark themes
- Phreak battalion diamond rotation preserved with straight text
- Comprehensive theme integration across all battle overlays
- Clean visual design with improved contrast and readability

### **Map Pan Position Restoration** ✅
- Fixed grid effect resetting coordinates after battle
- Implemented proper pan position restoration
- Added virtual viewport refresh for tile loading
- Map now loads at correct battle location with tiles visible

### **Phase 6: Navigation Behavior Implementation** 🔄 **CURRENT PHASE**
- [x] **✅ Wallet/Financial Screen Centering**: Implemented centering to home/digital barracks when closed
- [x] **✅ TurfScreen Ref System**: Added forwardRef to TurfScreen for parent component access
- [x] **✅ Position Capture Logic**: Implemented position capture for Research Center and Investment Properties
- [ ] **FIX REQUIRED**: Profile, Home, and Digital Barracks should always center on home/digital barracks when closed
- [ ] **FIX REQUIRED**: Research Center should return to last pan position when closed
- [ ] **FIX REQUIRED**: Investment Properties should return to last pan position when closed (already working)

**CURRENT IMPLEMENTATION STATUS:**
- ✅ **FinancialStatementScreen**: Centers on home/digital barracks when closed
- ✅ **InvestmentPropertyScreen**: Returns to last pan position when closed
- ❌ **ProfileScreen**: Currently returns to last pan position (should always center)
- ❌ **HomeScreen**: Currently returns to last pan position (should always center)  
- ❌ **DigitalBarracksScreen**: Currently returns to last pan position (should always center)
- ❌ **ResearchScreen**: Currently returns to last pan position (should return to last pan position - this is correct)

**DESIRED BEHAVIORS:**
1. **FinancialStatementScreen** - when closed returns to home/digital barracks center ✅
2. **ProfileScreen** - when closed goes to home/digital barracks center ❌
3. **HomeScreen** - when closed goes to home/digital barracks center ❌
4. **DigitalBarracksScreen** - when closed goes to home/digital barracks center ❌
5. **ResearchScreen** - when closed returns to last pan position ✅
6. **InvestmentPropertyScreen** - when closed returns to last pan position ✅

**IMPLEMENTATION APPROACH:**
- Use conditional logic in `navigateToScreen` to handle different behaviors
- Home/Barracks/Profile should clear `turfViewPosition` and center
- Research/Investment Properties should restore `turfViewPosition`
- Maintain existing position capture logic for Research and Investment Properties
