#!/bin/bash

# verify-test-path.sh - Tool to verify test file paths and existence
# Usage: ./verify-test-path.sh "FeatureName"

set -e

# Check if feature name is provided
if [ $# -lt 1 ]; then
  echo "Usage: ./verify-test-path.sh \"FeatureName\""
  echo "Example: ./verify-test-path.sh \"LossTrackingSystem\""
  exit 1
fi

FEATURE="$1"
TEST_DIR="mobile/__tests__/battle/core"
TEST_FILE="${TEST_DIR}/${FEATURE}.test.ts"
ROOT_DIR="$(pwd)"

echo "=== Test Path Verification Tool ==="
echo "Feature: $FEATURE"
echo "Expected test file: $TEST_FILE"
echo

# Verify workspace structure
echo "Checking workspace structure:"
if [ -d "mobile" ]; then
  echo "  ✅ mobile directory exists"
else
  echo "  ❌ mobile directory not found - are you in the correct workspace root?"
  echo "  Current directory: $ROOT_DIR"
  exit 1
fi

if [ -d "$TEST_DIR" ]; then
  echo "  ✅ Test directory exists: $TEST_DIR"
else
  echo "  ❌ Test directory not found: $TEST_DIR"
  echo "  Creating test directory structure..."
  mkdir -p "$TEST_DIR"
  echo "  ✅ Created test directory: $TEST_DIR"
fi

# Check if test file exists
echo
echo "Checking test file:"
if [ -f "$TEST_FILE" ]; then
  echo "  ✅ Test file exists: $TEST_FILE"
  echo "  Last modified: $(stat -f "%Sm" "$TEST_FILE")"
  
  # Get test count
  TEST_COUNT=$(grep -c "it(" "$TEST_FILE" || echo "0")
  echo "  Test count: $TEST_COUNT tests found"
  
  # Show test names
  echo "  Test names:"
  grep -o "it(['\"].*['\"]" "$TEST_FILE" | sed "s/it(['\"]/ - /" | sed "s/['\"]$//"
else
  echo "  ❌ Test file not found: $TEST_FILE"
  echo "  Would you like to create a template test file? (y/n)"
  read CREATE_TEMPLATE
  
  if [ "$CREATE_TEMPLATE" = "y" ]; then
    echo "Creating test file template..."
    
    # Create template test file
    cat > "$TEST_FILE" << EOL
import { BattleStateManager, Node, Battalion } from '../../../src/battle/core/BattleStateManager';
import { BattleService } from '../../../src/battle/core/BattleService';
import { BattlePhase, BattalionType } from '../../../src/battle/core/BattleTypes';

// Mock BattleService
jest.mock('../../../src/battle/core/BattleService', () => {
  return {
    BattleService: jest.fn().mockImplementation(() => {
      return {
        updateBattleState: jest.fn().mockResolvedValue({}),
        startSync: jest.fn().mockImplementation((battleId, callback, errorCallback) => {
          // Mock successful sync startup
          return Promise.resolve();
        }),
      };
    }),
  };
});

describe('${FEATURE}', () => {
  let battleStateManager: BattleStateManager;
  let mockBattleService: jest.Mocked<BattleService>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create fresh instance
    mockBattleService = new BattleService() as jest.Mocked<BattleService>;
    battleStateManager = BattleStateManager.getInstance(mockBattleService);
    
    // Initialize with test battle
    const testBattleId = 'test-battle-123';
    const initialState = {
      phase: BattlePhase.COMBAT,
      timeRemaining: 300,
      nodes: new Map<string, Node>([
        ['node1', {
          id: 'node1',
          position: { x: 100, y: 100 },
          controllingTeam: null,
          controlProgress: 0,
          health: 1000
        }]
      ]),
      battalions: new Map<string, Battalion>([
        ['blue-battalion', {
          id: 'blue-battalion',
          position: { x: 50, y: 50 },
          team: 'blue',
          type: BattalionType.GUARDIAN,
          health: 100,
          quantity: 5,
          targetId: 'node1'
        }]
      ]),
      updateId: 0,
      lastUpdated: new Date()
    };
    
    battleStateManager.initializeBattle(testBattleId, initialState);
  });
  
  // Add your test cases here
  
});
EOL
    
    echo "  ✅ Created template test file: $TEST_FILE"
  fi
fi

# Verify test can be run
echo
echo "Verifying test execution:"
if [ -f "$TEST_FILE" ]; then
  echo "  Running test file check (this won't execute the tests, just verify the file is recognized):"
  
  # Change to mobile directory and check if test file is recognized
  cd mobile
  TEST_CHECK=$(npm test -- --listTests | grep "$FEATURE.test.ts" || echo "")
  cd "$ROOT_DIR"
  
  if [ -n "$TEST_CHECK" ]; then
    echo "  ✅ Test file is recognized by Jest"
  else
    echo "  ❌ Test file is not recognized by Jest - check for syntax errors"
  fi
else
  echo "  ❌ Cannot verify test execution - test file doesn't exist"
fi

echo
echo "=== Verification Summary ==="
if [ -f "$TEST_FILE" ]; then
  echo "✅ Test path is correct and file exists"
  echo "   You can run tests with: cd mobile && npm test -- $FEATURE"
else
  echo "❌ Test file does not exist - use the template generator to create it"
fi

echo
echo "Verification completed." 