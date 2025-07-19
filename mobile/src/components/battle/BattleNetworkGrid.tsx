/**
 * @file BattleNetworkGrid.tsx
 * @description Pure network visualization component that renders nodes and connections
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Server-provided data types (matching server response)

export interface NetworkConnection {
  from: number;
  to: number;
}

export interface LineProperties {
  length: number;
  angle: number;
  left: number;
  top: number;
}

export interface BattleNodeState {
  index: number;
  position: { x: number; y: number };
  owner: 'user' | 'enemy' | 'neutral';
  health?: number;
  captureProgress?: number;
}

interface Props {
  nodes: BattleNodeState[];
  connections: NetworkConnection[];
  lineProperties: LineProperties[];
  onNodePress?: (nodeIndex: number) => void;
  nodeSize?: number;
  lineColor?: string;
  lineWidth?: number;
  showNodeLabels?: boolean;
}

// Server provides all network data - no fallback logic needed

/**
 * getNodeColor() - Node Visual Properties
 */
function getNodeColor(owner: 'user' | 'enemy' | 'neutral'): string {
  switch (owner) {
    case 'user': return '#4717F6'; // User blue
    case 'enemy': return '#FF4141'; // Enemy red
    default: return '#666666'; // Neutral gray
  }
}

/**
 * getNodeBorderColor() - Node Visual Properties  
 */
function getNodeBorderColor(owner: 'user' | 'enemy' | 'neutral'): string {
  switch (owner) {
    case 'user': return '#7C3AED'; // Lighter blue border
    case 'enemy': return '#EF4444'; // Lighter red border
    default: return '#9CA3AF'; // Light gray border
  }
}

export const BattleNetworkGrid = React.memo(({
  nodes,
  connections,
  lineProperties,
  onNodePress,
  nodeSize = 20,
  lineColor = '#666666',
  lineWidth = 2,
  showNodeLabels = true,
}: Props) => {
  // Server provides all network data - use directly
  const actualConnections = connections || [];
  const actualLineProperties = lineProperties || [];
  
  // SIMPLE LOG: Only log problems
  React.useEffect(() => {
    if (actualLineProperties?.length > 0 && actualLineProperties[0].length === 0) {
      console.log('❌ LINE PROPS ALL ZERO - Server calculation failed');
    }
  }, [actualLineProperties]);

  return (
    <View style={styles.container}>
      {/* Render connection lines */}
      {actualLineProperties?.map((lineProps, index) => {
        const connection = actualConnections?.[index];
        if (!connection) return null;

        return (
          <View
            key={`${connection.from}-${connection.to}-${index}`}
            style={[
              styles.line,
              {
                width: lineProps.length,
                height: lineWidth,
                backgroundColor: lineColor,
                left: lineProps.left,
                top: lineProps.top - lineWidth / 2,
                transform: [{ rotate: `${lineProps.angle}deg` }],
                transformOrigin: '0 50%',
              },
            ]}
          />
        );
      })}

      {/* Render nodes */}
      {nodes?.map((node) => {
        const NodeContent = () => (
          <View
            style={[
              styles.node,
              {
                width: nodeSize,
                height: nodeSize,
                borderRadius: nodeSize / 2,
                backgroundColor: getNodeColor(node.owner),
                borderColor: getNodeBorderColor(node.owner),
                left: node.position.x - nodeSize / 2,
                top: node.position.y - nodeSize / 2,
              },
            ]}
          >
            {showNodeLabels && (
              <Text style={styles.nodeLabel}>{node.index}</Text>
            )}
          </View>
        );

        if (onNodePress) {
          return (
            <TouchableOpacity
              key={node.index}
              onPress={() => onNodePress(node.index)}
              style={styles.touchable}
              activeOpacity={0.7}
            >
              <NodeContent />
            </TouchableOpacity>
          );
        }

        return (
          <View key={node.index}>
            <NodeContent />
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { position: 'absolute', width: '100%', height: '100%' },
  line: { position: 'absolute' },
  touchable: { position: 'absolute' },
  node: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  nodeLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
