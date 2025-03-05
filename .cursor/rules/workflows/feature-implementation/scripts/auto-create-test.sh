#!/bin/bash

# auto-create-test.sh
# Automatically creates a test file for a feature without interactive prompts
# Usage: ./auto-create-test.sh "FeatureName"

if [ $# -eq 0 ]; then
  echo "Usage: $0 FeatureName"
  exit 1
fi

FEATURE_NAME=$1
TEST_DIR="mobile/__tests__/battle/core"
TEST_FILE="${TEST_DIR}/${FEATURE_NAME}.test.ts"

echo "=== Automatic Test File Creation ==="
echo "Feature: ${FEATURE_NAME}"
echo "Target file: ${TEST_FILE}"
echo

# Check if the test directory exists, create if needed
if [ ! -d "$TEST_DIR" ]; then
  echo "Creating test directory: $TEST_DIR"
  mkdir -p "$TEST_DIR"
fi

# Check if test file already exists
if [ -f "$TEST_FILE" ]; then
  echo "✅ Test file already exists: $TEST_FILE"
  echo "Last modified: $(stat -c %y "$TEST_FILE" 2>/dev/null || stat -f "%Sm" "$TEST_FILE")"
  exit 0
fi

# Create the test file with a template
echo "Creating test file: $TEST_FILE"

cat > "$TEST_FILE" << EOL
import { BattleStateManager } from '../../../src/battle/core/BattleStateManager';
import { BattleService } from '../../../src/battle/services/BattleService';

// Mock dependencies
jest.mock('../../../src/battle/services/BattleService');

describe('${FEATURE_NAME}', () => {
  let battleStateManager: BattleStateManager;
  let mockBattleService: jest.Mocked<BattleService>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Initialize mocked battle service
    mockBattleService = new BattleService() as jest.Mocked<BattleService>;
    
    // Initialize battle state manager with mocked dependencies
    battleStateManager = new BattleStateManager(mockBattleService);
  });

  describe('Node Control Points', () => {
    test('should award points for node control', () => {
      // Arrange
      
      // Act
      
      // Assert
      expect(true).toBe(false); // This test should fail initially
    });

    test('should accumulate points over time based on control duration', () => {
      // Arrange
      
      // Act
      
      // Assert
      expect(true).toBe(false); // This test should fail initially
    });

    test('should apply different point rates for different node types', () => {
      // Arrange
      
      // Act
      
      // Assert
      expect(true).toBe(false); // This test should fail initially
    });
  });
});
EOL

# Check if file was created successfully
if [ -f "$TEST_FILE" ]; then
  echo "✅ Test file created successfully: $TEST_FILE"
  echo "Template includes basic structure and failing tests for Node Control Points"
  echo
  echo "Next steps:"
  echo "1. Complete the test implementation"
  echo "2. Run tests to confirm they fail: cd mobile && npm test -- $FEATURE_NAME"
  echo "3. Implement the feature to make tests pass"
  echo
  echo "Test file is ready at: $TEST_FILE"
else
  echo "❌ Failed to create test file"
  exit 1
fi

exit 0 