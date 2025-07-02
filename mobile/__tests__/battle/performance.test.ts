import { captureNode, updateNodeOwnership, resetNodeOwnership, getUserNodes, getEnemyNodes, getNeutralNodes, getPerformanceMetrics } from '../../src/utils/nodeOwnership';

describe('Step 1.3: Performance Optimization', () => {
  beforeEach(() => {
    resetNodeOwnership();
  });

  it('should not update ownership arrays if ownership does not change', () => {
    const before = getPerformanceMetrics().stateChangeCount;
    // Node 0 is already user-controlled
    const changed = updateNodeOwnership(0, 'user');
    expect(changed).toBe(false);
    const after = getPerformanceMetrics().stateChangeCount;
    expect(after).toBe(before);
  });

  it('should update state only when ownership changes', () => {
    const before = getPerformanceMetrics().stateChangeCount;
    // Node 3 is neutral, capture to user
    const changed = updateNodeOwnership(3, 'user');
    expect(changed).toBe(true);
    const after = getPerformanceMetrics().stateChangeCount;
    expect(after).toBe(before + 1);
  });

  it('should clear cache and reset metrics on reset', () => {
    updateNodeOwnership(3, 'user');
    resetNodeOwnership();
    const metrics = getPerformanceMetrics();
    expect(metrics.stateChangeCount).toBe(0);
    expect(metrics.cacheSize).toBe(0);
  });
}); 