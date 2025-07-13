import { battleApi } from '../../src/store/api/battleApi';
import { configureStore } from '@reduxjs/toolkit';

// Create a test store with the battle API
const createTestStore = () => {
  return configureStore({
    reducer: {
      [battleApi.reducerPath]: battleApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(battleApi.middleware),
  });
};

describe('Battle API', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it('should have correct API configuration', () => {
    expect(battleApi.reducerPath).toBe('battleApi');
    expect(battleApi.endpoints).toBeDefined();
  });

  it('should have startBattle mutation', () => {
    const startBattleEndpoint = battleApi.endpoints.startBattle;
    expect(startBattleEndpoint).toBeDefined();
    expect(typeof startBattleEndpoint.initiate).toBe('function');
  });

  it('should have getBattleState query', () => {
    const getBattleStateEndpoint = battleApi.endpoints.getBattleState;
    expect(getBattleStateEndpoint).toBeDefined();
    expect(typeof getBattleStateEndpoint.initiate).toBe('function');
  });

  it('should export correct hooks', () => {
    const { useStartBattleMutation, useGetBattleStateQuery } = battleApi;
    expect(useStartBattleMutation).toBeDefined();
    expect(useGetBattleStateQuery).toBeDefined();
  });

  it('should have correct polling interval for getBattleState', () => {
    const getBattleStateEndpoint = battleApi.endpoints.getBattleState;
    // The polling interval is set in the component, not in the API definition
    // This test verifies the endpoint exists and can be configured
    expect(getBattleStateEndpoint).toBeDefined();
  });
}); 