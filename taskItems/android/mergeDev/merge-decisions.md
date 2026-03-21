# Merge decisions: `origin/dev` → `android_mergeDev` (March 21, 2026)

Session log for conflict resolutions. Priority: Android deploy / Play Console first, then dev behavior.

---

## `.github/workflows/deploy-production.yml`

| Side | Content |
|------|---------|
| HEAD (`androidStaging`) | `NODE_ENV=production node dist/server.js` |
| `origin/dev` | `node dist/server/server.js` (no `NODE_ENV`) |

**Resolution:** `NODE_ENV=production node dist/server/server.js`

**Rationale:** `server/package.json` `start:prod` uses `dist/server/server.js` (current `tsc` output). Staging’s `NODE_ENV=production` keeps Elastic Beanstalk behavior aligned with local prod start. Old `dist/server.js` path is obsolete.

**Rejected:** HEAD-only path (wrong entry for current build). Dev-only line without `NODE_ENV` (less explicit for production).

**If something breaks:** EB health check fails or wrong app behavior → confirm `server` build emits `dist/server/server.js` and `npm run start:prod` locally.

---

## `.github/workflows/deploy-staging.yml`

| Side | Content |
|------|---------|
| HEAD | `NODE_ENV=staging node dist/server.js` |
| `origin/dev` | `node dist/server/server.js` |

**Resolution:** `NODE_ENV=staging node dist/server/server.js`

**Rationale:** Same as production: correct compiled entry + explicit staging env per `server/package.json` `start:staging`.

**Rejected:** Old `dist/server.js` path; dev Procfile without `NODE_ENV=staging`.

**If something breaks:** Staging API wrong env → verify Procfile line matches `npm run start:staging` from `server/`.

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
