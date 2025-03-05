#!/bin/bash
# Context Verification Script
# Usage: ./verify-context.sh [quick|complete|recovery]

# Default to quick verification
LEVEL=${1:-quick}

echo "=== Context Verification Tool ==="
echo "Verification Level: $LEVEL"
echo "Timestamp: $(date)"
echo

# Paths to context files
CORE_MECHANICS=".cursor/rules/gameplay/features/battle/core-mechanics.mdc"
ACTIVE_CONTEXT=".cursor/rules/workflows/feature-implementation/active-working-feature-context.mdc"
CONTEXT_PERSISTENCE=".cursor/rules/workflows/feature-implementation/context-persistence.mdc"

# Extract current feature from active context
FEATURE=$(grep "Active Feature" "$ACTIVE_CONTEXT" -A 5 | grep "Name:" | cut -d':' -f2- | tr -d ' ')
FEATURE_STATUS=$(grep "Active Feature" "$ACTIVE_CONTEXT" -A 5 | grep "Status:" | cut -d']' -f1 | cut -d'[' -f2)
SUB_FEATURE=$(grep "Current Phase" "$ACTIVE_CONTEXT" -A 10 | grep "Sub-feature:" | head -1 | cut -d':' -f2- | tr -d ' ')

# Implementation file path
IMPL_FILE=".cursor/rules/gameplay/features/battle/features/$FEATURE-implementation.mdc"
IMPL_FILE=$(echo "$IMPL_FILE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

echo "Detected Context:"
echo "  Feature: $FEATURE"
echo "  Status: [$FEATURE_STATUS]"
echo "  Sub-feature: $SUB_FEATURE"
echo "  Implementation File: $IMPL_FILE"
echo

# Check if files exist
echo "Checking File Existence:"
for FILE in "$CORE_MECHANICS" "$ACTIVE_CONTEXT" "$CONTEXT_PERSISTENCE" "$IMPL_FILE"; do
  if [ -f "$FILE" ]; then
    echo "  ✅ $FILE exists"
  else
    echo "  ❌ $FILE does not exist"
  fi
done
echo

# Check feature status in core mechanics
echo "Checking Feature Status in Core Mechanics:"
CORE_STATUS=$(grep -A 1 "## $FEATURE" "$CORE_MECHANICS" | head -1 | tr -d ' ' | cut -d']' -f1 | cut -d'[' -f2)
if [ "$CORE_STATUS" = "$FEATURE_STATUS" ]; then
  echo "  ✅ Feature status in core-mechanics.mdc matches active context: [$CORE_STATUS]"
else
  echo "  ❌ Feature status mismatch: core-mechanics.mdc [$CORE_STATUS] vs active context [$FEATURE_STATUS]"
fi
echo

# Check implementation file status
echo "Checking Implementation File:"
if [ -f "$IMPL_FILE" ]; then
  SUB_FEATURE_STATUS=$(grep -A 2 "### .*$SUB_FEATURE" "$IMPL_FILE" | head -1 | tr -d ' ' | cut -d']' -f1 | cut -d'[' -f2)
  echo "  Sub-feature status in implementation file: [$SUB_FEATURE_STATUS]"
  
  # Check implementation status in active context
  CONTEXT_SUB_FEATURE_STATUS=$(grep -A 30 "Test Context" "$ACTIVE_CONTEXT" | grep -A 5 "$SUB_FEATURE" | grep "Status:" | head -1 | cut -d':' -f2 | tr -d ' ')
  if [ "$CONTEXT_SUB_FEATURE_STATUS" = "Passing" ] && [ "$SUB_FEATURE_STATUS" = "test-passing" ]; then
    echo "  ✅ Sub-feature status is consistent: implementation [$SUB_FEATURE_STATUS] vs active context [Passing]"
  elif [ "$CONTEXT_SUB_FEATURE_STATUS" = "Failing" ] && [ "$SUB_FEATURE_STATUS" = "test-failing" ]; then
    echo "  ✅ Sub-feature status is consistent: implementation [$SUB_FEATURE_STATUS] vs active context [Failing]"
  elif [ -z "$CONTEXT_SUB_FEATURE_STATUS" ]; then
    echo "  ⚠️ Sub-feature status not found in active context"
  else
    echo "  ❌ Sub-feature status mismatch: implementation [$SUB_FEATURE_STATUS] vs active context [$CONTEXT_SUB_FEATURE_STATUS]"
  fi
else
  echo "  ❌ Implementation file not found"
fi
echo

# Check context persistence
echo "Checking Context Persistence:"
PERSISTENCE_FEATURE=$(grep -A 10 "current_context:" "$CONTEXT_PERSISTENCE" | grep "current_feature:" | cut -d':' -f2- | tr -d ' ')
PERSISTENCE_STATUS=$(grep -A 10 "current_context:" "$CONTEXT_PERSISTENCE" | grep "current_status:" | cut -d':' -f2- | tr -d ' ')
PERSISTENCE_SUB_FEATURE=$(grep -A 10 "current_context:" "$CONTEXT_PERSISTENCE" | grep "current_sub_feature:" | cut -d':' -f2- | tr -d ' ')

if [ "$PERSISTENCE_FEATURE" = "$FEATURE" ]; then
  echo "  ✅ Feature in context-persistence.mdc matches active context: $PERSISTENCE_FEATURE"
else
  echo "  ❌ Feature mismatch: context-persistence.mdc [$PERSISTENCE_FEATURE] vs active context [$FEATURE]"
fi

if [ "$PERSISTENCE_STATUS" = "$FEATURE_STATUS" ]; then
  echo "  ✅ Feature status in context-persistence.mdc matches active context: $PERSISTENCE_STATUS"
else
  echo "  ❌ Feature status mismatch: context-persistence.mdc [$PERSISTENCE_STATUS] vs active context [$FEATURE_STATUS]"
fi

if [ "$PERSISTENCE_SUB_FEATURE" = "$SUB_FEATURE" ]; then
  echo "  ✅ Sub-feature in context-persistence.mdc matches active context: $PERSISTENCE_SUB_FEATURE"
else
  echo "  ❌ Sub-feature mismatch: context-persistence.mdc [$PERSISTENCE_SUB_FEATURE] vs active context [$SUB_FEATURE]"
fi
echo

# For complete verification, add test running
if [ "$LEVEL" = "complete" ] || [ "$LEVEL" = "recovery" ]; then
  echo "Running tests for $FEATURE..."
  echo "This would execute: cd mobile && npm test -- -t '$FEATURE'"
  echo "Test results would determine the actual implementation status."
  echo
fi

# Summary
echo "=== Verification Summary ==="
if [ "$CORE_STATUS" = "$FEATURE_STATUS" ] && [ "$CONTEXT_SUB_FEATURE_STATUS" = "Passing" ] && [ "$SUB_FEATURE_STATUS" = "test-passing" ] || [ "$CONTEXT_SUB_FEATURE_STATUS" = "Failing" ] && [ "$SUB_FEATURE_STATUS" = "test-failing" ] && [ "$PERSISTENCE_FEATURE" = "$FEATURE" ] && [ "$PERSISTENCE_STATUS" = "$FEATURE_STATUS" ]; then
  echo "✅ Context is consistent across all files"
else
  echo "❌ Context inconsistencies detected - see details above"
  
  echo
  echo "=== Suggested Fixes ==="
  if [ "$CORE_STATUS" != "$FEATURE_STATUS" ]; then
    echo "1. Update feature status in core-mechanics.mdc:"
    echo "   Change: ## $FEATURE [$CORE_STATUS]"
    echo "   To:     ## $FEATURE [$FEATURE_STATUS]"
  fi
  
  if [ "$SUB_FEATURE_STATUS" != "test-passing" ] && [ "$CONTEXT_SUB_FEATURE_STATUS" = "Passing" ]; then
    echo "2. Update sub-feature status in $IMPL_FILE:"
    echo "   Change: ### $SUB_FEATURE [$SUB_FEATURE_STATUS]"
    echo "   To:     ### $SUB_FEATURE [test-passing]"
  fi
  
  if [ "$SUB_FEATURE_STATUS" != "test-failing" ] && [ "$CONTEXT_SUB_FEATURE_STATUS" = "Failing" ]; then
    echo "2. Update sub-feature status in $IMPL_FILE:"
    echo "   Change: ### $SUB_FEATURE [$SUB_FEATURE_STATUS]"
    echo "   To:     ### $SUB_FEATURE [test-failing]"
  fi
  
  if [ "$PERSISTENCE_FEATURE" != "$FEATURE" ] || [ "$PERSISTENCE_STATUS" != "$FEATURE_STATUS" ] || [ "$PERSISTENCE_SUB_FEATURE" != "$SUB_FEATURE" ]; then
    echo "3. Update context-persistence.mdc to match active context"
  fi
fi
echo

echo "Verification completed." 