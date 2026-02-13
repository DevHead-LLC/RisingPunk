# Android merge-dev: merge decision log

**Purpose:** Record merge resolutions (dev → current branch) for Android-related files so an AI or developer can later diagnose regressions. Decisions are documented with rationale, rejected alternatives, and failure-mode hints.

**Convention:** "HEAD" = current branch (e.g. android_mergeDev), "dev" = incoming dev branch. We generally accept dev unless the Android-specific change is required for a defined feature set (chat scroll, profile load, crew onboarding inputs, task guide UI, guest sign-in / email-password linking).

---

## Session: 2025-02-04 (merge conflict resolution)

**Branch context:** Merging dev into branch with Android-focused changes. Three conflicts across two files.

### 1. `mobile/android/app/src/main/AndroidManifest.xml`

**Conflict:** `<application>` attributes.

| Side | Content |
|------|--------|
| HEAD | `android:usesCleartextTraffic="false"`, `android:networkSecurityConfig="@xml/network_security_config"`, `tools:replace="android:usesCleartextTraffic"` |
| dev  | `android:networkSecurityConfig="@xml/network_security_config"` only |

**Resolution:** Accepted **dev**. Final state: only `android:networkSecurityConfig="@xml/network_security_config"` on `<application>`.

**Rationale:** Not related to chat scroll, profile load, crew onboarding, task guide, or guest/linking. Dev’s simpler manifest is sufficient: cleartext is already constrained by `network_security_config.xml` (localhost/Metro allowed; API HTTPS-only).

**Rejected from HEAD:** Explicit `usesCleartextTraffic="false"` and `tools:replace`. These were extra hardening to override any merged manifest that might set cleartext true.

**Failure-mode hints for later:**
- If a **dependency or merged manifest** introduces `android:usesCleartextTraffic="true"` and it wins, the app might allow cleartext beyond the domains in network_security_config. **Fix:** Re-add `android:usesCleartextTraffic="false"` and `tools:replace="android:usesCleartextTraffic"` in the main `AndroidManifest.xml` `<application>`.
- If **Metro/localhost** fails on a device or emulator, the cause is likely in `network_security_config.xml` (domain-config for localhost/127.0.0.1/10.0.2.2), not this manifest choice.

---

### 2. `mobile/android/app/src/main/res/xml/network_security_config.xml`

**Conflict A (comments + api.risingpunk.com trust-anchors):**

| Side | Content |
|------|--------|
| HEAD | Comment: "Allow api.risingpunk.com with all certificate sources" / "Samsung devices may require explicit domain configuration". `<trust-anchors>` included `<certificates src="user" />` in addition to `src="system"`. |
| dev  | Comment: "api.risingpunk.com with system CAs only (no user certs = no MITM via user-installed certs)". `<trust-anchors>` only `<certificates src="system" />`. |

**Conflict B (base-config):**

| Side | Content |
|------|--------|
| HEAD | `base-config` had both `system` and `user` certs; comment about "Allow ALL HTTPS" and "ensure HTTPS works on all devices". |
| dev  | `base-config` only `system` certs; comment "For API 24+, Android default does NOT trust user certs; we match that." |

**Resolution:** Accepted **dev** for both. Final state: api.risingpunk.com and base-config use **system CAs only**; no `src="user"` anywhere.

**Rationale:** Not required for the listed features. User certs were a compatibility/per-device choice (e.g. Samsung, debugging proxies), not a requirement for the feature set. Stricter security (system-only) preferred.

**Rejected from HEAD:** Trust for user-installed certificates (Charles, corporate MITM, etc.) for api.risingpunk.com and for default HTTPS.

**Failure-mode hints for later:**
- **API or HTTPS failing on specific devices** (e.g. certain Samsung or OEM builds, or devices with custom CAs): Consider re-adding `<certificates src="user" />` **only** in the `<domain-config>` for `api.risingpunk.com` and `risingpunk.com`, not globally. Document the device/model and error (e.g. SSL handshake, certificate chain) in this file before changing.
- **Charles/Fiddler or corporate proxy debugging:** Current config will fail with system CAs only. Either use a build that does not use this strict config for debugging, or add a debug-only domain-config that trusts user certs (do not commit for release).
- **"Trust anchor not found" or similar:** Often means the server chain isn’t trusted by system CAs or a device has an old CA store. First verify api.risingpunk.com chain; only if the issue is device-specific consider the limited user-cert exception above.

