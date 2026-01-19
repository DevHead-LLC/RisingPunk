#!/bin/bash
set -e

PR_NUMBER="$1"
PR_SOURCE="$2"
PR_TARGET="$3"
GITHUB_REPOSITORY="$4"

echo "=========================================="
echo "WORKFLOW RUN: Processing PR #$PR_NUMBER"
echo "Source: $PR_SOURCE → Target: $PR_TARGET"
echo "=========================================="

BRANCHES=("dev" "main" "staging" "prod")

STAGE_NAME=""

echo "🔍 DEBUG: Checking stage validation..."
echo "   PR_SOURCE: '$PR_SOURCE'"
echo "   PR_TARGET: '$PR_TARGET'"

if [ "$PR_TARGET" = "dev" ]; then
  STAGE_NAME="feature → dev"
  echo "   ✅ Matched: feature → dev (any branch → dev)"
elif [ "$PR_SOURCE" = "dev" ] && [ "$PR_TARGET" = "main" ]; then
  STAGE_NAME="dev → main"
  echo "   ✅ Matched: dev → main"
elif [ "$PR_SOURCE" = "main" ] && [ "$PR_TARGET" = "staging" ]; then
  STAGE_NAME="main → staging"
  echo "   ✅ Matched: main → staging"
elif [ "$PR_SOURCE" = "staging" ] && [ "$PR_TARGET" = "prod" ]; then
  STAGE_NAME="staging → prod"
  echo "   ✅ Matched: staging → prod"
else
  echo "   ❌ No match found"
fi

if [ -z "$STAGE_NAME" ]; then
  echo "⚠️  PR $PR_SOURCE → $PR_TARGET is not a valid promotion stage."
  echo "   Valid stages: feature → dev, dev → main, main → staging, staging → prod"
  echo "   Exiting (this may be an invalid combination)."
  exit 0
fi

echo "📍 STAGE: $STAGE_NAME"
echo "⏳ Waiting For: Cursor bot check run conclusion (already checked in workflow)"
echo "🎯 Action: Merge PR #$PR_NUMBER ($PR_SOURCE → $PR_TARGET)"
echo "✅ Completion: PR merged AND all actions stopped, then create next PR"
echo "=========================================="

echo "🔍 SAFETY CHECK: Verifying Cursor bot passed before proceeding..."
HEAD_SHA=$(gh pr view $PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
if [ -z "$HEAD_SHA" ]; then
  echo "❌ CRITICAL: Cannot get PR head SHA. Stopping to prevent unsafe merge."
  exit 1
fi

CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
if command -v jq &> /dev/null; then
  CURSOR_CHECK_CONCLUSION=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.name | ascii_downcase | contains("cursor")) | .conclusion // empty' | head -1 || echo "")
else
  CURSOR_CHECK_CONCLUSION=$(echo "$CHECKS_JSON" | grep -i "cursor" -A 10 | grep -oP '"conclusion":\s*"\K[^"]+' | head -1 || echo "")
fi

if [ -n "$CURSOR_CHECK_CONCLUSION" ]; then
  if [ "$CURSOR_CHECK_CONCLUSION" != "success" ] && [ "$CURSOR_CHECK_CONCLUSION" != "neutral" ]; then
    echo "=========================================="
    echo "❌ CRITICAL: Cursor bot check FAILED in script verification"
    echo "❌ Cursor bot conclusion: $CURSOR_CHECK_CONCLUSION"
    echo "❌ Only 'success' or 'neutral' conclusions are allowed"
    echo "❌ Bugs detected - stopping immediately"
    echo "❌ No PR will be merged. No promotion will occur."
    echo "=========================================="
    exit 1
  else
    echo "✅ Cursor bot verification passed (conclusion: $CURSOR_CHECK_CONCLUSION)"
  fi
else
  echo "⚠️  WARNING: Cursor bot check not found in commit checks"
  echo "⚠️  This may indicate Cursor bot hasn't run yet or workflow bypassed check"
  echo "❌ Cannot proceed without Cursor bot verification - stopping for safety"
  exit 1
fi

echo "=========================================="

