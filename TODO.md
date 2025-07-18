# TODO - RisingPunk Development Tasks

---

## **Current Tasks**

### **Timer Anti-Cheat Implementation**
**Priority:** Medium | **Time:** 3-4 hours | **Status:** Planned

**Problem:** Timer skips seconds due to network delays (16→14, 4→2)

**Solution:** Client timer + server validation every 5 seconds
- Client runs smooth 1s countdown
- Server validates every 5s, resets battle if mismatch
- Anti-cheat detection with logging

**Key Files:**
- `mobile/src/hooks/useBattleSync.ts`
- `mobile/src/components/battle/BattleOverlayManager.tsx`
- `server/src/routes/battle.ts`
- `server/src/controllers/BattleController.ts`

**Critical Notes:**
- Sync client timer with server on battle phase start
- Handle network delays (tolerance ±2s)
- Clean timer state on unmount/battle end

---

## **Future Tasks**

### **Batch 2: Error State Logic**
**Priority:** High | **Status:** Next in queue

### **WebSocket Implementation**
**Priority:** Low | **Status:** Future enhancement

### **Performance Optimizations**
**Priority:** Low | **Status:** Future enhancement

---

## **Task Template**

### **[Task Name]**
**Priority:** [High/Medium/Low] | **Time:** [X hours] | **Status:** [Planned/In Progress/Done]

**Problem:** [Brief description]

**Solution:** [Brief description]

**Key Files:** [List of files to modify]

**Critical Notes:** [Important implementation details] 