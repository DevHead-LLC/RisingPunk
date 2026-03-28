# Merge Decisions — dev → android_mergeDev (2026-03-28)

---

## 1. `mobile/package.json`

| Side | Content |
|------|---------|
| **HEAD (android_mergeDev base = androidStaging)** | `"version": "3.5.0"`, `"versionCode": 110` |
| **dev** | `"version": "3.6.0"` (no versionCode) |

**Resolution:** Took dev's version bump (`3.6.0`) and kept Android's `versionCode: 110`.

**Rationale:** `versionCode` is Android-specific (required for Google Play Console uploads — each upload must increment). Dev doesn't track it. Version string updated to match dev's latest.

**Rejected content:** HEAD's `"version": "3.5.0"` — stale version string.

**Failure-mode hints:** If `versionCode` is missing or lower than the last Play Console upload, the AAB/APK will be rejected on upload.

---

## Deploy workflow files

No conflicts. Kept HEAD per merge-flow for any future workflow conflicts; workflows unchanged by intent.
