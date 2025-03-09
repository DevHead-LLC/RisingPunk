#!/bin/bash

# Context Size Management Script
# Purpose: Monitor and manage the size of the active-working-context.mdc file
# Usage: ./manage-context-size.sh

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Define paths and limits
WORKSPACE_ROOT="/Users/robertthiel/DevHead_LLC/RisingPunk"
ACTIVE_CONTEXT="${WORKSPACE_ROOT}/rules/context/tdd/active-working-context.mdc"
ARCHIVE_DIR="${WORKSPACE_ROOT}/rules/context/tdd/archive"
SIZE_LIMIT_KB=50
WARNING_THRESHOLD_KB=40
CRITICAL_THRESHOLD_KB=45

# Check if the active context file exists
if [ ! -f "$ACTIVE_CONTEXT" ]; then
    echo -e "${RED}Error: Active context file not found at ${ACTIVE_CONTEXT}${NC}"
    exit 1
fi

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

# Get file size in KB
FILE_SIZE_KB=$(du -k "$ACTIVE_CONTEXT" | cut -f1)

echo -e "${GREEN}Checking context file size...${NC}"
echo -e "Current size: ${FILE_SIZE_KB}KB (Limit: ${SIZE_LIMIT_KB}KB)"

# Function to archive older history entries
archive_history() {
    TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
    ARCHIVE_FILE="${ARCHIVE_DIR}/context_history_${TIMESTAMP}.mdc"
    
    echo -e "${YELLOW}Archiving older context history to ${ARCHIVE_FILE}...${NC}"
    
    # Extract the CONTEXT HISTORY section and save the older entries to archive
    awk '/^## CONTEXT HISTORY/{flag=1;count=0} /^## [A-Z]/{if(flag==1 && $0 !~ /^## CONTEXT HISTORY/){flag=0}} flag{if(/- [0-9]{4}-[0-9]{2}-[0-9]{2}/){count++; if(count>10){print $0}}}' "$ACTIVE_CONTEXT" > "$ARCHIVE_FILE"
    
    # Create a new temporary file with only the 10 most recent history entries
    TEMP_FILE=$(mktemp)
    cat "$ACTIVE_CONTEXT" | awk '
        BEGIN {count=0; history=0; print_line=1}
        /^## CONTEXT HISTORY/ {history=1}
        /^## [A-Z]/ {if(history==1 && $0 !~ /^## CONTEXT HISTORY/){history=0}}
        {
            if(history==1 && /- [0-9]{4}-[0-9]{2}-[0-9]{2}/) {
                entries[count++]=$0
            } else if(print_line) {
                print $0
            }
        }
        END {
            print "## CONTEXT HISTORY"
            # Print 10 most recent entries (if we have that many)
            start = (count > 10) ? count - 10 : 0
            for(i=start; i<count; i++) {
                print entries[i]
            }
            if(count > 10) {
                print "- " strftime("%Y-%m-%dT%H:%M:%SZ") ": Archived " (count-10) " older history entries"
            }
        }
    ' > "$TEMP_FILE"
    
    # Add note about archived entries
    echo -e "- $(date -u +"%Y-%m-%dT%H:%M:%SZ"): Archived $(grep -c "^- " "$ARCHIVE_FILE") entries to ${ARCHIVE_FILE}" >> "$TEMP_FILE"
    
    # Replace original file with trimmed version
    mv "$TEMP_FILE" "$ACTIVE_CONTEXT"
    
    echo -e "${GREEN}✓ Context history archived successfully${NC}"
    
    # Get new file size
    NEW_SIZE_KB=$(du -k "$ACTIVE_CONTEXT" | cut -f1)
    echo -e "New size: ${NEW_SIZE_KB}KB (Reduced by $((FILE_SIZE_KB - NEW_SIZE_KB))KB)"
}

# Check against thresholds and take action
if [ "$FILE_SIZE_KB" -ge "$CRITICAL_THRESHOLD_KB" ]; then
    echo -e "${RED}CONTEXT CRITICAL: Important details may be truncated. Archiving history to preserve important information.${NC}"
    archive_history
elif [ "$FILE_SIZE_KB" -ge "$WARNING_THRESHOLD_KB" ]; then
    echo -e "${YELLOW}CONTEXT OVERFLOW WARNING: active-working-context.mdc is approaching size limits.${NC}"
    read -p "Do you want to archive older entries now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        archive_history
    else
        echo -e "${YELLOW}Context size warning acknowledged. No action taken.${NC}"
    fi
else
    echo -e "${GREEN}✓ Context size is within acceptable limits${NC}"
fi

exit 0 