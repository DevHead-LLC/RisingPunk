import React from 'react';
import { render, act } from '@testing-library/react-native';
import { BattleProvider, useBattle } from '../../contexts/BattleContext';

describe('BattleContext', () => {
  function renderWithContext() {
    let contextValue: ReturnType<typeof useBattle> | undefined;

    function TestComponent() {
      contextValue = useBattle();
      return null;
    }

    render(
      <BattleProvider>
        <TestComponent />
      </BattleProvider>
    );

    return () => contextValue!;
  }

  it('manages battalion deployment and state', () => {
    const getContext = renderWithContext();

    // Test battalion deployment
    const testBattalion = {
      id: 'test-1',
      type: 'guardian' as const,
      position: { x: 100, y: 100 },
      health: 100,
      quantity: 1000,
      targetId: null,
      nodeId: 0
    };

    act(() => {
      getContext().deployBattalion(testBattalion);
    });

    expect(getContext().state.battalions['test-1']).toEqual(testBattalion);

    // Test position update
    act(() => {
      getContext().updatePosition('test-1', { x: 200, y: 200 });
    });

    expect(getContext().state.battalions['test-1'].position).toEqual({ x: 200, y: 200 });

    // Test targeting
    act(() => {
      getContext().updateTarget('test-1', 'enemy-1');
    });

    expect(getContext().state.battalions['test-1'].targetId).toBe('enemy-1');

    // Test health update
    act(() => {
      getContext().updateHealth('test-1', 80);
    });

    expect(getContext().state.battalions['test-1'].health).toBe(80);
  });

  it('manages node control', () => {
    const getContext = renderWithContext();

    // Test node control update
    act(() => {
      getContext().updateNodeControl(3, 'blue', 50);
    });

    expect(getContext().state.nodes[3].controllingTeam).toBe('blue');
    expect(getContext().state.nodes[3].controlProgress).toBe(50);
  });

  it('manages battle phases', () => {
    const getContext = renderWithContext();

    // Initial phase should be deployment
    expect(getContext().state.phase).toBe('deployment');

    // Test battle start
    act(() => {
      getContext().startBattle();
    });

    expect(getContext().state.phase).toBe('active');

    // Test battle end
    act(() => {
      getContext().endBattle('red');
    });

    expect(getContext().state.phase).toBe('complete');
    expect(getContext().state.winner).toBe('red');
  });
}); 