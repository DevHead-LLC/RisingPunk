#!/bin/bash
# Generate Progress Report Script
# Creates a comprehensive report of all features and their implementation status
# Usage: ./generate-progress-report.sh [output_file]

set -e

OUTPUT_FILE="${1:-feature-progress-report.md}"
TIMESTAMP=$(date)
FEATURES_DIR=".cursor/rules/gameplay/features/battle/features"
CORE_MECHANICS_FILE=".cursor/rules/gameplay/features/battle/core-mechanics.mdc"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}=== Feature Progress Report Generator ===${NC}"
echo "Generating report at: $OUTPUT_FILE"
echo "Timestamp: $TIMESTAMP"

# Create report header
cat > "$OUTPUT_FILE" << EOF
# Feature Implementation Progress Report

**Generated:** $TIMESTAMP

## Overview

This report provides a comprehensive overview of all features and their implementation status.

EOF

# Extract feature list from core-mechanics file
if [ -f "$CORE_MECHANICS_FILE" ]; then
  echo -e "${BOLD}Extracting feature list from core-mechanics.mdc...${NC}"
  
  cat >> "$OUTPUT_FILE" << EOF
## Feature List

The following features are defined in the core-mechanics.mdc file:

| Feature | Status | Implementation File |
|---------|--------|---------------------|
EOF
  
  # Extract feature list (macOS compatible)
  cat "$CORE_MECHANICS_FILE" | grep -E "- \[.*\] \[.*\]|^\s*- .* \[.*\]" | sed 's/- \[\(.*\)\] \[\(.*\)\]/\1|\2/' | sed 's/- \(.*\) \[\(.*\)\]/\1|\2/' > /tmp/features.txt
  
  # Process each feature
  while IFS='|' read -r feature status; do
    feature_filename=$(echo "$feature" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    impl_file="$FEATURES_DIR/${feature_filename}-implementation.mdc"
    
    # Check if implementation file exists
    if [ -f "$impl_file" ]; then
      impl_status="✅ [View](../../../gameplay/features/battle/features/${feature_filename}-implementation.mdc)"
    else
      impl_status="❌ Missing"
    fi
    
    # Add to report
    echo "| $feature | [$status] | $impl_status |" >> "$OUTPUT_FILE"
  done < /tmp/features.txt
  
  # Clean up
  rm -f /tmp/features.txt
  
  echo -e "${GREEN}✅ Added feature list to report${NC}"
else
  echo -e "${RED}Error: Core mechanics file not found: $CORE_MECHANICS_FILE${NC}"
  echo "Unable to extract feature list."
  
  cat >> "$OUTPUT_FILE" << EOF
## Feature List

⚠️ Unable to extract feature list from core-mechanics.mdc (file not found).

EOF
fi

# Add detailed status section
cat >> "$OUTPUT_FILE" << EOF

## Detailed Implementation Status

This section provides detailed status for each feature with an implementation file.

EOF

# Process each implementation file
if [ -d "$FEATURES_DIR" ]; then
  echo -e "${BOLD}Processing implementation files...${NC}"
  
  # Find all implementation files
  find "$FEATURES_DIR" -name "*-implementation.mdc" -type f > /tmp/impl_files.txt
  
  if [ -s "/tmp/impl_files.txt" ]; then
    # Process each file
    while read -r impl_file; do
      filename=$(basename "$impl_file")
      feature_name=$(head -n 1 "$impl_file" | sed 's/# \(.*\) Implementation/\1/')
      
      echo -e "${BLUE}Processing: $feature_name${NC}"
      
      # Extract implementation status
      impl_status=$(grep -A 5 "^## Implementation Status" "$impl_file" | tail -n +2)
      
      # Extract sub-features and their status (macOS compatible)
      cat "$impl_file" | grep -E "^### .+ \[.+\]" | sed 's/### \(.*\) \[\(.*\)\]/\1|\2/' > /tmp/sub_features.txt
      
      # Calculate progress percentage
      total_sub_features=$(cat /tmp/sub_features.txt | wc -l | tr -d ' ')
      completed_sub_features=$(cat /tmp/sub_features.txt | grep -E "test-passing" | wc -l | tr -d ' ')
      
      if [ "$total_sub_features" -gt 0 ]; then
        progress_pct=$((completed_sub_features * 100 / total_sub_features))
      else
        progress_pct=0
      fi
      
      # Extract current focus
      current_focus=$(sed -n '/^## Current Focus/,/^##/p' "$impl_file" | grep -v "^##" | grep -v "^$" | head -n 1)
      
      # Extract last update
      last_update=$(grep -E "^\*\*Updated\*\*:" "$impl_file" | tail -n 1)
      
      # Add to report
      cat >> "$OUTPUT_FILE" << EOF
### $feature_name

**Progress:** $completed_sub_features/$total_sub_features sub-features complete ($progress_pct%)

**Current Focus:** ${current_focus:-No current focus defined}

**Sub-Features:**
EOF
      
      # Add progress bar
      progress_bar="["
      for i in $(seq 1 10); do
        if [ $i -le $((progress_pct / 10)) ]; then
          progress_bar="${progress_bar}█"
        else
          progress_bar="${progress_bar}░"
        fi
      done
      progress_bar="${progress_bar}] $progress_pct%"
      
      echo "**Progress:** $progress_bar" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
      
      # Add sub-features table
      cat >> "$OUTPUT_FILE" << EOF
| Sub-Feature | Status |
|-------------|--------|
EOF
      
      if [ -s "/tmp/sub_features.txt" ]; then
        # Process each sub-feature
        while IFS='|' read -r sub_feature status; do
          # Convert status to emoji
          case "$status" in
            "test-passing") 
              status_emoji="✅ Completed"
              ;;
            "test-failing") 
              status_emoji="🔴 Tests Failing"
              ;;
            "in-progress") 
              status_emoji="🟡 In Progress"
              ;;
            "not-started") 
              status_emoji="⚪ Not Started"
              ;;
            *) 
              status_emoji="⚠️ Unknown: $status"
              ;;
          esac
          
          echo "| $sub_feature | $status_emoji |" >> "$OUTPUT_FILE"
        done < /tmp/sub_features.txt
      else
        echo "| No sub-features defined | ⚠️ |" >> "$OUTPUT_FILE"
      fi
      
      # Add last update
      echo "" >> "$OUTPUT_FILE"
      echo "**Last Update:** ${last_update:-No updates recorded}" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
    done < /tmp/impl_files.txt
    
    # Clean up
    rm -f /tmp/impl_files.txt /tmp/sub_features.txt
    
    echo -e "${GREEN}✅ Added detailed implementation status to report${NC}"
  else
    echo -e "${YELLOW}⚠️ No implementation files found${NC}"
    
    # Clean up
    rm -f /tmp/impl_files.txt
    
    cat >> "$OUTPUT_FILE" << EOF
⚠️ No implementation files found in $FEATURES_DIR.

EOF
  fi
else
  echo -e "${RED}Error: Features directory not found: $FEATURES_DIR${NC}"
  
  cat >> "$OUTPUT_FILE" << EOF
⚠️ Unable to process implementation files (directory not found: $FEATURES_DIR).

EOF
fi

# Add summary section
cat >> "$OUTPUT_FILE" << EOF
## Summary

This report was automatically generated on $TIMESTAMP by the feature progress report generator.

For more information, see the [Feature Implementation Guide](../feature-implementation-guide.mdc).
EOF

echo -e "\n${GREEN}✅ Report generated successfully: $OUTPUT_FILE${NC}"
echo -e "${BOLD}View the report at: $OUTPUT_FILE${NC}"

exit 0 