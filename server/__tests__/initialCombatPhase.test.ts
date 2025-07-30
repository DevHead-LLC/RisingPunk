import { CombatService } from '../src/services/CombatService';
import { createTestNodes, createTestBattalion, TEST_BOT_STATS } from './testUtils';
import { NodeOwner, BotType } from '../src/types/battle';

describe('Initial Combat Phase - Tug-of-War System', () => {
  test('battalions apply tug-of-war damage to neutral nodes', () => {
    // Setup: Create a neutral node and user battalion
    const nodes = createTestNodes();
    const neutralNode = nodes[3]; // Node 3 (neutral)
    const userBattalion = createTestBattalion('user-1', 0, NodeOwner.USER, BotType.GUARDIAN);
    
    // Verify battalion damage calculation: offense × quantity
    const calculatedDamage = CombatService.calculateTugOfWarDamage(userBattalion);
    const expectedDamage = TEST_BOT_STATS.guardian.offense * userBattalion.quantity; // 8 × 10 = 80
    expect(calculatedDamage).toBe(expectedDamage);
    
    // Verify node damage application and progress
    const expectedPercentage = (expectedDamage / neutralNode.maxCaptureThreshold) * 100; // 80/1000 = 8%
    const wasCaptured = CombatService.applyTugOfWarDamage(neutralNode, calculatedDamage, NodeOwner.USER);
    
    // Assert: Both battalion damage and node behavior verified
    expect(neutralNode.tugOfWarProgress).toBe(expectedPercentage);
    expect(wasCaptured).toBe(false); // Not captured yet (need 100% to capture)
    expect(neutralNode.owner).toBe(NodeOwner.NEUTRAL); // Still neutral
  });
}); 