import { renderHook, act } from '@testing-library/react-native';
import { useBattleBattalions } from '../../src/hooks/useBattleBattalions';

// Mock the useBattalionData hook
jest.mock('../../src/hooks/useBattalionData', () => ({
  useBattalionData: () => ({
    createBattalion: (type: string, quantity: number, nodeIndex: number, isUser: boolean, mark: number) => ({
      id: `battalion-${Date.now()}`,
      type,
      quantity,
      currentHealth: 100,
      maxHealth: 100,
      nodeIndex,
      isUser,
      stats: { health: 10, speed: 5, range: 5, offense: 5, defense: 5 },
      mark,
    }),
  }),
}));

describe('useBattleBattalions', () => {
  it('should add battalion to state', () => {
    const { result } = renderHook(() => useBattleBattalions());

    act(() => {
      result.current.addBattalion('guardian', 10, 0, true, 1);
    });

    expect(result.current.battalions).toHaveLength(1);
    expect(result.current.battalions[0].type).toBe('guardian');
    expect(result.current.battalions[0].quantity).toBe(10);
  });

  it('should remove battalion from state', () => {
    const { result } = renderHook(() => useBattleBattalions());

    let battalionId: string;

    act(() => {
      const battalion = result.current.addBattalion('guardian', 10, 0, true, 1);
      battalionId = battalion.id;
    });

    expect(result.current.battalions).toHaveLength(1);

    act(() => {
      result.current.removeBattalion(battalionId);
    });

    expect(result.current.battalions).toHaveLength(0);
  });

  it('should get user and enemy battalions correctly', () => {
    const { result } = renderHook(() => useBattleBattalions());

    act(() => {
      result.current.addBattalion('guardian', 10, 0, true, 1); // User battalion
      result.current.addBattalion('breacher', 5, 6, false, 1); // Enemy battalion
    });

    const userBattalions = result.current.getUserBattalions();
    const enemyBattalions = result.current.getEnemyBattalions();

    expect(userBattalions).toHaveLength(1);
    expect(enemyBattalions).toHaveLength(1);
    expect(userBattalions[0].isUser).toBe(true);
    expect(enemyBattalions[0].isUser).toBe(false);
  });
});
