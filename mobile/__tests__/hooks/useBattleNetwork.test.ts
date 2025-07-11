/**
 * @file useBattleNetwork.test.ts
 * @description Tests for useBattleNetworkConnections hook (Batch 1B)
 */

import { getNetworkConnections, calculateLineProperties } from '../../src/hooks/useBattleNetwork';

describe('useBattleNetworkConnections (Batch 1B)', () => {
  describe('network topology', () => {
    it('should have correct connections for user nodes', () => {
      const connections = getNetworkConnections();

      // Node 0 should connect to 3 and 4
      const node0Connections = connections.filter(c => c.from === 0 || c.to === 0);
      expect(node0Connections).toHaveLength(2);
      expect(node0Connections.some(c => (c.from === 0 && c.to === 3) || (c.from === 3 && c.to === 0))).toBe(true);
      expect(node0Connections.some(c => (c.from === 0 && c.to === 4) || (c.from === 4 && c.to === 0))).toBe(true);

      // Node 1 should connect to 3, 4, and 5
      const node1Connections = connections.filter(c => c.from === 1 || c.to === 1);
      expect(node1Connections).toHaveLength(3);
      expect(node1Connections.some(c => (c.from === 1 && c.to === 3) || (c.from === 3 && c.to === 1))).toBe(true);
      expect(node1Connections.some(c => (c.from === 1 && c.to === 4) || (c.from === 4 && c.to === 1))).toBe(true);
      expect(node1Connections.some(c => (c.from === 1 && c.to === 5) || (c.from === 5 && c.to === 1))).toBe(true);

      // Node 2 should connect to 4 and 5
      const node2Connections = connections.filter(c => c.from === 2 || c.to === 2);
      expect(node2Connections).toHaveLength(2);
      expect(node2Connections.some(c => (c.from === 2 && c.to === 4) || (c.from === 4 && c.to === 2))).toBe(true);
      expect(node2Connections.some(c => (c.from === 2 && c.to === 5) || (c.from === 5 && c.to === 2))).toBe(true);
    });

    it('should have correct connections for enemy nodes', () => {
      const connections = getNetworkConnections();

      // Node 6 should connect to 3 and 4
      const node6Connections = connections.filter(c => c.from === 6 || c.to === 6);
      expect(node6Connections).toHaveLength(2);
      expect(node6Connections.some(c => (c.from === 6 && c.to === 3) || (c.from === 3 && c.to === 6))).toBe(true);
      expect(node6Connections.some(c => (c.from === 6 && c.to === 4) || (c.from === 4 && c.to === 6))).toBe(true);

      // Node 7 should connect to 3, 4, and 5
      const node7Connections = connections.filter(c => c.from === 7 || c.to === 7);
      expect(node7Connections).toHaveLength(3);
      expect(node7Connections.some(c => (c.from === 7 && c.to === 3) || (c.from === 3 && c.to === 7))).toBe(true);
      expect(node7Connections.some(c => (c.from === 7 && c.to === 4) || (c.from === 4 && c.to === 7))).toBe(true);
      expect(node7Connections.some(c => (c.from === 7 && c.to === 5) || (c.from === 5 && c.to === 7))).toBe(true);

      // Node 8 should connect to 4 and 5
      const node8Connections = connections.filter(c => c.from === 8 || c.to === 8);
      expect(node8Connections).toHaveLength(2);
      expect(node8Connections.some(c => (c.from === 8 && c.to === 4) || (c.from === 4 && c.to === 8))).toBe(true);
      expect(node8Connections.some(c => (c.from === 8 && c.to === 5) || (c.from === 5 && c.to === 8))).toBe(true);
    });

    it('should have neutral nodes as central hubs', () => {
      const connections = getNetworkConnections();

      // Neutral nodes should be the most connected
      const node3Connections = connections.filter(c => c.from === 3 || c.to === 3);
      const node4Connections = connections.filter(c => c.from === 4 || c.to === 4);
      const node5Connections = connections.filter(c => c.from === 5 || c.to === 5);

      expect(node3Connections.length).toBeGreaterThanOrEqual(4); // Connected to 0, 1, 6, 7
      expect(node4Connections.length).toBeGreaterThanOrEqual(6); // Connected to 0, 1, 2, 6, 7, 8
      expect(node5Connections.length).toBeGreaterThanOrEqual(4); // Connected to 1, 2, 7, 8
    });

    it('should not have direct user-enemy connections', () => {
      const connections = getNetworkConnections();

      // No direct connections between user nodes (0,1,2) and enemy nodes (6,7,8)
      const directUserEnemyConnections = connections.filter(c =>
        (c.from <= 2 && c.to >= 6) || (c.from >= 6 && c.to <= 2)
      );

      expect(directUserEnemyConnections).toHaveLength(0);
    });
  });

  describe('line calculation utilities', () => {
    it('should calculate correct line properties for horizontal lines', () => {
      const fromPos = { x: 100, y: 200 };
      const toPos = { x: 300, y: 200 };

      const props = calculateLineProperties(fromPos, toPos);

      expect(props.length).toBe(200); // 300 - 100
      expect(props.angle).toBe(0); // Horizontal line
      expect(props.left).toBe(100);
      expect(props.top).toBe(200);
    });

    it('should calculate correct line properties for vertical lines', () => {
      const fromPos = { x: 100, y: 200 };
      const toPos = { x: 100, y: 400 };

      const props = calculateLineProperties(fromPos, toPos);

      expect(props.length).toBe(200); // 400 - 200
      expect(props.angle).toBe(90); // Vertical line
      expect(props.left).toBe(100);
      expect(props.top).toBe(200);
    });

    it('should calculate correct line properties for diagonal lines', () => {
      const fromPos = { x: 0, y: 0 };
      const toPos = { x: 100, y: 100 };

      const props = calculateLineProperties(fromPos, toPos);

      expect(props.length).toBeCloseTo(141.42, 1); // sqrt(100^2 + 100^2)
      expect(props.angle).toBe(45); // 45-degree diagonal
      expect(props.left).toBe(0);
      expect(props.top).toBe(0);
    });
  });
});
