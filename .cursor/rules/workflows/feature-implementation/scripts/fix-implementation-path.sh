#!/bin/bash

# fix-implementation-path.sh
# Script to fix implementation file path inconsistencies in context files

echo "=== Implementation Path Fix Tool ==="
echo "Timestamp: $(date)"
echo

# Get working directory
WORKSPACE_DIR="$(pwd)"
CONTEXT_DIR="${WORKSPACE_DIR}/.cursor/rules/workflows/feature-implementation"
ACTIVE_CONTEXT_FILE="${CONTEXT_DIR}/active-working-feature-context.mdc"
CONTEXT_PERSISTENCE_FILE="${CONTEXT_DIR}/context-persistence.mdc"

# Check if active context file exists
if [ ! -f "$ACTIVE_CONTEXT_FILE" ]; then
  echo "❌ Active context file not found: $ACTIVE_CONTEXT_FILE"
  exit 1
fi

# Get current feature name from active context
FEATURE_NAME=$(grep -A 5 "## Active Feature" "$ACTIVE_CONTEXT_FILE" | grep "Name:" | head -1 | sed 's/- Name: //')
if [ -z "$FEATURE_NAME" ]; then
  echo "❌ Could not determine feature name from active context"
  exit 1
fi

echo "Feature: $FEATURE_NAME"

# Convert feature name to hyphenated and non-hyphenated versions
# Example: "Loss Tracking System" -> "loss-tracking-system" and "LossTrackingSystem"
HYPHENATED_NAME=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')
NONHYPHENATED_NAME=$(echo "$FEATURE_NAME" | sed 's/ //g')

echo "Hyphenated name: $HYPHENATED_NAME"
echo "Non-hyphenated name: $NONHYPHENATED_NAME"

# Correct implementation file path
CORRECT_IMPL_PATH=".cursor/rules/gameplay/features/battle/features/${HYPHENATED_NAME}-implementation.mdc"
CORRECT_TEST_PATH="mobile/__tests__/battle/core/${NONHYPHENATED_NAME}.test.ts"

echo "Correct implementation file path: $CORRECT_IMPL_PATH"
echo "Correct test file path: $CORRECT_TEST_PATH"

# Check if correct implementation file exists
if [ ! -f "$WORKSPACE_DIR/$CORRECT_IMPL_PATH" ]; then
  echo "❌ Implementation file not found: $CORRECT_IMPL_PATH"
  echo "Would you like to create it? (y/n)"
  read -r CREATE_FILE
  if [[ "$CREATE_FILE" == "y" ]]; then
    mkdir -p "$(dirname "$WORKSPACE_DIR/$CORRECT_IMPL_PATH")"
    touch "$WORKSPACE_DIR/$CORRECT_IMPL_PATH"
    echo "✅ Created implementation file: $CORRECT_IMPL_PATH"
  else
    echo "⚠️ Implementation file not created. Context may remain inconsistent."
  fi
else
  echo "✅ Implementation file exists: $CORRECT_IMPL_PATH"
fi

# Fix active context file
echo "Updating active context file..."
sed -i.bak "s|Implementation File:.*|Implementation File: ${CORRECT_IMPL_PATH}|g" "$ACTIVE_CONTEXT_FILE"
echo "✅ Updated implementation file path in active context"

# Fix context persistence file
if [ -f "$CONTEXT_PERSISTENCE_FILE" ]; then
  echo "Updating context persistence file..."
  sed -i.bak "s|implementation_file:.*|implementation_file: ${CORRECT_IMPL_PATH}|g" "$CONTEXT_PERSISTENCE_FILE"
  echo "✅ Updated implementation file path in context persistence"
fi

# Clean up backup files
find "$CONTEXT_DIR" -name "*.bak" -type f -delete

echo 
echo "=== Path Fix Summary ==="
echo "✅ Implementation path fixed to: $CORRECT_IMPL_PATH"
echo "✅ Context files updated"
echo
echo "Run ./verify-context.sh to confirm fixes"
echo 