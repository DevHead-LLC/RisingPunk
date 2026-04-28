# Merge Decisions — dev -> android_mergeDev (2026-04-28)

---

## 1. `mobile/package.json`

| Side | Content |
|------|---------|
| **HEAD (androidStaging)** | `"version": "5.0.0"`, `"versionCode": 128` |
| **dev** | `"version": "5.1.0"` (no `versionCode`) |

**Resolution:** Kept Android branch values (`"version": "5.0.0"` and `"versionCode": 128`).

**Rationale:** `versionCode` is Android/Play authority and must remain present/increment-safe. Keeping `version` aligned to HEAD here avoids introducing mixed release metadata during the Android merge pass.

**Rejected content:** Dev-only `"version": "5.1.0"` without `versionCode`.

**Failure-mode hints:** Before Android release, verify `versionCode` is greater than latest Play Console build and version metadata matches the intended release train.

---

## 2. `mobile/src/components/research/FeatureModal.tsx`

| Side | Content |
|------|---------|
| **HEAD (androidStaging)** | `useGetUserFeaturesQuery` data consumed as `{ features }`, with per-category `isLoading` guards in `loadingByCategory`. |
| **dev** | Added `hunting` category support, but switched several category mappings to raw array access (no `.features`) and removed loading flags. |

**Resolution:** Merged both intents: kept HEAD's `{ features }` data-shape access and loading guards, and added dev's new `hunting` query/category plus `huntingLoading` in `loadingByCategory`.

**Rationale:** The RTK query endpoint currently returns `{ features: any[] }`; preserving that contract avoids prerequisite checks reading empty data. Bringing in `hunting` keeps new dev functionality.

**Rejected content:** Dev's raw-array mappings (`homeDefFeatures ?? []`, etc.) and removal of loading guards; these would conflict with current API response shape and could cause false prerequisite failures while queries are still resolving.

**Failure-mode hints:** If research prerequisites appear incorrectly blocked, check `featuresByCategory` still reads `.features` and `loadingByCategory` includes every queried category (including `hunting`).

---

## Deploy workflow files

No conflicts this session. Kept HEAD per merge-flow; `.github/workflows/deploy-production.yml` and `.github/workflows/deploy-staging.yml` unchanged by intent.