PR_STATE_BEFORE_MERGE=$(gh pr view $PR_NUMBER --json state -q '.state' 2>/dev/null || echo "")
PR_STATE_BEFORE_MERGE_LOWER=$(echo "$PR_STATE_BEFORE_MERGE" | tr '[:upper:]' '[:lower:]')

if [ "$PR_STATE_BEFORE_MERGE_LOWER" = "merged" ] || [ "$PR_STATE_BEFORE_MERGE_LOWER" = "closed" ]; then
  echo "✅ PR #$PR_NUMBER was already merged. Verifying all actions have stopped..."
  
  HEAD_SHA=$(gh pr view $PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
  CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
  
  if command -v jq &> /dev/null; then
    RUNNING_CHECKS=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.status != "completed") | select(.name | ascii_downcase | (contains("promote") | not)) | .name' 2>/dev/null || echo "")
  else
    RUNNING_CHECKS=""
    STATUS_PATTERN='"status"\s*:\s*"(in_progress|queued)"'
    STATUS_POSITIONS=$(echo "$CHECKS_JSON" | grep -boE "$STATUS_PATTERN" | cut -d: -f1 || echo "")
    if [ -n "$STATUS_POSITIONS" ]; then
      for STATUS_POS in $STATUS_POSITIONS; do
        WINDOW_START=$((STATUS_POS > 500 ? STATUS_POS - 500 : 0))
        WINDOW_END=$((STATUS_POS + 500))
        CONTEXT_WINDOW="${CHECKS_JSON:$WINDOW_START:$((WINDOW_END - WINDOW_START))}"
        CHECK_NAME=$(echo "$CONTEXT_WINDOW" | grep -oE '"name"\s*:\s*"[^"]+"' | head -1 | sed -E 's/.*:\s*"([^"]+)".*/\1/' || echo "")
        if [ -n "$CHECK_NAME" ]; then
          CHECK_NAME_LOWER=$(echo "$CHECK_NAME" | tr '[:upper:]' '[:lower:]')
          if ! echo "$CHECK_NAME_LOWER" | grep -qi "promote"; then
            if [ -z "$RUNNING_CHECKS" ]; then
              RUNNING_CHECKS="$CHECK_NAME"
            else
              if echo "$RUNNING_CHECKS" | grep -qF "$CHECK_NAME"; then
                continue
              fi
              RUNNING_CHECKS="$RUNNING_CHECKS $CHECK_NAME"
            fi
          fi
        fi
      done
    fi
  fi
  
  if [ -n "$RUNNING_CHECKS" ]; then
    echo "❌ PR #$PR_NUMBER is merged but actions are still running: $RUNNING_CHECKS"
    echo "❌ Cannot proceed - all actions must be stopped before continuing."
    exit 1
  fi
  
  echo "✅ PR #$PR_NUMBER merge verified complete. All actions stopped."
