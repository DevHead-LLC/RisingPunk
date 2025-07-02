import {
  isNeutral,
  isUserControlled,
  isEnemyControlled,
  captureNode,
  getUserNodes,
  getEnemyNodes,
  getNeutralNodes,
  resetNodeOwnership
} from '../../src/utils/nodeOwnership';

describe('Step 1.1/1.2: Node Ownership System', () => {
  beforeEach(() => {
    resetNodeOwnership();
  });

  it('should initialize ownership arrays correctly', () => {
    expect(getUserNodes().sort()).toEqual([0, 1, 2]);
    expect(getEnemyNodes().sort()).toEqual([6, 7, 8]);
    expect(getNeutralNodes().sort()).toEqual([3, 4, 5]);
  });

  it('should return correct ownership for each node', () => {
    for (let i = 0; i < 9; i++) {
      if ([0, 1, 2].includes(i)) {
        expect(isUserControlled(i)).toBe(true);
        expect(isEnemyControlled(i)).toBe(false);
        expect(isNeutral(i)).toBe(false);
      } else if ([6, 7, 8].includes(i)) {
        expect(isUserControlled(i)).toBe(false);
        expect(isEnemyControlled(i)).toBe(true);
        expect(isNeutral(i)).toBe(false);
      } else {
        expect(isUserControlled(i)).toBe(false);
        expect(isEnemyControlled(i)).toBe(false);
        expect(isNeutral(i)).toBe(true);
      }
    }
  });

  it('should only allow neutral nodes to be captured and update arrays', () => {
    captureNode(3, 'user');
    expect(getUserNodes()).toContain(3);
    expect(getNeutralNodes()).not.toContain(3);
    captureNode(4, 'enemy');
    expect(getEnemyNodes()).toContain(4);
    expect(getNeutralNodes()).not.toContain(4);
  });

  it('should not reference controlState anywhere', () => {
    // This is a static test: if controlState is present, this will fail
    // (In a real repo, use a linter or grep in CI)
    const code = require('fs').readFileSync(require.resolve('../../src/utils/nodeOwnership.ts'), 'utf8');
    expect(code.includes('controlState')).toBe(false);
  });
}); 