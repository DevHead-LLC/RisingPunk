# Merge decisions: `origin/dev` → `android_mergeDev` (March 23, 2026)

Session log for conflict resolutions. Priority: Android deploy / Play Console first, then dev behavior.

---

## Deploy workflows

No conflicts in `.github/workflows/deploy-production.yml` or `deploy-staging.yml` this session. **Kept HEAD per merge-flow; workflows unchanged by intent.**

---

## `mobile/package.json`

| Side | Content |
|------|---------|
| HEAD (`androidStaging` lineage) | `"version": "3.2.0"`, `"versionCode": 104` |
| `origin/dev` | `"version": "3.3.0"` (no `versionCode`) |

**Resolution:** `"version": "3.3.0"` + `"versionCode": 104`.

**Rationale:** Version label tracks dev. `versionCode` stays from the Android branch for Gradle / Play monotonicity until the next intentional store bump.

**Rejected:** Dropping `versionCode`. Keeping `3.2.0` only.

**If something breaks:** Gradle missing `versionCode` → restore in `package.json`. Play upload rejected for duplicate code → bump `versionCode` in a dedicated commit.

---

## `mobile/src/screens/HackMapScreen.tsx` (active probes + move property)

| Side | Content |
|------|---------|
| HEAD | `useGetActiveProbesQuery` with `refetch: refetchActiveProbes`; no `useMovePropertyMutation` on this block |
| `origin/dev` | `useMovePropertyMutation` + `useGetActiveProbesQuery` without `refetch` |

**Resolution:** Both hooks: `useMovePropertyMutation()` then `useGetActiveProbesQuery` with `refetch: refetchActiveProbes` (dev’s move-property API + HEAD’s refetch used by probe completion effects).

**Rationale:** Dev adds move-property; Android branch added probe refetch after complete — both behaviors are required.

**Rejected:** Dev-only (lose refetch → stale probe UI). HEAD-only (lose move mutation → build/runtime errors where `movePropertyMutation` is used).

**If something breaks:** Move property fails → check `handleMovePropertyPress` / `movePropertyMutation`. Probes stuck after complete → check `refetchActiveProbes` call sites.

---

## `mobile/src/screens/HackMapScreen.tsx` (selected-cell modal `useCallback` deps)

| Side | Content |
|------|---------|
| HEAD | Shorter dependency array (no `probes`, no share/move handlers) |
| `origin/dev` | Full deps including `probes`, `handleShareLocationPress`, `effectiveMyPosition`, `currentBalanceDisplay`, `handleMovePropertyPress` |

**Resolution:** `origin/dev` dependency array.

**Rationale:** Modal renders share location + move property; those handlers and `probes` belong in the dependency list so the callback matches dev’s UI.

**Rejected:** HEAD’s shorter list (risk stale closures for new buttons).

**If something breaks:** Wrong labels or handlers on cell modal → verify deps match values used inside the callback.
