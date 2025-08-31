# Current Task: User-vs-User Hacking with Defender Wave Deployment

## Recently Completed: Email Encryption Bug Fix & Performance Optimization
- ✅ Fixed critical bug where new user registration stored emails as plain text
- ✅ Added pre-save hook in User model to automatically encrypt emails before saving
- ✅ Updated getDecryptedEmail() method to handle both encrypted and unencrypted emails (backward compatibility)
- ✅ Fixed existing user email duplicate checking to work with encrypted emails
- ✅ Added static emailExists() method to User model for efficient duplicate checking
- ✅ **NEW**: Added emailHash field for efficient duplicate checking without decrypting all emails
- ✅ **NEW**: Created migration script `npm run migrate:add-email-hash` to add hash field to existing users
- ✅ **FIXED**: Made emailHash field optional to prevent validation errors with existing users
- ✅ All new user registrations now properly encrypt emails before database storage
- ✅ Existing users with unencrypted emails can still authenticate and use the system
- ✅ Email encryption now works consistently across registration, login, and profile endpoints
- ✅ **PERFORMANCE**: Email duplicate checking now uses indexed hash field instead of scanning all users

## Previously Completed: Email Encryption at Rest for GDPR Compliance
- ✅ Installed crypto-js library for AES-256-CBC encryption
- ✅ Created EncryptionService with encrypt/decrypt methods and key validation
- ✅ Updated User model with email encryption/decryption methods
- ✅ Modified auth routes to handle encrypted email storage and retrieval
- ✅ Updated user routes to return decrypted emails in responses
- ✅ Created migration script for existing user emails
- ✅ Added environment variable configuration for encryption keys
- ✅ Emails are now encrypted at rest using AES-256-CBC with random IVs
- ✅ All email operations (create, read, update) now use encryption
- ✅ Migration script available: `npm run migrate:encrypt-emails`

**Security Features:**
- AES-256-CBC encryption with PKCS7 padding
- Random initialization vector (IV) for each encryption
- Environment-based encryption keys (minimum 32 characters)
- Automatic encryption on save, decryption on retrieval
- GDPR compliant data protection

**Next Steps for Email Encryption:**
1. Set ENCRYPTION_KEY in environment variables (32+ characters)
2. Run migration: `npm run migrate:encrypt-emails`
3. Test registration/login with new encrypted emails
4. Verify existing users can still authenticate

## Priority: Core Gameplay – Enable attacking other users and large-scale defense

Goal: When attacking a user on the map, attacker keeps current limits; defender can auto-deploy entire inventory in waves: up to 6 battalions per second, 250,000 units per battalion, random bot types until inventory is exhausted. Inventory must decrement on deploy and return survivors at battle end for both sides.

Authorities to reuse (single source of truth):
- Server battle lifecycle: `server/src/services/BattleService.ts`, `server/src/services/BattleTimer.ts`, `server/src/services/BattleSetupService.ts`, `server/src/services/BattalionService.ts`
- Inventory: `server/src/models/Bot.ts`, `/api/battalions/assign`, Bot counts in DB
- Battle end accounting: `server/src/services/BattleResponseService.ts` + extend with inventory settlement (both users)
- Mobile battle flow: `mobile/src/screens/BattlePreparationScreen.tsx`, `mobile/src/store/api/battleApi.ts`, `mobile/src/screens/HackMapScreen.tsx`

Phased Plan (minimal, additive, no duplication):
1) Map + Client Initiation (U-vs-U)
   - Update `mobile/src/screens/HackMapScreen.tsx` to allow Hack on cells owned by another user (exclude self). Capture `defenderId` from cell `userId`.
   - Extend `mobile/src/store/api/battleApi.ts` `StartBattleRequest` to include optional `defenderId` and pass it from `BattlePreparationScreen` (unchanged attacker limits and UI).
   - Server already accepts `defenderId` in `POST /api/battle/start`; no API surface change needed.
   - **REQUIRED**: Add `_id: string` field to mobile `User` interface in `authSlice.ts` for proper user identification
   - **REQUIRED**: Add `pendingDefenderUserId` state management in `TurfScreen.tsx` with proper cleanup effects
   - **REQUIRED**: Update `BattlePreparationScreen` Props to accept `defenderId` and pass it through to battle start

2) Battle Setup (no pre-spawn for defender in U-vs-U)
   - In `BattleSetupService.createBattle`: when `defenderId` is a user (not NPC), only create attacker battalions; do not pre-create enemy battalions. Compute `totalArmyHealth` using attacker battalions plus defender inventory (by type) at defender’s level to size tug-of-war nodes correctly. Persist flags/fields on `Battle`:
     - `isUserDefender: true`, `defenderDeployedTotals: {guardian, breacher, phreak}`, `defenderDeploymentExhausted: false`.

