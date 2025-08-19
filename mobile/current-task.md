# RESEARCH CENTER BUILDING SYSTEM - CURRENT PRIORITY

## AI Directives
- Check existing files and logic first before creating new code
- Use authorities in coordination with use-existing-first.mdc rules
- Keep under 150 lines for effectiveness
- Update this file after every task

## OVERVIEW
Implementing a complete research center building system with real-time 1-hour timer, database persistence, user balance management, and visual state transitions.

## STATUS: Planning Complete - Ready for Implementation

### BUILDING SYSTEM REQUIREMENTS

**1. Database Timer System (1 hour real-time)**
- **Authority**: Follow existing Bot build queue pattern from `server/server.ts`
- **Model**: Extend User model with `researchCenter` field in `unlockedFeatures`
- **Timer**: Use MongoDB Date fields for persistence across app resets
- **Real-time**: Client polling every 10 seconds (following existing balance/bots pattern)

**2. User Object Structure Extension**
- **Authority**: Follow existing `unlockedFeatures.hackRig` pattern
- **New Field**: `unlockedFeatures.researchCenter: boolean`
- **Default**: `false` (locked until build completes)
- **Update**: Set to `true` when timer reaches 0

**3. Balance Management System**
- **Authority**: Follow existing balance deduction pattern from `server/server.ts`
- **Amount**: $50,000 deduction
- **Validation**: Check sufficient balance before starting build
- **Transaction**: Atomic balance update + build start

**4. Visual State Transitions**
- **Phase 1**: `dirt.png` (clickable, shows popup)
- **Phase 2**: `underConstruction.png` (non-clickable, shows countdown)
- **Phase 3**: `ResearchLvl1.png` (clickable, navigates to Research Screen)

**5. Research Screen Navigation**
- **Authority**: Follow existing screen navigation pattern from `TurfScreen.tsx`
- **New Screen**: `ResearchScreen` with basic "Research Categories and Items" text
- **Integration**: Add to `navigateToScreen` state management

### COMPLETE SYSTEM INTEGRATION FLOW

**Database Layer (MongoDB):**
- **User Collection**: Add `researchCenterBuild: { startedAt: Date, completesAt: Date }` field
- **Build State**: Store start time and completion time for persistence across app resets
- **Unlock Status**: `unlockedFeatures.researchCenter` boolean flag

**Server Layer (Node.js/Express):**
- **API Endpoint**: `POST /api/research-center/build` - Validates balance, deducts $50k, sets timer
- **Timer Service**: Background process checks completion times, updates user unlock status
- **Balance API**: Atomic deduction + build start transaction
- **User Routes**: Extend existing user routes for research center status

**Client Layer (React Native):**
- **Redux Store**: New `researchCenterSlice` with build state, timer, unlock status
- **API Integration**: RTK Query for research center build and status endpoints
- **Timer Polling**: 10-second intervals to check build progress and completion
- **State Management**: Visual transitions based on Redux state changes
- **Navigation**: Screen routing integrated with existing TurfScreen navigation system

**Data Flow Architecture:**
1. **User clicks "Build Research Center"** → Client calls build API
2. **Server validates balance** → Deducts $50k → Sets timer → Returns build state
3. **Client updates Redux** → Shows underConstruction.png → Starts countdown display
4. **Timer polling every 10s** → Checks server for completion status
5. **Server detects completion** → Updates user unlock status → Returns completion
6. **Client receives completion** → Updates Redux → Shows ResearchLvl1.png
7. **User clicks ResearchLvl1** → Navigates to ResearchScreen

### EXISTING AUTHORITIES & PATTERNS

**Database Models:**
- **User Model**: `server/src/models/User.ts` - Extend `unlockedFeatures.researchCenter`
- **Bot Model**: `server/src/models/Bot.ts` - Reference for build queue structure

**Timer Systems:**
- **Bot Build Queue**: `server/server.ts` - Real-time build timer with Date fields
- **Battle Timer**: `server/src/services/BattleTimer.ts` - Countdown management patterns

**Balance Management:**
- **Balance API**: `server/server.ts` - Atomic balance deduction + operation pattern
- **Balance Slice**: `mobile/src/store/slices/balanceSlice.ts` - Client-side balance updates

**Screen Navigation:**
- **TurfScreen**: `mobile/src/screens/TurfScreen.tsx` - Screen state management pattern
- **Screen Types**: Extend `currentScreen` union type to include `'research'`

**Client-Side Patterns:**
- **Polling**: 10-second intervals (following balance/bots pattern)
- **State Management**: Redux slices for research center state
- **API Integration**: RTK Query for server communication

### IMPLEMENTATION PLAN

**Phase 1: Database & Backend (Server)**
1. Extend User model with `researchCenter` field
2. Create research center build API endpoint
3. Implement balance validation and deduction
4. Add build timer with completion callback
5. Update user unlock status on completion

**Phase 2: Client-Side State Management**
1. Create research center Redux slice
2. Add research center API integration
3. Implement real-time timer polling
4. Add visual state management

**Phase 3: UI Components & Navigation**
1. Update ResearchCenterLocation with state transitions
2. Add countdown display during construction
3. Create ResearchScreen component
4. Integrate with TurfScreen navigation

**Phase 4: Testing & Polish**
1. Test balance validation
2. Verify timer persistence across app resets
3. Test visual state transitions
4. Verify navigation flow

### TECHNICAL CONSIDERATIONS

**Performance:**
- Use existing 10-second polling pattern (not real-time WebSocket)
- Implement proper cleanup for timers and intervals
- Use React.memo for performance optimization

**Database:**
- Atomic operations for balance + build start
- Proper indexing for user queries
- Transaction-like behavior for data consistency

**State Management:**
- Single source of truth for research center state
- Proper error handling and loading states
- Optimistic updates for better UX

**Naming Conventions:**
- Follow existing patterns: `researchCenter` (camelCase)
- API endpoints: `/api/research-center/build`
- Redux actions: `startResearchCenterBuild`, `completeResearchCenterBuild`

### NEXT IMMEDIATE ACTION
**Start Phase 1**: Extend User model and create backend build system
- Follow existing Bot build queue pattern
- Implement balance validation and deduction
- Set up 1-hour timer with database persistence

### FILES TO MODIFY

**Server Files:**
- `server/src/models/User.ts` - Add researchCenterBuild timer fields + unlockedFeatures.researchCenter
- `server/server.ts` - Add research center build endpoint and timer completion logic
- `server/src/routes/userRoutes.ts` - Extend for research center status

**Mobile Client Files:**
- `mobile/src/store/slices/researchCenterSlice.ts` - New Redux slice for build state
- `mobile/src/store/api/researchCenterApi.ts` - New RTK Query API integration
- `mobile/src/screens/ResearchScreen.tsx` - New research screen component
- `mobile/src/screens/TurfScreen.tsx` - Add research navigation to currentScreen state
- `mobile/src/components/turf/ResearchCenterLocation.tsx` - Add state transitions and countdown display
- `mobile/src/types/` - Extend types for research center build state

**Integration Points:**
- **Redux Store**: Connect research center state to existing auth and balance slices
- **Navigation**: Integrate with existing TurfScreen screen management
- **API Layer**: Follow existing RTK Query patterns for consistency
- **Timer System**: Use existing Bot build queue patterns for persistence