else
  echo "Merging PR #$PR_NUMBER: $PR_SOURCE → $PR_TARGET"
  
  set +e
  MERGE_OUTPUT=$(gh pr merge $PR_NUMBER --merge --delete-branch=false 2>&1)
  MERGE_EXIT_CODE=$?
  set -e
  
  if [ $MERGE_EXIT_CODE -eq 0 ]; then
    echo "✅ Merge command succeeded. Verifying merge is complete..."
    
    MAX_VERIFY_WAIT=60
    VERIFY_ELAPSED=0
    VERIFY_INTERVAL=2
    MERGE_VERIFIED=false
    
    while [ $VERIFY_ELAPSED -lt $MAX_VERIFY_WAIT ]; do
      sleep $VERIFY_INTERVAL
      VERIFY_ELAPSED=$((VERIFY_ELAPSED + VERIFY_INTERVAL))
      
      PR_STATE_AFTER_MERGE=$(gh pr view $PR_NUMBER --json state -q '.state' 2>/dev/null || echo "")
      PR_STATE_AFTER_MERGE_LOWER=$(echo "$PR_STATE_AFTER_MERGE" | tr '[:upper:]' '[:lower:]')
      
      if [ "$PR_STATE_AFTER_MERGE_LOWER" = "merged" ]; then
        echo "✅ PR #$PR_NUMBER confirmed merged. Verifying all actions have stopped..."
        
        HEAD_SHA=$(gh pr view $PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
        CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
        
        if command -v jq &> /dev/null; then
          RUNNING_CHECKS=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.status != "completed") | select(.name | ascii_downcase | (contains("promote") | not)) | .name' 2>/dev/null || echo "")
        else
          RUNNING_CHECKS=""
          STATUS_PATTERN='"status"\s*:\s*"(in_progress|queued)"'
          STATUS_POSITIONS=$(echo "$CHECKS_JSON" | grep -boE "$STATUS_PATTERN" | cut -d: -f1 || echo "")
          if [ -n "$STATUS_POSITIONS" ]; then
            for STATUS_POS in $STATUS_POSITIONS; do
              WINDOW_START=$((STATUS_POS > 500 ? STATUS_POS - 500 : 0))
              WINDOW_END=$((STATUS_POS + 500))
              CONTEXT_WINDOW="${CHECKS_JSON:$WINDOW_START:$((WINDOW_END - WINDOW_START))}"
              CHECK_NAME=$(echo "$CONTEXT_WINDOW" | grep -oE '"name"\s*:\s*"[^"]+"' | head -1 | sed -E 's/.*:\s*"([^"]+)".*/\1/' || echo "")
              if [ -n "$CHECK_NAME" ]; then
                CHECK_NAME_LOWER=$(echo "$CHECK_NAME" | tr '[:upper:]' '[:lower:]')
                if ! echo "$CHECK_NAME_LOWER" | grep -qi "promote"; then
                  if [ -z "$RUNNING_CHECKS" ]; then
                    RUNNING_CHECKS="$CHECK_NAME"
                  else
                    if echo "$RUNNING_CHECKS" | grep -qF "$CHECK_NAME"; then
                      continue
                    fi
                    RUNNING_CHECKS="$RUNNING_CHECKS $CHECK_NAME"
                  fi
                fi
              fi
            done
          fi
        fi
        
        if [ -z "$RUNNING_CHECKS" ]; then
          echo "✅ All checks/actions have stopped. Merge is 100% complete."
          MERGE_VERIFIED=true
          break
        else
          echo "⏳ Waiting for actions to complete... (${VERIFY_ELAPSED}s/${MAX_VERIFY_WAIT}s)"
        fi
      else
        echo "⏳ Waiting for merge to complete... PR state: ${PR_STATE_AFTER_MERGE:-unknown} (${VERIFY_ELAPSED}s/${MAX_VERIFY_WAIT}s)"
      fi
    done
    
    if [ "$MERGE_VERIFIED" != "true" ]; then
      echo "❌ PR #$PR_NUMBER merge verification failed."
      echo "❌ PR state: ${PR_STATE_AFTER_MERGE:-unknown}"
      if [ -n "$RUNNING_CHECKS" ]; then
        echo "❌ Running checks still present: $RUNNING_CHECKS"
      fi
      echo "❌ Cannot proceed - merge not confirmed complete and all actions stopped."
      exit 1
    fi
    
    echo "✅ PR #$PR_NUMBER: $PR_SOURCE → $PR_TARGET merge verified complete. All actions stopped."
  elif echo "$MERGE_OUTPUT" | grep -qi "already merged\|already been merged"; then
    echo "✅ PR #$PR_NUMBER was already merged (detected during merge attempt). Verifying complete..."
    PR_STATE_AFTER_MERGE=$(gh pr view $PR_NUMBER --json state -q '.state' 2>/dev/null || echo "")
    PR_STATE_AFTER_MERGE_LOWER=$(echo "$PR_STATE_AFTER_MERGE" | tr '[:upper:]' '[:lower:]')
    if [ "$PR_STATE_AFTER_MERGE_LOWER" != "merged" ]; then
      echo "❌ PR state verification failed. Expected 'merged', got: ${PR_STATE_AFTER_MERGE:-unknown}"
      exit 1
    fi
    
    HEAD_SHA=$(gh pr view $PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
    CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
    
    if command -v jq &> /dev/null; then
      RUNNING_CHECKS=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.status != "completed") | select(.name | ascii_downcase | (contains("promote") | not)) | .name' 2>/dev/null || echo "")
    else
      RUNNING_CHECKS=""
      STATUS_PATTERN='"status"\s*:\s*"(in_progress|queued)"'
      STATUS_POSITIONS=$(echo "$CHECKS_JSON" | grep -boE "$STATUS_PATTERN" | cut -d: -f1 || echo "")
      if [ -n "$STATUS_POSITIONS" ]; then
        for STATUS_POS in $STATUS_POSITIONS; do
          WINDOW_START=$((STATUS_POS > 500 ? STATUS_POS - 500 : 0))
          WINDOW_END=$((STATUS_POS + 500))
          CONTEXT_WINDOW="${CHECKS_JSON:$WINDOW_START:$((WINDOW_END - WINDOW_START))}"
          CHECK_NAME=$(echo "$CONTEXT_WINDOW" | grep -oE '"name"\s*:\s*"[^"]+"' | head -1 | sed -E 's/.*:\s*"([^"]+)".*/\1/' || echo "")
          if [ -n "$CHECK_NAME" ]; then
            CHECK_NAME_LOWER=$(echo "$CHECK_NAME" | tr '[:upper:]' '[:lower:]')
            if ! echo "$CHECK_NAME_LOWER" | grep -qi "promote"; then
              if [ -z "$RUNNING_CHECKS" ]; then
                RUNNING_CHECKS="$CHECK_NAME"
              else
                if echo "$RUNNING_CHECKS" | grep -qF "$CHECK_NAME"; then
                  continue
                fi
                RUNNING_CHECKS="$RUNNING_CHECKS $CHECK_NAME"
              fi
            fi
          fi
        done
      fi
    fi
    
    if [ -n "$RUNNING_CHECKS" ]; then
      echo "❌ PR #$PR_NUMBER is merged but actions are still running: $RUNNING_CHECKS"
      echo "❌ Cannot proceed - all actions must be stopped before continuing."
      exit 1
    fi
    
    echo "✅ PR #$PR_NUMBER merge verified complete. All actions stopped."
  else
    echo "❌ Failed to merge PR #$PR_NUMBER (exit code: $MERGE_EXIT_CODE)"
    echo "Merge output: $MERGE_OUTPUT"
    exit 1
  fi
