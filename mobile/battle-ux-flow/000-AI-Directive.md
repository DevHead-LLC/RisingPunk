# AI Directive - Sources of Truth Architecture

## Purpose
This directive establishes the architecture and rules for organizing sources of truth in the battle system. It provides clear guidelines for AI assistants to understand, maintain, and extend the sources of truth documentation.

## Core Principles

### **1. Source of Truth Hierarchy**
- **Independent Sources**: Timer, Network, Bot systems (standalone, reusable)
- **Child Sources**: Overlays (belongs to Battle State, battle-specific)
- **Parent Sources**: Battle State (orchestrates children and imports independents)

### **2. Borrowing Pattern**
- **Source of Truth** = Imports actual implementation, owns the logic
- **Borrowing System** = Imports data from source of truth, doesn't own implementation
- **Mark borrowed items** with `← **Borrowed from: [Source](#anchor)**`

### **3. Dependency Flow**
```
Independent Sources (Timer, Network, Bots)
    ↓ exports data
Child Sources (Overlays) ← borrows data when needed
    ↓ exports overlay state
Parent Sources (Battle State) ← imports both independent and child data
```

### **4. File Organization Rules**
- **Independent**: Can be used anywhere, no battle-specific dependencies
- **Child**: Belongs to a parent system, battle-specific
- **Parent**: Orchestrates multiple systems, manages overall state

## Architecture Examples

### **Timer System (Independent)**
```typescript
// TimerService.ts - Independent Source of Truth
export class TimerService {
  // Owns ALL timer logic
  getCountdownData() { /* 3-second logic */ }
  getBattleData() { /* 20-second logic */ }
}
```

### **Overlay System (Child of Battle State)**
```typescript
// OverlayService.ts - Child of Battle State
import { TimerService } from './TimerService';

export class OverlayService {
  private timerService = new TimerService(); // Borrows timer
  
  getCountdownOverlay() {
    const timerData = this.timerService.getCountdownData(); // Borrowed
    return { type: 'countdown', data: timerData };
  }
}
```

### **Battle State (Parent/Orchestrator)**
```typescript
// useBattleState.ts - Parent/Orchestrator
import { TimerService } from './TimerService';
import { OverlayService } from './OverlayService';

export function useBattleState() {
  const timerService = new TimerService(); // Direct import for battle timer
  const overlayService = new OverlayService(); // Child import for overlays
  
  const battleTimer = timerService.getBattleData(); // Direct timer usage
  const countdownOverlay = overlayService.getCountdownOverlay(); // Overlay with borrowed timer
  
  return { battleTimer, countdownOverlay };
}
```

## When Adding New Files

### **Step 1: Determine Type**
- **Independent**: Is this a utility that could be used outside battles? (Timer, Network, Bots)
- **Child**: Is this battle-specific UI/state that belongs to a parent? (Overlays)
- **Parent**: Is this orchestrating multiple systems? (Battle State)

### **Step 2: Identify Dependencies**
- **What does this system need?** → Borrow from appropriate sources
- **What does this system provide?** → Export for borrowing
- **What owns the implementation?** → Only the source of truth imports actual logic

### **Step 3: Update Documentation**
- Add to appropriate section in `00-sot-toc.md`
- Mark borrowing relationships in `00-sources-of-truth.md`
- Follow the established patterns

## Documentation Structure

### **`00-sot-toc.md` - Table of Contents**
- **Desired Architecture**: Clean hierarchy following these principles
- **Current Architecture**: Current state for reference
- **Migration Path**: How to get from current to desired

### **`00-sources-of-truth.md` - Detailed File Descriptions**
- **Source of Truth Files**: Primary logic owners
- **Connected Controllers**: Systems that use source of truth data
- **Borrowed Items**: Marked with `← **Borrowed from: [Source](#anchor)**`

## Current Architecture Status

### **Desired State (Target)**
- Clean hierarchy with independent/child/parent relationships
- No circular dependencies
- Clear borrowing patterns
- Single responsibility for each system

### **Current State (As Is)**
- Mixed organization, some duplicates
- Unclear dependencies
- Some circular references
- Inconsistent patterns

### **Migration Goal**
- Gradually move from current to desired structure
- Maintain functionality while improving organization
- Document all borrowing relationships
- Establish clear ownership patterns

## Key Rules for AI Assistants

### **1. Always Check Hierarchy**
- Is this independent, child, or parent?
- What should it borrow from?
- What should it export?

### **2. Mark Borrowing Relationships**
- Use `← **Borrowed from: [Source](#anchor)**` format
- Only the source of truth imports actual implementation
- Other systems borrow data, not implementation

### **3. Maintain Linear Dependencies**
- Independent → Child → Parent
- No circular dependencies
- No diamond patterns

### **4. Update Both Files**
- `00-sot-toc.md` for high-level organization
- `00-sources-of-truth.md` for detailed relationships
- Keep both in sync

### **5. Follow Established Patterns**
- Use existing formatting and structure
- Maintain consistency with current examples
- Reference this directive for guidance

## Future Evolution

This directive can be updated as the architecture evolves. When making changes:

1. **Update this directive first**
2. **Update table of contents to reflect new structure**
3. **Update detailed descriptions with new relationships**
4. **Maintain backward compatibility where possible**

The goal is to create a maintainable, scalable architecture that clearly shows ownership and dependencies throughout the battle system. 