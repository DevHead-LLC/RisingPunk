#!/bin/bash
# Improved Context Verification Script
# Usage: ./improved-verify-context.sh [quick|complete|recovery]

# Default to quick verification
LEVEL=${1:-quick}

echo "=== Improved Context Verification Tool ==="
echo "Verification Level: $LEVEL"
echo "Timestamp: $(date)"
echo

# Paths to context files
CORE_MECHANICS=".cursor/rules/gameplay/features/battle/core-mechanics.mdc"
ACTIVE_CONTEXT=".cursor/rules/workflows/feature-implementation/active-working-feature-context.mdc"
CONTEXT_PERSISTENCE=".cursor/rules/workflows/feature-implementation/context-persistence.mdc"

# Extract current feature from active context (preserving spaces)
FEATURE_WITH_SPACES=$(grep -A 2 "## Active Feature" "$ACTIVE_CONTEXT" | grep "- Name:" | sed 's/- Name: //')
FEATURE=$(echo "$FEATURE_WITH_SPACES" | tr -d ' ')
FEATURE_STATUS=$(grep -A 4 "## Active Feature" "$ACTIVE_CONTEXT" | grep "- Status:" | sed 's/- Status: \[//' | sed 's/\]//')
SUB_FEATURE=$(grep -A 10 "## Current Phase" "$ACTIVE_CONTEXT" | grep "Sub-feature:" | sed 's/.*Sub-feature: //')

