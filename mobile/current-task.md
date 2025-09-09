# Current Task: Rental Housing Balance Integration

## Implementation Summary
Successfully connected rental housing unlocks with user's balance system using ratePerSecond multiplier.

## Key Changes Made

### Server Side
1. **Created RentalHousingIncomeService** (`server/src/services/RentalHousingIncomeService.ts`)
   - Calculates income per property based on unlocked status
   - Room values: Bathroom ($0.01), Kitchen ($0.01), Bedroom ($0.02), Living Room ($0.02)
   - Total per property: $0.06 × ratePerSecond
   - Returns breakdown for all 4 properties

2. **Updated Balance Endpoints** (`server/server.ts`)
   - Modified `/api/balance` GET endpoint to include rental housing income
   - Modified `/api/balance/update` POST endpoint to include rental housing income
   - Added `/api/rental-housing/income` GET endpoint for room value data

### Mobile Side
1. **Created Rental Housing API** (`mobile/src/store/api/rentalHousingApi.ts`)
   - RTK Query service for fetching rental housing income data
   - Integrated with Redux store

2. **Updated FloorPlan Component** (`mobile/src/components/common/FloorPlan.tsx`)
   - Now displays dynamic room values based on ratePerSecond
   - Uses real-time data from API instead of hardcoded values
   - Shows loading state while fetching data

3. **Added Currency Utilities** (`mobile/src/utils/currencyUtils.ts`)
   - `formatCurrency()` for displaying room values
   - `roundToFloor()` for balance display rounding

4. **Updated Balance Display** (`mobile/src/components/common/Balance.tsx`)
   - Now rounds balance down using `roundToFloor()` for UI display
   - Maintains full precision in database

## How It Works
- Each unlocked rental property contributes $0.06 × ratePerSecond per second
- Room values scale with ratePerSecond (e.g., if ratePerSecond = 10, each room value is 10x higher)
- Balance accumulates both base ratePerSecond income + rental housing income
- UI displays rounded-down balance while database maintains full precision
- Room values update dynamically based on current ratePerSecond

## Database Behavior
- Full balance precision maintained (e.g., $1,350,468.67)
- UI displays rounded down (e.g., $1,350,468)
- Rental housing income automatically included in balance calculations

## Sync Mechanism for Existing Users
**Problem Solved**: Existing users with already unlocked properties needed historical income calculation.

### Smart Sync Implementation
1. **Added `rentalHousingIncomeLastSynced` field** to User model to track sync status
2. **Created RentalHousingSyncService** that:
   - Checks if sync is needed (never synced OR >1 hour since last sync)
   - Calculates historical income from last balance update
   - Only syncs when necessary (not on every request)
   - Logs sync activity for monitoring

3. **Automatic Sync Triggers**:
   - **Balance endpoints** (`/api/balance`, `/api/balance/update`) - syncs before calculating current balance
   - **Property completion** - syncs when new property is unlocked
   - **Manual endpoint** (`/api/rental-housing/sync`) - for manual triggering if needed

### Sync Logic
- **When sync runs**: Only when `rentalHousingIncomeLastSynced` is null OR >1 hour old
- **What it calculates**: Historical income from `balance.lastUpdated` to now
- **Formula**: `unlockedProperties × $0.06 × ratePerSecond × secondsElapsed`
- **Performance**: Minimal impact - only runs when needed, not on every render

### Example Sync Scenarios
- **New user**: First balance fetch triggers sync, calculates all historical income
- **Existing user**: Sync runs once, then only re-syncs if >1 hour passes
- **Property unlock**: Immediate sync ensures new property income is calculated
- **RatePerSecond change**: Sync will recalculate within 1 hour of change

## Rate Display Fix
**Issue Resolved**: Balance endpoints were returning base `ratePerSecond` instead of total effective rate.

### Fix Applied
- **Balance endpoints** now calculate and return `totalEffectiveRate = baseRatePerSecond + rentalHousingIncomePerSecond`
- **BertToast example**: Base rate (1) + 4 properties × $0.06 = 1 + 0.24 = **$1.24/second**
- **UI now displays**: Total effective rate including all income sources

## Financial Statements Integration
**Added**: Investment properties passive income to FinancialStatementsScreen.

### Features Added
- **Income Statement**: Shows "Investment Properties (Passive Income)" with +$0.24/second
- **Balance Sheet**: Shows "Investment Properties" with count of unlocked properties @ $100,000 each
- **Cash Flow Statement**: Shows passive income + total combined cash flow rate ($1.24/sec)
- **Real-time Data**: Uses rental housing API to get current income values
- **Conditional Display**: Only shows when properties are unlocked and generating income

### Debugging Steps
- **API Integration**: Fixed baseUrl to use API_URL from config (port 5001)
- **Error Handling**: Added loading states and error display for API calls
- **Property Values**: Shows "4 Properties @ $100,000 each" in balance sheet
- **Debug Cleanup**: Removed all debug console logs for production readiness

### Balance Sheet Enhancements
- **Individual Properties**: Shows each unlocked property as "Investment Property 1", "Investment Property 2", etc. with $100,000 value
- **Net Worth Calculation**: Removed "(Cash)" text and now includes total property values + cash balance
- **Dynamic Calculation**: Net worth = Cash Balance + (Number of Properties × $100,000)
- **Example**: With $11,109,669 cash + 4 properties = $11,509,669 total net worth

## Critical Bug Fix: Base Income Loss
**Issue**: Rental housing sync was wiping out base income by updating `lastUpdated` before calculating elapsed time.

### Problem
- **Sync Order**: `performSync()` updated `user.balance.lastUpdated` to current time
- **Immediate Calculation**: Balance endpoints calculated `secondsElapsed` after sync
- **Result**: `secondsElapsed` was almost always 0, losing all base income for that period
- **Impact**: Players lost base ratePerSecond earnings every time sync ran (initially + hourly)

### Fix Applied
- **Reordered Logic**: Calculate and apply base income accumulation FIRST
- **Then Sync**: Run rental housing sync AFTER base income is preserved
- **Both Endpoints**: Fixed `/api/balance` GET and `/api/balance/update` POST
- **Preserved Behavior**: All existing functionality maintained, just fixed timing

## Critical Bug Fix: Rental Income Compounding
**Issue**: Rental income was compounding exponentially instead of adding fixed amounts.

### Problem
- **Compounding Calculation**: `rentalIncomePerSecond = properties × $0.06 × user.ratePerSecond`
- **Exponential Growth**: Each sync multiplied rate by ~1.06 per property instead of adding $0.06
- **Rate Inflation**: After a few syncs, rates grew exponentially beyond intended values
- **Display Issues**: Rental values inflated far beyond the intended "$0.06 per property per second"

### Fix Applied
- **Fixed Amounts**: Changed to `rentalIncomePerSecond = properties × $0.06` (no rate multiplication)
- **Both Services**: Fixed RentalHousingSyncService and RentalHousingIncomeService
- **Room Values**: Fixed room values to be constants instead of rate-scaled
- **Method Signatures**: Updated helper methods to remove ratePerSecond parameters
- **Consistent Behavior**: Now rental income is truly fixed at $0.06 per property per second
