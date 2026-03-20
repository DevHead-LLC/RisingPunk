# Merge decisions: `origin/dev` → `android_mergeDev` (March 19, 2026)

Session log for conflict resolutions. Priority: Android deploy / Play Console first, then dev behavior.

---

## `mobile/package.json`

| Side | Content |
|------|---------|
| HEAD (`androidStaging`) | `"version": "3.0.0"`, `"versionCode": 100` |
| `origin/dev` | `"version": "3.1.0"` (no `versionCode` line) |

**Resolution:** `"version": "3.1.0"` + `"versionCode": 100`.

**Rationale:** `version` follows the release on dev. `versionCode` is required by `mobile/android/app/build.gradle` (reads from `package.json`); keep staging’s code so the Android pipeline stays valid and monotonicity can be bumped intentionally on the next Play upload.

**Rejected:** Dropping `versionCode` (breaks Gradle) or keeping `3.0.0` only (hides the dev release label).

**If something breaks:** Build fails at Gradle with missing `versionCode` → restore numeric `versionCode` in `package.json`. Wrong store version label → adjust `version` only.

---

## `mobile/src/hooks/useResearchFeatures.ts`

| Side | Content |
|------|---------|
| HEAD | Destructure `data`, `isLoading: loading`; then `const features = data?.features ?? []` |
| `origin/dev` | `data: features = []` in destructure (collides with API shape) |

**Resolution:** HEAD pattern: `data` + `isLoading: loading` + `const features = data?.features ?? []`.

**Rationale:** RTK query returns an object with a `features` array on `data`, not an array as `data` itself.

**Rejected:** Dev’s destructure default `[]` as `data` alias.

**If something breaks:** Empty or wrong list in research UI → verify `useGetUserFeaturesQuery` return type vs `features` derivation.

---

## `mobile/src/components/hackMap/CrewModal.tsx` (imports)

| Side | Content |
|------|---------|
| HEAD | No `useRef`, no `Image` |
| `origin/dev` | `useRef`, `Image` |

**Resolution:** Dev’s imports (`useRef`, `Image`, `SafeAreaView` ordering with `Image`).

**Rationale:** Dev adds backup UI using `Image` and refs for backup queue; required for merged functionality.

**Rejected:** HEAD-only imports (would break references to `useRef` / `Image`).

**If something breaks:** Missing symbol errors at compile time → confirm imports match usage.

---

## `mobile/src/screens/InvestmentPropertyScreen.tsx`

| Side | Content |
|------|---------|
| HEAD (`androidStaging`) | Android modal: `Dimensions`/`Platform`, full-screen overlay, `Modal` props, `onPressOut` Android workarounds, `useCompleteRemodelMutation` + Complete button path |
| `origin/dev` | Crew backup, property build banner, `closeRemodelModal` / Bugbot timer flow, `Alert` on start remodel, no `completeRemodel` |

**Resolution:** Take **`origin/dev` as the full file** (logic and features). Re-apply **Android-only** pieces from staging:

- `Platform`, `Dimensions`, `SCREEN_WIDTH` / `SCREEN_HEIGHT`
- `Modal`: `onRequestClose`, `statusBarTranslucent`, `hardwareAccelerated`, `presentationStyle="overFullScreen"`
- Overlay: absolute fill on Android using screen dimensions; `pointerEvents` on overlay/box
- `modalBox`: border from staging
- `onPressOut` Android handlers on modal actions (dismiss + duplicate `speedupRemodel` / `startRemodel` where staging had them for touch reliability)

**Rationale:** Dev carries the intended product behavior (single Close when timer complete, no duplicate Complete button, crew backup, alerts). Staging’s Android layout/touch mitigations are kept so internal testing on devices does not regress.

**Rejected:** Staging-only `useCompleteRemodelMutation` / Complete button when `timeUp` (superseded by dev’s auto-complete + `closeRemodelModal`). Rejected a line-by-line conflict merge (produced duplicate/broken JSX).

**If something breaks:** Modal off-center on Android → check overlay `Platform.OS === 'android'` block and task doc `taskItems/android/turf/investment-property-remodel-modal-android.md`. Double speedup/start on one tap → review `onPress` + `onPressOut` overlap on Android.