---

## Session: 2025-02-07 (merge dev → android_mergeDev)

**Branch context:** Merging origin/dev into android_mergeDev (from androidStaging). Two conflicts in app code (no Android manifest/build files).

### 1. `mobile/src/components/hackMap/AntivirusModal.tsx`

**Conflict A (hooks / mutation / research query):**

| Side | Content |
|------|--------|
| HEAD | useEffects logging shieldError, activateError, researchError; useActivateShieldMutation with error destructured; useGetUserFeaturesQuery with error. |
| dev  | useAppDispatch; useActivateShieldMutation without error; useGetUserFeaturesQuery without error; comment "Get research features data...". |

**Conflict B (catch block after activateShield):**

| Side | Content |
|------|--------|
| HEAD | `} catch (error: any) { console.error('[AntivirusModal] Failed to activate shield:', error);` |
| dev  | `dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress'])); } catch (error) { console.error('Failed to activate shield:', error);` |

**Resolution:** Accepted **dev** for both. Final state: dispatch + task guide invalidation on success; no error useEffects; simpler catch with generic console.error.

**Rationale:** Not Android deployment–specific (no manifest, build, or Play Console config). Dev adds task guide invalidation so "Use a shield" moves to Collect; we want that behavior. Android-specific ScrollView props (e.g. nestedScrollEnabled) are elsewhere in the file and were not in conflict.

**Rejected from HEAD:** Extra useEffects for RTK Query/mutation errors and [AntivirusModal]-prefixed logging.

**Failure-mode hints for later:**
- If **task guide "Use a shield"** does not advance after activating shield, confirm `userGuideApi.util.invalidateTags(['UserTaskProgress'])` runs after successful activation (dev behavior we kept).
- If you need **per-query error logging** for debugging on device, you can re-add useEffects for shieldError/activateError/researchError without affecting Android deployment.

---

### 2. `mobile/src/store/slices/authSlice.ts`

**Conflict:** `registerUser` thunk – fetch and timeout handling.

| Side | Content |
|------|--------|
| HEAD | Duplicate controller/timeoutId declaration; inner try/finally with fetch and clearTimeout(timeoutId); then if (!response.ok) etc. (catch/finally for outer try were present but try was missing). |
| dev  | Single fetch call with controller.signal; no timeout; no inner try/finally. |

**Resolution:** Accepted **HEAD’s timeout pattern** and fixed structure. Final state: one controller and one timeoutId; inner try/finally for fetch + clearTimeout; outer try wrapping success path (if (!response.ok) … return data); outer catch/finally with clearTimeout. No duplicate declarations.

**Rationale:** Android priority: timeout + cleanup avoid hung registration on slow/unreliable networks and match loginUser behavior. Dev had no timeout; HEAD added it but introduced a duplicate declaration and a broken try/catch (catch with no enclosing try). We kept the timeout and corrected the try/catch/finally structure.

**Rejected from dev:** Plain fetch without AbortController timeout (would keep register consistent with login for network robustness).

**Failure-mode hints for later:**
- If **registration hangs** on Android, the 10s abort should fire; if it does not, check that controller.signal is passed to fetch and clearTimeout runs.
- If **"Network error: Cannot connect to server"** appears immediately on register where it used to work, ensure the outer try/catch still wraps the full flow and that response is only used after the inner try/finally.

---

## Session: 2025-02-08 (merge dev → android_mergeDev)

**Branch context:** Merging origin/dev into android_mergeDev (from androidStaging). Three files: authSlice guest fetch, server.ts email index block, auth.ts guest research-error comment.

### 1. `mobile/src/store/slices/authSlice.ts`

**Conflict:** Guest creation fetch – timeout/AbortController vs simple fetch; request body with or without `forceNew`.

| Side | Content |
|------|--------|
| HEAD | guestUrl variable; AbortController + 15s timeout; try/finally with clearTimeout; body `{ deviceId }` only; apiHost for logging. |
| dev  | Single fetch call, no timeout; body `{ deviceId, ...(forceNew && { forceNew: true }) }`. |

