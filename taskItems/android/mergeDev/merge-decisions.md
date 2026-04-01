# Merge Decisions — dev → android_mergeDev (2026-04-01)

---

## 1. `mobile/package.json`

| Side | Content |
|------|---------|
| **HEAD (android_mergeDev base = androidStaging)** | `"version": "3.7.0"`, `"versionCode": 116` |
| **dev** | `"version": "3.7.1"` (no `versionCode`) |

**Resolution:** Took dev's version bump (`3.7.1`) and kept Android's `versionCode: 116`.

**Rationale:** `versionCode` is Android-specific (required for Google Play Console uploads — each upload must increment). Dev does not track it. Version string matches dev's latest release line.

**Rejected content:** HEAD's `"version": "3.7.0"` — stale version string vs dev.

**Failure-mode hints:** If `versionCode` is missing or lower than the last Play Console upload, the AAB/APK will be rejected on upload. Before the next store upload from this branch, bump `versionCode` above the last published value if needed.

---

## Deploy workflow files

No conflicts. Kept HEAD per merge-flow for any future workflow conflicts; workflows unchanged by intent.
