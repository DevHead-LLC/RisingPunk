# **IMPLEMENT CORRECT BATTALION MOVEMENT LOGIC**

## **🎯 PRIORITY TASK: Fix battalion movement logic during retargeting**

**🐛 CORE PROBLEM:** Battalions are not following the correct conditional movement logic during retargeting, pathfinding, and movement phases

## **📋 CORRECT IMPLEMENTATION LOGIC:**

**Pathfinding Logic:**
- Pathfinding uses **nearest node to battalion's position** to calculate path
- **NOT** battalion's actual position for pathfinding
- **Example:** Nearest node = 3, Path = [3, 1, 5]

**Conditional Movement Logic:**
```
if (battalion actual position IS BETWEEN 3 and 1) {
  skip node 3, begin normal movement speed from actual position to node 1, then 5
} else if (battalion actual position is NOT between 3 and 1) {
  battalion moves at stat speed from actual position to node 3, then continues to node 1, and then 5
}
```

**Example Scenarios:**

**Scenario A - Battalion between nodes 3 and 1:**
- Battalion at position (400, 200) between nodes 3 and 1
- **Action:** Skip node 3, move from current position to node 1, then to node 5

**Scenario B - Battalion NOT between nodes 3 and 1:**
- Battalion at position (100, 100) (not between nodes 3 and 1)
- **Action:** Move from current position to node 3, then to node 1, then to node 5

## **🎯 IMPLEMENTATION REQUIREMENTS:**

**Files to Modify:**
- `server/src/services/MovementService.ts` - Update `initiateRetargetingMovement()` method
- `server/src/services/MovementService.ts` - Add `isPointBetweenNodes()` helper method
- `server/src/services/MovementService.ts` - Update movement target logic

**Key Logic Changes:**
1. **Check if battalion is between first two nodes** of the calculated path
2. **If between nodes:** Skip first node, move directly to second node
3. **If not between nodes:** Move to first node, then continue normal path
4. **Use actual battalion position** for all distance calculations

**🎯 NEXT ACTION:**
Find all holes in the retargeting, pathfinding, and movement phases where battalions aren't following the conditional logic and implement the correct behavior