**Resolution:** Kept **HEAD’s timeout pattern** and **dev’s request body**. Final state: one controller, 15s timeout, try/finally clearTimeout, body `JSON.stringify({ deviceId, ...(forceNew && { forceNew: true }) })`, signal: controller.signal, apiHost for logging.

**Rationale:** Android priority: timeout + cleanup avoid hung guest creation on slow/unreliable networks (same as prior registerUser decision). Dev’s `forceNew` is desired behavior so we merged it into the body.

**Rejected from dev:** Plain fetch without timeout (would risk hung guest creation on Android). Rejected from HEAD: body without forceNew (we added forceNew from dev).

**Failure-mode hints for later:**
- If **guest creation hangs** on Android, the 15s abort should fire; confirm controller.signal is passed to fetch and clearTimeout runs.
- If **forceNew** does not create a new guest when requested, confirm the body includes `forceNew: true` when payload?.forceNew === true.

---

### 2. `server/server.ts`

**Conflict A (email index block comments + find typing):**

| Side | Content |
|------|--------|
| HEAD | Comment: "One-time fix: if users collection has..."; `indexes.find((i) => i.name === 'email_1')` with no param type. |
| dev  | Comment: "Ensure multiple guest users... If production DB has a non-sparse..."; `indexes.find((i: { name?: string }) => i.name === 'email_1')`. |

**Resolution:** Accepted **dev**. Final state: dev’s comment and explicit callback type `(i: { name?: string })`.

**Rationale:** Not Android-specific. Dev’s comment is clearer; explicit typing is better for TypeScript. Same behavior.

**Conflict B (catch block):**

| Side | Content |
|------|--------|
| HEAD | `indexErr: any`; `indexErr.codeName`, `indexErr.message`; comment "Index already dropped or never existed; sync so sparse index exists". |
| dev  | `indexErr: unknown`; `err = indexErr as { codeName?: string; message?: string }`; `err.message ?? indexErr`. |

**Resolution:** Accepted **dev**. Final state: unknown + type guard, err.message ?? indexErr.

**Rationale:** Stricter typing and safer error handling; not Android deployment–specific.

**Rejected from HEAD:** `any` and direct property access on indexErr.

**Failure-mode hints for later:** None specific; behavior unchanged.

---

### 3. `server/src/routes/auth.ts`

**Conflict:** Single comment line before console.error in guest research-data failure block.

| Side | Content |
|------|--------|
| HEAD | No extra comment. |
| dev  | Comment: "Per taskItems/ios/appWide/guest-login-play-as-guest.md and android/appWide/guest-login-play-as-guest.md". |

**Resolution:** Accepted **dev**. Final state: comment retained for doc reference.

**Rationale:** Documentation only; no behavior change. Helps trace guest flow to task docs.

---

## Post-merge checklist (every time dev is merged into Android)

After completing conflict resolution and pushing `android_mergeDev`, run through this list to catch regressions that don’t show up as merge conflicts:

### HandleSelectionModal – text input on Android

- **File:** `mobile/src/components/modals/HandleSelectionModal.tsx`
- **Risk:** Dev may use a `Pressable` or `TouchableWithoutFeedback` wrapper around the handle `TextInput`. On Android, **Pressable blocks typing** (keyboard opens, no characters). **TouchableWithoutFeedback breaks focus** (tap doesn’t open keyboard).
- **Check:** In the Android branch (`Platform.OS !== 'ios'`), the handle input must be: a **plain `View style={styles.inputContainer} pointerEvents="box-none"`** containing the `TextInput`, and the `TextInput` must have **`onTouchEnd`** that calls `textInputRef.current?.focus()`. Search for `Pressable` or `TouchableWithoutFeedback` wrapping the handle input in the Android branch; if present, treat as regression.
- **Fix:** Keep Android’s working pattern: plain View for input container, no wrapper; TextInput with `onTouchEnd={() => { const input = textInputRef.current; if (input) input.focus(); }}`. See code snippets in `taskItems/android/onboarding/handle-selection-modal-fix.md`.
- **Reference:** `taskItems/android/onboarding/handle-selection-modal-fix.md` – single source of truth for the working Android setup and “After merging from Dev” checklist.
- **Prevention when merging:** Prefer keeping the Android branch’s plain View + onTouchEnd focus pattern. Do not accept dev’s Pressable or TouchableWithoutFeedback for the handle input on Android.

