# Current Task: Security Fix - Database Credentials Hardcoded in Backup Scripts

## Priority: Security - Critical Vulnerability Fixed

**STATUS**: ✅ COMPLETED - Database credentials removed from scripts

## Problem
The `autoBackup.sh` script contained hardcoded MongoDB database credentials, creating a security vulnerability where sensitive database access information was exposed in the repository.

## Solution Implemented
1. ✅ **Removed hardcoded credentials** from `autoBackup.sh`
2. ✅ **Updated `backupRestore.js`** to generate secure scripts
3. ✅ **Added environment variable validation** with clear error messages
4. ✅ **Updated scripts to use existing `env.staging`** configuration
5. ✅ **Updated documentation** with security best practices

## Files Modified
- `server/scripts/autoBackup.sh` - Removed hardcoded MONGODB_URI, updated to use env.staging
- `server/scripts/backupRestore.js` - Updated to generate secure backup scripts using env.staging
- `server/scripts/README.md` - Added security documentation and usage instructions for env.staging

## Security Features Now in Place
- ✅ No hardcoded credentials in any scripts
- ✅ Environment variable validation with clear error messages
- ✅ Automatic .env file loading
- ✅ Gitignore protection for sensitive files
- ✅ Clear setup instructions for users

---

# Current Task: Hacker Map Navigation Icon Implementation

## Priority: User Experience - Map Navigation Enhancement

**STATUS**: ✅ COMPLETED - Navigation icon added to center map on user's home

## Problem
Users need a quick way to navigate back to their position on the hacker map, especially when they've panned away from their home location.

## Solution Implemented
1. ✅ **Added navigation function** `centerOnUserHome` that finds user's house and centers map
2. ✅ **Added navigation button** with home icon (⌂) positioned at top-left of screen
3. ✅ **Implemented proper clamping** to respect map boundaries when centering
4. ✅ **Used free text-based icon** to avoid copyright/licensing issues
5. ✅ **Upgraded to MaterialIcons** for professional appearance

## Features
- **Icon**: Professional MaterialIcons home icon - no copyright concerns
- **Position**: Top-left corner, above other UI elements
- **Functionality**: Centers map on user's home location with boundary clamping
- **Styling**: Consistent with existing UI (primary color background, white icon)
- **Accessibility**: High z-index to ensure it's always clickable

## Files Modified
- `mobile/src/screens/HackMapScreen.tsx` - Added navigation button and centering function

## Technical Implementation
- **Function**: `centerOnUserHome` callback that searches grid for user's house
- **Positioning**: Calculates target coordinates and applies boundary clamping
- **Animation**: Uses existing `offsetX` and `offsetY` shared values for smooth movement
- **Window Update**: Calls `computeWindow` to update visible cells after centering

## Next Steps
1. Test the navigation icon functionality
2. Verify it works correctly from all map positions
3. Consider adding visual feedback (e.g., brief highlight) when centering

---

# Current Task: Profile Gender Selection Implementation - Database Persistence

## Priority: User Experience - Profile Customization with Persistence

**STATUS**: ✅ COMPLETED - Gender selection with database persistence implemented

## Problem
Users need the ability to choose between male and female profile avatars that persist through application refreshes and restarts.

## Solution Implemented
1. ✅ **Created preferences slice** to store user preferences including profile gender
2. ✅ **Added gender toggle** in ProfileScreen settings section
3. ✅ **Updated ProfileLocation component** to dynamically use selected gender image
4. ✅ **Integrated with existing store** structure
5. ✅ **Added database persistence** to User model and API endpoints
6. ✅ **Implemented automatic sync** between local state and database

## Features
- **Gender Selection**: Toggle between male (👨) and female (👩) profile avatars
- **Settings Integration**: Added to existing ProfileScreen settings tab
- **Dynamic Images**: ProfileLocation automatically updates based on selection
- **Database Persistence**: Gender preference stored in MongoDB User document
- **Automatic Sync**: Preferences loaded from database on login/app restart
- **Visual Feedback**: Clear icons and text indicating current selection

## Files Created/Modified

### **New Files**:
- `mobile/src/store/slices/preferencesSlice.ts` - New slice for user preferences
- `mobile/src/store/api/preferencesApi.ts` - API for updating user preferences

### **Updated Files**:
- `mobile/src/store/index.ts` - Added preferences slice and API to store
- `mobile/src/components/turf/ProfileLocation.tsx` - Dynamic profile image selection
- `mobile/src/screens/ProfileScreen.tsx` - Added gender toggle with API integration
- `mobile/src/store/slices/authSlice.ts` - Added preferences sync on login/load
- `server/src/models/User.ts` - Added profileGender field to User model
- `server/src/routes/userRoutes.ts` - Added preferences update endpoint and profile endpoint update

