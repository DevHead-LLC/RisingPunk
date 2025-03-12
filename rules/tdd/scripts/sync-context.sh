#!/bin/bash

# TDD Workflow - Context Synchronization Script
# Purpose: Synchronize context across TDD workflow files
# Usage: ./sync-context.sh "{FeatureName}" "{SubFeatureName}" "{Status}"

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
FEATURE_PATH="${WORKSPACE_ROOT}/rules/gameplay/intended-features"

# Get parameters
FEATURE_NAME=$1
SUB_FEATURE_NAME=$2
STATUS=$3

echo -e "${YELLOW}Synchronizing TDD Context...${NC}"
echo -e "Feature: ${FEATURE_NAME}"
echo -e "Sub-Feature: ${SUB_FEATURE_NAME}"
echo -e "Status: ${STATUS}"

# Function to update active context
update_active_context() {
    if [ -f "$ACTIVE_CONTEXT" ]; then
        echo -e "${YELLOW}Updating active working context...${NC}"
        
        # Update current feature and status
        if [ ! -z "$FEATURE_NAME" ] && [ "$FEATURE_NAME" != "init" ]; then
            # Replace Current Feature line
            sed -i '' -e "s/- \*\*Current Feature\*\*: .*$/- **Current Feature**: ${FEATURE_NAME}/" "$ACTIVE_CONTEXT"
            # Replace Feature Status line
            sed -i '' -e "s/- \*\*Feature Status\*\*: .*$/- **Feature Status**: ${STATUS}/" "$ACTIVE_CONTEXT"
        fi
        
        # Update sub-feature if provided
        if [ ! -z "$SUB_FEATURE_NAME" ] && [ "$SUB_FEATURE_NAME" != "init" ]; then
            # Replace Sub-Feature line
            sed -i '' -e "s/- \*\*Sub-Feature\*\*: .*$/- **Sub-Feature**: ${SUB_FEATURE_NAME}/" "$ACTIVE_CONTEXT"
            # Replace Sub-Feature Status line
            sed -i '' -e "s/- \*\*Sub-Feature Status\*\*: .*$/- **Sub-Feature Status**: ${STATUS}/" "$ACTIVE_CONTEXT"
        fi
        
        # Update CURRENT POSITION section with return pointer to AI Directive Tree
        # Check if the section exists
        if grep -q "^## CURRENT POSITION" "$ACTIVE_CONTEXT"; then
            # Update the current workflow position based on status
            case "$STATUS" in 
                "in-progress")
                    # Update to show we're starting this step
                    local current_tree=$(grep -A 1 "^## CURRENT STATUS" "$ACTIVE_CONTEXT" | grep "Workflow Position" | sed 's/.*: //')
                    sed -i '' 's/- \*\*Tree\*\*: .*/- **Tree**: '"$current_tree"'/' "$ACTIVE_CONTEXT"
                    sed -i '' 's/- \*\*Last Completed Sub-step\*\*: .*/- **Last Completed Sub-step**: Previous step complete/' "$ACTIVE_CONTEXT"
                    sed -i '' 's/- \*\*Next Sub-step\*\*: .*/- **Next Sub-step**: First sub-step of '"$current_tree"'/' "$ACTIVE_CONTEXT"
                    ;;
                "test-failing"|"implementing"|"test-passing")
                    # Update for feature implementation steps
                    sed -i '' 's/- \*\*Last Completed Sub-step\*\*: .*/- **Last Completed Sub-step**: Status updated to ['"$STATUS"']/' "$ACTIVE_CONTEXT"
                    sed -i '' 's/- \*\*Next Sub-step\*\*: .*/- **Next Sub-step**: Continue with next action in AI Directive Tree/' "$ACTIVE_CONTEXT"
                    ;;
                "done")
                    # Update to show completion and next step
                    sed -i '' 's/- \*\*Last Completed Sub-step\*\*: .*/- **Last Completed Sub-step**: All sub-steps of current step/' "$ACTIVE_CONTEXT"
                    sed -i '' 's/- \*\*Next Sub-step\*\*: .*/- **Next Sub-step**: Move to next workflow step/' "$ACTIVE_CONTEXT"
                    ;;
            esac
            
            # Always ensure the return path is correct
            sed -i '' 's|- \*\*Return To\*\*: .*|- **Return To**: '"$AI_DIRECTIVE_TREE"'|' "$ACTIVE_CONTEXT"
        else
            # Add the section if it doesn't exist
            sed -i '' "/^## FEATURE TRACKING/i\\
## CURRENT POSITION\\
- **Tree**: $(grep -A 1 "^## CURRENT STATUS" "$ACTIVE_CONTEXT" | grep "Workflow Position" | sed 's/.*: //')\\
- **Last Completed Sub-step**: Status synchronized to [$STATUS]\\
- **Next Sub-step**: Continue with next action in AI Directive Tree\\
- **Return To**: $AI_DIRECTIVE_TREE\\
" "$ACTIVE_CONTEXT"
        fi
        
        # Update the NEXT ACTIONS section to point back to AI Directive Tree
        if grep -q "^## NEXT ACTIONS" "$ACTIVE_CONTEXT"; then
            # Replace first action to point back to AI Directive Tree
            sed -i '' '/^## NEXT ACTIONS/,/^##/{s/^1\..*/1. Return to AI Directive Tree at: '"$AI_DIRECTIVE_TREE"'/}' "$ACTIVE_CONTEXT"
        fi
        
        # Add timestamp to context history
        sed -i '' "/^## CONTEXT HISTORY/a\\
- $(date -u +"%Y-%m-%dT%H:%M:%SZ"): Context synchronized for ${FEATURE_NAME}:${SUB_FEATURE_NAME} with status [${STATUS}]" "$ACTIVE_CONTEXT"
        
        echo -e "${GREEN}✓ Active context updated${NC}"
    else
        echo -e "${RED}✗ Context update failed: Active context file doesn't exist${NC}"
        exit 1
    fi
}

# Function to find and update feature status in feature files
update_feature_status() {
    if [ -z "$FEATURE_NAME" ] || [ "$FEATURE_NAME" == "init" ]; then
        echo -e "${YELLOW}No feature specified, skipping feature file update${NC}"
        return 0
    fi
    
    # Try to find the feature file by looking through the feature directory
    feature_files=$(find "$FEATURE_PATH" -type f -name "*.mdc")
    
    feature_file_found=false
    for file in $feature_files; do
        # Check if the file contains the feature name
        if grep -q "$FEATURE_NAME" "$file"; then
            echo -e "${YELLOW}Found feature match in ${file}${NC}"
            feature_file_found=true
            
            # For now, just report that we would update the status
            # In a real implementation, we would actually update the status markers
            echo -e "${GREEN}✓ Would update feature status to [${STATUS}] in ${file}${NC}"
        fi
    done
    
    if [ "$feature_file_found" = false ]; then
        echo -e "${YELLOW}No feature file found matching ${FEATURE_NAME}${NC}"
    fi
}

# Main execution
update_active_context
update_feature_status

echo -e "${GREEN}Context synchronization completed successfully${NC}"
exit 0 