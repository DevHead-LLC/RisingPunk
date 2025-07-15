# Battle Preparation to Battle

## Step 4: Battle Preparation to Battle

**1. User Experience Behavior:**
- User sees the Battle Preparation Screen with "BATTLE PREPARATION" title
- Screen shows two sections: "USER FORCES" and "ENEMY FORCES" (swipeable)
- User can assign bots to Battalion A and B slots (currently functional but not connected)
- **Future Implementation**: Battalion assignments from this screen will be mapped to specific node positions in battle (currently defaults to single battalion of each bot type per node)
- User clicks the "DEPLOY PURGE" button at the bottom
- Screen transitions to BattleGridScreen where the pre-battle countdown overlay will begin

**2. Feature Description:**
- **Battle preparation interface**: Battalion assignment and deployment setup
  - [`../src/screens/BattlePreparationScreen.tsx`](../src/screens/BattlePreparationScreen.tsx) - Main preparation screen with battalion slots and deployment button
  - [`../src/components/battle/BattalionSlot.tsx`](../src/components/battle/BattalionSlot.tsx) - Individual battalion slots for bot assignment
  - [`../src/components/battle/BattalionBotSelector/index.tsx`](../src/components/battle/BattalionBotSelector/index.tsx) - Bot selection modal for battalion assignment
- **Deployment navigation**: Transition from preparation to battle
  - [`../src/screens/TurfScreen.tsx`](../src/screens/TurfScreen.tsx) - Navigation logic that routes from 'battlePrep' to 'battle' screen
  - [`../src/screens/BattleGridScreen.tsx`](../src/screens/BattleGridScreen.tsx) - Destination battle screen with network visualization
- **Deployment button**: Final action to start battle sequence
  - [`../src/screens/BattlePreparationScreen.tsx`](../src/screens/BattlePreparationScreen.tsx) - "DEPLOY PURGE" button with onBattleStart callback
  - [`../src/screens/TurfScreen.tsx`](../src/screens/TurfScreen.tsx) - onBattleStart handler that navigates to 'battle' screen

**3. Source of Truth:**
- **Navigation State**: [`../src/screens/TurfScreen.tsx`](../src/screens/TurfScreen.tsx) - Controls screen transitions via currentScreen state
- **Preparation State**: [`../src/screens/BattlePreparationScreen.tsx`](../src/screens/BattlePreparationScreen.tsx) - Manages battalion assignments and bot selection
- **Deployment Action**: [`../src/screens/BattlePreparationScreen.tsx`](../src/screens/BattlePreparationScreen.tsx) - "DEPLOY PURGE" button triggers battle start

**4. Code Location Analysis:**
- **Current Location**: 
  - Client-side: All preparation logic, navigation, and deployment button handling
  - Server-side: Battalion assignment API calls (assignToBattalion mutation)
- **Should Live**: 
  - **Client-side**: UI components, navigation, deployment button, local state management
  - **Server-side**: Battalion assignment validation, battle initialization (future)
  - **Evaluation**: Correctly placed - UI and navigation should remain client-side, deployment action should trigger server-side battle initialization 