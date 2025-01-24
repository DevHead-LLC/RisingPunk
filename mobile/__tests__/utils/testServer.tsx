import { testDb } from './testDb';
import { BotType, BuildError } from './testTypes';

export const mockServerResponses = {
  async startBuild(type: BotType, quantity: number): Promise<void> {
    if (quantity > 1000) {
      throw new Error('Maximum build limit is 1000');
    }
    await testDb.addToQueue(type, quantity);
  },

  async syncProgress(buildId: string): Promise<number> {
    return Math.floor(Math.random() * 100);
  },

  async completeBuild(type: BotType, quantity: number): Promise<void> {
    await testDb.updateBotCount(type, quantity);
  }
};

export const mockServerErrors = {
  insufficientFunds: (): BuildError => ({
    response: { data: { error: 'Insufficient funds' } }
  }),
  
  buildLimitExceeded: (): BuildError => ({
    response: { data: { error: 'Maximum build limit is 1000' } }
  })
}; 