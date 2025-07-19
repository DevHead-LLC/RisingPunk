/**
 * @file BattleNetworkGrid.tsx
 * @description Self-contained network visualization component with direct server integration
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useGetBattleStateQuery } from '../../store/api/battleApi';

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
  battleId: string;
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
  battleId,
  onNodePress,
  nodeSize = 20,
  lineColor = '#666666',
  lineWidth = 2,
  showNodeLabels = true,
}: Props) => {
  // Get screen dimensions for server calculations
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Direct API call to get battle state
  const { 
    data: battleState, 
    isLoading: battleLoading, 
    error: battleError 
  } = useGetBattleStateQuery(
    { battleId, screenWidth, screenHeight }, 
    {
      pollingInterval: 1000, // Poll every 1 second for real-time updates
      skip: !battleId,
    }
  );

  // SIMPLE LOG: Only log problems
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

  // Show loading state while fetching server data
  if (battleLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4717F6" />
        <Text style={styles.loadingText}>Loading network...</Text>
      </View>
    );
  }

  // Show error state if server data fails
  if (battleError || !battleState) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load network</Text>
        <Text style={styles.errorSubtext}>Please try again</Text>
      </View>
    );
  }

  // Server provides all network data - use directly
  const nodes = battleState.nodes || [];
  const connections = battleState.networkConnections || [];
  const lineProperties = battleState.lineProperties || [];

  return (
    <View style={styles.container}>
      {/* Render connection lines */}
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
