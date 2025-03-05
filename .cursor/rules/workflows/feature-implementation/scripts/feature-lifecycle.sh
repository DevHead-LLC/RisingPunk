#!/bin/bash
# Feature Lifecycle Management Script
# Manages the entire feature lifecycle from start to finish
# Usage: ./feature-lifecycle.sh [command] [feature_name] [additional_args...]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTEXT_SCRIPTS_DIR="$SCRIPT_DIR"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Main help function
show_help() {
  echo -e "${BOLD}=== Feature Lifecycle Management Tool ===${NC}"
  echo
  echo -e "Usage: ./feature-lifecycle.sh ${YELLOW}[command]${NC} ${CYAN}[feature_name]${NC} [additional_args...]"
  echo
  echo -e "${BOLD}Available Commands:${NC}"
  echo -e "  ${YELLOW}start${NC}      ${CYAN}[feature_name]${NC}                     Start a new feature implementation"
  echo -e "  ${YELLOW}test-create${NC} ${CYAN}[feature_name]${NC} ${GREEN}[sub_feature]${NC}        Create tests for a sub-feature"
  echo -e "  ${YELLOW}test-pass${NC}   ${CYAN}[feature_name]${NC} ${GREEN}[sub_feature]${NC}        Mark tests as passing for a sub-feature"
  echo -e "  ${YELLOW}implement${NC}  ${CYAN}[feature_name]${NC} ${GREEN}[sub_feature]${NC}        Start implementing a sub-feature"
  echo -e "  ${YELLOW}complete${NC}   ${CYAN}[feature_name]${NC} ${GREEN}[sub_feature]${NC} ${RED}[message]${NC} Mark a sub-feature as complete"
  echo -e "  ${YELLOW}finish${NC}     ${CYAN}[feature_name]${NC}                     Finish a feature implementation"
  echo -e "  ${YELLOW}sync${NC}       ${CYAN}[feature_name]${NC}                     Synchronize feature context files"
  echo -e "  ${YELLOW}verify${NC}     ${CYAN}[feature_name]${NC}                     Verify feature context consistency"
  echo -e "  ${YELLOW}analyze${NC}    ${CYAN}[feature_name]${NC}                     Analyze feature dependencies"
  echo -e "  ${YELLOW}status${NC}     ${CYAN}[feature_name]${NC}                     Show current feature status"
  echo 
  echo -e "${BOLD}Examples:${NC}"
  echo -e "  ./feature-lifecycle.sh ${YELLOW}start${NC} ${CYAN}'Scoring System'${NC}"
  echo -e "  ./feature-lifecycle.sh ${YELLOW}test-create${NC} ${CYAN}'Scoring System'${NC} ${GREEN}'Node Control Points'${NC}"
  echo -e "  ./feature-lifecycle.sh ${YELLOW}implement${NC} ${CYAN}'Scoring System'${NC} ${GREEN}'Node Control Points'${NC}"
  echo -e "  ./feature-lifecycle.sh ${YELLOW}complete${NC} ${CYAN}'Scoring System'${NC} ${GREEN}'Node Control Points'${NC} ${RED}'Implemented point calculation logic'${NC}"
  echo
}

# Validate feature name
validate_feature_name() {
  if [ -z "$1" ]; then
    echo -e "${RED}Error: Feature name is required${NC}"
    show_help
    exit 1
  fi
}

# Run a script with arguments
run_script() {
  script_name="$1"
  shift
  
  if [ -f "$CONTEXT_SCRIPTS_DIR/$script_name" ]; then
    echo -e "${BOLD}Running $script_name...${NC}"
    "$CONTEXT_SCRIPTS_DIR/$script_name" "$@"
  else
    echo -e "${RED}Error: Script $script_name not found${NC}"
    exit 1
  fi
}

# Generate feature filename from feature name
get_feature_filename() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '-'
}

