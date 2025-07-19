import { NodeIndex, BattleNodeState } from './useBattleNodes';

/**
 * NetworkConnection Interface
 * PURPOSE: Defines the structure of a connection between two nodes
 * USED BY: BattleGridScreen receives this data to understand network topology
 *          BattleNetworkGrid uses this to know which nodes to connect with lines
 */
export interface NetworkConnection {
  from: NodeIndex; // Source node index (0-8)
  to: NodeIndex;   // Destination node index (0-8)
}

/**
 * LineProperties Interface  
 * PURPOSE: Defines the visual properties needed to render a connection line
 * USED BY: BattleNetworkGrid uses these properties to position and rotate line elements
 *          Contains length, angle, and starting position for CSS transforms
 */
export interface LineProperties {
  length: number; // Distance between nodes (for line width)
  angle: number;  // Rotation angle in degrees (for line direction)
  left: number;   // Starting X position (for line positioning)
  top: number;    // Starting Y position (for line positioning)
}

/**
 * calculateLineProperties() - Utility Function
 * PURPOSE: Calculates visual properties needed to render connection lines between nodes
 * USED BY: BattleNetworkGrid calls this for each connection to get line rendering properties
 *          Returns length, angle, and position for CSS transforms on line elements
 * 
 * CALCULATIONS:
 * - Length: Euclidean distance between node positions
 * - Angle: Direction from source to destination node (for line rotation)
 * - Position: Starting coordinates for line element positioning
 * 
 * VISUAL RENDERING: These properties are used to create rotated line elements that
 *                   visually connect nodes in the battle interface
 */
/**
 * getNetworkConnections() - Network Topology Source of Truth
 * PURPOSE: Defines which nodes connect to which for line rendering
 * USED BY: BattleGridScreen imports this to get network topology
 *          BattleNetworkGrid uses this to know which nodes to connect with lines
 */
export function getNetworkConnections(): NetworkConnection[] {
  return [
    // Node 0 connections (top-left user territory)
    { from: 0, to: 3 }, // Connects to top-center neutral
    { from: 0, to: 4 }, // Connects to middle-center neutral

    // Node 1 connections (middle-left user territory)  
    { from: 1, to: 3 }, // Connects to top-center neutral
    { from: 1, to: 4 }, // Connects to middle-center neutral
    { from: 1, to: 5 }, // Connects to bottom-center neutral

    // Node 2 connections (bottom-left user territory)
    { from: 2, to: 4 }, // Connects to middle-center neutral
    { from: 2, to: 5 }, // Connects to bottom-center neutral

    // Node 6 connections (top-right enemy territory)
    { from: 6, to: 3 }, // Connects to top-center neutral
    { from: 6, to: 4 }, // Connects to middle-center neutral

    // Node 7 connections (middle-right enemy territory)
    { from: 7, to: 3 }, // Connects to top-center neutral
    { from: 7, to: 4 }, // Connects to middle-center neutral
    { from: 7, to: 5 }, // Connects to bottom-center neutral

    // Node 8 connections (bottom-right enemy territory)
    { from: 8, to: 4 }, // Connects to middle-center neutral
    { from: 8, to: 5 }, // Connects to bottom-center neutral
  ];
}

export function calculateLineProperties(
  fromPos: { x: number; y: number }, // Source node position
  toPos: { x: number; y: number }    // Destination node position
): LineProperties {
  // Calculate distance between nodes
  const deltaX = toPos.x - fromPos.x;
  const deltaY = toPos.y - fromPos.y;

  // Calculate line length (Euclidean distance)
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  // Calculate line angle in degrees (for CSS rotation)
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  // Return properties for line rendering
  return {
    length,        // Used as line width in CSS
    angle,         // Used as rotation transform in CSS
    left: fromPos.x, // Starting X position for line element
    top: fromPos.y,  // Starting Y position for line element
  };
}


