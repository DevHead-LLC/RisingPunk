import { BotType, MockBotCounts } from './testTypes';

export class TestDatabase {
  private botCounts: MockBotCounts = {
    breacher: 0,
    guardian: 0,
    phreak: 0
  };

  private buildQueue: Array<{type: BotType, quantity: number}> = [];
  
  async updateBotCount(type: BotType, quantity: number): Promise<void> {
    this.botCounts[type] += quantity;
  }

  async getBotCounts(): Promise<MockBotCounts> {
    return this.botCounts;
  }

  async addToQueue(type: BotType, quantity: number): Promise<void> {
    this.buildQueue.push({ type, quantity });
  }

  async getQueue(): Promise<Array<{type: BotType, quantity: number}>> {
    return this.buildQueue;
  }

  reset(): void {
    this.botCounts = { breacher: 0, guardian: 0, phreak: 0 };
    this.buildQueue = [];
  }
}

export const testDb = new TestDatabase(); 