# Merge Decisions — dev → android_mergeDev (2026-04-22)

---

## 1. `mobile/package.json`

| Side | Content |
|------|---------|
| **HEAD (androidStaging)** | `"version": "4.0.1"`, `"versionCode": 124` |
| **dev** | `"version": "4.1.0"` (no `versionCode`) |

**Resolution:** Took dev’s `version` (`4.1.0`) and kept Android’s `versionCode: 124`.

**Rationale:** Release string follows dev. `versionCode` is Play Console authority on this branch; dev does not carry it.

**Rejected content:** HEAD’s `4.0.1` only.

**Failure-mode hints:** Before the next Play upload, ensure `versionCode` exceeds the last value accepted in Play Console; bump if needed.

---

## 2. `mobile/src/components/AppContent.tsx`

| Side | Content |
|------|---------|
| **HEAD** | Auth loading: full-screen `<View style={{ flex: 1, backgroundColor: colors.background }} />`; comments about not blocking Turf on RTK |
| **dev** | `return null` while `isLoading`; shorter comment |

**Resolution:** Kept HEAD’s full-screen themed `View` and comments; added explicit `View` import from `react-native` (required for JSX).

**Rationale:** Android first — avoids blank/black perceived state during hydrate; matches documented Android merge priority.

**Rejected content:** dev’s `return null` during auth load.

**Failure-mode hints:** If auth feels “stuck” on a solid screen, check `isLoading` / `loadStoredAuth` timing and verify-token failures.

---

## 3. `mobile/src/components/hackMap/CollapsibleToolbar.tsx`

| Side | Content |
|------|---------|
| **HEAD** | Imports include `Platform` (for `Platform.select` in styles) |
| **dev** | Import line without `Platform` / `Dimensions` |

**Resolution:** Import `Platform` only (styles use `Platform.select`; `Dimensions` unused).

**Rationale:** Android toolbar bottom inset depends on `Platform.select`; dev’s minimal import would break compile.

**Rejected content:** dev’s import list without `Platform`.

**Failure-mode hints:** If toolbar clips on devices, revisit `Platform.select` android branch vs safe area.

---

## 4. `mobile/src/screens/BattlePreparationScreen.tsx`

| Side | Content |
|------|---------|
| **HEAD** | `setAssignments` imperative block + `lastSuccessfulPresetSigRef.current = null` after successful assign |
| **dev** | Functional `setAssignments((prev) => ({ ... }))` without clearing preset sig |

**Resolution:** Used dev’s functional `setAssignments` and kept `lastSuccessfulPresetSigRef.current = null` after it (HEAD behavior).

**Rationale:** Dev second for updater style; Android/session correctness for preset re-apply after manual assign.

**Rejected content:** dev-only path that omitted preset sig reset.

**Failure-mode hints:** If presets skip after manual assign, confirm this ref still clears on assign success.

---

## 5. `mobile/src/screens/TurfScreen.tsx` (`applyAndroidPanBounds`)

| Side | Content |
|------|---------|
| **HEAD** | Conflict fragment referenced `adjustedBounds` without defining it (incomplete) |
| **dev** | `adjustedBounds` from `computePanBounds` + `ANDROID_HEADER_HEIGHT` / nav bar offset on `minY` |

**Resolution:** Took dev’s full `adjustedBounds` block and assignments to shared values.

**Rationale:** HEAD side was broken; dev’s logic is the intentional Android pan bound fix (nav / header offset).

**Rejected content:** Broken HEAD fragment.

**Failure-mode hints:** If turf still pans under system UI, revisit constant `ANDROID_NAVIGATION_BAR_HEIGHT` vs device metrics.

---

## 6. `mobile/src/store/api/botsApi.ts`

| Side | Content |
|------|---------|
| **HEAD** | Large inline `fetchBotStatsBreakdown` generic with `researchBonus` field names |
| **dev** | `builder.query<BotStatsBreakdownPayload, void>` + `normalizeBotStatsBreakdownResponse` |

**Resolution:** Took dev’s typed endpoint matching `BotStatsBreakdownPayload` and normalizer.

**Rationale:** Dev is source of truth for stats-breakdown shape and crew bonus fields; aligns with server/transform.

**Rejected content:** HEAD’s stale inline generic (`researchBonus` vs crew keys).

**Failure-mode hints:** If Profile/Barracks stats look wrong, inspect `/api/bots/stats-breakdown` payload vs `normalizeBotStatsBreakdownResponse`.

---

## 7. `mobile/src/store/slices/authSlice.ts`

| Side | Content |
|------|---------|
| **HEAD** | `readStoredSessionFromStorage`, `readTokenWithGuestRaceRetry` variant, optimistic session on verify failures; fulfilled/rejected null guards without `isInitialized` tweak |
| **dev** | `readStoredUserFromStorage`, token retry with empty-string checks, `storedUserFallback` in `loadStoredAuth`, catch-path token/user read; fulfilled/rejected set `isInitialized` when concurrent session |

**Resolution:** Took dev’s helpers and `loadStoredAuth` / reducer branches; dropped `readStoredSessionFromStorage`. Extended JSON parse path: after successful `response.json()`, if `!userData?.user`, return fallback user or clear storage (covers empty body vs parse-only failure).

**Rationale:** Dev second — clearer race handling and concurrent Play-as-Guest guards; HEAD’s optimistic helper superseded by `storedUserFallback` + explicit missing-user branch.

**Rejected content:** HEAD-only `readStoredSessionFromStorage` and older fulfilled/rejected branches.

**Failure-mode hints:** If stale user shows after server user delete, verify 401/403/404 still clear storage; if concurrent guest races, check `isInitialized` on fulfilled/rejected early returns.

---

## Deploy workflow files

No conflicts. Kept HEAD per merge-flow for any future workflow conflicts; workflows unchanged by intent.
