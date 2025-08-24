# Current Task: Implement Research Unlock System

## Priority: Research Category Unlock Conditions

**STATUS**: Planning Phase - Setting up unlock system architecture

## Problem
Research categories are currently all locked with no unlock mechanism. We need to implement a comprehensive unlock system that checks:
1. Player level requirements
2. Balance availability 
3. Dependency chains (previous research categories unlocked)
4. Real-time validation from database

## Unlock Requirements Matrix

### **Tier 1: Basic Research**
1. **Home Defense** = Level 2 && $10,000 balance
2. **Hack Ability** = Level 5 && $20,000 balance && Home Defense Unlocked
3. **Financial** = Level 5 && $20,000 balance && Home Defense Unlocked

### **Tier 2: Intermediate Research**  
4. **Hack Crew** = Level 10 && $50,000 balance && Hack Ability unlocked && Financial unlocked
5. **NPC** = Level 10 && $50,000 balance && Hack Ability unlocked && Financial unlocked
6. **Cash Flow** = Level 10 && $50,000 balance && Hack Ability unlocked && Financial unlocked
7. **Construction** = Level 10 && $50,000 balance && Hack Ability unlocked && Financial unlocked

### **Tier 3: Advanced Research**
8. **Battle Mechanics** = Level 20 && $150,000 balance && Hack Crew unlocked && NPC unlocked && Cash Flow unlocked && Construction unlocked

### **Tier 4: Expert Research**
9. **Gear** = $400,000 balance && Battle Mechanics unlocked
10. **Investments** = Level 30 && $500,000 && Gear unlocked && Rental Properties 1-4 unlocked

## Technical Architecture Requirements

### **Database Architecture: Separate Collections Approach**
- **User Collection**: Keep existing structure intact, no new fields needed
- **Research Collection**: New collection with user-specific unlock status
- **Benefits**: 
  - User document stays clean and focused
  - Research system is modular and scalable
  - Easy to add new research categories without user schema changes
  - Better performance for research-specific queries

### **Universal Unlock System**
- Single unlock validation function that can check any research category
- Configurable unlock conditions per category
- Real-time database validation (no client-side assumptions)
- Balance deduction upon successful unlock
- Cache invalidation for unlock status updates

### **Database Schema Updates Needed**
- **Research Collection**: Create separate `research` collection for unlock status and conditions
- **User Collection**: Keep existing structure, only add `researchId` reference if needed
- **Research Model**: Define unlock conditions, dependencies, and user unlock status
- **Balance validation**: Ensure sufficient funds before unlock (using existing user.balance)
- **Rental Properties Integration**: Check existing user.unlockedFeatures.rentalHousing1-4 for Investments unlock
- **Balance Update Logic**: Deduct unlock costs and update user.balance after successful unlock

### **API Endpoints Required**
- `GET /api/research/unlock-status` - Check all research unlock eligibility
- `POST /api/research/unlock/:categoryId` - Unlock specific research category
- `GET /api/users/level` - Get current user level
- `GET /api/users/balance` - Get current user balance

### **Client-Side Implementation**
- ResearchScreen: Dynamic lock/unlock icon display
- Unlock validation: Check all conditions before allowing unlock
- Balance deduction: Update UI after successful unlock
- Dependency visualization: Show unlock requirements to user

## Implementation Phases

### **Phase 1: Database Schema & Models**
- [ ] Create Research model with unlock conditions and dependencies
- [ ] Create ResearchUser model for user-specific unlock status
- [ ] **NO User model changes needed** - keep existing structure
- [ ] Create unlock validation service
- [ ] Design collection relationships and indexing strategy

### **Phase 2: Server-Side Unlock Logic**
- [ ] Implement unlock condition checking with simple conditional logic
- [ ] Create balance validation middleware (check sufficient funds)
- [ ] Build dependency chain validation (if all conditions met, allow unlock)
- [ ] Implement unlock API endpoints with MongoDB transactions
- [ ] **Add unlock cost structure** for all 10 research categories
- [ ] **Implement rental property dependency checking** for Investments unlock
- [ ] **Create balance deduction logic** with proper transaction handling
- [ ] **Add unlock confirmation modal** with cost display and confirmation button

### **Phase 3: Client-Side Integration**
- [ ] Add unlock status fetching
- [ ] Implement dynamic lock/unlock display
- [ ] Add unlock confirmation modals
- [ ] Integrate balance updates

### **Phase 4: Testing & Validation**
- [ ] Test all unlock conditions
- [ ] Verify balance deduction
- [ ] Test dependency chains
- [ ] Validate real-time updates

## Current Status
🔄 **PLANNING PHASE**: Setting up unlock system architecture

## Database Schema Design

