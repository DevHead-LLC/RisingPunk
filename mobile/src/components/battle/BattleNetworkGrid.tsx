/**
 * @file BattleNetworkGrid.tsx
 * @description Single network visualization component that renders nodes and connections
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NodeIndex } from '../../types/battleTypes';
import { NetworkConnection, calculateLineProperties } from '../../hooks/useBattleNetwork';
import { BattleNodeState, getNodeColor, getNodeBorderColor } from '../../hooks/useBattleNodes';

interface Props {
  nodes: BattleNodeState[];
  connections: NetworkConnection[];
  onNodePress?: (nodeIndex: NodeIndex) => void;
  nodeSize?: number;
  lineColor?: string;
  lineWidth?: number;
  showNodeLabels?: boolean;
}

export const BattleNetworkGrid = React.memo(({ 
  nodes, 
  connections, 
  onNodePress, 
  nodeSize = 20, 
  lineColor = '#666666', 
  lineWidth = 2, 
  showNodeLabels = true 
}: Props) => {
  // Convert nodes array to positions record for line calculations
  const nodePositions = nodes.reduce((acc, node) => {
    acc[node.index] = node.position;
    return acc;
  }, {} as Record<NodeIndex, { x: number; y: number }>);

  return (
    <View style={styles.container}>
      {/* Render connection lines first (behind nodes) */}
      {connections.map((connection, index) => {
        const fromPos = nodePositions[connection.from];
        const toPos = nodePositions[connection.to];
        
        if (!fromPos || !toPos) return null;
        
        const lineProps = calculateLineProperties(fromPos, toPos);
        
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
              }
            ]}
          />
        );
      })}
      
      {/* Render nodes on top */}
      {nodes.map((node) => {
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
              }
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

        return <NodeContent key={node.index} />;
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  line: {
    position: 'absolute',
  },
  touchable: {
    position: 'absolute',
  },
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