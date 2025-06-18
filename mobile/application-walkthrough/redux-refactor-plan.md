# Redux Refactoring Plan for Rising Punk Mobile App

## Table of Contents
- [Executive Summary](#executive-summary)
- [Current State Analysis](#current-state-analysis)
  - [Stateful Components Inventory](#stateful-components-inventory)
  - [API Call Locations](#api-call-locations)
  - [Existing Context Providers](#existing-context-providers)
  - [Current State Management Patterns](#current-state-management-patterns)
- [Redux vs Alternatives](#redux-vs-alternatives)
- [Proposed Redux Architecture](#proposed-redux-architecture)
  - [Store Structure](#store-structure)
  - [Slice Definitions](#slice-definitions)
  - [State Shape](#state-shape)
- [State Categorization](#state-categorization)
  - [Global State (Redux)](#global-state-redux)
  - [Local State (Component)](#local-state-component)
- [Migration Plan](#migration-plan)
  - [Phase 0: Setup and Installation](#phase-0-setup-and-installation)
  - [Phase 1: Core Infrastructure](#phase-1-core-infrastructure)
  - [Phase 2: Auth Slice Migration](#phase-2-auth-slice-migration)
  - [Phase 3: Balance Slice Migration](#phase-3-balance-slice-migration)
  - [Phase 4: Bots Slice Migration](#phase-4-bots-slice-migration)
  - [Phase 5: Battle Slice Migration](#phase-5-battle-slice-migration)
  - [Phase 6: UI State Migration](#phase-6-ui-state-migration)
  - [Phase 7: Cleanup and Optimization](#phase-7-cleanup-and-optimization)
- [Implementation Guidelines](#implementation-guidelines)
- [Testing Strategy](#testing-strategy)
- [Future Considerations](#future-considerations)

## Executive Summary

This document outlines a comprehensive plan to migrate the Rising Punk mobile app from Context API to Redux Toolkit. The migration will be done in phases to ensure minimal disruption while improving state management, debugging capabilities, and scalability.

**Key Benefits:**
- Centralized state management with better debugging via Redux DevTools
- Improved performance through selective subscriptions
- Better separation of concerns with API logic in thunks
- Easier testing and maintenance
- Time-travel debugging for complex battle states

## Current State Analysis

### Stateful Components Inventory

#### Screen Components with Local State
1. **LoginScreen** (`src/screens/LoginScreen.tsx`)
   - `formData` - login/register form data
   - Makes API calls directly in component

2. **TurfScreen** (`src/screens/TurfScreen.tsx`)
   - `currentScreen` - navigation state within turf

3. **BotAssemblyScreen** (`src/screens/BotAssemblyScreen.tsx`)
   - `quantity` - bot build quantity input

4. **BattleScreen** (`src/screens/BattleScreen.tsx`)
   - `timeRemaining` - battle timer
   - `showResults` - results modal visibility
   - `battleStarted` - battle state flag
   - `countdown` - pre-battle countdown

5. **BattlePreparationScreen** (`src/screens/BattlePreparationScreen.tsx`)
   - `selectorVisible` - modal visibility
   - Makes API calls for bot fetching

6. **HackMapScreen** (`src/screens/HackMapScreen.tsx`)
   - `loading` - loading state
   - `isLegendExpanded` - UI toggle state
   - Makes API calls for map data

#### Component-Level State
1. **HackRigDisplay** (`src/components/home/HackRigDisplay.tsx`)
   - `isAlertOpen` - alert dialog state

2. **BattalionBotSelector** (`src/components/battle/BattalionBotSelector/index.tsx`)
   - `quantity` - battalion assignment quantity

3. **NetworkNode** (`src/components/battle/NetworkNode.tsx`)
   - `currentProgress` - node capture progress

### API Call Locations

#### Direct API Calls in Components
1. **LoginScreen** - `api.login()`, `api.register()`
2. **HackMapScreen** - `fetch(/map/main)`
3. **BattlePreparationScreen** - `fetch(/api/bots)`

#### API Calls in Contexts
1. **AuthContext**
   - `fetch(/users/unlock-hack-rig)`
   
2. **BalanceContext**
   - `fetch(/api/balance)`
   
3. **BotsContext**
   - `fetch(/api/bots)`
   - `fetch(/api/bots/build-state)`
   - `fetch(/api/balance/deduct)`
   - `fetch(/api/bots/build)`
   - `fetch(/api/battalions/assign)`

### Existing Context Providers

1. **AuthContext** (`src/context/AuthContext.tsx`)
   - State: token, user, isLoading
   - Actions: login, logout, unlockHackRig
   - Persistence: AsyncStorage

2. **BalanceContext** (`src/context/BalanceContext.tsx`)
   - State: balance, ratePerSecond, lastUpdated
   - Actions: subtractFromBalance, addToBalance
   - Features: Real-time balance calculation

3. **BotsContext** (`src/context/BotsContext.tsx`)
   - State: botCounts, deployedCounts, buildingProgress, buildQueue
   - Actions: startBuilding, assignToBattalion, selectBotType
   - Features: Build queue polling, battalion assignments

4. **BattleContext** (`src/contexts/BattleContext.tsx`)
   - Uses useReducer pattern already!
   - State: battalions, nodes, gameState
   - Actions: Various battle actions via dispatch

### Current State Management Patterns

1. **Context + useState** - Most common pattern
2. **Context + useReducer** - Used in BattleContext
3. **Local useState** - For UI-only state
4. **AsyncStorage** - For persistence (auth tokens)
5. **Polling** - For real-time updates (bot building)

## Redux vs Alternatives

### Why Redux Toolkit?

**Pros:**
- Industry standard with excellent tooling
- Redux DevTools for debugging
- RTK Query for API caching/management
- Excellent TypeScript support
- Battle-tested in production
- Great for complex state like battles

**Cons:**
- More boilerplate than Context API
- Learning curve for team
- Overkill for simple state

### Alternatives Considered

1. **Zustand** - Simpler but less tooling
2. **MobX** - Different paradigm, less common
3. **Valtio** - Too new, less ecosystem
4. **Keep Context API** - Current performance issues

**Decision: Redux Toolkit** for its maturity, tooling, and RTK Query.

## Proposed Redux Architecture

### Store Structure

```
store/
├── index.ts           # Store configuration
├── hooks.ts           # Typed hooks
├── slices/
│   ├── authSlice.ts
│   ├── balanceSlice.ts
│   ├── botsSlice.ts
│   ├── battleSlice.ts
│   ├── uiSlice.ts
│   └── mapSlice.ts
├── api/
│   ├── authApi.ts     # RTK Query API
│   ├── botsApi.ts
│   ├── balanceApi.ts
│   ├── battleApi.ts
│   └── mapApi.ts
└── middleware/
    └── storage.ts     # AsyncStorage sync
```

### Slice Definitions

#### 1. Auth Slice
```typescript
{
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}
```

#### 2. Balance Slice
```typescript
{
  total: number;
  ratePerSecond: number;
  lastUpdated: string;
  isLoading: boolean;
}
```

#### 3. Bots Slice
```typescript
{
  counts: Record<BotType, number>;
  deployedCounts: Record<BotType, number>;
  buildQueue: BuildQueue | null;
  selectedType: BotType | null;
  assignments: Record<string, BattalionAssignment>;
}
```

#### 4. Battle Slice
```typescript
{
  battalions: Battalion[];
  nodes: Node[];
  gameState: 'preparing' | 'countdown' | 'active' | 'ended';
  timeRemaining: number;
  winner: string | null;
}
```

#### 5. UI Slice
```typescript
{
  modals: {
    hackRigAlert: boolean;
    battleResults: boolean;
    botSelector: boolean;
  };
  screens: {
    currentTurfScreen: string;
  };
  map: {
    legendExpanded: boolean;
  };
}
```

#### 6. Map Slice
```typescript
{
  grid: GridData | null;
  selectedCell: CellData | null;
  isLoading: boolean;
  error: string | null;
}
```

### State Shape

```typescript
type RootState = {
  auth: AuthState;
  balance: BalanceState;
  bots: BotsState;
  battle: BattleState;
  ui: UIState;
  map: MapState;
  // RTK Query reducers
  authApi: AuthApiState;
  botsApi: BotsApiState;
  balanceApi: BalanceApiState;
  battleApi: BattleApiState;
  mapApi: MapApiState;
};
```

## State Categorization

### Global State (Redux)

**User/Session State:**
- Authentication (token, user)
- Balance information
- Bot inventory
- Battle state

**Server State (via RTK Query):**
- API responses
- Cached data
- Loading states
- Error states

**App-Wide UI State:**
- Modal visibility
- Current navigation state
- Global notifications

### Local State (Component)

**Form State:**
- Input values
- Validation errors
- Form submission state

**Ephemeral UI State:**
- Hover states
- Animation states
- Temporary toggles

**Component-Specific:**
- Scroll positions
- Accordion states
- Tab selections

## Migration Plan

### Phase 0: Setup and Installation

**Objective:** Install Redux dependencies and create basic store structure

**Steps:**
1. Install dependencies:
   ```bash
   npm install @reduxjs/toolkit react-redux
   npm install --save-dev @types/react-redux
   ```

2. Create store structure:
   - `/src/store/index.ts` - Configure store
   - `/src/store/hooks.ts` - Typed hooks
   - `/src/store/slices/` - Empty directory

3. Wrap app with Provider:
   - Update `App.tsx` with Redux Provider
   - Keep existing Context providers for now

4. Setup Redux DevTools:
   - Configure for development
   - Add Flipper integration for React Native

**Deliverables:**
- Empty Redux store running alongside contexts
- DevTools connected and working
- No functional changes to app

**Time Estimate:** 2-3 hours

**🔍 VERIFICATION CHECKPOINT - Phase 0**

**Manual Testing Steps:**
1. **App Launch Test:**
   - [ ] App launches without errors
   - [ ] No console errors related to Redux
   - [ ] All existing functionality works as before

2. **Redux DevTools Verification:**
   - [ ] Open Redux DevTools in browser (if using web)
   - [ ] Verify store is connected and shows initial state
   - [ ] Check that DevTools shows "No actions yet" on app start

3. **Context Compatibility Test:**
   - [ ] Login functionality still works
   - [ ] Balance displays correctly
   - [ ] Bot assembly screen works
   - [ ] All existing contexts still function

4. **Build Verification:**
   - [ ] `npm run ios` works without errors
   - [ ] `npm run android` works without errors
   - [ ] Metro bundler starts successfully

**Success Criteria:**
- ✅ App functions identically to before Redux installation
- ✅ Redux DevTools shows empty store
- ✅ No TypeScript compilation errors
- ✅ All existing contexts still work

**If Issues Found:**
- Check package.json for correct dependencies
- Verify Provider wrapping in App.tsx
- Check for import/export errors in store files
- Ensure no conflicts with existing context providers

---

### Phase 1: Core Infrastructure

**Objective:** Create reusable patterns and utilities

**Steps:**
1. Create typed hooks:
   ```typescript
   // store/hooks.ts
   export const useAppDispatch = () => useDispatch<AppDispatch>();
   export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
   ```

2. Setup AsyncStorage middleware:
   - Create persistence middleware
   - Handle rehydration

3. Create API base configuration:
   - Setup RTK Query base API
   - Configure auth headers
   - Add error handling

4. Create first UI slice as test:
   - Migrate `isLegendExpanded` from HackMapScreen
   - Verify DevTools show state changes

**Deliverables:**
- Working Redux patterns
- One piece of state migrated
- Persistence middleware ready

**Time Estimate:** 3-4 hours

**🔍 VERIFICATION CHECKPOINT - Phase 1**

**Manual Testing Steps:**
1. **TypeScript Compilation:**
   - [ ] No TypeScript errors in store files
   - [ ] Hooks are properly typed
   - [ ] Store configuration compiles

2. **UI Slice Migration Test:**
   - [ ] Navigate to Hack Map Screen
   - [ ] Tap "LEGEND [+]" button
   - [ ] Verify legend expands/collapses
   - [ ] Check Redux DevTools shows state changes
   - [ ] Verify legend state persists during navigation

3. **Redux DevTools Verification:**
   - [ ] Open DevTools and navigate to Hack Map
   - [ ] Toggle legend and see actions dispatched
   - [ ] Verify state shape matches expected structure
   - [ ] Check action names are descriptive

4. **Persistence Test:**
   - [ ] Toggle legend state
   - [ ] Close and reopen app
   - [ ] Verify legend state is restored
   - [ ] Check AsyncStorage for persisted data

5. **API Base Configuration:**
   - [ ] Check network requests still work
   - [ ] Verify auth headers are included
   - [ ] Test error handling with network issues

**Success Criteria:**
- ✅ Legend toggle works via Redux
- ✅ DevTools shows clear action names and state changes
- ✅ State persists across app restarts
- ✅ No breaking changes to existing functionality

**If Issues Found:**
- Check Redux DevTools for action dispatching
- Verify selector is properly connected to component
- Check AsyncStorage implementation
- Ensure no conflicts with existing legend state

---

### Phase 2: Auth Slice Migration

**Objective:** Migrate AuthContext to Redux

**Steps:**
1. Create authSlice:
   - State: token, user, isLoading
   - Reducers: setCredentials, logout
   - Async thunks: unlockHackRig

2. Create authApi with RTK Query:
   - Login mutation
   - Register mutation
   - Profile query

3. Update LoginScreen:
   - Use Redux hooks instead of context
   - Use RTK Query mutations

4. Create compatibility layer:
   - Keep AuthContext as wrapper
   - Use Redux state internally
   - Allows gradual migration

5. Update all auth consumers:
   - Replace useAuth with useAppSelector
   - Update one screen at a time

**Deliverables:**
- Auth fully in Redux
- AuthContext wraps Redux for compatibility
- Login/logout working via Redux

**Time Estimate:** 4-5 hours

**🔍 VERIFICATION CHECKPOINT - Phase 2**

**Manual Testing Steps:**
1. **Login Flow Test:**
   - [ ] Navigate to Login Screen
   - [ ] Enter valid credentials
   - [ ] Submit login form
   - [ ] Verify successful login and navigation
   - [ ] Check Redux DevTools for login actions

2. **Logout Flow Test:**
   - [ ] Navigate to Profile Screen
   - [ ] Tap "DISCONNECT" button
   - [ ] Verify logout and redirect to Login
   - [ ] Check Redux DevTools for logout actions

3. **Token Persistence Test:**
   - [ ] Login successfully
   - [ ] Close app completely
   - [ ] Reopen app
   - [ ] Verify still logged in
   - [ ] Check AsyncStorage for token

4. **Auth State Verification:**
   - [ ] Check Redux DevTools for auth state
   - [ ] Verify user object structure
   - [ ] Confirm token is stored
   - [ ] Check isLoading states

5. **Error Handling Test:**
   - [ ] Try login with invalid credentials
   - [ ] Verify error state is handled
   - [ ] Check error messages display correctly
   - [ ] Test network failure scenarios

6. **Compatibility Layer Test:**
   - [ ] Verify all screens still work
   - [ ] Check that existing useAuth calls work
   - [ ] Confirm no breaking changes

**Success Criteria:**
- ✅ Login/logout works via Redux
- ✅ Auth state persists across app restarts
- ✅ Redux DevTools shows auth actions and state
- ✅ All existing auth functionality preserved
- ✅ Error handling works correctly

**If Issues Found:**
- Check Redux DevTools for auth state structure
- Verify RTK Query mutations are working
- Check AsyncStorage for token persistence
- Ensure compatibility layer is properly implemented

---

### Phase 3: Balance Slice Migration

**Objective:** Migrate BalanceContext to Redux

**Steps:**
1. Create balanceSlice:
   - State: total, ratePerSecond, lastUpdated
   - Reducers: updateBalance, setRate
   - Computed selector: getCurrentBalance

2. Create balanceApi:
   - Fetch balance query
   - Use polling for real-time updates

3. Migrate balance calculation logic:
   - Move time-based calculation to selector
   - Keep same update frequency

4. Update balance consumers:
   - Home screen
   - Bot assembly
   - Profile screen

**Deliverables:**
- Balance in Redux with real-time updates
- All screens showing correct balance
- BalanceContext removed

**Time Estimate:** 3-4 hours

**🔍 VERIFICATION CHECKPOINT - Phase 3**

**Manual Testing Steps:**
1. **Balance Display Test:**
   - [ ] Navigate to Home Screen
   - [ ] Verify balance displays correctly
   - [ ] Check balance updates in real-time
   - [ ] Navigate to other screens and verify balance consistency

2. **Real-time Updates Test:**
   - [ ] Watch balance for 30+ seconds
   - [ ] Verify balance increases at correct rate
   - [ ] Check Redux DevTools for balance updates
   - [ ] Test with different rate values

3. **Balance Calculation Test:**
   - [ ] Note current balance and time
   - [ ] Wait 10 seconds
   - [ ] Verify balance increased by (rate * 10)
   - [ ] Check calculation accuracy

4. **Cross-Screen Consistency:**
   - [ ] Navigate between Home, Bot Assembly, Profile
   - [ ] Verify balance shows same value everywhere
   - [ ] Check no duplicate API calls
   - [ ] Test balance updates propagate to all screens

5. **API Integration Test:**
   - [ ] Check network tab for balance API calls
   - [ ] Verify polling frequency is correct
   - [ ] Test with network interruptions
   - [ ] Check error handling

6. **Balance Deduction Test:**
   - [ ] Go to Bot Assembly Screen
   - [ ] Build some bots
   - [ ] Verify balance decreases correctly
   - [ ] Check balance updates immediately

**Success Criteria:**
- ✅ Balance displays correctly on all screens
- ✅ Real-time updates work at correct rate
- ✅ Balance calculations are accurate
- ✅ Redux DevTools shows balance state changes
- ✅ No duplicate API calls or state inconsistencies

**If Issues Found:**
- Check Redux DevTools for balance state structure
- Verify polling configuration in RTK Query
- Check selector calculations for accuracy
- Ensure no race conditions in balance updates

---

### Phase 4: Bots Slice Migration

**Objective:** Migrate BotsContext to Redux (most complex)

**Steps:**
1. Create botsSlice:
   - State: counts, deployedCounts, buildQueue
   - Reducers: updateCounts, updateBuildProgress
   - Complex thunks: startBuilding, assignToBattalion

2. Create botsApi:
   - Fetch bots query
   - Build mutation
   - Assign battalion mutation
   - Build status polling

3. Handle build queue polling:
   - Use RTK Query polling
   - Or create custom middleware

4. Migrate bot assembly screen:
   - Use new Redux state
   - Test building functionality

5. Migrate battle preparation:
   - Battalion assignments via Redux
   - Test assignment flow

**Deliverables:**
- Complete bot system in Redux
- Building and assignments working
- BotsContext removed

**Time Estimate:** 6-8 hours

**🔍 VERIFICATION CHECKPOINT - Phase 4**

**Manual Testing Steps:**
1. **Bot Assembly Flow Test:**
   - [ ] Navigate to Bot Assembly Screen
   - [ ] Select a bot type (breacher, guardian, phreak)
   - [ ] Enter quantity and tap BUILD
   - [ ] Verify build starts and progress bar appears
   - [ ] Check Redux DevTools for build actions

2. **Build Progress Test:**
   - [ ] Start a build
   - [ ] Watch progress bar for 10+ seconds
   - [ ] Verify progress updates smoothly
   - [ ] Check build completes and bot count increases
   - [ ] Verify balance decreases correctly

3. **Build Queue Polling Test:**
   - [ ] Start multiple builds
   - [ ] Navigate away and back to Bot Assembly
   - [ ] Verify build progress is maintained
   - [ ] Check polling continues in background

4. **Battle Preparation Test:**
   - [ ] Navigate to Battle Preparation Screen
   - [ ] Tap on Battalion A or B
   - [ ] Select bots and assign quantity
   - [ ] Verify assignment is saved
   - [ ] Check deployed counts update correctly

5. **Bot Counts Accuracy Test:**
   - [ ] Note initial bot counts
   - [ ] Build some bots
   - [ ] Assign bots to battalions
   - [ ] Verify available counts = total - deployed
   - [ ] Check counts are consistent across screens

6. **Error Handling Test:**
   - [ ] Try to build more bots than balance allows
   - [ ] Verify error handling works
   - [ ] Test with network failures
   - [ ] Check error states are handled gracefully

7. **State Persistence Test:**
   - [ ] Build bots and assign to battalions
   - [ ] Close and reopen app
   - [ ] Verify bot counts and assignments persist
   - [ ] Check build queue state is maintained

**Success Criteria:**
- ✅ Bot building works end-to-end
- ✅ Build progress updates in real-time
- ✅ Battalion assignments work correctly
- ✅ Bot counts are accurate across all screens
- ✅ Redux DevTools shows all bot-related actions
- ✅ State persists across app restarts

**If Issues Found:**
- Check Redux DevTools for bot state structure
- Verify RTK Query polling configuration
- Check build queue state management
- Ensure no race conditions in bot operations

---

### Phase 5: Battle Slice Migration

**Objective:** Enhance existing BattleContext pattern

**Steps:**
1. Move BattleContext reducer to Redux:
   - Keep same reducer logic
   - Add to Redux store

2. Create battleApi:
   - Start battle mutation
   - Get battle state query

3. Add battle middleware:
   - Handle real-time updates
   - Manage battle timer

4. Update BattleScreen:
   - Use Redux instead of context
   - Keep same component structure

5. Add DevTools integration:
   - Time-travel debugging for battles
   - Action replay capability

**Deliverables:**
- Battle system in Redux
- DevTools showing battle flow
- Better debugging capabilities

**Time Estimate:** 4-5 hours

**🔍 VERIFICATION CHECKPOINT - Phase 5**

**Manual Testing Steps:**
1. **Battle Preparation to Battle Flow:**
   - [ ] Assign bots to battalions in Battle Preparation
   - [ ] Tap "DEPLOY PURGE" button
   - [ ] Verify transition to Battle Screen
   - [ ] Check Redux DevTools for battle start action

2. **Battle Countdown Test:**
   - [ ] Start a battle
   - [ ] Watch countdown from 3 to 0
   - [ ] Verify battle starts when countdown reaches 0
   - [ ] Check Redux DevTools for countdown actions

3. **Battle Progress Test:**
   - [ ] Let battle run for 30+ seconds
   - [ ] Verify battalions move and fight
   - [ ] Check node capture mechanics work
   - [ ] Verify battle timer counts down correctly

4. **Battle State Management Test:**
   - [ ] Navigate away during battle
   - [ ] Return to battle screen
   - [ ] Verify battle state is maintained
   - [ ] Check no duplicate battles started

5. **Battle Results Test:**
   - [ ] Let battle complete
   - [ ] Verify results overlay appears
   - [ ] Check winner determination works
   - [ ] Verify navigation back to previous screen

6. **DevTools Time-Travel Test:**
   - [ ] Start a battle
   - [ ] Open Redux DevTools
   - [ ] Use time-travel to go back in battle history
   - [ ] Verify battle state changes correctly
   - [ ] Test action replay functionality

7. **Battle Performance Test:**
   - [ ] Monitor frame rate during battle
   - [ ] Check for memory leaks
   - [ ] Verify smooth animations
   - [ ] Test with multiple battles

**Success Criteria:**
- ✅ Battle flow works end-to-end
- ✅ Battle state is properly managed in Redux
- ✅ DevTools shows detailed battle actions
- ✅ Time-travel debugging works
- ✅ Battle performance is maintained
- ✅ No state corruption during navigation

**If Issues Found:**
- Check Redux DevTools for battle state structure
- Verify battle middleware is working correctly
- Check for memory leaks in battle components
- Ensure battle timer logic is accurate

---

### Phase 6: UI State Migration

**Objective:** Consolidate remaining UI state

**Steps:**
1. Create comprehensive uiSlice:
   - Modal states
   - Screen navigation states
   - Loading states
   - Error messages

2. Migrate component local states:
   - HackMapScreen legend state ✓ (done in Phase 1)
   - TurfScreen current screen
   - Modal visibilities

3. Create UI selectors:
   - isAnyModalOpen
   - getCurrentScreen
   - getActiveModals

4. Update all UI state consumers:
   - Replace useState with Redux
   - Keep truly local state local

**Deliverables:**
- All shared UI state in Redux
- Consistent modal management
- Clean component code

**Time Estimate:** 3-4 hours

**🔍 VERIFICATION CHECKPOINT - Phase 6**

**Manual Testing Steps:**
1. **Modal Management Test:**
   - [ ] Open various modals across the app
   - [ ] Verify modals open/close correctly
   - [ ] Check no multiple modals open simultaneously
   - [ ] Test modal state persistence during navigation

2. **Screen Navigation Test:**
   - [ ] Navigate between all screens
   - [ ] Verify current screen state is tracked
   - [ ] Check navigation state persists correctly
   - [ ] Test deep linking scenarios

3. **Loading States Test:**
   - [ ] Trigger loading states (login, bot building, etc.)
   - [ ] Verify loading indicators appear/disappear
   - [ ] Check loading states don't conflict
   - [ ] Test loading state cleanup

4. **Error Message Test:**
   - [ ] Trigger various error scenarios
   - [ ] Verify error messages display correctly
   - [ ] Check error state cleanup
   - [ ] Test error message dismissal

5. **UI State Consistency Test:**
   - [ ] Navigate between screens rapidly
   - [ ] Verify UI state doesn't get corrupted
   - [ ] Check state resets appropriately
   - [ ] Test app backgrounding/foregrounding

6. **Performance Test:**
   - [ ] Monitor for unnecessary re-renders
   - [ ] Check UI state updates are efficient
   - [ ] Verify no memory leaks
   - [ ] Test with complex UI interactions

**Success Criteria:**
- ✅ All modals work correctly
- ✅ Screen navigation state is accurate
- ✅ Loading states work properly
- ✅ Error handling is consistent
- ✅ UI state doesn't cause performance issues
- ✅ Redux DevTools shows UI state changes

**If Issues Found:**
- Check Redux DevTools for UI state structure
- Verify selectors are properly memoized
- Check for unnecessary re-renders
- Ensure UI state cleanup is working

---

### Phase 7: Cleanup and Optimization

**Objective:** Remove old code and optimize

**Steps:**
1. Remove all Context providers:
   - Delete context files
   - Remove from App.tsx
   - Update imports

2. Optimize selectors:
   - Add memoization where needed
   - Create composite selectors

3. Add performance monitoring:
   - Redux performance middleware
   - Identify slow selectors

4. Documentation:
   - Update component docs
   - Create Redux style guide
   - Add inline comments

5. Testing:
   - Add Redux store tests
   - Test async thunks
   - Integration tests

**Deliverables:**
- Clean codebase
- Optimized performance
- Complete documentation

**Time Estimate:** 4-5 hours

**🔍 VERIFICATION CHECKPOINT - Phase 7**

**Manual Testing Steps:**
1. **Full App Functionality Test:**
   - [ ] Test complete user journey from login to battle
   - [ ] Verify all features work as expected
   - [ ] Check no regressions from migration
   - [ ] Test edge cases and error scenarios

2. **Performance Verification:**
   - [ ] Monitor app startup time
   - [ ] Check memory usage during use
   - [ ] Verify smooth animations and transitions
   - [ ] Test with multiple screens open

3. **Redux DevTools Final Check:**
   - [ ] Verify all state is in Redux
   - [ ] Check action names are descriptive
   - [ ] Test time-travel debugging
   - [ ] Verify no context-related actions

4. **Build and Deployment Test:**
   - [ ] Run `npm run ios` successfully
   - [ ] Run `npm run android` successfully
   - [ ] Check no TypeScript errors
   - [ ] Verify production build works

5. **Code Quality Check:**
   - [ ] Review for any remaining context imports
   - [ ] Check for unused files
   - [ ] Verify consistent Redux patterns
   - [ ] Check documentation completeness

6. **Integration Test:**
   - [ ] Test with real server endpoints
   - [ ] Verify all API integrations work
   - [ ] Check error handling scenarios
   - [ ] Test offline/online scenarios

**Success Criteria:**
- ✅ All functionality works as before migration
- ✅ Performance is maintained or improved
- ✅ Codebase is clean with no context remnants
- ✅ Redux DevTools shows complete state management
- ✅ Build and deployment work correctly
- ✅ Documentation is complete and accurate

**If Issues Found:**
- Check for any remaining context imports
- Verify all Redux patterns are consistent
- Check performance monitoring for bottlenecks
- Ensure all tests pass

---

## Implementation Guidelines

### Code Standards

1. **File Naming:**
   - Slices: `camelCase` (authSlice.ts)
   - APIs: `camelCase` (authApi.ts)
   - Types: `PascalCase` (AuthState)

2. **Slice Structure:**
   ```typescript
   const slice = createSlice({
     name: 'domain',
     initialState,
     reducers: {
       // Sync actions
     },
     extraReducers: (builder) => {
       // Async actions
     }
   });
   ```

3. **Selector Patterns:**
   ```typescript
   // Simple selectors
   export const selectUser = (state: RootState) => state.auth.user;
   
   // Memoized selectors
   export const selectAvailableBots = createSelector(
     [selectBotCounts, selectDeployedCounts],
     (counts, deployed) => {...}
   );
   ```

4. **API Patterns:**
   ```typescript
   const api = createApi({
     reducerPath: 'domainApi',
     baseQuery: fetchBaseQuery({
       baseUrl: API_URL,
       prepareHeaders: // Add auth
     }),
     endpoints: (builder) => ({...})
   });
   ```

### Migration Rules

1. **Incremental Migration:**
   - Keep app working at each step
   - Use compatibility layers
   - Test after each change

2. **State Design:**
   - Normalize when beneficial
   - Keep related data together
   - Avoid deeply nested state

3. **Performance:**
   - Use RTK Query for caching
   - Memoize expensive selectors
   - Batch related dispatches

4. **Testing:**
   - Test reducers in isolation
   - Mock API calls
   - Test integrated flows

## Testing Strategy

### Unit Tests

1. **Reducers:**
   ```typescript
   test('should handle login', () => {
     const nextState = authSlice.reducer(initialState, setCredentials({...}));
     expect(nextState.user).toEqual({...});
   });
   ```

2. **Selectors:**
   ```typescript
   test('should calculate current balance', () => {
     const balance = selectCurrentBalance(mockState);
     expect(balance).toBe(1050);
   });
   ```

3. **Async Thunks:**
   ```typescript
   test('should fetch bots', async () => {
     const dispatch = jest.fn();
     await fetchBots()(dispatch, getState, undefined);
     expect(dispatch).toHaveBeenCalledWith(...);
   });
   ```

### Integration Tests

1. **API Integration:**
   - Test RTK Query hooks
   - Mock server responses
   - Test error scenarios

2. **Component Integration:**
   - Test Redux-connected components
   - Verify state updates
   - Test user flows

## Future Considerations

### Scalability

1. **Code Splitting:**
   - Lazy load slices
   - Dynamic reducer injection
   - Split API endpoints

2. **Performance:**
   - Redux persist for offline
   - Optimistic updates
   - Background sync

3. **Developer Experience:**
   - Redux Toolkit Query
   - Better TypeScript types
   - Custom DevTools monitors

### Feature Additions

1. **Notifications Slice:**
   - Global notification system
   - Toast messages
   - Error handling

2. **Settings Slice:**
   - User preferences
   - App configuration
   - Feature flags

3. **Cache Management:**
   - TTL for cached data
   - Invalidation strategies
   - Offline queue

### Team Considerations

1. **Documentation:**
   - Redux patterns guide
   - Common recipes
   - Troubleshooting guide

2. **Onboarding:**
   - Redux training materials
   - Code examples
   - Pair programming

3. **Code Review:**
   - Redux checklist
   - Performance guidelines
   - Best practices

## Summary

This migration plan provides a structured approach to moving from Context API to Redux Toolkit. The phased approach ensures the app remains functional throughout the migration while gradually improving state management capabilities.

**Total Estimated Time:** 30-40 hours

**Key Success Factors:**
- Incremental migration
- Comprehensive testing
- Team alignment
- Performance monitoring

The plan is designed to be followed step-by-step, with each phase building on the previous one. Any developer can pick up at any phase with the context provided in that section.

**🔍 IMPORTANT: Each phase includes a verification checkpoint with specific manual testing steps. Do not proceed to the next phase until all verification criteria are met. This ensures the migration remains stable and functional throughout the process.** 