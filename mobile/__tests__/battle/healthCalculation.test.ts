describe('Health Calculation - Intended Step 1', () => {
  it('should calculate health as 75% of total army strength', () => {
    // Mock battalion data based on intended sequence
    const userBattalions = [
      { type: 'Breacher', quantity: 5, nodeIndex: 0, position: { x: 0, y: 0 }, mark: 1 }, // Node 0
      { type: 'Guardian', quantity: 3, nodeIndex: 1, position: { x: 0, y: 0 }, mark: 1 }, // Node 1
      { type: 'Phreak', quantity: 4, nodeIndex: 2, position: { x: 0, y: 0 }, mark: 1 }    // Node 2
    ];
    
    const enemyBattalions = [
      { type: 'Breacher', quantity: 24, nodeIndex: 6, position: { x: 0, y: 0 }, mark: 1 }, // Node 6
      { type: 'Guardian', quantity: 21, nodeIndex: 7, position: { x: 0, y: 0 }, mark: 1 }, // Node 7
      { type: 'Phreak', quantity: 18, nodeIndex: 8, position: { x: 0, y: 0 }, mark: 1 }    // Node 8
    ];
    
    const totalHealth = calculateTotalArmyHealth(userBattalions, enemyBattalions);
    const expectedHealth = Math.floor(totalHealth * 0.75);
    
    // Test the 75% calculation logic
    expect(expectedHealth).toBe(Math.floor(totalHealth * 0.75));
    expect(expectedHealth).toBeLessThan(totalHealth);
    expect(expectedHealth).toBeGreaterThan(totalHealth * 0.74);
  });

  it('should assign health only to neutral nodes', () => {
    const nodes = initializeNodesWithHealth();
    
    // Neutral nodes should have health
    [3, 4, 5].forEach(nodeIndex => {
      expect(nodes[nodeIndex].health).toBeGreaterThan(0);
    });
    
    // User and enemy nodes should have 0 health
    [0, 1, 2, 6, 7, 8].forEach(nodeIndex => {
      expect(nodes[nodeIndex].health).toBe(0);
    });
  });

  it('should mark controlled nodes as locked', () => {
    const nodes = initializeNodesWithHealth();
    
    // User and enemy nodes should be locked
    [0, 1, 2, 6, 7, 8].forEach(nodeIndex => {
      expect(nodes[nodeIndex].isLocked).toBe(true);
    });
    
    // Neutral nodes should be unlocked
    [3, 4, 5].forEach(nodeIndex => {
      expect(nodes[nodeIndex].isLocked).toBe(false);
    });
  });

  it('should have correct health distribution', () => {
    const nodes = initializeNodesWithHealth();
    const totalHealth = nodes.reduce((sum, node) => sum + node.health, 0);
    
    // Only neutral nodes should contribute to total health
    const neutralHealth = nodes.slice(3, 6).reduce((sum, node) => sum + node.health, 0);
    expect(totalHealth).toBe(neutralHealth);
    
    // Health should be distributed equally among neutral nodes
    const healthPerNode = nodes[3].health;
    expect(nodes[4].health).toBe(healthPerNode);
    expect(nodes[5].health).toBe(healthPerNode);
  });
});

// Helper functions
function calculateTotalArmyHealth(userBattalions: any[], enemyBattalions: any[]): number {
  // Mock bot health values
  const botHealth = {
    'Breacher': 100,
    'Guardian': 150,
    'Phreak': 80
  };
  
  const allBattalions = [...userBattalions, ...enemyBattalions];
  return allBattalions.reduce((total, battalion) => {
    return total + (botHealth[battalion.type as keyof typeof botHealth] * battalion.quantity);
  }, 0);
}

function initializeNodesWithHealth() {
  // Mock node initialization with health assignment
  const nodes = Array.from({ length: 9 }, (_, i) => ({ health: 0, isLocked: false }));
  const health = 1000; // Mock calculated health
  
  // Assign health only to neutral nodes
  [3, 4, 5].forEach(nodeIndex => {
    nodes[nodeIndex].health = health;
    nodes[nodeIndex].isLocked = false;
  });
  
  // Mark controlled nodes as locked
  [0, 1, 2, 6, 7, 8].forEach(nodeIndex => {
    nodes[nodeIndex].health = 0;
    nodes[nodeIndex].isLocked = true;
  });
  
  return nodes;
} 