---

## How to use this log (for AI/agent)

1. **Search by file:** Look for the path (e.g. `AndroidManifest.xml`, `network_security_config.xml`) to see what was chosen and what was dropped.
2. **Search by symptom:** Search for "Failure-mode", "If … fails", "Consider re-adding" to get remediation hints.
3. **Search by keyword:** e.g. "cleartext", "user cert", "Samsung", "Metro", "ENVFILE" to find relevant decisions.
4. **When adding a new session:** Use the same section structure: file, conflict table (HEAD vs dev), resolution, rationale, rejected content, failure-mode hints. Keep one session block per merge resolution pass.

---

## Session: 2025-02-09 (merge dev → android_mergeDev)

**Branch context:** Merging origin/dev into android_mergeDev (from androidStaging). No conflicts; merge completed cleanly.

**Files merged from dev:** `mobile/src/components/auth/AuthInputs.tsx`, `mobile/src/components/modals/HandleSelectionModal.tsx`, `server/src/models/User.ts`, `server/src/routes/auth.ts`.

**Conflict resolutions:** None.

**Post-merge checklist:** HandleSelectionModal – Android branch verified. Input container is plain `View style={styles.inputContainer} pointerEvents="box-none"`; TextInput has `onTouchEnd` calling `textInputRef.current?.focus()`. No Pressable or TouchableWithoutFeedback wrapping the handle input. No regression.

---

## Session: 2025-02-11 (merge dev → android_mergeDev)

**Branch context:** Merging origin/dev into android_mergeDev (from androidStaging). Two conflicts: FinancialStatementsScreen (comments + feature sum), server research route (legacy lookup sort).

### 1. `mobile/src/screens/FinancialStatementsScreen.tsx`

**Conflict A (comments):**

| Side | Content |
|------|--------|
| HEAD | Single comment: "prefer expense-modifiers API, then balance, then server value from cash-flow user-features (Bugbot: legacy insurance $0.02 not $0.03), then naive feature sum." |
| dev  | Two comments: "prefer dedicated expense-modifiers API (single source of truth). Fall back to balance, then research features." + "Fallback: sum 01 + 02 so migrated users… (Bugbot tradeoff)." |

**Resolution:** Accepted **dev**. Final state: dev’s two comments.

**Rationale:** Not Android-specific. Dev’s comments are clearer and document the Bugbot tradeoff.

**Conflict B (insurance feature sum):**

| Side | Content |
|------|--------|
| HEAD | `features.some((f: any) => …)` where `features = cashFlowFeatures?.features`. |
| dev  | `cashFlowFeatures.some((f: any) => …)` (calling .some on the query result object). |

**Resolution:** Accepted **HEAD**. Final state: `features` (array from `cashFlowFeatures?.features`) used in .some().

**Rationale:** API returns `{ features, insuranceReduction?, taxReduction? }`. Dev’s `cashFlowFeatures.some()` would run on the whole object, not the features array; HEAD is correct. Android and behavior unchanged.

**Rejected from dev:** Using `cashFlowFeatures` directly in .some() (wrong shape).

**Failure-mode hints for later:** If insurance reduction fallback shows 0 when features are unlocked, confirm `cashFlowFeatures?.features` is the array and that .some() is called on that array.

---

### 2. `server/src/routes/research.ts`

**Conflict:** Legacy-aware UserResearchFeature lookup – with or without sort by unlockedAt.

| Side | Content |
|------|--------|
| HEAD | findOne with getFeatureIdFindFilter, .select('unlockedAt').lean(); no sort. |
| dev  | Same findOne + .sort({ unlockedAt: -1 }). Comment: "Legacy-aware filter can match multiple docs; use most recent unlockedAt so balance accrual is correct (Bugbot)." |

**Resolution:** Accepted **dev**. Final state: findOne with .sort({ unlockedAt: -1 }).

**Rationale:** Not Android-specific; server logic. When multiple docs match (legacy IDs), using most recent unlockedAt fixes balance accrual (Bugbot). Dev’s change is the correct fix.

**Rejected from HEAD:** findOne without sort (could pick wrong doc when multiple match).