fi

echo "=========================================="
echo "✅ STAGE COMPLETE: $STAGE_NAME"
echo "✅ PR #$PR_NUMBER merged and verified"
echo "=========================================="

NEXT_SOURCE="$PR_TARGET"
NEXT_TARGET=""

for i in "${!BRANCHES[@]}"; do
  if [ "${BRANCHES[$i]}" = "$NEXT_SOURCE" ] && [ "$((i + 1))" -lt "${#BRANCHES[@]}" ]; then
    NEXT_TARGET="${BRANCHES[$((i + 1))]}"
    break
  fi
done

if [ -z "$NEXT_TARGET" ]; then
  echo "=========================================="
  echo "✅ PROMOTION COMPLETE: Reached final stage ($NEXT_SOURCE)"
  echo "✅ No further promotions - workflow complete"
  echo "=========================================="
  exit 0
fi

echo "=========================================="
echo "Creating PR for next stage: $NEXT_SOURCE → $NEXT_TARGET"
echo "=========================================="

EXISTING_PR=$(gh pr list --base "$NEXT_TARGET" --head "$NEXT_SOURCE" --state open --json number -q '.[0].number' 2>/dev/null || echo "")

if [ -n "$EXISTING_PR" ]; then
  echo "✅ PR already exists: #$EXISTING_PR ($NEXT_SOURCE → $NEXT_TARGET)"
  echo "   This PR will trigger the next workflow run automatically."
else
  PR_TITLE="Auto-promote: $NEXT_SOURCE → $NEXT_TARGET"
  PR_BODY="Automated promotion from $NEXT_SOURCE to $NEXT_TARGET branch.

