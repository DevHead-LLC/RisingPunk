import mongoose from 'mongoose';
import { Battle } from '../src/models/Battle';
import { BattleEvent } from '../src/models/BattleEvent';
import { BattlePhase, NodeOwner, BotType } from '../src/types/battle';

// Mock mongoose connection for testing
beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as any);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Battle.deleteMany({});
  await BattleEvent.deleteMany({});
});

describe('Battle Model', () => {
  it('should create a battle with valid data', async () => {
    const battleData = {
      battleId: 'test-battle-1',
      attackerId: 'user1',
      defenderId: 'user2',
      phase: BattlePhase.SETUP,
      countdown: 3,
      battleTime: 0,
      battalions: [],
      nodes: []
    };

    const battle = new Battle(battleData);
    const savedBattle = await battle.save();

    expect(savedBattle.battleId).toBe('test-battle-1');
    expect(savedBattle.phase).toBe(BattlePhase.SETUP);
    expect(savedBattle.countdown).toBe(3);
    expect(savedBattle.battleTime).toBe(0);
  });

  it('should update battle phase correctly', async () => {
    const battle = new Battle({
      battleId: 'test-battle-2',
      attackerId: 'user1',
      defenderId: 'user2',
      phase: BattlePhase.SETUP,
      countdown: 3,
      battleTime: 0,
      battalions: [],
      nodes: []
    });

    await battle.save();
    await battle.updatePhase(BattlePhase.ACTIVE);

    const updatedBattle = await Battle.findOne({ battleId: 'test-battle-2' });
    expect(updatedBattle?.phase).toBe(BattlePhase.ACTIVE);
  });
}); 