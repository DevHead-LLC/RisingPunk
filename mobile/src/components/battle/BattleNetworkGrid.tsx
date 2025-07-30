/**
 * @file BattleNetworkGrid.tsx
 * @description Self-contained network visualization component with direct server integration
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NodeHealthBar } from './NodeHealthBar';
import { BattleLoadingError } from './BattleLoadingError';
import { useBattleState } from '../../hooks/useBattleState';

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
  tugOfWarProgress: number;
  maxCaptureThreshold: number;
}

interface Props {
  battleId: string;
  nodeSize?: number;
  lineColor?: string;
  lineWidth?: number;
  showNodeLabels?: boolean;
}

const getNodeColor = React.useCallback((owner: 'user' | 'enemy' | 'neutral'): string => {
  switch (owner) {
    case 'user': return '#4717F6';
    case 'enemy': return '#FF4141';
    default: return '#666666';
  }
}, []);

const getNodeBorderColor = React.useCallback((owner: 'user' | 'enemy' | 'neutral'): string => {
  switch (owner) {
    case 'user': return '#7C3AED';
    case 'enemy': return '#EF4444';
    default: return '#9CA3AF';
  }
}, []);

export const BattleNetworkGrid = React.memo(({
  battleId,
  nodeSize = 20,
  lineColor = '#666666',
  lineWidth = 2,
  showNodeLabels = true,
}: Props) => {
  const {
    data: battleState,
    isLoading: battleLoading,
    error: battleError,
  } = useBattleState({
    battleId,
    pollingInterval: 1000,
  });

  useEffect(() => {
    if (battleState && battleState.nodes?.length > 0) {
      const firstNode = battleState.nodes[0];
      if (!firstNode.index && firstNode.index !== 0) {
        console.log('❌ NODES MISSING INDEX/OWNER - Server sending Mongoose docs');
      }
    }
    if (battleState?.lineProperties && battleState.lineProperties.length > 0 && battleState.lineProperties[0].length === 0) {
      console.log('❌ LINE PROPS ALL ZERO - Server calculation failed');
    }
    if (battleError) {
      console.log('❌ NETWORK API ERROR:', battleError);
    }
  }, [battleState, battleError]);

  const nodes = React.useMemo(() => battleState?.nodes || [], [battleState?.nodes]);
  const connections = React.useMemo(() => battleState?.networkConnections || [], [battleState?.networkConnections]);
  const lineProperties = React.useMemo(() => battleState?.lineProperties || [], [battleState?.lineProperties]);

  const neutralNodes = React.useMemo(() => 
    nodes.filter(node => node.owner === 'neutral'), [nodes]
  );

  const renderNetwork = React.useMemo(() => {
    if (!battleState) return null;

    return (
      <View style={styles.container}>
        {lineProperties?.map((lineProps, index) => {
          const connection = connections?.[index];
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

        {nodes?.map((node) => (
          <React.Fragment key={node.index}>
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
            
            {node.owner === 'neutral' && (
              <NodeHealthBar node={node} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  }, [battleState, lineWidth, lineColor, nodeSize, showNodeLabels, nodes, connections, lineProperties]);

  return (
    <BattleLoadingError
      isLoading={battleLoading}
      error={battleError}
      loadingText="Loading network..."
      errorText="Failed to load network"
      errorSubtext="Please try again"
    >
      {renderNetwork}
    </BattleLoadingError>
  );
});

const styles = StyleSheet.create({
  container: { position: 'absolute', width: '100%', height: '100%' },
  line: { position: 'absolute' },
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
