# Merge Decisions — dev -> android_mergeDev (2026-04-25)

---

## 1. `mobile/package.json`

| Side | Content |
|------|---------|
| **HEAD (androidStaging)** | `"version": "4.1.0"`, `"versionCode": 126` |
| **dev** | `"version": "5.0.0"` (no `versionCode`) |

**Resolution:** Took dev `version` (`5.0.0`) and kept Android `versionCode: 126`.

**Rationale:** Keep Android Play Console authority (`versionCode`) while advancing app semantic version from dev.

**Rejected content:** HEAD-only `version: 4.1.0`.

**Failure-mode hints:** Before publishing, verify `versionCode` is higher than the latest accepted Play build.

---

## 2. `mobile/package-lock.json`

| Side | Content |
|------|---------|
| **HEAD (androidStaging)** | `packages[""].version: "2.8.0"`, `hasInstallScript: true` |
| **dev** | `packages[""].version: "4.1.0"` (no `hasInstallScript`) |

**Resolution:** Set `packages[""].version` to dev (`4.1.0`) and kept `hasInstallScript: true` from HEAD.

**Rationale:** Preserve Android install-script metadata while taking the newer lockfile root version present on dev.

**Rejected content:** HEAD `packages[""].version: 2.8.0`; dev omission of `hasInstallScript`.

**Failure-mode hints:** If postinstall behavior regresses locally/CI, confirm lockfile still includes `hasInstallScript: true` for root package.

---

## Deploy workflow files

No conflicts. Kept HEAD per merge-flow; workflows unchanged by intent.
