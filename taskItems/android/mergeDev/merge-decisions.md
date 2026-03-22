# Merge decisions: `origin/dev` → `android_mergeDev` (March 21, 2026)

Session log for conflict resolutions. Priority: Android deploy / Play Console first, then dev behavior.

---

## `.github/workflows/deploy-production.yml` / `deploy-staging.yml` (correction)

**March 21 merge mistake:** Conflicts were resolved to `dist/server/server.js`. **That was wrong** for this repo’s EB pipeline.

**Authoritative rule:** Per [merge-flow.md](merge-flow.md), Android merge **must not** change deploy workflows except to **keep `androidStaging` (HEAD)**. Correct Procfile paths are:

- Production: `NODE_ENV=production node dist/server.js`
- Staging: `NODE_ENV=staging node dist/server.js`

**Never** `dist/server/server.js` in these workflow Procfile lines.

**If something breaks:** Wrong entry on EB → restore the exact YAML from `androidStaging` / merge-flow; do not infer paths from `server/package.json` local `start` scripts during Android merges.

---

## `mobile/package.json`

| Side | Content |
|------|---------|
| HEAD | `"version": "3.1.0"`, `"versionCode": 102` |
| `origin/dev` | `"version": "3.2.0"` (no `versionCode`) |

**Resolution:** `"version": "3.2.0"` + `"versionCode": 102`.

**Rationale:** Version label tracks dev. `versionCode` stays from Android branch for Gradle / Play monotonicity until the next intentional store bump.

**Rejected:** Dropping `versionCode`. Keeping `3.1.0` only.

**If something breaks:** Gradle missing `versionCode` → restore in `package.json`. Play upload rejected for duplicate code → bump `versionCode` in a dedicated commit.

---

## `mobile/src/components/battle/BattalionBotSelector/QuantitySelector.tsx`

| Side | Content |
|------|---------|
| HEAD | Local `useEffect` / `currentTime` / `BATTALION_SIZE_FEATURE_IDS` loop for max size |
| `origin/dev` | `computeBattalionMaxSizeFromFeatures(hackAbilityFeatures, researchNowMs)` |

**Resolution:** Dev’s `useMemo` + shared helpers (`useBattalionSizeResearchNowMs`, `computeBattalionMaxSizeFromFeatures`).

**Rationale:** Single source of truth in `useBattalionSlotUnlocks`; HEAD conflict block referenced incomplete symbols vs dev’s refactor. Matches PresetBar / research timer behavior.

**Rejected:** HEAD duplicate tier logic (stale vs shared module).

**If something breaks:** Wrong max quantity in battle prep → compare `computeBattalionMaxSizeFromFeatures` inputs vs API `features` list.
