# Merge Decisions — dev → android_mergeDev (2026-05-02)

---

## 1. `mobile/package.json`

| Side | Content |
|------|---------|
| **HEAD (androidStaging)** | `"version": "5.2.0"`, `"versionCode": 137` |
| **dev** | `"version": "5.3.0"` (no `versionCode`) |

**Resolution:** Kept Android branch values (`"version": "5.2.0"` and `"versionCode": 137`).

**Rationale:** `versionCode` is Android/Play authority and must stay present and consistent with the Android release train. Do not adopt dev-only version metadata without an intentional Android bump.

**Rejected content:** Dev-only `"version": "5.3.0"` without `versionCode`.

**Failure-mode hints:** Before Play upload, confirm `versionCode` exceeds the latest build in Play Console and bump deliberately when shipping.

---

## 2. `mobile/package-lock.json`

**Resolution:** Ran `npm install` in `mobile/` after resolving `package.json` so root and `packages[""]` versions match `5.2.0` and `hasInstallScript` remains aligned with `postinstall`.

**Rationale:** Lockfile must match authoritative `package.json`.

**Failure-mode hints:** If CI or local install disagrees on versions, re-run `npm install` from `mobile/` after any manual `package.json` edit.

---

## 3. `mobile/src/screens/HackMapScreen.tsx` (`visibleCells` — virtual scroll vs window range)

| Side | Content |
|------|---------|
| **HEAD** | `fillCellsFromWindowRange()` helper with `if (!terrain) continue`; virtual branch uses direct `staticTerrainData[tileKey]` / `if (!terrain) return`; `cells.length === 0` fallback to window range (Android blank-map guard). |
| **dev** | No helper; virtual and window loops use `hasTerrainData`, `terrain ?? 'plain'`, and conditional `entity` / `entityImage` reads plus panning entity-disappear fix comments. |

**Resolution:** Kept HEAD structure: `fillCellsFromWindowRange`, virtual-tiles branch, empty-virtual fallback to window range, and Android comments. Applied dev’s per-tile read pattern (`hasTerrainData`, `?? 'plain'`, entity/entityImage guards and comments) inside both the helper and the virtual `forEach`.

**Rationale:** Android-first: preserve empty-grid fallback and window-range fill. Dev-second: bring ref-timing and entity-image fallback behavior without dropping the Android-specific virtual→window fallback.

**Rejected content:** Dev-only flat structure without `fillCellsFromWindowRange` / empty-virtual fallback; HEAD-only `if (!terrain) continue` / `return` that skipped dev’s terrain/entity read hardening.

**Failure-mode hints:** If the map goes blank after pan or refetch, confirm `fillCellsFromWindowRange` still runs when `virtualViewport.visibleTiles` is non-empty but yields zero cells; if entities vanish on pan stop, confirm `hasTerrainData` / `entityImage` paths remain in both branches.

---

## Deploy workflow files

No conflicts this session. Kept HEAD per merge-flow; `.github/workflows/deploy-production.yml` and `.github/workflows/deploy-staging.yml` unchanged by intent.