This PR was created automatically by the branch promotion workflow.
Cursor bug bot will run automatically on this PR, which will trigger the next workflow run."

  echo "Creating PR: $NEXT_SOURCE → $NEXT_TARGET"
  set +e
  CREATE_OUTPUT=$(gh pr create \
    --base "$NEXT_TARGET" \
    --head "$NEXT_SOURCE" \
    --title "$PR_TITLE" \
    --body "$PR_BODY" 2>&1)
  CREATE_EXIT_CODE=$?
  set -e
  NEXT_PR_NUMBER=$(echo "$CREATE_OUTPUT" | grep -oP 'pull/\K[0-9]+' || echo "")
  
  if [ -z "$NEXT_PR_NUMBER" ]; then
    echo "⚠️  First PR creation method failed (exit code: $CREATE_EXIT_CODE)"
    echo "🔍 DEBUG: Create output: $CREATE_OUTPUT"
    
    if echo "$CREATE_OUTPUT" | grep -qiE "(already exists|no commits|no changes|nothing to compare|branches are the same)"; then
      echo "ℹ️  PR may already exist or branches are in sync. Checking for existing open PR..."
      EXISTING_PR=$(gh pr list --base "$NEXT_TARGET" --head "$NEXT_SOURCE" --state open --json number -q '.[0].number' 2>/dev/null || echo "")
      if [ -n "$EXISTING_PR" ]; then
        echo "✅ Found existing open PR #$EXISTING_PR. Using it."
        NEXT_PR_NUMBER="$EXISTING_PR"
      else
        echo "ℹ️  No existing open PR found. Branches may be in sync (no changes to promote)."
        echo "✅ No next stage needed - branches are in sync"
        exit 0
      fi
    else
      echo "⚠️  Trying alternative API method..."
      set +e
      PR_RESPONSE=$(gh api repos/$GITHUB_REPOSITORY/pulls \
        -X POST \
        -f base="$NEXT_TARGET" \
        -f head="$NEXT_SOURCE" \
        -f title="$PR_TITLE" \
        -f body="$PR_BODY" 2>&1)
      API_EXIT_CODE=$?
      set -e
      NEXT_PR_NUMBER=$(echo "$PR_RESPONSE" | grep -oP '"number":\s*\K[0-9]+' || echo "")
      
      if [ -z "$NEXT_PR_NUMBER" ]; then
        echo "❌ Alternative API method also failed (exit code: $API_EXIT_CODE)"
        echo "🔍 DEBUG: Full API response:"
        echo "$PR_RESPONSE"
        
        if echo "$PR_RESPONSE" | grep -qiE "(already exists|pull request already exists)"; then
          echo "ℹ️  PR already exists. Checking for existing open PR..."
          EXISTING_PR=$(gh pr list --base "$NEXT_TARGET" --head "$NEXT_SOURCE" --state open --json number -q '.[0].number' 2>/dev/null || echo "")
          if [ -n "$EXISTING_PR" ]; then
            echo "✅ Found existing open PR #$EXISTING_PR. Using it."
            NEXT_PR_NUMBER="$EXISTING_PR"
          else
            echo "❌ Failed to find existing open PR despite 'already exists' error"
            exit 1
          fi
        elif echo "$PR_RESPONSE" | grep -qiE "(no commits|no changes|nothing to compare|branches are the same|no difference)"; then
          echo "ℹ️  Branches are in sync (no changes to promote)."
          echo "✅ No next stage needed - branches are in sync"
          exit 0
        else
          echo "❌ Failed to create PR from $NEXT_SOURCE to $NEXT_TARGET"
          echo "❌ Unknown error. Please check the API response above."
          exit 1
        fi
      fi
    fi
  fi
  
  if [ -z "$NEXT_PR_NUMBER" ]; then
    echo "❌ Failed to create PR from $NEXT_SOURCE to $NEXT_TARGET"
    exit 1
  fi
  
  echo "✅ Created PR #$NEXT_PR_NUMBER: $NEXT_SOURCE → $NEXT_TARGET"
  echo "   This PR will trigger the next workflow run automatically."
fi

echo "=========================================="
echo "✅ WORKFLOW RUN COMPLETE: $STAGE_NAME"
echo "✅ Next stage PR created: #${NEXT_PR_NUMBER:-$EXISTING_PR} ($NEXT_SOURCE → $NEXT_TARGET)"
echo "✅ This workflow run is complete - next workflow will be triggered by PR creation"
echo "=========================================="

exit 0
