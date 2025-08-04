import { AttackService } from '../src/services/AttackService';
import { createTestBattalion, TEST_BOT_STATS } from './testUtils';
import { NodeOwner, BotType } from '../src/types/battle';

describe('AttackService - Attack Intervals', () => {
  beforeEach(() => {
    AttackService.clearAllAttacks();
  });

  afterEach(() => {
    AttackService.clearAllAttacks();
  });

  test('should calculate correct attack intervals for each bot type', () => {
    const guardian = createTestBattalion('guardian-1', 0, NodeOwner.USER, BotType.GUARDIAN);
    const breacher = createTestBattalion('breacher-1', 0, NodeOwner.USER, BotType.BREACHER);
    const phreak = createTestBattalion('phreak-1', 0, NodeOwner.USER, BotType.PHREAK);

    const guardianInterval = AttackService.calculateAttackInterval(guardian.stats.speed);
    const breacherInterval = AttackService.calculateAttackInterval(breacher.stats.speed);
    const phreakInterval = AttackService.calculateAttackInterval(phreak.stats.speed);

    expect(guardianInterval).toBe(1200);
    expect(breacherInterval).toBe(2000);
    expect(phreakInterval).toBe(1600);
  });

  test('should start attacking with correct intervals', () => {
    const guardian = createTestBattalion('guardian-2', 0, NodeOwner.USER, BotType.GUARDIAN);
    const breacher = createTestBattalion('breacher-2', 0, NodeOwner.USER, BotType.BREACHER);
    const phreak = createTestBattalion('phreak-2', 0, NodeOwner.USER, BotType.PHREAK);

    AttackService.startAttack(guardian, 'node', 3);
    AttackService.startAttack(breacher, 'node', 4);
    AttackService.startAttack(phreak, 'node', 5);

    const guardianState = AttackService.getAttackState(guardian.id);
    const breacherState = AttackService.getAttackState(breacher.id);
    const phreakState = AttackService.getAttackState(phreak.id);

    expect(guardianState?.attackInterval).toBe(1200);
    expect(breacherState?.attackInterval).toBe(2000);
    expect(phreakState?.attackInterval).toBe(1600);
  });

  test('should attack at correct intervals when processing active attacks', async () => {
    const guardian = createTestBattalion('guardian-3', 0, NodeOwner.USER, BotType.GUARDIAN);
    const breacher = createTestBattalion('breacher-3', 0, NodeOwner.USER, BotType.BREACHER);
    const phreak = createTestBattalion('phreak-3', 0, NodeOwner.USER, BotType.PHREAK);

    const mockBattle = {
      battleId: 'test-battle',
      phase: 'ACTIVE',
      battalions: [guardian, breacher, phreak],
      nodes: [
        { index: 3, owner: 'neutral', control: 0 },
        { index: 4, owner: 'neutral', control: 0 },
        { index: 5, owner: 'neutral', control: 0 }
      ],
      save: jest.fn()
    };

    AttackService.startAttack(guardian, 'node', 3);
    AttackService.startAttack(breacher, 'node', 4);
    AttackService.startAttack(phreak, 'node', 5);

    const guardianState = AttackService.getAttackState(guardian.id);
    const breacherState = AttackService.getAttackState(breacher.id);
    const phreakState = AttackService.getAttackState(phreak.id);

    expect(guardianState?.attackInterval).toBe(1200);
    expect(breacherState?.attackInterval).toBe(2000);
    expect(phreakState?.attackInterval).toBe(1600);
  });
});
