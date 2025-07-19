# NEW Source of Truth Table of Contents - New Source of Truth Being Built Piece by Piece

**Battle Screen Source of Truth**
- `[BattleGridScreen]` - Main battle screen orchestrator and container
  - [Battle Grid Screen](../src/screens/BattleGridScreen.tsx)
  - [Battle Grid Screen MD](sources-of-truth/battle-grid-screen/BattleGridScreen.md)
  
  - `[useBattleSync]` - Server/client data synchronization and orchestration (**belongs to: BattleGridScreen**)
    - [useBattleSync](../src/hooks/useBattleSync.ts)
    - [useBattleSync MD](sources-of-truth/battle-grid-screen/useBattleSync.md)
  
  - `[useBattleState]` - Battle state, error management, and lifecycle management (**belongs to: BattleGridScreen**)
    - [useBattleState](../src/hooks/useBattleState.ts)
    - [useBattleState MD](sources-of-truth/battle-grid-screen/useBattleState.md)

  - `[battleGridStyles]` - Visual styling and responsive layout utilities (**belongs to: BattleGridScreen**)
    - [battleGridStyles](../src/styles/battleGridStyles.ts)
    - [battleGridStyles MD](sources-of-truth/battle-grid-screen/battleGridStyles.md)

  **JSX Transitional Component: Battle Screen 'Child Export', Battle Network 'Parent Import'**
  - `[BattleNetworkGrid]` - Network visual renderer (**belongs to: BattleGridScreen**)
    - [BattleNetworkGrid](../src/components/battle/BattleNetworkGrid.tsx)
    - [BattleNetworkGrid MD](sources-of-truth/battle-grid-screen/battle-network-grid/BattleNetworkGrid.md)
  
    **Battle Network Source of Truth**
    - `[useBattleNetwork]` - Network topology and connection data (**belongs to: BattleNetworkGrid**)
      - [useBattleNetwork](../src/hooks/useBattleNetwork.ts)
      - [useBattleNetwork MD](sources-of-truth/battle-grid-screen/battle-network-grid/use-battle-network/useBattleNetwork.md)
    
      **Network Node Source of Truth**
      - `[useBattleNodes]` - Node positioning and ownership data (**belongs to: useBattleNetwork**)
        - [useBattleNodes](../src/hooks/useBattleNodes.ts)
        - [useBattleNodes MD](sources-of-truth/battle-grid-screen/battle-network-grid/use-battle-network/use-battle-nodes/useBattleNodes.md)
    
      **Network Lines Source of Truth**
      - `[useBattleLines]` - Line calculation utilities (**belongs to: useBattleNetwork**)
        - [useBattleLines](../src/hooks/useBattleLines.ts)
        - [useBattleLines MD](sources-of-truth/battle-grid-screen/battle-network-grid/use-battle-network/use-battle-lines/useBattleLines.md)

