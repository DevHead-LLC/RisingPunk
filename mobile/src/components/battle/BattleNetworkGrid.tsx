/**
 * @file BattleNetworkGrid.tsx
 * @description Single network visualization component that renders nodes and connections
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NetworkConnection, calculateLineProperties } from '../../hooks/useBattleLines';
import { BattleNodeState, getNodeColor, getNodeBorderColor, NodeIndex } from '../../hooks/useBattleNodes';

interface Props {
  nodes: BattleNodeState[];
  connections: NetworkConnection[];
  onNodePress?: (nodeIndex: NodeIndex) => void;
  nodeSize?: number;
  lineColor?: string;
  lineWidth?: number;
  showNodeLabels?: boolean;
}

/**
 * orchestrateNetworkData() - Network Data Orchestration
 * PURPOSE: Combines node and connection data for visual rendering
 * USED BY: BattleNetworkGrid component to prepare data for display
 *          Handles data transformation and line property calculations
 */
function orchestrateNetworkData(nodes: BattleNodeState[], connections: NetworkConnection[]) {
  // Convert nodes array to positions record for line calculations
  const nodePositions = nodes.reduce((acc, node) => {
    acc[node.index] = node.position;
    return acc;
  }, {} as Record<NodeIndex, { x: number; y: number }>);

  // Calculate line elements with pre-computed properties
  const lineElements = connections.map((connection, index) => {
    const fromPos = nodePositions[connection.from];
    const toPos = nodePositions[connection.to];

    if (!fromPos || !toPos) {
      return null;
    }

    const lineProps = calculateLineProperties(fromPos, toPos);

    return {
      key: `${connection.from}-${connection.to}-${index}`,
      from: connection.from,
      to: connection.to,
      lineProps,
    };
  }).filter((element): element is NonNullable<typeof element> => element !== null);

  return {
    nodePositions,
    lineElements,
  };
}

export const BattleNetworkGrid = React.memo(({
  nodes,
  connections,
  onNodePress,
  nodeSize = 20,
  lineColor = '#666666',
  lineWidth = 2,
  showNodeLabels = true,
}: Props) => {
  // Get pre-calculated network visual data
  const { lineElements } = orchestrateNetworkData(nodes, connections);

  return (
    <View style={styles.container}>
      {/* Render connection lines first (behind nodes) */}
      {lineElements.map((lineElement) => {
        return (
          <View
            key={lineElement.key}
            style={[
              styles.line,
              {
                width: lineElement.lineProps.length,
                height: lineWidth,
                backgroundColor: lineColor,
                left: lineElement.lineProps.left,
                top: lineElement.lineProps.top - lineWidth / 2,
                transform: [{ rotate: `${lineElement.lineProps.angle}deg` }],
                transformOrigin: '0 50%',
              },
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
