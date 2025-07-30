/**
 * @file BattleNetworkGrid.tsx
 * @description Self-contained network visualization component with direct server integration
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useGetBattleStateQuery } from '../../store/api/battleApi';
import { NodeHealthBar } from './NodeHealthBar';

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

const getNodeColor = (owner: 'user' | 'enemy' | 'neutral'): string => {
  switch (owner) {
    case 'user': return '#4717F6';
    case 'enemy': return '#FF4141';
    default: return '#666666';
  }
};

const getNodeBorderColor = (owner: 'user' | 'enemy' | 'neutral'): string => {
  switch (owner) {
    case 'user': return '#7C3AED';
    case 'enemy': return '#EF4444';
    default: return '#9CA3AF';
  }
};

export const BattleNetworkGrid = React.memo(({
  battleId,
  nodeSize = 20,
  lineColor = '#666666',
  lineWidth = 2,
  showNodeLabels = true,
}: Props) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const {
    data: battleState,
    isLoading: battleLoading,
    error: battleError,
  } = useGetBattleStateQuery(
    { battleId, screenWidth, screenHeight },
    {
      pollingInterval: 1000,
      skip: !battleId,
    }
  );

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

  if (battleLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4717F6" />
        <Text style={styles.loadingText}>Loading network...</Text>
      </View>
    );
  }

  if (battleError || !battleState) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load network</Text>
        <Text style={styles.errorSubtext}>Please try again</Text>
      </View>
    );
  }

  const nodes = battleState.nodes || [];
  const connections = battleState.networkConnections || [];
  const lineProperties = battleState.lineProperties || [];

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
  loadingContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  loadingText: {
    marginTop: 10,
    color: '#4717F6',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.1)',
  },
  errorText: {
    color: '#FF4141',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
});
