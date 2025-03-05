#!/bin/bash
# Feature Dependency Analysis Script
# Analyzes feature dependencies by scanning import statements in the codebase
# Usage: ./analyze-feature-dependencies.sh [feature_name]

set -e

FEATURE_NAME="$1"
TIMESTAMP=$(date)
MOBILE_SRC="mobile/src"
MOBILE_TESTS="mobile/__tests__"
TEMP_FILE="/tmp/feature_deps_$$.txt"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}=== Feature Dependency Analysis Tool ===${NC}"
echo "Timestamp: $TIMESTAMP"

if [ -n "$FEATURE_NAME" ]; then
  echo "Analyzing dependencies for feature: $FEATURE_NAME"
  
  # Get feature filename for searching
  FEATURE_FILENAME=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  
  # Find source files related to this feature
  echo -e "\n${BOLD}Finding feature files...${NC}"
  
  # Search for files that might be related to this feature
  find "$MOBILE_SRC" "$MOBILE_TESTS" -type f -name "*.ts" -o -name "*.tsx" | grep -i "$FEATURE_FILENAME" > "$TEMP_FILE" 2>/dev/null || true

  # File count
  FILE_COUNT=$(cat "$TEMP_FILE" | wc -l | tr -d ' ')
  
  if [ "$FILE_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️ No files found for feature: $FEATURE_NAME${NC}"
    echo "Try a different feature name or check the feature exists."
    
    # Clean up
    rm -f "$TEMP_FILE"
    exit 0
  fi
  
  echo -e "${GREEN}Found $FILE_COUNT files related to feature: $FEATURE_NAME${NC}"
  
  # Initialize dependency tracking
  declare -A IMPORTS_FROM
  declare -A IMPORTED_BY
  declare -A FEATURE_LAYERS
  
  # Layer counts
  CORE_COUNT=0
  SERVICE_COUNT=0
  FEATURE_COUNT=0
  UI_COUNT=0
  
  # Process each file to extract imports
  echo -e "\n${BOLD}Analyzing imports...${NC}"
  
  while read -r file; do
    # Determine layer based on path
    if [[ "$file" == *"/core/"* ]]; then
      LAYER="core"
      ((CORE_COUNT++))
    elif [[ "$file" == *"/services/"* ]]; then
      LAYER="service"
      ((SERVICE_COUNT++))
    elif [[ "$file" == *"/components/"* || "$file" == *"/screens/"* ]]; then
      LAYER="ui"
      ((UI_COUNT++))
    else
      LAYER="feature"
      ((FEATURE_COUNT++))
    fi
    
    # Store layer
    FEATURE_LAYERS["$file"]="$LAYER"
    
    # Extract imports
    IMPORTS=$(grep -E "^import .* from '" "$file" 2>/dev/null | sed "s/import .* from '//g" | sed "s/';//g") 
    
    # Store imports
    for import in $IMPORTS; do
      # Only track internal imports
      if [[ "$import" == "../"* || "$import" == "./"* ]]; then
        # Resolve relative path
        IMPORT_FILE=$(dirname "$file")/"$import"
        # Normalize path
        IMPORT_FILE=$(realpath --relative-to="$(pwd)" "$IMPORT_FILE" 2>/dev/null || echo "$IMPORT_FILE")
        
        # Add to imports list
        IMPORTS_FROM["$file"]="${IMPORTS_FROM[$file]} $IMPORT_FILE"
        
        # Add to imported-by list
        IMPORTED_BY["$IMPORT_FILE"]="${IMPORTED_BY[$IMPORT_FILE]} $file"
      fi
    done
  done < "$TEMP_FILE"
  
  # Output findings
  echo -e "\n${BOLD}Dependency Analysis Summary:${NC}"
  echo -e "Files analyzed by layer:"
  echo -e "  ${BLUE}Core:${NC} $CORE_COUNT files"
  echo -e "  ${BLUE}Service:${NC} $SERVICE_COUNT files"
  echo -e "  ${BLUE}Feature:${NC} $FEATURE_COUNT files"
  echo -e "  ${BLUE}UI:${NC} $UI_COUNT files"
  echo -e "  ${BOLD}Total:${NC} $FILE_COUNT files"
  
  # Check for layer violations
  VIOLATIONS=0
  
  echo -e "\n${BOLD}Checking architectural violations...${NC}"
  
  while read -r file; do
    SRC_LAYER="${FEATURE_LAYERS[$file]}"
    
    # Check imports
    for import in ${IMPORTS_FROM[$file]}; do
      # Only check if import is in our feature files
      if grep -q "$import" "$TEMP_FILE" 2>/dev/null; then
        IMPORT_LAYER="${FEATURE_LAYERS[$import]}"
        
        # Check for layer violations
        VIOLATION=""
        
        if [ "$SRC_LAYER" = "core" ] && [ "$IMPORT_LAYER" != "core" ]; then
          VIOLATION="Core should not import from $IMPORT_LAYER layer"
        elif [ "$SRC_LAYER" = "service" ] && [ "$IMPORT_LAYER" = "ui" ]; then
          VIOLATION="Service should not import from UI layer"
        elif [ "$SRC_LAYER" = "service" ] && [ "$IMPORT_LAYER" = "feature" ]; then
          VIOLATION="Service should not import from Feature layer"
        elif [ "$SRC_LAYER" = "feature" ] && [ "$IMPORT_LAYER" = "ui" ]; then
          VIOLATION="Feature should not import from UI layer"
        fi
        
        if [ -n "$VIOLATION" ]; then
          echo -e "${RED}⚠️ $VIOLATION:${NC}"
          echo -e "  ${GRAY}$file (${SRC_LAYER})${NC} imports ${GRAY}$import (${IMPORT_LAYER})${NC}"
          ((VIOLATIONS++))
        fi
      fi
    done
  done < "$TEMP_FILE"
  
  if [ "$VIOLATIONS" -eq 0 ]; then
    echo -e "${GREEN}✅ No architectural violations detected!${NC}"
  else
    echo -e "\n${RED}Found $VIOLATIONS architectural violations!${NC}"
    echo -e "Consider refactoring to maintain clean architecture:"
    echo -e "- Core layer should have no dependencies except other core modules"
    echo -e "- Service layer should only depend on Core layer"
    echo -e "- Feature layer can depend on Core and Service layers"
    echo -e "- UI layer can depend on any layer"
  fi
  
  # Detailed analysis
  echo -e "\n${BOLD}Detailed Analysis:${NC}"
  echo -e "Files in feature: $FEATURE_NAME"
  
  while read -r file; do
    layer="${FEATURE_LAYERS[$file]}"
    echo -e "\n${BLUE}$file${NC} (${layer})"
    
    # Show imports
    if [ -n "${IMPORTS_FROM[$file]}" ]; then
      echo -e "  ${BOLD}Imports:${NC}"
      for import in ${IMPORTS_FROM[$file]}; do
        if grep -q "$import" "$TEMP_FILE" 2>/dev/null; then
          import_layer="${FEATURE_LAYERS[$import]}"
          echo -e "    - $import ($import_layer)"
        fi
      done
    fi
    
    # Show imported by
    if [ -n "${IMPORTED_BY[$file]}" ]; then
      echo -e "  ${BOLD}Imported by:${NC}"
      for importer in ${IMPORTED_BY[$file]}; do
        if grep -q "$importer" "$TEMP_FILE" 2>/dev/null; then
          importer_layer="${FEATURE_LAYERS[$importer]}"
          echo -e "    - $importer ($importer_layer)"
        fi
      done
    fi
  done < "$TEMP_FILE"
  
else
  # If no feature specified, analyze all features
  echo "Analyzing dependencies for all features"
  
  # Find all potential feature files
  echo -e "\n${BOLD}Finding feature files...${NC}"
  
  find "$MOBILE_SRC" "$MOBILE_TESTS" -type f -name "*.ts" -o -name "*.tsx" | sort > "$TEMP_FILE"
  
  # File count
  FILE_COUNT=$(cat "$TEMP_FILE" | wc -l | tr -d ' ')
  
  echo -e "${GREEN}Found $FILE_COUNT files to analyze${NC}"
  
  # Count files by directory to identify features
  echo -e "\n${BOLD}Identified features by directory:${NC}"
  
  # Extract directory counts (first level under src)
  cat "$TEMP_FILE" | grep "$MOBILE_SRC" | sed "s|$MOBILE_SRC/||" | cut -d'/' -f1 | sort | uniq -c | sort -nr > "/tmp/dir_counts.txt"
  
  echo -e "${BLUE}Source directories:${NC}"
  cat "/tmp/dir_counts.txt" | while read -r line; do
    count=$(echo "$line" | awk '{print $1}')
    dir=$(echo "$line" | awk '{print $2}')
    echo -e "  $dir: $count files"
  done
  
  # Extract test directories
  cat "$TEMP_FILE" | grep "$MOBILE_TESTS" | sed "s|$MOBILE_TESTS/||" | cut -d'/' -f1 | sort | uniq -c | sort -nr > "/tmp/test_counts.txt"
  
  echo -e "\n${BLUE}Test directories:${NC}"
  cat "/tmp/test_counts.txt" | while read -r line; do
    count=$(echo "$line" | awk '{print $1}')
    dir=$(echo "$line" | awk '{print $2}')
    echo -e "  $dir: $count files"
  done
  
  # Suggestions
  echo -e "\n${BOLD}Suggestions:${NC}"
  echo -e "To analyze a specific feature, run:"
  echo -e "  ./analyze-feature-dependencies.sh 'Feature Name'"
  echo -e "\nExample features from your codebase:"
  
  cat "/tmp/dir_counts.txt" | head -5 | while read -r line; do
    dir=$(echo "$line" | awk '{print $2}')
    echo -e "  - $dir"
  done
  
  # Clean up
  rm -f "/tmp/dir_counts.txt" "/tmp/test_counts.txt"
fi

# Clean up
rm -f "$TEMP_FILE"

echo -e "\n${GREEN}✅ Dependency analysis complete!${NC}"

exit 0 