# Battle Targeting Expectations

## Targeting Flow

### 1. Initial Battalion Movement
- Battalions move to a **RANDOM** neutral node from their available connected network lines
- Available neutral nodes: 3, 4, or 5 (the middle nodes)
- Movement is based on network connectivity from starting position

### 2. Retargeting Triggers
- **Node capture**: When any battalion's target node gets captured, trigger retarget for all affected battalions
- **Battalion destruction**: When target battalion is destroyed, trigger retarget

### 3. Retargeting Priority
- **NO priority between nodes vs battalions**
- **Pure proximity-based targeting**: Target the closest available entity
- **Available targets**: 
  - Neutral nodes (not owned, not captured)
  - Opposing battalions
- **Selection criteria**: Whichever is closest in proximity

## Implementation Notes

- Remove the current "neutral nodes first" priority system
- Implement random initial targeting for neutral nodes
- Use pure distance-based targeting for all retargeting decisions
- Maintain network connectivity constraints for node targeting
