# Merge Decisions — dev → android_mergeDev (2026-04-30)

---

## 1. `mobile/package.json`

| Side | Content |
|------|---------|
| **HEAD (androidStaging)** | `"version": "5.1.0"`, `"versionCode": 135` |
| **dev** | `"version": "5.2.0"` (no `versionCode`) |

**Resolution:** Kept Android branch values (`"version": "5.1.0"` and `"versionCode": 135`).

**Rationale:** `versionCode` is Android/Play authority and must stay present and consistent with the Android release train. Same approach as prior merge sessions: do not drop `versionCode` or adopt dev-only version metadata.

**Rejected content:** Dev-only `"version": "5.2.0"` without `versionCode`.

**Failure-mode hints:** Before Play upload, confirm `versionCode` exceeds the latest build in Play Console and bump deliberately when shipping.

---

## 2. `mobile/package-lock.json`

| Side | Content |
|------|---------|
| **HEAD** | Root `packages[""]` version `4.1.0`, `hasInstallScript: true` |
| **dev** | Root `packages[""]` version `5.3.0` (no `hasInstallScript` in conflict hunk); top-level lock `version` drifted with dev |

**Resolution:** Set lockfile `version` and `packages[""].version` to `5.1.0` to match resolved `package.json`; kept `hasInstallScript: true`. Ran `npm install` in `mobile/` to refresh the lockfile after resolution.

**Rationale:** Lockfile must match authoritative `package.json`; `hasInstallScript` reflects `postinstall` and must remain.

**Rejected content:** Dev’s standalone `5.3.0` without aligning to Android branch `package.json`.

**Failure-mode hints:** If CI or local install disagrees on versions, re-run `npm install` from `mobile/` after any manual `package.json` edit.

---

## 3. `mobile/src/screens/HackMapScreen.tsx` (comments — `gridDerivedUserPosition`)

| Side | Content |
|------|---------|
| **HEAD** | Longer comment: my-position API, single `useMemo` / Bugbot duplicate-scan note |
| **dev** | Shorter comment: fallback when my-position unavailable |

**Resolution:** Combined into two lines: my-position / single scan / Bugbot note, plus explicit fallback line when API is unavailable.

**Rationale:** Preserves Android-branch intent (documented my-position and scan discipline) and dev’s fallback wording; no behavior change.

**Rejected content:** Dropping either side’s meaning.

**Failure-mode hints:** None; comments only.

---

## 4. `mobile/src/screens/HackMapScreen.tsx` (`AttackMarchAnimationLayer` siblings)

| Side | Content |
|------|---------|
| **HEAD** | `ProbeAnimationLayer` nested inside map/gesture tree with `nestedInMapView` and `mapTapGesture` (tap-through fix); nothing after `AttackMarchAnimationLayer` |
| **dev** | After `AttackMarchAnimationLayer`: `TransferRunAnimationLayer` plus a second `ProbeAnimationLayer` (non-nested duplicate) |

**Resolution:** After `AttackMarchAnimationLayer`, added **only** `TransferRunAnimationLayer` from dev. Did **not** re-add dev’s outer `ProbeAnimationLayer` (HEAD already renders one instance with the nested/tap-gesture wiring).

**Rationale:** Android-first: keep the single nested `ProbeAnimationLayer` pattern that fixes probe tap-through. Dev-second: bring transfer-run visuals without duplicating probes (duplicate could regress layering or handlers).

**Rejected content:** Dev’s second full `ProbeAnimationLayer` block after attack march.

**Failure-mode hints:** If probes fail to render or follow incorrectly, confirm exactly one `ProbeAnimationLayer` remains and it still receives `nestedInMapView` / `mapTapGesture` as intended.

---

## Deploy workflow files

No conflicts this session. Kept HEAD per merge-flow; `.github/workflows/deploy-production.yml` and `.github/workflows/deploy-staging.yml` unchanged by intent.
