# useBattleNetworkConnections Hook - Source of Truth

## File Description
The `useBattleNetworkConnections` hook provides network topology and connection data for the battle system. It defines the network structure that connects battle nodes and provides utilities for calculating line properties between connected nodes. This hook serves as the single source of truth for network topology, ensuring consistent connection patterns across the battle interface.

## Imported Logic
- **React hooks** - `useMemo` for performance optimization
- **Battle types** - `NodeIndex` interface for type safety
- **Math utilities** - `Math.sqrt`, `Math.atan2` for geometric calculations

## Internal Logic
- **Network topology definition** - Defines all valid connections between battle nodes
- **Connection patterns** - Establishes neighbor relationships in 3-column grid layout
- **Line property calculations** - Computes length, angle, and positioning for connection lines
- **Performance optimization** - Memoized network connections to prevent unnecessary recalculations
- **Pure function design** - Network connections are deterministic and testable

## Key Functions
- `getNetworkConnections` - Pure function that returns network topology
- `useBattleNetworkConnections` - Hook that provides memoized network connections
- `calculateLineProperties` - Utility for computing line rendering properties

## Network Topology
- **3-Column Grid Layout** - 9 nodes arranged in 3 columns (left, center, right)
- **Neighbor Connections** - Each node connects to adjacent nodes in center column
- **Strategic Positioning** - Connections enable movement between user, neutral, and enemy territories
- **Bidirectional Links** - Each connection is defined once but works in both directions

## Connection Patterns
- **Left Column (User Territory)** - Nodes 0, 1, 2 connect to center column
- **Center Column (Neutral Territory)** - Nodes 3, 4, 5 serve as connection hubs
- **Right Column (Enemy Territory)** - Nodes 6, 7, 8 connect to center column
- **Strategic Pathways** - Enables movement from user to enemy territory through neutral nodes

## Line Calculation Utilities
- **Length Calculation** - Euclidean distance between connected nodes
- **Angle Calculation** - Direction of connection line for proper rendering
- **Position Calculation** - Starting coordinates for line rendering
- **Geometric Accuracy** - Precise mathematical calculations for visual accuracy 