### **Research Collection (Global Research Definitions)**
```typescript
interface Research {
  _id: ObjectId;
  categoryId: string; // 'home-defense', 'hack-ability', etc.
  name: string; // 'Home Defense', 'Hack Ability', etc.
  levelRequirement: number;
  balanceRequirement: number;
  dependencies: string[]; // Array of categoryIds that must be unlocked first
  image: string; // Image path
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### **ResearchUser Collection (User-Specific Unlock Status)**
```typescript
interface ResearchUser {
  _id: ObjectId;
  userId: ObjectId; // Reference to User collection
  researchId: ObjectId; // Reference to Research collection
  isUnlocked: boolean;
  unlockedAt: Date | null;
  unlockCost: number; // Amount paid to unlock
  createdAt: Date;
  updatedAt: Date;
}
```

### **Collection Relationships**
- **User** → **ResearchUser** (one-to-many via userId)
- **Research** → **ResearchUser** (one-to-many via researchId)
- **No direct changes to User collection needed**

### **Indexing Strategy**
- `ResearchUser.userId` - For fast user research queries
- `ResearchUser.researchId` - For fast research-specific queries
- `ResearchUser.userId + ResearchUser.researchId` - Compound index for unique user-research combinations

## Missing Requirements (Critical for System Functionality)

### **1. Unlock Cost Structure**
```typescript
const RESEARCH_UNLOCK_COSTS = {
  'home-defense': 10000,      // $10,000
  'hack-ability': 20000,      // $20,000
  'financial': 20000,         // $20,000
  'hack-crew': 50000,         // $50,000
  'npc': 50000,               // $50,000
  'cash-flow': 50000,         // $50,000
  'construction': 50000,       // $50,000
  'battle-mechanics': 150000, // $150,000
  'gear': 400000,             // $400,000
  'investments': 500000       // $500,000
};
```

### **2. Complex Dependency Validation**
- **Battle Mechanics**: Requires ALL of [Hack Crew, NPC, Cash Flow, Construction] to be unlocked
- **Investments**: Requires Gear unlocked + ALL Rental Properties (1-4) unlocked
- **Validation Logic**: Must check multiple dependencies simultaneously

### **3. Balance Update Transaction**
- **Pre-unlock**: Validate sufficient balance exists
- **During unlock**: Deduct unlock cost from user.balance.total
- **Post-unlock**: Update user.balance.lastUpdated timestamp
- **Error handling**: Rollback if balance update fails

### **4. Rental Properties Integration**
- **Check existing data**: user.unlockedFeatures.rentalHousing1-4
- **Dependency validation**: Investments requires all 4 properties unlocked
- **Real-time checking**: Verify rental property status during unlock validation

## Dependencies
- ✅ **ResearchScreen**: Already implemented with lock icons
- ✅ **Lock Icon System**: Gray overlay with gold lock symbols
- ✅ **Category Ordering**: Correct sequence implemented
- ✅ **User Collection**: Already has level and balance fields
- ✅ **Rental Properties**: Already exist in user.unlockedFeatures
- ❌ **Unlock Logic**: Not implemented
- ❌ **Research Collections**: Need to create new collections
- ❌ **API Endpoints**: Need unlock validation endpoints
- ❌ **Cost Structure**: Need to define unlock costs
- ❌ **Dependency Validation**: Need complex dependency checking logic

## Implementation Strategy

### **Balance Update Pattern**
- **Database-first approach**: Update user.balance.total immediately upon unlock
- **Redux sync**: Update client-side balance for instant UI feedback
- **Transaction safety**: Use MongoDB transactions to ensure atomicity
- **No gaming possible**: Balance deduction happens server-side before unlock

### **Dependency Validation Logic**
```typescript
// Simple conditional approach - if all requirements met, allow unlock
const canUnlock = (
  user.level >= research.levelRequirement &&
  user.balance.total >= research.balanceRequirement &&
  allDependenciesUnlocked(user, research.dependencies)
);

if (canUnlock) {
  // Proceed with unlock transaction
} else {
  // Show unlock requirements to user
}
```

### **Transaction Implementation**
- **Lightweight MongoDB transactions**: Won't impact game performance
- **Atomic operations**: Balance deduction + unlock status update happen together
- **Rollback on failure**: If unlock fails, balance is restored automatically

### **Error Handling Strategy**
- **System-breaking errors**: Throw errors, show user-friendly message, navigate to safe screen
- **Validation errors**: Clear feedback about what requirements aren't met
- **Network errors**: Retry logic with user notification
- **Database errors**: Automatic rollback, user stays on current screen

### **User Scoping**
- **Research data**: Each user has separate research unlock status
- **Cache invalidation**: User-specific research data updates
- **No cross-contamination**: User A cannot see User B's research progress

## Next Steps
1. Design database schema for research unlocks
2. Plan unlock validation service architecture  
3. Define API endpoint structure
4. Begin Phase 1 implementation

---

## PREVIOUS TASKS (COMPLETED)

### **Research Category Reordering** ✅
- Reordered research categories to match specified sequence
- Home Defense → Hack Ability → Financial → Hack Crew → NPC → Cash Flow → Construction → Battle Mechanics → Gear → Investments

### **Lock Icon Implementation** ✅
- Added gray circular lock overlays centered on all research category images
- Implemented gold lock symbols (🔒) with proper positioning
- Created reusable lock overlay system for future unlock states