# Start new feature implementation
start_feature() {
  feature_name="$1"
  validate_feature_name "$feature_name"
  
  echo -e "${BOLD}Starting new feature implementation: ${CYAN}$feature_name${NC}${BOLD}...${NC}"
  
  # Set active feature context
  run_script "set-active-feature.sh" "$feature_name"
  
  # Create implementation file (if it doesn't exist)
  feature_filename=$(get_feature_filename "$feature_name")
  impl_file=".cursor/rules/gameplay/features/battle/features/${feature_filename}-implementation.mdc"
  
  if [ ! -f "$impl_file" ]; then
    echo -e "${BOLD}Creating implementation file: $impl_file${NC}"
    
    # Create implementation template
    mkdir -p "$(dirname "$impl_file")"
    cat > "$impl_file" << EOF
# $feature_name Implementation

## Overview

This document tracks the implementation of the $feature_name feature.

## Implementation Status

- [ ] Test Created
- [ ] Implementation Started
- [ ] Implementation Complete
- [ ] Test Passing

## Sub-Features

### Sub-Feature 1 [not-started]

- [ ] Test Created
- [ ] Implementation Started
- [ ] Implementation Complete
- [ ] Test Passing

## Current Focus

**Planning**: Initial Setup

- Review requirements
- Break down into sub-features
- Create implementation plan

## Progress Tracking

**Current Phase**: Feature Planning
**Last Action**: Started feature implementation
**Next Action**: Define sub-features

**Updated**: $(date) - Feature implementation started
EOF
    
    echo -e "${GREEN}✅ Created implementation file template${NC}"
  else
    echo -e "${YELLOW}⚠️ Implementation file already exists: $impl_file${NC}"
  fi
  
  # Fix implementation path if needed
  run_script "fix-implementation-path.sh" "$feature_name"
  
  # Sync context
  run_script "sync-context.sh" "$feature_name"
  
  echo -e "\n${GREEN}✅ Feature $feature_name setup complete!${NC}"
  echo -e "${BOLD}Next steps:${NC}"
  echo -e "1. Define sub-features in the implementation file"
  echo -e "2. Run './feature-lifecycle.sh test-create \"$feature_name\" \"Sub-Feature Name\"' to start implementing a sub-feature"
}

# Create tests for a sub-feature
create_tests() {
  feature_name="$1"
  sub_feature="$2"
  
  validate_feature_name "$feature_name"
  
  if [ -z "$sub_feature" ]; then
    echo -e "${RED}Error: Sub-feature name is required${NC}"
    show_help
    exit 1
  fi
  
  echo -e "${BOLD}Creating tests for sub-feature ${GREEN}$sub_feature${NC}${BOLD} in feature ${CYAN}$feature_name${NC}${BOLD}...${NC}"
  
  # Update implementation status
  run_script "update-implementation-progress.sh" "$feature_name" "$sub_feature" "test-failing" "Created failing tests for $sub_feature"
  
  # Sync context
  run_script "sync-context.sh" "$feature_name"
  
  echo -e "\n${GREEN}✅ Test creation phase complete!${NC}"
  echo -e "${BOLD}Next steps:${NC}"
  echo -e "1. Implement the failing tests in the appropriate test file"
  echo -e "2. Run './feature-lifecycle.sh implement \"$feature_name\" \"$sub_feature\"' to start implementation"
}

# Start implementing a sub-feature
start_implementation() {
  feature_name="$1"
  sub_feature="$2"
  
  validate_feature_name "$feature_name"
  
  if [ -z "$sub_feature" ]; then
    echo -e "${RED}Error: Sub-feature name is required${NC}"
    show_help
    exit 1
  fi
  
  echo -e "${BOLD}Starting implementation for sub-feature ${GREEN}$sub_feature${NC}${BOLD} in feature ${CYAN}$feature_name${NC}${BOLD}...${NC}"
  
  # Update implementation status
  run_script "update-implementation-progress.sh" "$feature_name" "$sub_feature" "in-progress" "Started implementing $sub_feature"
  
  # Sync context
  run_script "sync-context.sh" "$feature_name"
  
  echo -e "\n${GREEN}✅ Implementation phase started!${NC}"
  echo -e "${BOLD}Next steps:${NC}"
  echo -e "1. Implement the functionality in the appropriate files"
  echo -e "2. Run tests to verify the implementation"
  echo -e "3. Run './feature-lifecycle.sh complete \"$feature_name\" \"$sub_feature\" \"[completion message]\"' when tests pass"
}

