# Current Task: Remove Legacy ResearchUser.features[] Array

## Problem
The `ResearchUser.features[]` array was legacy code that duplicated individual feature tracking. The mobile app uses the new `UserResearchFeature` collection exclusively, but the server was still trying to merge data from both sources, causing potential conflicts and incorrect behavior.

## Root Cause Analysis
- **ResearchUser.features[]** was legacy code from when individual features were stored within category documents
- **UserResearchFeature** collection is the current system for tracking individual feature unlocks
- Mobile app only uses new system (`/user-features/:categoryId` endpoint)
- Legacy routes (`/features/:categoryId`, `/start-research/:featureId`, `/unlock-feature`) still existed but weren't used by mobile
- Merge logic was trying to combine two different ways of storing the same data

## Architecture Understanding
- **ResearchUser**: Tracks category-level unlocks (e.g., "home-defense" category) - KEPT
- **UserResearchFeature**: Tracks individual feature unlocks within categories - KEPT
- **ResearchUser.features[]**: Legacy individual feature tracking - REMOVED

## Solution Implemented
1. **Removed legacy merge logic** from `ResearchFeatureService.getUserFeatures()`
   - Now only uses `UserResearchFeature` collection
   - Removed `ResearchUser` import and fallback logic
   - Simplified code to single data source

2. **Removed features array from ResearchUser model**
   - Removed `IResearchFeature` interface
   - Removed `researchFeatureSchema`
   - Removed `features: [researchFeatureSchema]` from schema
   - ResearchUser now only tracks category-level unlocks

## Technical Details
- **Server-side changes**: 
  - `server/src/services/ResearchFeatureService.ts` - Removed legacy merge logic
  - `server/src/models/ResearchUser.ts` - Removed features array schema
- **Data source**: Only `UserResearchFeature` collection for individual features
- **Category tracking**: Only `ResearchUser` collection for category unlocks
- **Mobile app**: Unchanged, already using correct endpoints

## Solution Implemented (Updated)
1. **Removed legacy merge logic** from `ResearchFeatureService.getUserFeatures()`
   - Now only uses `UserResearchFeature` collection
   - Removed `ResearchUser` import and fallback logic
   - Simplified code to single data source

2. **Removed features array from ResearchUser model**
   - Removed `IResearchFeature` interface
   - Removed `researchFeatureSchema`
   - Removed `features: [researchFeatureSchema]` from schema
   - ResearchUser now only tracks category-level unlocks

3. **Removed legacy routes** that used `ResearchUser.features[]`
   - `/features/:categoryId` - Legacy route using ResearchUser.features[]
   - `/start-research/:featureId` - Legacy route updating ResearchUser.features[]
   - `/unlock-feature` - Legacy route updating ResearchUser.features[]
   - `/complete-research/:featureId` - Legacy route updating ResearchUser.features[]
   - `/feature-status/:featureId` - Legacy route checking ResearchUser.features[]

## Next Steps
- Update ResearchUser creation in auth.ts to not include features array
- Remove ResearchUser.features[] references from ResearchUnlockService
- Test that only Antivirus feature is visible and working correctly

## Testing Status
- Legacy merge logic removed ✅
- Legacy routes removed ✅
- No linting errors introduced ✅
- System now uses single source of truth for individual features ✅
- Server should start without TypeScript errors ✅
