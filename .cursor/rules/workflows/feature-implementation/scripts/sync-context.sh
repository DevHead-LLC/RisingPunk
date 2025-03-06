#!/bin/bash
# Context Synchronization Script
# Usage: ./sync-context.sh [feature] [sub-feature] [status]

# Check if required arguments are provided
if [ "$#" -lt 3 ]; then
  echo "Usage: ./sync-context.sh [feature] [sub-feature] [status]"
  echo "Example: ./sync-context.sh 'Loss Tracking System' 'Loss Comparison Analytics' 'test-failing'"
  exit 1
fi

FEATURE="$1"
SUB_FEATURE="$2"
STATUS="$3"

echo "=== Context Synchronization Tool ==="
echo "Feature: $FEATURE"
echo "Sub-feature: $SUB_FEATURE"
echo "Status: $STATUS"
echo "Timestamp: $(date)"
echo

# Paths to context files
CORE_MECHANICS=".cursor/rules/gameplay/features/battle/core-mechanics.mdc"
ACTIVE_CONTEXT=".cursor/rules/workflows/feature-implementation/active-working-feature-context.mdc"
CONTEXT_PERSISTENCE=".cursor/rules/workflows/feature-implementation/context-persistence.mdc"

# Implementation file path (convert to lowercase with hyphens)
FEATURE_FILENAME=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
IMPL_FILE=".cursor/rules/gameplay/features/battle/features/${FEATURE_FILENAME}-implementation.mdc"

# Determine feature status based on sub-feature status
if [ "$STATUS" = "test-passing" ] || [ "$STATUS" = "test-failing" ] || [ "$STATUS" = "not-started" ] || [ "$STATUS" = "test-needed" ]; then
  FEATURE_STATUS="in-progress"
elif [ "$STATUS" = "done" ]; then
  FEATURE_STATUS="done"
else
  echo "❌ Invalid status: $STATUS"
  echo "Valid status values: test-passing, test-failing, not-started, test-needed, done"
  exit 1
fi

# Check if files exist
echo "Checking File Existence:"
for FILE in "$CORE_MECHANICS" "$ACTIVE_CONTEXT" "$CONTEXT_PERSISTENCE"; do
  if [ -f "$FILE" ]; then
    echo "  ✅ $FILE exists"
  else
    echo "  ❌ $FILE does not exist"
    exit 1
  fi
done

if [ ! -f "$IMPL_FILE" ]; then
  echo "  ⚠️ Implementation file $IMPL_FILE does not exist"
  echo "  Would you like to create it? (y/n)"
  read -r CREATE_IMPL
  if [ "$CREATE_IMPL" = "y" ]; then
    echo "Creating implementation file..."
    mkdir -p "$(dirname "$IMPL_FILE")"
    cat > "$IMPL_FILE" << EOF
---
description: 
globs: 
alwaysApply: false
---
# $FEATURE Implementation

## Sub-Features

### 1. $SUB_FEATURE [$STATUS]

**Implementation Status**:
- [ ] Test Created
- [ ] Implementation Started 
- [ ] Implementation Complete
- [ ] Test Passing

**Test Requirements**:
- Define test requirements here

## Current Focus

**Test Writing**: $SUB_FEATURE

- List test writing tasks

## Progress Tracking

**Current Phase**: Feature Selected

**Next Steps**:
1. Create tests for $SUB_FEATURE
2. Implement $SUB_FEATURE
3. Complete the $FEATURE feature
EOF
    echo "  ✅ Created implementation file: $IMPL_FILE"
  else
    echo "  ❌ Cannot synchronize context without implementation file"
    exit 1
  fi
fi
echo

# Update core-mechanics.mdc
echo "Updating Feature Status in Core Mechanics:"
if grep -q "## $FEATURE \[" "$CORE_MECHANICS"; then
  # Feature exists, update status
  sed -i.bak "s/## $FEATURE \[[a-z-]*\]/## $FEATURE \[$FEATURE_STATUS\]/" "$CORE_MECHANICS"
  echo "  ✅ Updated feature status in core-mechanics.mdc: [$FEATURE_STATUS]"
else
  echo "  ❌ Feature not found in core-mechanics.mdc"
fi
echo

# Update implementation file
echo "Updating Sub-feature Status in Implementation File:"
if grep -q "### .*$SUB_FEATURE \[" "$IMPL_FILE"; then
  # Sub-feature exists, update status
  sed -i.bak "s/### .*$SUB_FEATURE \[[a-z-]*\]/### $SUB_FEATURE \[$STATUS\]/" "$IMPL_FILE"
  echo "  ✅ Updated sub-feature status in implementation file: [$STATUS]"
else
  echo "  ❌ Sub-feature not found in implementation file"
fi
echo

# Update context-persistence.mdc
echo "Updating Context Persistence:"

# Extract current yaml block
CURRENT_CONTEXT_BLOCK=$(sed -n '/^```yaml/,/^```/ p' "$CONTEXT_PERSISTENCE" | grep -v '```yaml' | grep -v '^```')
FEATURE_INVENTORY_BLOCK=$(sed -n '/^```yaml/,/^```/ p' "$CONTEXT_PERSISTENCE" | grep -v '```yaml' | grep -v '^```')

# Create updated current context
UPDATED_CURRENT_CONTEXT="timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
current_feature: $FEATURE
current_status: $FEATURE_STATUS
current_sub_feature: $SUB_FEATURE
sub_feature_status: $STATUS
previous_feature: Node Control System
previous_status: done"

# Update context-persistence.mdc
sed -i.bak "s/timestamp: .*current_feature: .*/timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")\ncurrent_feature: $FEATURE/" "$CONTEXT_PERSISTENCE"
sed -i.bak "s/current_status: .*/current_status: $FEATURE_STATUS/" "$CONTEXT_PERSISTENCE"
sed -i.bak "s/current_sub_feature: .*/current_sub_feature: $SUB_FEATURE/" "$CONTEXT_PERSISTENCE"
sed -i.bak "s/sub_feature_status: .*/sub_feature_status: $STATUS/" "$CONTEXT_PERSISTENCE"

echo "  ✅ Updated context-persistence.mdc with current context"
echo

# Update active working context
echo "Updating Active Working Feature Context:"
# This is a simplified update - in practice you'd need a more complex parser
# to handle the full structure of the active-working-feature-context.mdc file
# For now, we'll just update the feature and status

sed -i.bak "s/- Name: .*/- Name: $FEATURE/" "$ACTIVE_CONTEXT"
sed -i.bak "s/- Status: \[[a-z-]*\]/- Status: \[$FEATURE_STATUS\]/" "$ACTIVE_CONTEXT"

echo "  ✅ Updated active-working-feature-context.mdc"
echo

# Clean up backup files
rm -f "$CORE_MECHANICS.bak" "$IMPL_FILE.bak" "$CONTEXT_PERSISTENCE.bak" "$ACTIVE_CONTEXT.bak"

echo "=== Synchronization Summary ==="
echo "✅ Context synchronized successfully"
echo "  Feature: $FEATURE [$FEATURE_STATUS]"
echo "  Sub-feature: $SUB_FEATURE [$STATUS]"
echo
echo "Run ./verify-context.sh to confirm synchronization." 