# Mark tests as passing
mark_tests_passing() {
  feature_name="$1"
  sub_feature="$2"
  
  validate_feature_name "$feature_name"
  
  if [ -z "$sub_feature" ]; then
    echo -e "${RED}Error: Sub-feature name is required${NC}"
    show_help
    exit 1
  fi
  
  echo -e "${BOLD}Marking tests as passing for sub-feature ${GREEN}$sub_feature${NC}${BOLD} in feature ${CYAN}$feature_name${NC}${BOLD}...${NC}"
  
  # Update implementation status
  run_script "update-implementation-progress.sh" "$feature_name" "$sub_feature" "test-passing" "Tests passing for $sub_feature"
  
  # Sync context
  run_script "sync-context.sh" "$feature_name"
  
  echo -e "\n${GREEN}✅ Tests marked as passing!${NC}"
  echo -e "${BOLD}Next steps:${NC}"
  echo -e "1. Proceed to the next sub-feature or finish the feature"
}

# Mark a sub-feature as complete
complete_subfeature() {
  feature_name="$1"
  sub_feature="$2"
  message="${3:-Completed implementation}"
  
  validate_feature_name "$feature_name"
  
  if [ -z "$sub_feature" ]; then
    echo -e "${RED}Error: Sub-feature name is required${NC}"
    show_help
    exit 1
  fi
  
  echo -e "${BOLD}Completing sub-feature ${GREEN}$sub_feature${NC}${BOLD} in feature ${CYAN}$feature_name${NC}${BOLD}...${NC}"
  
  # Update implementation status
  run_script "update-implementation-progress.sh" "$feature_name" "$sub_feature" "test-passing" "$message"
  
  # Sync context
  run_script "sync-context.sh" "$feature_name"
  
  echo -e "\n${GREEN}✅ Sub-feature completed successfully!${NC}"
  
  # Check if this was the last sub-feature
  feature_filename=$(get_feature_filename "$feature_name")
  impl_file=".cursor/rules/gameplay/features/battle/features/${feature_filename}-implementation.mdc"
  
  if [ -f "$impl_file" ]; then
    # macOS compatible command
    incomplete_features=$(cat "$impl_file" | grep -E "\[not-started\]|\[test-needed\]|\[test-failing\]|\[in-progress\]" | wc -l | tr -d ' ')
    
    if [ "$incomplete_features" -eq 0 ]; then
      echo -e "${YELLOW}All sub-features appear to be completed!${NC}"
      echo -e "Consider running './feature-lifecycle.sh finish \"$feature_name\"' to finalize the feature."
    else
      echo -e "${BOLD}Next steps:${NC}"
      echo -e "1. Proceed to the next sub-feature"
      
      # Find the next sub-feature that's not done (macOS compatible)
      next_sub_features=$(cat "$impl_file" | grep -E "^### .+ \[(not-started|test-needed|test-failing|in-progress)\]")
      next_sub_feature=$(echo "$next_sub_features" | grep -v "$sub_feature" | head -1 | sed 's/### \(.*\) \[.*/\1/')
      
      if [ -n "$next_sub_feature" ]; then
        echo -e "   Suggested: './feature-lifecycle.sh test-create \"$feature_name\" \"$next_sub_feature\"'"
      fi
    fi
  else
    echo -e "${BOLD}Next steps:${NC}"
    echo -e "1. Proceed to the next sub-feature or finish the feature"
  fi
}

