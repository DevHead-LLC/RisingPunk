# Merge Decisions — dev → android_mergeDev (2026-03-26)

---

## 1. `mobile/package.json`

| Side | Content |
|------|---------|
| **HEAD (androidStaging)** | `"version": "3.3.0"`, `"versionCode": 106` |
| **dev** | `"version": "3.4.0"` (no versionCode) |

**Resolution:** Took dev's version bump (`3.4.0`) and kept Android's `versionCode: 106`.

**Rationale:** `versionCode` is Android-specific (required for Google Play Console uploads — each upload must increment). Dev doesn't track it. Version string updated to match dev's latest.

**Rejected content:** HEAD's `"version": "3.3.0"` — stale version string.

**Failure-mode hints:** If `versionCode` is missing or lower than the last Play Console upload, the AAB/APK will be rejected on upload.

---

## 2. `mobile/src/components/AppContent.tsx`

| Side | Content |
|------|---------|
| **HEAD (androidStaging)** | Empty line (whitespace only) |
| **dev** | `const activeBotBuildQueue = useAppSelector((state) => state.bots.buildQueue);` |

**Resolution:** Took dev's `activeBotBuildQueue` selector.

**Rationale:** The selector is referenced at line 88 (`pollingInterval: activeBotBuildQueue ? 2000 : 10000`) for dynamic build-state polling. Without it, the variable would be undefined and the build would fail. No Android-specific concern.

**Rejected content:** HEAD's blank line — no functional content.

**Failure-mode hints:** If this selector is missing, TypeScript will error on the `activeBotBuildQueue` reference in `useFetchBuildStateQuery`.

---

## 3. `mobile/src/screens/BattlePreparationScreen.tsx`

| Side | Content |
|------|---------|
| **HEAD (androidStaging)** | `presetApplyChainRef`, `lastSuccessfulPresetSigRef` refs + old `handleBotAssignment` signature (no `markLevel`) |
| **dev** | Updated `handleBotAssignment` signature with `markLevel: 1 \| 2` parameter |

**Resolution:** Kept both — Android's preset refs AND dev's updated function signature with `markLevel`.

**Rationale:** The preset refs (`presetApplyChainRef`, `lastSuccessfulPresetSigRef`) are used by `handleApplyPreset` (lines 238-315) and are Android-branch additions for serialized preset application. Dev's `markLevel` parameter is required because the function body (line 214) passes `markLevel` to `assignToBattalion`. Both are needed for the merged code to compile and function.

**Rejected content:** HEAD's old function signature without `markLevel` — the function body already references `data.markLevel`.

**Failure-mode hints:** Missing preset refs → `handleApplyPreset` crashes on undefined `presetApplyChainRef`. Missing `markLevel` in signature → TypeScript error when calling `handleBotAssignment` with mark level data.

---

## 4. `mobile/src/store/slices/authSlice.ts`

| Side | Content |
|------|---------|
| **HEAD (androidStaging)** | `await markAccountExists();` + `await clearPersistedTurfNavState();` |
| **dev** | `await logAccountCreatedOnce({ userId: data.user._id, method: 'guest' });` |

**Resolution:** Kept all three lines: `markAccountExists()`, `clearPersistedTurfNavState()`, then `logAccountCreatedOnce()`.

**Rationale:** `markAccountExists()` is needed for "returning user" tracking. `clearPersistedTurfNavState()` is an Android/androidStaging fix ensuring new guests start on turf (not a stale previous user's screen like a locked map). `logAccountCreatedOnce()` is dev's new analytics call to track guest account creation. All three are independent and necessary.

**Rejected content:** None — both sides fully included.

**Failure-mode hints:** Missing `clearPersistedTurfNavState()` → new guest may land on previous user's locked map screen. Missing `logAccountCreatedOnce()` → guest account_created analytics event won't fire.

---

## Deploy workflow files

Kept HEAD per merge-flow; workflows unchanged by intent.
