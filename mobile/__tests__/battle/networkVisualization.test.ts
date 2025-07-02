import { NETWORK_CONNECTIONS } from '../../src/utils/networkConstants';

describe('Step 1.4: Network Visualization', () => {
  it('should have correct number of network connections', () => {
    // Test that the network connections array is properly defined
    expect(NETWORK_CONNECTIONS).toBeDefined();
    expect(Array.isArray(NETWORK_CONNECTIONS)).toBe(true);
    expect(NETWORK_CONNECTIONS.length).toBeGreaterThan(0);
  });

  it('should have valid connection pairs', () => {
    // Test that each connection is a valid pair of node indices
    NETWORK_CONNECTIONS.forEach(([from, to]) => {
      expect(typeof from).toBe('number');
      expect(typeof to).toBe('number');
      expect(from).toBeGreaterThanOrEqual(0);
      expect(to).toBeGreaterThanOrEqual(0);
      expect(from).toBeLessThan(9); // 9 nodes total
      expect(to).toBeLessThan(9);
    });
  });
}); 