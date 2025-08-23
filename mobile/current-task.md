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

### **Phase 1: Build Empty Space and Image** 
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
- [x] **PHASE 1 COMPLETE**: All visual components implemented and positioned with proper layout

### **Phase 2: Modal Popup Implementation**
- [ ] Add modal popup to `RentalHousingLocation.tsx` component
- [ ] Implement build confirmation dialog with $100,000 cost display
- [ ] Add "Build Rental Housing" button (initially disabled)
- [ ] Style modal to match Research Center pattern

### **Phase 3: Funds Validation**
- [ ] Integrate balance checking from `useFetchBalanceQuery`
- [ ] Disable build button if insufficient funds (< $100,000)
- [ ] Show appropriate error messages for insufficient balance
- [ ] Enable build button only when user has sufficient funds

### **Phase 4: Database Integration & Initial Testing**
- [ ] Add server-side API endpoints:
  - `GET /api/users/rental-housing-status` - Check build status
  - `POST /api/users/unlock-rental-housing` - Start build process
- [ ] Update User model with `rentalHousingBuild` schema
- [ ] Implement balance deduction and build timer logic
- [ ] Add client-side API hooks in `authApi.ts`
- [ ] Integrate API calls in component
- [ ] **PROGRESSION CHECK**: Test with 1-minute timer to verify database unlock works before extending to 2 hours

### **Phase 5: 1-Minute Countdown Timer**
- [ ] Implement countdown timer using `BuildCountdownTimer` component
- [ ] Test timer functionality with 1-minute build time
- [ ] Verify timer completion triggers status update
- [ ] Ensure image transitions from under construction to completed
- [ ] **VERIFICATION**: Confirm database unlock process works correctly with short timer

### **Phase 6: Extend to 2-Hour Build**
- [ ] Update build time from 1 minute to 2 hours (120 minutes)
- [ ] Test extended timer functionality
- [ ] Verify proper time formatting (hours:minutes:seconds)
- [ ] Ensure timer persists across app restarts
- [ ] **FINAL IMPLEMENTATION**: Full 2-hour build process now active

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
