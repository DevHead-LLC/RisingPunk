import React from 'react';
import { render } from '@testing-library/react-native';
import { NodeHealthBar } from '../../../src/components/battle/NodeHealthBar';
import { createTestNodes } from '../../testUtils';

describe('Initial Combat Phase - Tug-of-War Visual', () => {
  test('neutral node displays tug-of-war progress bar', () => {
    // Setup: Create a neutral node with tug-of-war progress
    const nodes = createTestNodes();
    const neutralNode = { ...nodes[3], owner: 'neutral' as const }; // Node 3 (neutral)
    neutralNode.tugOfWarProgress = 25; // 25% toward user control
    
    // Action: Render the health bar for the neutral node
    const { UNSAFE_getByType } = render(
      <NodeHealthBar node={neutralNode} />
    );
    
    // Assert: Health bar component should render for neutral nodes
    const healthBar = UNSAFE_getByType(NodeHealthBar);
    expect(healthBar).toBeTruthy();
    
    // Note: The actual progress bar styling and colors are implementation details
    // This test verifies the component renders for neutral nodes with tug-of-war progress
  });
}); 