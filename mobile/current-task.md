# CURRENT TASK: Map performance optimization (virtualized tiles, memoization)

## Objectives
- Improve scroll/drag responsiveness without changing expected behavior.
- Reduce re-renders and mount/unmount churn while keeping the map deterministic and server-authoritative.

## Constraints
- No behavior changes (drag, inertia, tap-to-inspect stay the same).
- Avoid code duplication; keep a single source of truth.
- Keep edits minimal, focused, and under file size limits.

## Plan (step-by-step)
1) Precompute grid shell and memoize rows/tiles
- Precreate the row containers and grid/border visuals once.
- Position rows absolutely; rows do not re-render unless their visible tile set changes.
- Introduce a `Row` component wrapped in `React.memo`.
- Introduce a `Tile` component wrapped in `React.memo`.

2) Virtualize tile content only (keep full grid shell visible)
- Continue using the current windowRange approach but mount only tile content for visible cells.
- Keep the grid shell (lines/borders) always visible to avoid blank background flashes.
- Use stable keys and avoid inline object styles that change each render.

3) Reduce recalculations per render
- Precompute `terrainStyleByType` map once and reuse.
- Precompute per-column/row pixel positions once (arrays of x,y positions) and reuse.
- Batch window updates with requestAnimationFrame (already in place); consider skipping every other frame during fast inertial movement if needed.
- Ensure `computeWindow` is stable and only sets state on actual changes (already in place).

4) Optional: use native driver for pan transforms (safe trial)
- Switch `Animated` transforms to `useNativeDriver: true` for pan if it does not break current logic.
- Keep window computation on JS thread; transforms on UI thread.
- Roll back if any interaction regressions appear.

5) Optional: pooled tile views (recycler)
- Create a fixed pool sized to visible-capacity + buffer and recycle views by updating props/positions.
- Only proceed if it does not complicate click/press or introduce flicker.

## Deliverables (in order)
- A: `Row` + `Tile` components with `React.memo`; grid shell precomputed; windowed content mount only.
- B: Style caches (terrain style map) and precomputed position arrays; remove inline style object creation.
- C (optional): `useNativeDriver: true` for pan transforms with verification.
- D (optional): Implement a small tile view pool and measure; keep behavior identical.

## Success criteria
- Noticeably reduced lag on drag start and during movement.
- No blank gaps entering the viewport; tiles appear pre-rendered.
- Tap-to-inspect continues to work reliably.
- Inertial scrolling remains smooth and predictable.

## Out of scope (for this batch)
- Server map generation changes.
- Feature changes to houses, terrains, or gameplay logic.