3) Defender Wave Spawning (6 battalions/sec, 250k cap per battalion)
   - Create `server/src/services/DefenderDeploymentService.ts` (new):
     - Build a dynamic deployment plan from defender’s `Bot` inventory at battle start; randomize bot type per battalion respecting remaining counts and 250k cap.
     - On each battle tick, spawn up to 6 battalions until inventory exhausted.
     - For each spawn: decrement defender `Bot` inventory immediately; append battalions to `battle.battalions`; also append to `startingBattalions` as they appear.
     - Track per-type totals in `battle.defenderDeployedTotals` and mark `defenderDeploymentExhausted` when done.
   - Hook: In `BattleService`, listen for `battleTimeUpdate` and call `DefenderDeploymentService.onTick(battleId)` only when `isUserDefender`.

4) Inventory Settlement at Battle End (both users)
   - Create `server/src/services/BattleInventorySettlementService.ts` (new):
     - Attacker: Their assignments reduced inventory up-front; compute survivors per type from `startingBattalions` vs ending battalions and add survivors back to `Bot` counts; clear assignments for used battalionIds.
     - Defender: Use `defenderDeployedTotals` minus survivors per type to derive losses; add survivors back to defender `Bot` counts. Do not double-decrement.
   - Call from `BattleService.handleBattleEnd` before `endBattle`.
   - Keep existing NPC rewards path intact; U-vs-U path skips NPC rewards and only settles inventories.

5) Battalion Creation Authority
   - Extract a small `BattalionFactory` (new) to centralize battalion object construction used by `BattalionService` and `DefenderDeploymentService`, avoiding duplication.
   - If extraction would push files >300, place factory in its own file and update callers minimally.

6) Schema & Safety
   - Update `server/src/models/Battle.ts` with new optional fields mentioned in (2).
   - Concurrency: use atomic updates when decrementing defender inventory per wave. Guard against negative values.
   - Randomization: choose types uniformly among available types with remaining counts.

7) Mobile UI/UX
   - No new screens. Keep existing preparation and battle screens. Enable U-vs-U map hack and pass `defenderId` from `HackMapScreen` (treat non-self `owner==='player'` as hackable enemy; set `pendingDefenderUserId`).

8) Manual verification (user-run)
   - Attack another user; observe defender waves ramp to 6 battalions/sec until inventory spent; after battle, verify both users’ inventories reflect destroyed vs returned survivors.

## Recently Added: Privacy Policy Integration
- ✅ Created server endpoint `/documents/privacy-policy` serving formatted HTML privacy policy
- ✅ Added documents route to server with proper styling and content
- ✅ Created PrivacyPolicyModal component for mobile app display
- ✅ Integrated privacy policy into ProfileScreen content tab under "LEGAL" section
- ✅ Privacy policy displays in scrollable overlay with close button
- ✅ Content matches user's specified privacy policy text with August 30, 2025 effective date
- ✅ Modal uses theme-aware styling and responsive design
- ✅ Accessible via Profile → CONTENT → LEGAL → Privacy Policy

## Recently Added: Global Internet Connectivity Checking
- ✅ Added @react-native-community/netinfo package for network detection
- ✅ Created NetworkConnectivityProvider to monitor connection status globally
- ✅ Created ConnectivityOverlay component with black overlay and centered error message
- ✅ Integrated connectivity checking into AppProviders wrapper
- ✅ Added connectivity overlay to both LoginScreen and authenticated screens
- ✅ Installed iOS pods and added Android ACCESS_NETWORK_STATE permission
- ✅ Fixed NetInfo native module linking issues with dynamic import approach
- ✅ Added graceful fallback when NetInfo is unavailable (defaults to connected state)
- Shows "It looks like you're not connected to the internet. Please check your connection and try again." when offline
- Overlay appears on any screen when network is unavailable, as requested
- Fixed native module errors by using dynamic imports and error handling
- Implementation is complete and ready for testing

## Security Fix: Regex Injection Vulnerability
- ✅ Fixed regex injection vulnerability in auth routes (registration and login)
- ✅ Added `escapeRegexString()` helper function to safely escape special characters
- ✅ Preserved case-insensitive username/handle functionality
- ✅ Prevents crafted handles from bypassing authentication or uniqueness checks

Notes
- Respect attacker limits; only defender uses wave logic.
- Keep edits small in files near 300 lines; add new services for new behavior.

Safeguards, validation, and best practices
- Server is the single source of truth for inventory and battle outcomes; settlement happens server-side only.
- Fetch defender level and `Bot` inventory to compute initial `totalArmyHealth` and to scale defender stats.
- Concurrency-safe inventory updates: use atomic decrement with guards to prevent negatives; idempotent per-tick deploy using a `lastTickProcessed` per battle.
- Stop deployment immediately when battle ends or inventory exhausted.
- Enforce constants: `MAX_DEFENDER_PER_BATTALION = 250000`, `MAX_DEFENDER_BATTALIONS_PER_SECOND = 6`.
- Randomize defender battalion type selection across available types with remaining counts.
- Validate inputs: cannot hack self; ensure `defenderId` exists and cell is occupied by that user; reject invalid requests.
- Performance: many defender battalions can exist; keep targeting/movement O(n) by reusing existing authorities and indexing battalions by node if needed in a follow-up.
- **REQUIRED**: Proper cleanup of global variables (`pendingDefenderUserId`, `pendingNpcSlug`, etc.) in TurfScreen to prevent state pollution between battles
- **REQUIRED**: Mobile User interface must include `_id` field for proper user identification and self-exclusion logic


