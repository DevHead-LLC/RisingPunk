#!/bin/bash
# Update Implementation Progress Script
# Updates the implementation file with current progress details
# Usage: ./update-implementation-progress.sh [feature_name] [sub_feature_name] [status] [message]

set -e

if [ "$#" -lt 3 ]; then
  echo "Usage: ./update-implementation-progress.sh [feature_name] [sub_feature_name] [status] [message]"
  echo "Example: ./update-implementation-progress.sh 'Scoring System' 'Node Control Points' 'test-passing' 'Implemented basic scoring logic'"
  exit 1
fi

FEATURE="$1"
SUB_FEATURE="$2"
STATUS="$3"
MESSAGE="${4:-Finished implementation milestone}"
TIMESTAMP=$(date)

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}=== Implementation Progress Update Tool ===${NC}"
echo "Timestamp: $TIMESTAMP"
echo "Feature: $FEATURE"
echo "Sub-feature: $SUB_FEATURE"
echo "Status: $STATUS"
echo "Message: $MESSAGE"
echo

# Generate implementation file path
FEATURE_FILENAME=$(echo "$FEATURE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
IMPL_FILE=".cursor/rules/gameplay/features/battle/features/${FEATURE_FILENAME}-implementation.mdc"

# Check if implementation file exists
if [ ! -f "$IMPL_FILE" ]; then
  echo -e "${RED}Implementation file not found: $IMPL_FILE${NC}"
  echo "Run fix-implementation-path.sh to correct the file path or create a new implementation file."
  exit 1
fi

echo -e "${BOLD}Updating implementation file: $IMPL_FILE${NC}"

# Update sub-feature status
SUB_FEATURE_ESCAPED=$(echo "$SUB_FEATURE" | sed 's/[\/&]/\\&/g')
if cat "$IMPL_FILE" | grep -E "### $SUB_FEATURE_ESCAPED \[.*\]" > /dev/null; then
  sed -i.bak "s/### $SUB_FEATURE_ESCAPED \[[a-z-]*\]/### $SUB_FEATURE_ESCAPED \[$STATUS\]/" "$IMPL_FILE"
  echo -e "${GREEN}✅ Updated sub-feature status to [$STATUS]${NC}"
else
  echo -e "${YELLOW}⚠️ Sub-feature not found in implementation file${NC}"
  echo "Consider adding the sub-feature section manually."
fi

# Update implementation status checkboxes
if [ "$STATUS" = "not-started" ]; then
  # Clear all checkboxes
  sed -i.bak "s/- \[x\] Test Created/- \[ \] Test Created/" "$IMPL_FILE"
  sed -i.bak "s/- \[x\] Implementation Started/- \[ \] Implementation Started/" "$IMPL_FILE"
  sed -i.bak "s/- \[x\] Implementation Complete/- \[ \] Implementation Complete/" "$IMPL_FILE"
  sed -i.bak "s/- \[x\] Test Passing/- \[ \] Test Passing/" "$IMPL_FILE"
  echo -e "${GREEN}✅ Reset implementation status checkboxes${NC}"
elif [ "$STATUS" = "test-needed" ]; then
  # Mark test needed
  sed -i.bak "s/- \[ \] Test Created/- \[ \] Test Created/" "$IMPL_FILE"
  sed -i.bak "s/- \[x\] Implementation Started/- \[ \] Implementation Started/" "$IMPL_FILE"
  sed -i.bak "s/- \[x\] Implementation Complete/- \[ \] Implementation Complete/" "$IMPL_FILE"
  sed -i.bak "s/- \[x\] Test Passing/- \[ \] Test Passing/" "$IMPL_FILE"
  echo -e "${GREEN}✅ Updated implementation status: Test needed${NC}"
elif [ "$STATUS" = "test-failing" ]; then
  # Mark test created
  sed -i.bak "s/- \[ \] Test Created/- \[x\] Test Created/" "$IMPL_FILE"
  sed -i.bak "s/- \[x\] Implementation Started/- \[ \] Implementation Started/" "$IMPL_FILE"
  sed -i.bak "s/- \[x\] Implementation Complete/- \[ \] Implementation Complete/" "$IMPL_FILE"
  sed -i.bak "s/- \[x\] Test Passing/- \[ \] Test Passing/" "$IMPL_FILE"
  echo -e "${GREEN}✅ Updated implementation status: Test created and failing${NC}"
elif [ "$STATUS" = "in-progress" ]; then
  # Mark implementation started
  sed -i.bak "s/- \[ \] Test Created/- \[x\] Test Created/" "$IMPL_FILE"
  sed -i.bak "s/- \[ \] Implementation Started/- \[x\] Implementation Started/" "$IMPL_FILE"
  sed -i.bak "s/- \[x\] Implementation Complete/- \[ \] Implementation Complete/" "$IMPL_FILE"
  sed -i.bak "s/- \[x\] Test Passing/- \[ \] Test Passing/" "$IMPL_FILE"
  echo -e "${GREEN}✅ Updated implementation status: Implementation in progress${NC}"
elif [ "$STATUS" = "test-passing" ]; then
  # Mark all complete
  sed -i.bak "s/- \[ \] Test Created/- \[x\] Test Created/" "$IMPL_FILE"
  sed -i.bak "s/- \[ \] Implementation Started/- \[x\] Implementation Started/" "$IMPL_FILE"
  sed -i.bak "s/- \[ \] Implementation Complete/- \[x\] Implementation Complete/" "$IMPL_FILE"
  sed -i.bak "s/- \[ \] Test Passing/- \[x\] Test Passing/" "$IMPL_FILE"
  echo -e "${GREEN}✅ Updated implementation status: All tests passing${NC}"
fi

# Update the Current Focus section
CURRENT_PHASE_LINE=$(grep -n "^## Current Focus" "$IMPL_FILE" | cut -d':' -f1)
if [ -n "$CURRENT_PHASE_LINE" ]; then
  # Find the Next Steps section or the end of the file
  NEXT_SECTION_LINE=$(tail -n +$CURRENT_PHASE_LINE "$IMPL_FILE" | grep -n "^##" | head -1 | cut -d':' -f1)
  if [ -n "$NEXT_SECTION_LINE" ]; then
    NEXT_SECTION_LINE=$((CURRENT_PHASE_LINE + NEXT_SECTION_LINE - 1))
    # Extract everything from Current Focus to the next section
    CURRENT_FOCUS_CONTENT=$(sed -n "${CURRENT_PHASE_LINE},${NEXT_SECTION_LINE}p" "$IMPL_FILE")
  else
    # No next section, extract to end of file
    CURRENT_FOCUS_CONTENT=$(sed -n "${CURRENT_PHASE_LINE},\$p" "$IMPL_FILE")
  fi
  
  # Create updated Current Focus content
  if [ "$STATUS" = "not-started" ] || [ "$STATUS" = "test-needed" ]; then
    NEW_FOCUS="## Current Focus

**Test Writing**: $SUB_FEATURE

- Define test requirements
- Create test file
- Write failing tests"
  elif [ "$STATUS" = "test-failing" ]; then
    NEW_FOCUS="## Current Focus

**Implementation**: $SUB_FEATURE

- Implement core functionality
- Fix failing tests
- Refactor as needed"
  elif [ "$STATUS" = "in-progress" ]; then
    NEW_FOCUS="## Current Focus

**Implementation**: $SUB_FEATURE

- Complete implementation
- Optimize for performance
- Finalize test cases"
  elif [ "$STATUS" = "test-passing" ]; then
    # Find next sub-feature that's not done (macOS compatible)
    NEXT_SUB_FEATURES=$(cat "$IMPL_FILE" | grep -E "^### .+ \[(not-started|test-needed|test-failing|in-progress)\]")
    NEXT_SUB_FEATURE=$(echo "$NEXT_SUB_FEATURES" | grep -v "$SUB_FEATURE" | head -1 | sed 's/### \(.*\) \[.*/\1/')
    
    if [ -n "$NEXT_SUB_FEATURE" ]; then
      NEW_FOCUS="## Current Focus

**Next Sub-Feature**: $NEXT_SUB_FEATURE

- Begin test creation for next sub-feature
- Review requirements
- Plan implementation approach"
    else
      NEW_FOCUS="## Current Focus

**Feature Complete**: $FEATURE

- Review all sub-features
- Document functionality
- Prepare for integration testing"
    fi
  fi
  
  # Replace Current Focus section
  if [ -n "$NEXT_SECTION_LINE" ]; then
    # Replace content between Current Focus and next section
    sed -i.bak "${CURRENT_PHASE_LINE},${NEXT_SECTION_LINE}c\\${NEW_FOCUS}" "$IMPL_FILE"
  else
    # Replace content to end of file
    sed -i.bak "${CURRENT_PHASE_LINE},\$c\\${NEW_FOCUS}\\
\\
## Progress Tracking\\
" "$IMPL_FILE"
  fi
  
  echo -e "${GREEN}✅ Updated Current Focus section${NC}"
else
  echo -e "${YELLOW}⚠️ Current Focus section not found${NC}"
fi

# Update Progress Tracking section
PROGRESS_TRACKING_LINE=$(grep -n "^## Progress Tracking" "$IMPL_FILE" | cut -d':' -f1)
if [ -n "$PROGRESS_TRACKING_LINE" ]; then
  # Extract and update the Current Phase subsection
  if grep -q "Current Phase" "$IMPL_FILE"; then
    # Determine current phase based on status
    if [ "$STATUS" = "not-started" ] || [ "$STATUS" = "test-needed" ]; then
      PHASE="Feature Selected"
      LAST_ACTION="Selected $SUB_FEATURE for implementation"
      NEXT_ACTION="Create tests for $SUB_FEATURE"
    elif [ "$STATUS" = "test-failing" ]; then
      PHASE="Test Creation"
      LAST_ACTION="Created failing tests for $SUB_FEATURE"
      NEXT_ACTION="Implement $SUB_FEATURE"
    elif [ "$STATUS" = "in-progress" ]; then
      PHASE="Implementation"
      LAST_ACTION="Started implementing $SUB_FEATURE"
      NEXT_ACTION="Complete implementation and make tests pass"
    elif [ "$STATUS" = "test-passing" ]; then
      PHASE="Implementation Complete for $SUB_FEATURE"
      LAST_ACTION="$MESSAGE"
      
      # Find next sub-feature that's not done (macOS compatible)
      NEXT_SUB_FEATURES=$(cat "$IMPL_FILE" | grep -E "^### .+ \[(not-started|test-needed|test-failing|in-progress)\]")
      NEXT_SUB_FEATURE=$(echo "$NEXT_SUB_FEATURES" | grep -v "$SUB_FEATURE" | head -1 | sed 's/### \(.*\) \[.*/\1/')
      
      if [ -n "$NEXT_SUB_FEATURE" ]; then
        NEXT_ACTION="Begin work on $NEXT_SUB_FEATURE sub-feature"
      else
        NEXT_ACTION="Review and finalize feature"
      fi
    fi
    
    # Update Current Phase
    CURRENT_PHASE_UPDATE="**Current Phase**: $PHASE
**Last Action**: $LAST_ACTION
**Next Action**: $NEXT_ACTION"
    
    # Find the Current Phase section and update it
    CURRENT_PHASE_START=$(grep -n "Current Phase" "$IMPL_FILE" | cut -d':' -f1)
    
    if [ -n "$CURRENT_PHASE_START" ]; then
      # Find up to 5 lines after Current Phase
      CURRENT_PHASE_END=$((CURRENT_PHASE_START + 5))
      sed -i.bak "${CURRENT_PHASE_START},${CURRENT_PHASE_END}c\\**Current Phase**: $PHASE\\
**Last Action**: $LAST_ACTION\\
**Next Action**: $NEXT_ACTION" "$IMPL_FILE"
      
      echo -e "${GREEN}✅ Updated Progress Tracking - Current Phase section${NC}"
    else
      echo -e "${YELLOW}⚠️ Current Phase section not found within Progress Tracking${NC}"
      
      # Append it to the Progress Tracking section
      echo "Current Phase:" >> "$IMPL_FILE"
      echo "$CURRENT_PHASE_UPDATE" >> "$IMPL_FILE"
    fi
  fi
  
  # Add a timestamp entry to show when this update was made
  echo -e "\n**Updated**: $TIMESTAMP - $MESSAGE" >> "$IMPL_FILE"
  
  echo -e "${GREEN}✅ Added timestamp to Progress Tracking${NC}"
else
  echo -e "${YELLOW}⚠️ Progress Tracking section not found${NC}"
  
  # Append a Progress Tracking section to the file
  cat >> "$IMPL_FILE" << EOF

## Progress Tracking

**Current Phase**: $([ "$STATUS" = "test-passing" ] && echo "Implementation Complete for $SUB_FEATURE" || echo "Implementation")
**Last Action**: $MESSAGE
**Next Action**: $([ "$STATUS" = "test-passing" ] && echo "Begin work on next sub-feature" || echo "Continue implementation")

**Updated**: $TIMESTAMP - $MESSAGE
EOF

  echo -e "${GREEN}✅ Created new Progress Tracking section${NC}"
fi

# Clean up backup file
rm -f "$IMPL_FILE.bak"

echo -e "\n${GREEN}✅ Implementation file updated successfully${NC}"
echo "Run sync-context.sh to synchronize all context files."

exit 0 