# Finish a feature implementation
finish_feature() {
  feature_name="$1"
  validate_feature_name "$feature_name"
  
  echo -e "${BOLD}Finishing feature implementation: ${CYAN}$feature_name${NC}${BOLD}...${NC}"
  
  # Check if all sub-features are complete
  feature_filename=$(get_feature_filename "$feature_name")
  impl_file=".cursor/rules/gameplay/features/battle/features/${feature_filename}-implementation.mdc"
  
  if [ -f "$impl_file" ]; then
    # macOS compatible command
    incomplete_features=$(cat "$impl_file" | grep -E "\[not-started\]|\[test-needed\]|\[test-failing\]|\[in-progress\]" | wc -l | tr -d ' ')
    
    if [ "$incomplete_features" -gt 0 ]; then
      echo -e "${YELLOW}⚠️ Warning: Some sub-features appear to be incomplete!${NC}"
      echo -e "Found $incomplete_features incomplete sub-features."
      echo -e "You may want to complete them before finishing the feature."
      echo
      echo -e "Incomplete sub-features:"
      cat "$impl_file" | grep -E "^### .+ \[(not-started|test-needed|test-failing|in-progress)\]" | sed 's/### \(.*\) \[\(.*\)\]/- \1 [\2]/'
      echo
      
      read -p "Continue anyway? (y/n): " confirm
      if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo -e "${YELLOW}Operation cancelled.${NC}"
        exit 0
      fi
    fi
  fi
  
  # Update feature status in core-mechanics.mdc
  core_mechanics_file=".cursor/rules/gameplay/features/battle/core-mechanics.mdc"
  if [ -f "$core_mechanics_file" ]; then
    # Update status to completed
    sed -i.bak "s/- \[$feature_name\] \[in-progress\]/- \[$feature_name\] \[completed\]/" "$core_mechanics_file"
    sed -i.bak "s/- $feature_name \[in-progress\]/- $feature_name \[completed\]/" "$core_mechanics_file"
    rm -f "$core_mechanics_file.bak"
    
    echo -e "${GREEN}✅ Updated feature status to completed in core-mechanics.mdc${NC}"
  else
    echo -e "${RED}Error: Core mechanics file not found: $core_mechanics_file${NC}"
  fi
  
  # Update implementation file
  if [ -f "$impl_file" ]; then
    # Find the Current Focus section and update it
    sed -i.bak "/^## Current Focus/,/^##/{s/^## Current Focus.*/## Current Focus\n\n**Feature Complete**: $feature_name\n\n- All sub-features implemented\n- All tests passing\n- Ready for integration/}; /^## Current Focus/,/^##/!b" "$impl_file"
    
    # Add completion note to Progress Tracking
    echo -e "\n**FEATURE COMPLETED**: $(date) - All sub-features implemented and tested" >> "$impl_file"
    
    rm -f "$impl_file.bak"
    
    echo -e "${GREEN}✅ Updated implementation file to mark feature as complete${NC}"
  fi
  
  # Sync context with completed status
  feature_status="completed"
  active_context_file=".cursor/rules/workflows/feature-implementation/active-working-feature-context.mdc"
  if [ -f "$active_context_file" ]; then
    # Update status to completed
    sed -i.bak "s/Status: \[in-progress\]/Status: \[$feature_status\]/" "$active_context_file"
    rm -f "$active_context_file.bak"
    
    echo -e "${GREEN}✅ Updated active context status to completed${NC}"
  fi
  
  # Run sync context script
  run_script "sync-context.sh" "$feature_name"
  
  echo -e "\n${GREEN}✅ Feature $feature_name completed successfully!${NC}"
  echo -e "${BOLD}Next steps:${NC}"
  echo -e "1. Verify integration with other features"
  echo -e "2. Start work on a new feature"
}

# Synchronize feature context
sync_feature_context() {
  feature_name="$1"
  validate_feature_name "$feature_name"
  
  echo -e "${BOLD}Synchronizing context files for feature: ${CYAN}$feature_name${NC}${BOLD}...${NC}"
  
  # Run sync context script
  run_script "sync-context.sh" "$feature_name"
  
  echo -e "\n${GREEN}✅ Feature context synchronized successfully!${NC}"
}

