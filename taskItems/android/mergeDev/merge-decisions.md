# Merge Decisions — dev → android_mergeDev (2026-04-05)

---

## 1. `mobile/package.json`

| Side | Content |
|------|---------|
| **HEAD (android_mergeDev base = androidStaging)** | `"version": "3.7.1"`, `"versionCode": 118` |
| **dev** | `"version": "4.0.0"` (no `versionCode`) |

**Resolution:** Took dev's version (`4.0.0`) and kept Android's `versionCode: 118`.

**Rationale:** Release string follows `dev`. `versionCode` is Android / Play Console authority on this branch; `dev` does not carry it.

**Rejected content:** HEAD's `"version": "3.7.1"` — behind dev's release line.

**Failure-mode hints:** Before the next Play upload from this branch, ensure `versionCode` exceeds the last value accepted in Play Console; bump if needed.

---

## 2. `mobile/src/screens/HackMapScreen.tsx`

| Side | Content |
|------|---------|
| **HEAD** | `ProbeAnimationLayer` remains inside the panned `Animated.View` with `nestedInMapView` + `mapTapGesture={tapGesture}` (Android tap-to-cell / probe layering). No `AttackMarchAnimationLayer` after the gesture block. |
| **dev** | Sibling `AttackMarchAnimationLayer` after `GestureDetector` (tap-through fix for march icons). Second, outer `ProbeAnimationLayer` without `nestedInMapView` / `mapTapGesture`. |

**Resolution:** Kept HEAD's single in-map `ProbeAnimationLayer` (with `nestedInMapView` and `mapTapGesture`). Added dev's `AttackMarchAnimationLayer` block only (comment + component) as a sibling after the inner `</View>`, before the outer map `</View>`. Dropped dev's duplicate outer `ProbeAnimationLayer`.

**Rationale:** Android-first: preserves the staging map probe + tap integration. Dev-second: brings march attack overlay without regressing probe behavior or duplicating probes.

**Rejected content:** Dev's outer `ProbeAnimationLayer` — would duplicate probes and remove `nestedInMapView` / tap gesture wiring.

**Failure-mode hints:** If probes fail to follow the map pan/zoom or march icons open the tile modal underneath, re-check this tree: probes should stay inside the transformed map layer; attack march overlay stays outside `GestureDetector` per dev.

---

## Deploy workflow files

No conflicts. Kept HEAD per merge-flow for any future workflow conflicts; workflows unchanged by intent.
