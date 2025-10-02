# Current Task: Bot Assignment Bug Fix

## Issue: Bot Assignment Persistence Bug

**Problem:** Bot assignments persist indefinitely, reducing available bot pool. When assigning different bot types to battalions, previously assigned bots aren't released properly.

**Current State:**
- Client calls `/api/bots/assign` (404 error)
- Server has `/api/battalions/assign` endpoint (working correctly)
- Server has `/api/bots` endpoint (returns bot inventory and assignments)
- Server has `/api/bots` route file (imported but not used due to inline routes)

**Root Cause:**
1. **API Endpoint Mismatch** - Client calls `/api/bots/assign` but server only has `/api/battalions/assign`
2. **Duplicate Route Definitions** - Bot routes exist both inline in server.ts AND in separate bots.ts file
3. **Missing Available Bot Calculation** - GET `/api/bots` doesn't calculate available bots (total - assigned)

**What Works:**
- `/api/battalions/assign` properly releases previously assigned bots
- Assignment logic correctly updates bot counts
- Bot inventory is returned correctly

**What's Broken:**
- Client gets 404 error when calling `/api/bots/assign`
- Available bot counts not calculated (shows total instead of available)
- No cleanup when leaving preparation screen

**Solution Implemented:**
1. ✅ **Changed client to call `/api/battalions/assign`** - Updated RTK Query endpoint
2. ✅ **Added available bot calculation** - Enhanced existing GET `/api/bots` endpoint
3. ✅ **Added cleanup endpoint** - Created `/api/battalions/clear-assignments` endpoint
4. ✅ **Used existing server logic** - Leveraged working assignment logic in server.ts

**Files Changed:**
- `mobile/src/store/api/botsApi.ts` - Changed endpoint from `/api/bots/assign` to `/api/battalions/assign`
- `server/server.ts` - Added `availableBots` calculation to GET `/api/bots` endpoint
- `server/server.ts` - Added POST `/api/battalions/clear-assignments` endpoint
- `mobile/src/screens/BattlePreparationScreen.tsx` - Real-time available counts, automatic cleanup

**How it works now:**
- Client calls existing `/api/battalions/assign` endpoint (working assignment logic)
- Server returns `availableBots` in GET `/api/bots` response (real-time calculation)
- Client fetches available counts from server instead of local calculation
- Assignments automatically cleared when leaving preparation screen
- Bot assignments properly release previously assigned bots when changing types

## ISSUE #5: DOUBLE DECREMENT BUG - PERSISTED! ❌
**Problem:** Bot count is still decreasing by 2 instead of 1 for each assignment (10706 → 10704 → 10702)

**Previous Attempt (REVERTED):**
- Tried to fix double `fetchAvailableBots()` calls
- Removed duplicate call from `handleBotAssignment`
- **Result:** Issue persisted, changes reverted

**Current State:**
- Client uses local calculation: `availableBots = botCounts - assignments`
- Client calls `/api/battalions/assign` endpoint
- Server decrements `bot.bots[botType] -= quantity` (single decrement)
- **Issue:** Available count still decreases by 2 per assignment

**Root Cause Investigation Needed:**
- Is the server actually decrementing by 2?
- Is the client's `botCounts` from Redux store being updated incorrectly?
- Are there multiple assignment calls happening?
- Is there a race condition between local state and server state?

**ROOT CAUSE IDENTIFIED! 🎯**
**Multiple Redux Updates:** Both `AppContent.tsx` and `DataFetcher.tsx` call `useFetchBotsQuery` and both update Redux with `dispatch(setBots(botsData.bots))`. When `assignToBattalion` runs with `invalidatesTags: ['Bots']`, both components refetch and update Redux twice, causing `availableBots` calculation to run twice.

**The Flow:**
1. User assigns 1 guardian bot
2. `assignToBattalion` mutation runs with `invalidatesTags: ['Bots']`
3. **Both** `AppContent` and `DataFetcher` refetch bot data
4. **Both** call `dispatch(setBots(botsData.bots))` 
5. Redux store updated **twice** with same data
6. `availableBots` calculation runs **twice** (once per Redux update)
7. Each calculation subtracts assignments → **double decrement**

**Investigation Results:**
- ✅ Server-side logging shows single decrement (working correctly)
- ✅ Client-side logging shows Redux being updated twice
- ✅ RTK Query cache invalidation causing multiple refetches

**SOLUTION IMPLEMENTED:**
- **Removed duplicate Redux updates** from `DataFetcher.tsx`
- **Kept bot data management** only in `AppContent.tsx`
- **Added comprehensive logging** to track the issue
- **Result:** Only one Redux update per assignment → single decrement

**Files Changed:**
- `mobile/src/components/DataFetcher.tsx` - Removed duplicate `useFetchBotsQuery` and `setBots` calls
- `server/server.ts` - Added detailed logging to `/api/battalions/assign` endpoint
- `mobile/src/screens/BattlePreparationScreen.tsx` - Added client-side logging

**Expected Result:** Bot count should now decrease by 1 per assignment (10706 → 10705 → 10704)
