/**
 * @component NodeVisual
 * @description Renders a single battle node
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BattleNode } from '../../types/battle';
import { COLORS } from '../../styles/theme';

type Props = {
  node: BattleNode;
  isActive: boolean;
};

export const NodeVisual = React.memo(({ node, isActive }: Props) => {
  const nodeColor = node.controlState === 'user' ? COLORS.primary : 
                   node.controlState === 'enemy' ? COLORS.error :
                   COLORS.neutral;

  return (
    <View style={[
      styles.node,
      { backgroundColor: nodeColor },
      { left: node.x, top: node.y }
    ]} />
  );
});

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
  }
}); 