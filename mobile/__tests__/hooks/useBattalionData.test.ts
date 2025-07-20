import { renderHook } from '@testing-library/react-native';
import { useBattalionData } from '../../src/hooks/useBattalionData';

// Mock the useBots hook
jest.mock('../../src/hooks/useBots', () => ({
  useBots: () => ({
    getBotStats: (type: string, isUser: boolean) => {
      const stats = {
        guardian: { stats: { health: 14, speed: 9, range: 4, offense: 8, defense: 6 } },
        breacher: { stats: { health: 18, speed: 5, range: 5, offense: 7, defense: 8 } },
        phreak: { stats: { health: 12, speed: 7, range: 9, offense: 6, defense: 5 } },
      };
      return stats[type as keyof typeof stats];
    },
  }),
}));

describe('useBattalionData', () => {
  it('should create battalion with correct stats', () => {
    const { result } = renderHook(() => useBattalionData());

    const battalion = result.current.createBattalion('guardian', 5, 0, true, 1);

    expect(battalion.type).toBe('guardian');
    expect(battalion.quantity).toBe(5);
    expect(battalion.currentHealth).toBe(70); // 14 × 5
    expect(battalion.maxHealth).toBe(70);
    expect(battalion.nodeIndex).toBe(0);
    expect(battalion.isUser).toBe(true);
    expect(battalion.mark).toBe(1);
    expect(battalion.stats.health).toBe(14);
  });
});