**Failure-mode hints for later:** If balance accrual is wrong after unlocking cash-flow features on migrated/legacy users, confirm .sort({ unlockedAt: -1 }) is present on this findOne.

---

**Post-merge checklist:** HandleSelectionModal – Android branch verified. Android path uses plain `View style={styles.inputContainer} pointerEvents="box-none"` and TextInput with `onTouchEnd` calling `textInputRef.current?.focus()`. No Pressable or TouchableWithoutFeedback wrapping the handle input. No regression.

---

## Session: 2025-02-12 (merge dev → android_mergeDev)

**Branch context:** Merging origin/dev into android_mergeDev (from androidStaging). Three conflicts: FinancialStatementsScreen (expense reduction fallback), research.ts route (legacy API + cash-flow expense modifiers), ResearchFeatureService (filter method + comments).

### 1. `mobile/src/screens/FinancialStatementsScreen.tsx`

**Conflict:** Expense reduction fallback logic in useMemo.

| Side | Content |
|------|--------|
| HEAD | Fallback to `cashFlowFeatures?.insuranceReduction`, then manual sum via `features.some((f: any) => f.id === '...')` for both insurance and tax. |
| dev  | Simple `return 0` fallback; no cashFlowFeatures query. |

**Resolution:** Accepted **dev**. Final state: insurance and tax reduction come from expense-modifiers or balance only; no client-side fallback sum.

**Rationale:** HEAD's `cashFlowFeatures` is undefined in this component's scope (would cause runtime error). Dev is correct: expense-modifiers endpoint is the single source of truth. Not Android deployment–specific.

**Rejected from HEAD:** Fallback to cashFlowFeatures (undefined variable) and manual feature sum (creates 0.03 display bug for legacy users with single $0.02 doc).

**Failure-mode hints for later:** If insurance/tax reduction shows 0 when it should have a value, verify the expense-modifiers API returns correct values and client calls it.

---

### 2. `server/src/routes/research.ts`

**Conflict:** `/user-features/:categoryId` route – legacy API support vs cash-flow expense modifiers.

| Side | Content |
|------|--------|
| HEAD | Comment about cash-flow returning insuranceReduction/taxReduction; getUserFeatures only; if cash-flow, compute and return expense modifiers. |
| dev  | Comment about legacy API; check x-research-api-version header; use getUserFeaturesLegacy for old App Store app; no expense modifiers. |

**Resolution:** Combined **both**. Final state: check x-research-api-version header for legacy support (dev) AND return insuranceReduction/taxReduction for cash-flow (HEAD).

**Rationale:** Both changes are needed. Dev's legacy API support ensures old App Store apps work. HEAD's cash-flow expense modifiers ensure client fallback matches server (Bugbot). Combined for full compatibility.

**Rejected content:** None—both sides merged.

**Failure-mode hints for later:**
- If old App Store app crashes on Research screen, confirm x-research-api-version header check and getUserFeaturesLegacy are present.
- If client expense reduction doesn't match server for cash-flow, confirm insuranceReduction/taxReduction are returned.

---

### 3. `server/src/services/ResearchFeatureService.ts`

**Conflict:** Comments and getExactFeatureIdFilter method.

| Side | Content |
|------|--------|
| HEAD | `getExactFeatureIdFilter` method for write filters; comment about legacy same-category old IDs. |
| dev  | No getExactFeatureIdFilter; cleaner JSDoc with @param forPrereq explanation. |

**Resolution:** Kept **HEAD's method** and combined **dev's comment**. Final state: getExactFeatureIdFilter method retained (used in startResearch); JSDoc includes both legacy explanation and forPrereq parameter.

**Rationale:** getExactFeatureIdFilter is used in startResearch (line 279) to prevent overwriting shared legacy docs. Dev's cleaner @param documentation improves readability. Both needed.

**Rejected from dev:** Omission of getExactFeatureIdFilter method.

**Failure-mode hints for later:** If startResearch overwrites a shared legacy doc (e.g. reduce-insurance-expense consumed by 01 or 02), confirm getExactFeatureIdFilter is used in findOneAndUpdate.

---

**Post-merge checklist:** HandleSelectionModal – Android branch verified. Android path uses plain `View style={styles.inputContainer} pointerEvents="box-none"` and TextInput with `onTouchEnd` calling `textInputRef.current?.focus()`. No Pressable or TouchableWithoutFeedback wrapping the handle input. No regression.

