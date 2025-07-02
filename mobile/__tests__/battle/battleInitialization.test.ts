import { resetNodeOwnership, getUserNodes, getEnemyNodes, getNeutralNodes } from '../../src/utils/nodeOwnership';

describe('Intended Step 1: Battle Initialization', () => {
  beforeEach(() => {
    resetNodeOwnership();
  });

  it('should initialize ownership arrays correctly', () => {
    // Test that ownership arrays are initialized with correct values
    expect(getUserNodes().sort()).toEqual([0, 1, 2]);
    expect(getEnemyNodes().sort()).toEqual([6, 7, 8]);
    expect(getNeutralNodes().sort()).toEqual([3, 4, 5]);
  });

  it('should have correct node count', () => {
    // Test that we have exactly 9 nodes total
    const totalNodes = getUserNodes().length + getEnemyNodes().length + getNeutralNodes().length;
    expect(totalNodes).toBe(9);
  });

  it('should have no overlapping ownership', () => {
    // Test that no node appears in multiple ownership arrays
    const userNodes = getUserNodes();
    const enemyNodes = getEnemyNodes();
    const neutralNodes = getNeutralNodes();
    
    const allNodes = [...userNodes, ...enemyNodes, ...neutralNodes];
    const uniqueNodes = new Set(allNodes);
    
    expect(allNodes.length).toBe(uniqueNodes.size);
  });
}); 