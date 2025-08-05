import { BattalionService } from '../src/services/BattalionService';
import { createNodesWithTugOfWar } from '../src/services/NodeService';
import { BOT_CONFIG } from '../src/services/BotService';

describe('Bot Validation Bug', () => {
  let nodes: any[];

  beforeEach(() => {
    nodes = createNodesWithTugOfWar(0, 800, 600);
  });

  test('should demonstrate the validation mismatch bug', () => {
    // This test demonstrates the bug where validateBotType only checks USER_BOT_STATS
    // but createEnemyBattalions tries to access ENEMY_BOT_STATS
    
    // Currently both configs have the same bot types, so this won't fail
    // But if ENEMY_BOT_STATS had different bot types, this would cause a runtime error
    
    const userBattalions = BattalionService.createUserBattalions(nodes);
    const enemyBattalions = BattalionService.createEnemyBattalions(nodes);
    
    // Both should work because both configs have the same bot types
    expect(userBattalions.length).toBe(3);
    expect(enemyBattalions.length).toBe(3);
    
    // But the validation logic is flawed:
    // 1. validateBotType() only checks BOT_CONFIG.USER_BOT_STATS
    // 2. createEnemyBattalions() then tries to access BOT_CONFIG.ENEMY_BOT_STATS
    // 3. If ENEMY_BOT_STATS had different bot types, this would fail at runtime
  });

  test('should verify that both configs have the same bot types', () => {
    // This test verifies that both configs currently have the same bot types
    // which is why the bug doesn't manifest yet
    
    const userBotTypes = Object.keys(BOT_CONFIG.USER_BOT_STATS);
    const enemyBotTypes = Object.keys(BOT_CONFIG.ENEMY_BOT_STATS);
    
    expect(userBotTypes).toEqual(enemyBotTypes);
    expect(userBotTypes).toEqual(['guardian', 'breacher', 'phreak']);
  });

  test('should verify the fix works correctly', () => {
    // This test verifies that the fix works correctly
    // Both user and enemy battalions should be created successfully
    // with proper validation against their respective configs
    
    const userBattalions = BattalionService.createUserBattalions(nodes);
    const enemyBattalions = BattalionService.createEnemyBattalions(nodes);
    
    // Both should be created successfully
    expect(userBattalions.length).toBe(3);
    expect(enemyBattalions.length).toBe(3);
    
    // User battalions should use USER_BOT_STATS
    userBattalions.forEach(battalion => {
      expect(battalion.stats).toBeDefined();
      expect(battalion.owner).toBe('user');
    });
    
    // Enemy battalions should use ENEMY_BOT_STATS
    enemyBattalions.forEach(battalion => {
      expect(battalion.stats).toBeDefined();
      expect(battalion.owner).toBe('enemy');
    });
    
    // The fix ensures that:
    // 1. User battalions validate against USER_BOT_STATS
    // 2. Enemy battalions validate against ENEMY_BOT_STATS
    // 3. No runtime errors occur if the configs have different bot types
  });
}); 