#!/bin/bash

# TDD Workflow - Context Verification Script
# Purpose: Verify that all necessary context files exist and are properly formatted
# Usage: ./verify-context.sh [feature_name] [sub_feature_name] [status]

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Define paths
WORKSPACE_ROOT="/Users/robertthiel/DevHead_LLC/RisingPunk"
ACTIVE_CONTEXT="${WORKSPACE_ROOT}/rules/context/tdd/active-working-context.mdc"
WORKFLOW_DIRECTIVE="${WORKSPACE_ROOT}/rules/context/tdd/workflow-directive.mdc"
AI_DIRECTIVE_TREE="${WORKSPACE_ROOT}/rules/ai-directives/tdd-workflow.mdc"

echo -e "${YELLOW}Running TDD Context Verification...${NC}"

# Function to check if a file exists and create it if it doesn't
check_file() {
    local file_path=$1
    local file_type=$2
    local create_template=$3
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✓ ${file_type} exists at ${file_path}${NC}"
        return 0
    else
        echo -e "${YELLOW}! ${file_type} does not exist at ${file_path}${NC}"
        if [ "$create_template" = true ]; then
            echo -e "${YELLOW}Creating ${file_type} template...${NC}"
            mkdir -p "$(dirname "$file_path")"
            
            case "$file_type" in
                "Active context file")
                    cat > "$file_path" << EOF
---
description: Active working context for TDD workflow
updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
---

# TDD WORKFLOW ACTIVE CONTEXT

## CURRENT STATUS
- **Workflow Position**: Reset Context
- **Status**: [in-progress]
- **Last Updated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## FEATURE TRACKING
- **Current Feature**: None
- **Feature Status**: Not started
- **Sub-Feature**: None
- **Sub-Feature Status**: Not started

## WORKFLOW PROGRESS
- **Reset Context**: [in-progress]
- **Select Feature from Files**: [to-do]
- **Build a Failing Test**: [to-do]
- **Run Failing Test to Verify It Fails**: [to-do]
- **Implement Minimal Fix**: [to-do]
- **Run Test to Verify Fix**: [to-do]
- **Run All Tests to Ensure No Other Tests Break**: [to-do]
- **Performance Check**: [to-do]
- **Feature Completion or Iteration**: [to-do]
- **Pause and Wait**: [to-do]

## CONTEXT HISTORY
- $(date -u +"%Y-%m-%dT%H:%M:%SZ"): Initialized TDD workflow context
- $(date -u +"%Y-%m-%dT%H:%M:%SZ"): Started Reset Context step

## EXECUTION NOTES
- Initial context file created
- Ready to continue with Reset Context step
- Following workflow as defined in "${AI_DIRECTIVE_TREE}"
- Master directive located at "${WORKFLOW_DIRECTIVE}"

## NEXT ACTIONS
1. Complete Reset Context step
2. Update status to [done]
3. Proceed to Select Feature from Files step
EOF
                    ;;
            esac
            
            if [ -f "$file_path" ]; then
                echo -e "${GREEN}✓ Created ${file_type} at ${file_path}${NC}"
            else
                echo -e "${RED}✗ Failed to create ${file_type} at ${file_path}${NC}"
                return 1
            fi
        else
            echo -e "${RED}✗ ${file_type} does not exist and was not created${NC}"
            return 1
        fi
    fi
}

# Check if context files exist
check_file "$ACTIVE_CONTEXT" "Active context file" true
check_file "$WORKFLOW_DIRECTIVE" "Workflow directive file" false
check_file "$AI_DIRECTIVE_TREE" "AI directive tree file" false

# New function to determine if we're starting fresh or continuing
determine_workflow_state() {
    if grep -q "\[in-progress\]" "$ACTIVE_CONTEXT"; then
        echo "continuing"
    else
        echo "fresh"
    fi
}

# New function to synchronize statuses between directive files and active context
sync_statuses() {
    local workflow_state=$1
    echo -e "${YELLOW}Synchronizing workflow statuses (state: $workflow_state)...${NC}"
    
    if [ "$workflow_state" = "fresh" ]; then
        # If starting fresh, reset all statuses to [to-do]
        echo -e "${YELLOW}Starting new workflow cycle - resetting all statuses to [to-do]${NC}"
        
        # Extract current statuses from active context
        if [ -f "$ACTIVE_CONTEXT" ]; then
            # Set all workflow steps to [to-do] in the active context
            sed -i '' 's/\[in-progress\]/\[to-do\]/g' "$ACTIVE_CONTEXT"
            sed -i '' 's/\[done\]/\[to-do\]/g' "$ACTIVE_CONTEXT"
            
            # Update the current status section
            sed -i '' 's/- \*\*Status\*\*: \[in-progress\]/- **Status**: \[to-do\]/g' "$ACTIVE_CONTEXT"
            sed -i '' 's/- \*\*Status\*\*: \[done\]/- **Status**: \[to-do\]/g' "$ACTIVE_CONTEXT"
            
            # Also set the first step to [to-do]
            sed -i '' 's/- \*\*Reset Context\*\*: \[in-progress\]/- **Reset Context**: \[to-do\]/g' "$ACTIVE_CONTEXT"
            
            # Update last updated timestamp
            current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
            sed -i '' "s/- \*\*Last Updated\*\*: .*/- **Last Updated**: $current_time/g" "$ACTIVE_CONTEXT"
            
            echo -e "${GREEN}✓ Active context statuses reset to [to-do]${NC}"
        fi
        
        # We would ideally also reset the AI directive tree, but that's likely read-only
        # Instead, add a note to the context history
        sed -i '' "/^## CONTEXT HISTORY/a\\
- $(date -u +"%Y-%m-%dT%H:%M:%SZ"): Reset all workflow statuses to [to-do] for new cycle" "$ACTIVE_CONTEXT"
    else
        # If continuing, use active context as the source of truth
        echo -e "${YELLOW}Continuing existing workflow - syncing from active context${NC}"
        
        # Add a note to the context history
        sed -i '' "/^## CONTEXT HISTORY/a\\
- $(date -u +"%Y-%m-%dT%H:%M:%SZ"): Continuing workflow from existing state" "$ACTIVE_CONTEXT"
    fi
    
    echo -e "${GREEN}✓ Status synchronization complete${NC}"
}

# Determine if we're starting fresh or continuing
WORKFLOW_STATE=$(determine_workflow_state)

# Perform status synchronization
sync_statuses "$WORKFLOW_STATE"

# Update active context with verified status
if [ -f "$ACTIVE_CONTEXT" ]; then
    echo -e "${YELLOW}Updating active context with verification timestamp...${NC}"
    # Add verification timestamp to context history
    sed -i '' "/^## CONTEXT HISTORY/a\\
- $(date -u +"%Y-%m-%dT%H:%M:%SZ"): Context verification completed" "$ACTIVE_CONTEXT"
    
    echo -e "${GREEN}✓ Context verification complete${NC}"
else
    echo -e "${RED}✗ Context verification failed: Active context file doesn't exist${NC}"
    exit 1
fi

# If feature_name is provided, update feature tracking
if [ ! -z "$1" ]; then
    echo -e "${YELLOW}Updating feature tracking with: $1 $2 $3${NC}"
    
    # This would be expanded in a real implementation to actually update feature tracking
    # For now, just echo that we would do this
    echo -e "${GREEN}✓ Feature tracking would be updated for: $1 $2 $3${NC}"
fi

echo -e "${GREEN}Context verification completed successfully${NC}"
exit 0 