## Technical Implementation
- **Database Schema**: Added profileGender field to User model with enum validation
- **API Endpoints**: 
  - PUT `/api/users/preferences` for updating preferences
  - Updated GET `/api/users/profile` to include profileGender
- **State Management**: Redux preferences slice with automatic database sync
- **Authentication Flow**: Preferences loaded from database on login and app restart
- **Error Handling**: Graceful fallback to default 'male' if database field missing

## Database Changes
- **New Field**: `profileGender: { type: String, enum: ['male', 'female'], default: 'male' }`
- **Backward Compatibility**: Existing users without profileGender will default to 'male'
- **Validation**: Server-side validation ensures only valid values are stored

## Next Steps
1. ✅ **FIXED**: Resolved circular dependency issue in auth slice
2. ✅ **FIXED**: Added robust preferences syncing from AppContent
3. Test the complete gender selection with database persistence
4. Verify preferences survive app restarts and refreshes
5. Consider adding more profile customization options
6. Test with existing users to ensure backward compatibility

## Technical Fixes Applied
- **Circular Dependency**: Removed preferences import from auth slice
- **Robust Syncing**: Added preferences sync in AppContent with proper timing
- **Dual Sync Strategy**: 
  - Sync from AsyncStorage after auth loads
  - Sync from user data when profile changes
- **Timing Fix**: Added small delay to ensure store initialization

---

# Previous Task: Turf Intro System Implementation - Digital Barracks Step

## Priority: User Experience - Onboarding Enhancement

**STATUS**: ✅ COMPLETED - Digital Barracks step implemented

## Problem
Need to create a Turf Intro system that highlights specific locations in sequence after the initial slideshow completes, providing guided tour of the Turf.

## Requirements
1. **Trigger**: After current slideshow completes (first Turf visit)
2. **First Intro**: Dark overlay with Home Location highlighted + explanatory text
3. **Second Intro**: Digital Barracks highlighted + explanatory text
4. **Features**: 
   - Dark opaque overlay except on highlighted areas
   - Skip button at top right
   - Pan view moves to appropriate locations
   - One-time events, skippable
   - Text: "This is your Home on your Turf. It's where you can build a digital bot army and access your hack rig to see other players and new enemies on a map."
   - Text: "This is your Digital Barracks. Here you can train and manage your bot army, upgrade their capabilities, and prepare for battles."

## Implementation Plan - Fresh Start
1. ✅ **Phase 1**: Add turf intro state to auth slice
2. ✅ **Phase 2**: Create simple TurfIntroText component (keeping what user liked)
3. ✅ **Phase 3**: Create main TurfIntro component with centering logic
4. ✅ **Phase 4**: Integrate into TurfScreen
5. ✅ **Phase 5**: Fix overlay to not cover Home Location
6. ✅ **Phase 6**: Implement Digital Barracks intro step with pan positioning

## Files Created/Modified

### **New Components**:
- `mobile/src/components/turf-intro/TurfIntro.tsx` - Main intro component with multi-step support
- `mobile/src/components/turf-intro/TurfIntroText.tsx` - Text component with dynamic button text
- `mobile/src/components/turf-intro/index.ts` - Export file

### **Updated Files**:
- `mobile/src/store/slices/authSlice.ts` - Added turfIntroCompleted state
- `mobile/src/screens/TurfScreen.tsx` - Integrated Turf Intro system

## Current Status
✅ **COMPLETED** - Digital Barracks step implemented:
- ✅ Component architecture created with simplified approach
- ✅ Text component positioned on right side as user preferred
- ✅ Turf centering using exact same logic as profile closing
- ✅ Dark overlay covering screen with Home Location window
- ✅ **NEW**: Digital Barracks step added when Continue is clicked
- ✅ **NEW**: Pan position adjusts to show Digital Barracks in overlay window
- ✅ **NEW**: Dynamic button text (Continue → Complete)
- ✅ **NEW**: Step-based text content for each location

## Technical Notes
- Uses existing onboarding state management
- Integrates with current auth slice structure
- Follows existing component patterns
- Maintains single source of truth for intro state
- **NEW**: Uses exact same centering logic as profile closing (`CENTER_X = (2000 - SCREEN_WIDTH) / 2`)
- **NEW**: Multi-step intro with state management (`currentStep` state)
- **NEW**: Dynamic pan positioning for each step
- **NEW**: Configurable button text for different steps