# Verify feature context consistency
verify_feature_context() {
  feature_name="$1"
  validate_feature_name "$feature_name"
  
  echo -e "${BOLD}Verifying context consistency for feature: ${CYAN}$feature_name${NC}${BOLD}...${NC}"
  
  # Run verify context script
  run_script "verify-context.sh" "$feature_name"
}

# Analyze feature dependencies
analyze_feature_dependencies() {
  feature_name="$1"
  validate_feature_name "$feature_name"
  
  echo -e "${BOLD}Analyzing dependencies for feature: ${CYAN}$feature_name${NC}${BOLD}...${NC}"
  
  # Run analyze dependencies script
  run_script "analyze-feature-dependencies.sh" "$feature_name"
}

# Show feature status
show_feature_status() {
  feature_name="$1"
  validate_feature_name "$feature_name"
  
  echo -e "${BOLD}Current status for feature: ${CYAN}$feature_name${NC}${BOLD}...${NC}"
  
  # Get feature filename
  feature_filename=$(get_feature_filename "$feature_name")
  impl_file=".cursor/rules/gameplay/features/battle/features/${feature_filename}-implementation.mdc"
  
  if [ ! -f "$impl_file" ]; then
    echo -e "${RED}Error: Implementation file not found: $impl_file${NC}"
    exit 1
  fi
  
  echo -e "${BOLD}Implementation Status:${NC}"
  grep -A 5 "^## Implementation Status" "$impl_file" | tail -n +2
  
  echo -e "\n${BOLD}Sub-Features:${NC}"
  cat "$impl_file" | grep -E "^### .+ \[.+\]" | sed 's/### \(.*\) \[\(.*\)\]/- \1 [\2]/'
  
  echo -e "\n${BOLD}Current Focus:${NC}"
  sed -n '/^## Current Focus/,/^##/p' "$impl_file" | grep -v "^##" | grep -v "^$"
  
  echo -e "\n${BOLD}Recent Updates:${NC}"
  grep -E "^\*\*Updated\*\*:" "$impl_file" | tail -n 3
  
  # Check active context
  active_context_file=".cursor/rules/workflows/feature-implementation/active-working-feature-context.mdc"
  if [ -f "$active_context_file" ]; then
    active_feature=$(grep "Feature:" "$active_context_file" | sed 's/Feature: //')
    active_status=$(grep "Status:" "$active_context_file" | sed 's/Status: \[\(.*\)\]/\1/')
    
    echo -e "\n${BOLD}Active Context:${NC}"
    echo -e "Active Feature: $active_feature"
    echo -e "Status: [$active_status]"
    
    if [ "$active_feature" != "$feature_name" ]; then
      echo -e "${YELLOW}⚠️ Warning: Requested feature doesn't match active feature in context!${NC}"
    fi
  fi
}

# Main command processing
if [ "$#" -lt 1 ]; then
  show_help
  exit 0
fi

command="$1"
shift

case "$command" in
  "start")
    start_feature "$@"
    ;;
  "test-create")
    create_tests "$@"
    ;;
  "implement")
    start_implementation "$@"
    ;;
  "test-pass")
    mark_tests_passing "$@"
    ;;
  "complete")
    complete_subfeature "$@"
    ;;
  "finish")
    finish_feature "$@"
    ;;
  "sync")
    sync_feature_context "$@"
    ;;
  "verify")
    verify_feature_context "$@"
    ;;
  "analyze")
    analyze_feature_dependencies "$@"
    ;;
  "status")
    show_feature_status "$@"
    ;;
  "help"|"-h"|"--help")
    show_help
    ;;
  *)
    echo -e "${RED}Error: Unknown command: $command${NC}"
    show_help
    exit 1
    ;;
esac

exit 0 