---

## Session: 2025-02-12 (merge dev → android_mergeDev, package.json only)

**Branch context:** Merging origin/dev into android_mergeDev (from androidStaging). Single conflict: react-native-reanimated version in mobile/package.json.

### 1. `mobile/package.json`

**Conflict:** react-native-reanimated dependency version.

| Side | Content |
|------|--------|
| HEAD | `"react-native-reanimated": "^3.17.5"` |
| dev  | `"react-native-reanimated": "^4.2.1"` |

**Resolution:** Accepted **HEAD**. Final state: `"react-native-reanimated": "^3.17.5"`.

**Rationale:** Android first. The Android branch is validated for Play Console/internal testing with 3.17.5. Reanimated 4.x may introduce native or runtime changes; keeping 3.17.5 avoids risking build or runtime regressions on Android until we explicitly test and adopt 4.x.

**Rejected from dev:** Bump to ^4.2.1 (can be done in a later, controlled upgrade after Android verification).

**Failure-mode hints for later:**
- If we want **reanimated 4.x** (e.g. new APIs or fixes), upgrade in a dedicated change: bump version, run Android build and device tests, then commit. Do not accept dev’s version in a merge without verifying Android.
- If **animation or gesture issues** appear after a future merge, check whether reanimated was bumped and consider reverting to 3.17.5.

---

**Post-merge checklist:** HandleSelectionModal – (run after push if needed; no changes to that file in this merge.)

---

## Session: 2025-02-13 (merge dev → android_mergeDev)

**Branch context:** Merging origin/dev into android_mergeDev (from androidStaging). Two conflicts: TitleSection (version display), CrewChatModal (inline modal vs BaseChatModal).

### 1. `mobile/src/components/auth/TitleSection.tsx`

**Conflict:** Version text – hardcoded vs APP_VERSION.

| Side | Content |
|------|--------|
| HEAD | `<Text ...>v2.4.1</Text>` (hardcoded) |
| dev  | `<Text ...>v{APP_VERSION}</Text>` (from appVersion) |

**Resolution:** Accepted **dev**. Final state: `v{APP_VERSION}`.

**Rationale:** Not Android-specific. Single source of truth for version (APP_VERSION) avoids drift; dev’s approach is correct.

**Rejected from HEAD:** Hardcoded v2.4.1.

**Failure-mode hints for later:** None; behavior is improved.

---

### 2. `mobile/src/components/hackMap/CrewChatModal.tsx`

**Conflict:** Inline Modal + ScrollView (HEAD) vs refactored BaseChatModal usage (dev).

| Side | Content |
|------|--------|
| HEAD | Full inline implementation: Modal, KeyboardAvoidingView, SafeAreaView, ScrollView with nestedScrollEnabled, FilteredText/FilteredTextInput, report modal, etc. |
| dev  | `<BaseChatModal ... />` with props (onClose, title, messages, fetchError, isLoadingMessages, onSendMessage, isSending, currentUser, reportContext, getReportContextData). |

**Resolution:** Accepted **dev**. Final state: CrewChatModal uses BaseChatModal with the listed props.

**Rationale:** BaseChatModal already includes Android behavior: `nestedScrollEnabled`, same scroll/at-bottom logic, Modal props, and report flow. Not an Android deployment–specific difference; dev’s refactor is the single shared implementation. Accepting dev keeps one code path for crew and world chat.

**Rejected from HEAD:** Inline duplicate implementation (logic lives in BaseChatModal).

**Failure-mode hints for later:** If crew chat scroll or keyboard behavior regresses on Android, confirm BaseChatModal’s ScrollView still has `nestedScrollEnabled` and KeyboardAvoidingView behavior.

---

**Post-merge checklist:** HandleSelectionModal – Android branch verified. Android path uses plain `View style={styles.inputContainer} pointerEvents="box-none"` and TextInput with `onTouchEnd` calling `textInputRef.current?.focus()`. No Pressable or TouchableWithoutFeedback wrapping the handle input on Android. No regression.

---

## Related docs

- `taskItems/android/appWide/network-security-config.md` – overall network security config design.
- `taskItems/android/deployment/` – build, env, and Play deployment (separate from merge decisions).
