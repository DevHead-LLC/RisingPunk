# Merge Decisions — dev → android_mergeDev (2026-04-12)

---

## 1. `mobile/package.json`

| Side | Content |
|------|---------|
| **HEAD (android_mergeDev base = androidStaging)** | `"version": "4.0.0"`, `"versionCode": 122` |
| **dev** | `"version": "4.0.1"` (no `versionCode`) |

**Resolution:** Took dev's version (`4.0.1`) and kept Android's `versionCode: 122`.

**Rationale:** Release string follows `dev`. `versionCode` is Android / Play Console authority on this branch; `dev` does not carry it.

**Rejected content:** HEAD's `"version": "4.0.0"` — behind dev's patch bump.

**Failure-mode hints:** Before the next Play upload from this branch, ensure `versionCode` exceeds the last value accepted in Play Console; bump if needed.

---

## 2. `server/src/services/BattleService.ts`

| Side | Content |
|------|---------|
| **HEAD** | Log: `NPC rewards failed (march return leg still runs):` |
| **dev** | Log: `NPC rewards failed (march follow-up still attempted if hack march):` |

**Resolution:** Took dev's log message (server behavior description; not Android-specific).

**Rationale:** Dev second — aligns log text with current march follow-up semantics.

**Rejected content:** HEAD's older phrasing.

**Failure-mode hints:** If debugging NPC reward failures vs march state, grep for this string in server logs.

---

## Deploy workflow files

No conflicts. Kept HEAD per merge-flow for any future workflow conflicts; workflows unchanged by intent.
