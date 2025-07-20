/**
 * @file battleTypes.test.ts
 * @description Tests for core battle type definitions (Batch 1A)
 */

import {
  NodePosition,
  BattalionType,
  BattlePhase,
  NetworkConnection,
} from '../../src/types/battleTypes';

describe('Battle Types (Batch 1A)', () => {
  describe('Node indices', () => {
    it('should accept valid node indices', () => {
      const validIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      expect(validIndices).toHaveLength(9);
    });
  });

  describe('NodePosition type', () => {
    it('should accept valid positions', () => {
      const position: NodePosition = { x: 100, y: 200 };
      expect(position.x).toBe(100);
      expect(position.y).toBe(200);
    });
  });



  describe('BattalionType enum', () => {
    it('should have correct values', () => {
      expect(BattalionType.GUARDIAN).toBe('guardian');
      expect(BattalionType.PHREAK).toBe('phreak');
      expect(BattalionType.BREACHER).toBe('breacher');
    });
  });

  describe('BattlePhase enum', () => {
    it('should have correct values', () => {
      expect(BattlePhase.COUNTDOWN).toBe('countdown');
      expect(BattlePhase.ACTIVE).toBe('active');
      expect(BattlePhase.COMPLETE).toBe('complete');
    });
  });

  describe('NetworkConnection type', () => {
    it('should accept valid network connections', () => {
      const connection: NetworkConnection = { from: 0, to: 3 };
      expect(connection.from).toBe(0);
      expect(connection.to).toBe(3);
    });
  });
});