# Generate implementation file path
FEATURE_HYPHENATED=$(echo "$FEATURE_WITH_SPACES" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
IMPL_FILE=".cursor/rules/gameplay/features/battle/features/${FEATURE_HYPHENATED}-implementation.mdc"

echo "Detected Context:"
echo "  Feature (with spaces): $FEATURE_WITH_SPACES"
echo "  Feature (no spaces): $FEATURE"
echo "  Feature (hyphenated): $FEATURE_HYPHENATED"
echo "  Status: [$FEATURE_STATUS]"
echo "  Sub-feature: $SUB_FEATURE"
echo "  Implementation File: $IMPL_FILE"
echo

# Check if files exist
echo "Checking File Existence:"
for FILE in "$CORE_MECHANICS" "$ACTIVE_CONTEXT" "$CONTEXT_PERSISTENCE"; do
  if [ -f "$FILE" ]; then
    echo "  ✅ $FILE exists"
  else
    echo "  ❌ $FILE does not exist"
  fi
done

# Special check for implementation file
if [ -f "$IMPL_FILE" ]; then
  echo "  ✅ $IMPL_FILE exists"
else
  # Try to find the implementation file if it exists with a different name pattern
  POSSIBLE_IMPL_FILES=$(find .cursor/rules/gameplay/features/battle/features/ -name "*${FEATURE_HYPHENATED}*-implementation.mdc" 2>/dev/null)
  if [ -n "$POSSIBLE_IMPL_FILES" ]; then
    FOUND_IMPL_FILE=$(echo "$POSSIBLE_IMPL_FILES" | head -1)
    echo "  ⚠️ Expected implementation file not found, but similar file exists: $FOUND_IMPL_FILE"
    echo "     Run fix-implementation-path.sh to correct this issue"
    IMPL_FILE="$FOUND_IMPL_FILE"
  else
    echo "  ❌ $IMPL_FILE does not exist"
  fi
fi
echo

# Check feature status in core mechanics
echo "Checking Feature Status in Core Mechanics:"
CORE_STATUS=$(grep -A 1 "## $FEATURE_WITH_SPACES" "$CORE_MECHANICS" | head -1 | grep -o "\[.*\]" | sed 's/\[//' | sed 's/\]//')
if [ -z "$CORE_STATUS" ]; then
  # Try searching without spaces
  CORE_STATUS=$(grep -A 1 "## $FEATURE" "$CORE_MECHANICS" | head -1 | grep -o "\[.*\]" | sed 's/\[//' | sed 's/\]//')
fi

if [ "$CORE_STATUS" = "$FEATURE_STATUS" ]; then
  echo "  ✅ Feature status in core-mechanics.mdc matches active context: [$CORE_STATUS]"
else
  echo "  ❌ Feature status mismatch: core-mechanics.mdc [$CORE_STATUS] vs active context [$FEATURE_STATUS]"
fi
echo

# Check implementation file status
echo "Checking Implementation File:"
if [ -f "$IMPL_FILE" ]; then
  # Search for sub-feature in implementation file (handling spaces correctly)
  SUB_FEATURE_STATUS=$(grep -A 1 "### $SUB_FEATURE" "$IMPL_FILE" | head -1 | grep -o "\[.*\]" | sed 's/\[//' | sed 's/\]//')
  
  if [ -n "$SUB_FEATURE_STATUS" ]; then
    echo "  ✅ Sub-feature found in implementation file with status: [$SUB_FEATURE_STATUS]"
    
    # Check consistency with active context
    CONTEXT_SUB_FEATURE_STATUS=$(grep -A 5 "$SUB_FEATURE" "$ACTIVE_CONTEXT" | grep "Status:" | head -1 | sed 's/.*Status: //')
    
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
    echo "  ❌ Sub-feature $SUB_FEATURE not found in implementation file"
  fi
else
  echo "  ❌ Implementation file not found"
fi
echo

# Check context persistence
echo "Checking Context Persistence:"
# Try both YAML and markdown formats for context persistence
PERSISTENCE_FEATURE=$(grep -A 2 "## Active Feature" "$CONTEXT_PERSISTENCE" 2>/dev/null | grep "- Name:" | sed 's/- Name: //')
if [ -z "$PERSISTENCE_FEATURE" ]; then
  PERSISTENCE_FEATURE=$(grep -A 10 "current_context:" "$CONTEXT_PERSISTENCE" 2>/dev/null | grep "current_feature:" | cut -d':' -f2- | tr -d ' ')
fi

PERSISTENCE_STATUS=$(grep -A 4 "## Active Feature" "$CONTEXT_PERSISTENCE" 2>/dev/null | grep "- Status:" | sed 's/- Status: \[//' | sed 's/\]//')
if [ -z "$PERSISTENCE_STATUS" ]; then
  PERSISTENCE_STATUS=$(grep -A 10 "current_context:" "$CONTEXT_PERSISTENCE" 2>/dev/null | grep "current_status:" | cut -d':' -f2- | tr -d ' ')
fi

PERSISTENCE_SUB_FEATURE=$(grep -A 10 "## Current Phase" "$CONTEXT_PERSISTENCE" 2>/dev/null | grep "Sub-feature:" | sed 's/.*Sub-feature: //')
if [ -z "$PERSISTENCE_SUB_FEATURE" ]; then
  PERSISTENCE_SUB_FEATURE=$(grep -A 10 "current_context:" "$CONTEXT_PERSISTENCE" 2>/dev/null | grep "current_sub_feature:" | cut -d':' -f2- | tr -d ' ')
fi

# Normalize for comparison (either both have spaces or both don't)
if [[ "$PERSISTENCE_FEATURE" != *" "* ]] && [[ "$FEATURE_WITH_SPACES" == *" "* ]]; then
  # Persistence has no spaces but active feature does - compare with no-space version
  if [ "$PERSISTENCE_FEATURE" = "$FEATURE" ]; then
    echo "  ✅ Feature in context-persistence.mdc matches active context"
  else
    echo "  ❌ Feature mismatch: context-persistence.mdc [$PERSISTENCE_FEATURE] vs active context [$FEATURE]"
  fi
else
  # Normal comparison with spaces
  if [ "$PERSISTENCE_FEATURE" = "$FEATURE_WITH_SPACES" ]; then
    echo "  ✅ Feature in context-persistence.mdc matches active context: $PERSISTENCE_FEATURE"
  else
    echo "  ❌ Feature mismatch: context-persistence.mdc [$PERSISTENCE_FEATURE] vs active context [$FEATURE_WITH_SPACES]"
  fi
fi

if [ "$PERSISTENCE_STATUS" = "$FEATURE_STATUS" ]; then
  echo "  ✅ Feature status in context-persistence.mdc matches active context: [$PERSISTENCE_STATUS]"
else
  echo "  ❌ Feature status mismatch: context-persistence.mdc [$PERSISTENCE_STATUS] vs active context [$FEATURE_STATUS]"
fi

# Similar normalization for sub-feature comparison
if [[ "$PERSISTENCE_SUB_FEATURE" != *" "* ]] && [[ "$SUB_FEATURE" == *" "* ]]; then
  SUB_FEATURE_NO_SPACES=$(echo "$SUB_FEATURE" | tr -d ' ')
  if [ "$PERSISTENCE_SUB_FEATURE" = "$SUB_FEATURE_NO_SPACES" ]; then
    echo "  ✅ Sub-feature in context-persistence.mdc matches active context"
  else
    echo "  ❌ Sub-feature mismatch: context-persistence.mdc [$PERSISTENCE_SUB_FEATURE] vs active context [$SUB_FEATURE_NO_SPACES]"
  fi
else
  if [ "$PERSISTENCE_SUB_FEATURE" = "$SUB_FEATURE" ]; then
    echo "  ✅ Sub-feature in context-persistence.mdc matches active context: $PERSISTENCE_SUB_FEATURE"
  else
    echo "  ❌ Sub-feature mismatch: context-persistence.mdc [$PERSISTENCE_SUB_FEATURE] vs active context [$SUB_FEATURE]"
  fi
fi
echo

# For complete verification, add test running
if [ "$LEVEL" = "complete" ] || [ "$LEVEL" = "recovery" ]; then
  echo "Running tests for $FEATURE..."
  echo "This would execute: cd mobile && npm test -- $FEATURE"
  echo "Test results would determine the actual implementation status."
  echo
fi

# Summary
echo "=== Verification Summary ==="
# Define a more robust check for consistency
CONTEXT_CONSISTENT=true
if [ "$CORE_STATUS" != "$FEATURE_STATUS" ]; then
  CONTEXT_CONSISTENT=false
fi

if [ -f "$IMPL_FILE" ] && [ -n "$SUB_FEATURE" ] && [ -n "$SUB_FEATURE_STATUS" ]; then
  if [ "$CONTEXT_SUB_FEATURE_STATUS" = "Passing" ] && [ "$SUB_FEATURE_STATUS" != "test-passing" ]; then
    CONTEXT_CONSISTENT=false
  elif [ "$CONTEXT_SUB_FEATURE_STATUS" = "Failing" ] && [ "$SUB_FEATURE_STATUS" != "test-failing" ]; then
    CONTEXT_CONSISTENT=false
  fi
fi

# Check persistence consistency
if [[ "$PERSISTENCE_FEATURE" != "$FEATURE_WITH_SPACES" && "$PERSISTENCE_FEATURE" != "$FEATURE" ]]; then
  CONTEXT_CONSISTENT=false
fi

if [ "$PERSISTENCE_STATUS" != "$FEATURE_STATUS" ]; then
  CONTEXT_CONSISTENT=false
fi

if [[ "$PERSISTENCE_SUB_FEATURE" != "$SUB_FEATURE" && "$PERSISTENCE_SUB_FEATURE" != "${SUB_FEATURE// /}" ]]; then
  CONTEXT_CONSISTENT=false
fi

if [ "$CONTEXT_CONSISTENT" = true ]; then
  echo "✅ Context is consistent across all files"
else
  echo "❌ Context inconsistencies detected - see details above"
  
  echo
  echo "=== Suggested Fixes ==="
  if [ "$CORE_STATUS" != "$FEATURE_STATUS" ]; then
    echo "1. Update feature status in core-mechanics.mdc:"
    echo "   Change: ## $FEATURE_WITH_SPACES [$CORE_STATUS]"
    echo "   To:     ## $FEATURE_WITH_SPACES [$FEATURE_STATUS]"
    echo "   OR run: .cursor/rules/workflows/feature-implementation/scripts/sync-context.sh \"$FEATURE_WITH_SPACES\" \"$SUB_FEATURE\" \"$FEATURE_STATUS\""
  fi
  
  if [ ! -f "$IMPL_FILE" ]; then
    echo "2. Fix implementation file path issues:"
    echo "   Run: .cursor/rules/workflows/feature-implementation/scripts/fix-implementation-path.sh"
  elif [ -n "$SUB_FEATURE" ] && [ -n "$SUB_FEATURE_STATUS" ]; then
    if [ "$CONTEXT_SUB_FEATURE_STATUS" = "Passing" ] && [ "$SUB_FEATURE_STATUS" != "test-passing" ]; then
      echo "2. Update sub-feature status in implementation file:"
      echo "   Change: ### $SUB_FEATURE [$SUB_FEATURE_STATUS]"
      echo "   To:     ### $SUB_FEATURE [test-passing]"
      echo "   OR run: .cursor/rules/workflows/feature-implementation/scripts/sync-context.sh \"$FEATURE_WITH_SPACES\" \"$SUB_FEATURE\" \"test-passing\""
    elif [ "$CONTEXT_SUB_FEATURE_STATUS" = "Failing" ] && [ "$SUB_FEATURE_STATUS" != "test-failing" ]; then
      echo "2. Update sub-feature status in implementation file:"
      echo "   Change: ### $SUB_FEATURE [$SUB_FEATURE_STATUS]"
      echo "   To:     ### $SUB_FEATURE [test-failing]"
      echo "   OR run: .cursor/rules/workflows/feature-implementation/scripts/sync-context.sh \"$FEATURE_WITH_SPACES\" \"$SUB_FEATURE\" \"test-failing\""
    fi
  fi
  
  if [[ "$PERSISTENCE_FEATURE" != "$FEATURE_WITH_SPACES" && "$PERSISTENCE_FEATURE" != "$FEATURE" ]] || [ "$PERSISTENCE_STATUS" != "$FEATURE_STATUS" ] || [[ "$PERSISTENCE_SUB_FEATURE" != "$SUB_FEATURE" && "$PERSISTENCE_SUB_FEATURE" != "${SUB_FEATURE// /}" ]]; then
    echo "3. Update context persistence to match active context:"
    echo "   Run: .cursor/rules/workflows/feature-implementation/scripts/sync-context.sh \"$FEATURE_WITH_SPACES\" \"$SUB_FEATURE\" \"$FEATURE_STATUS\""
  fi
fi
echo

echo "Verification completed."
exit 0 