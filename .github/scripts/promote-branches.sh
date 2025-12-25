#!/bin/bash
set -e

PR_NUMBER="$1"
PR_SOURCE="$2"
PR_TARGET="$3"
GITHUB_REPOSITORY="$4"

echo "=========================================="
echo "Processing PR #$PR_NUMBER: $PR_SOURCE → $PR_TARGET"
echo "=========================================="

INITIAL_PR_MERGE_COMPLETE=false

PR_STATE_BEFORE_MERGE=$(gh pr view $PR_NUMBER --json state -q '.state' 2>/dev/null || echo "")

if [ "$PR_STATE_BEFORE_MERGE" = "merged" ] || [ "$PR_STATE_BEFORE_MERGE" = "closed" ]; then
  echo "✅ PR #$PR_NUMBER was already merged. Verifying all actions have stopped..."
  
  HEAD_SHA=$(gh pr view $PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
  CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
  
  if command -v jq &> /dev/null; then
    RUNNING_CHECKS=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.status != "completed") | .name' 2>/dev/null || echo "")
  else
    RUNNING_CHECKS=$(echo "$CHECKS_JSON" | grep -i "status" | grep -v "completed" | head -1 || echo "")
  fi
  
  if [ -n "$RUNNING_CHECKS" ]; then
    echo "❌ PR #$PR_NUMBER is merged but actions are still running: $RUNNING_CHECKS"
    echo "❌ Cannot proceed - all actions must be stopped before continuing."
    exit 1
  fi
  
  echo "✅ PR #$PR_NUMBER merge verified complete. All actions stopped. Continuing to next branch..."
  INITIAL_PR_MERGE_COMPLETE=true
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
      
      if [ "$PR_STATE_AFTER_MERGE" = "merged" ]; then
        echo "✅ PR #$PR_NUMBER confirmed merged. Verifying all actions have stopped..."
        
        HEAD_SHA=$(gh pr view $PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
        CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
        
        if command -v jq &> /dev/null; then
          RUNNING_CHECKS=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.status != "completed") | .name' 2>/dev/null || echo "")
        else
          RUNNING_CHECKS=$(echo "$CHECKS_JSON" | grep -i "status" | grep -v "completed" | head -1 || echo "")
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
    if [ "$PR_STATE_AFTER_MERGE" != "merged" ]; then
      echo "❌ PR state verification failed. Expected 'merged', got: ${PR_STATE_AFTER_MERGE:-unknown}"
      exit 1
    fi
    
    HEAD_SHA=$(gh pr view $PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
    CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
    
    if command -v jq &> /dev/null; then
      RUNNING_CHECKS=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.status != "completed") | .name' 2>/dev/null || echo "")
    else
      RUNNING_CHECKS=$(echo "$CHECKS_JSON" | grep -i "status" | grep -v "completed" | head -1 || echo "")
    fi
    
    if [ -n "$RUNNING_CHECKS" ]; then
      echo "❌ PR #$PR_NUMBER is merged but actions are still running: $RUNNING_CHECKS"
      echo "❌ Cannot proceed - all actions must be stopped before continuing."
      exit 1
    fi
    
    echo "✅ PR #$PR_NUMBER merge verified complete. All actions stopped."
    INITIAL_PR_MERGE_COMPLETE=true
  else
    echo "❌ Failed to merge PR #$PR_NUMBER (exit code: $MERGE_EXIT_CODE)"
    echo "Merge output: $MERGE_OUTPUT"
    exit 1
  fi
fi

BRANCHES=("dev" "main" "staging" "prod")
CURRENT_SOURCE="$PR_TARGET"

echo "=========================================="
echo "Starting promotion chain from: $CURRENT_SOURCE"
echo "Promotion chain: dev → main → staging → prod"
echo "=========================================="

for i in "${!BRANCHES[@]}"; do
  if [ "${BRANCHES[$i]}" = "$PR_TARGET" ]; then
    START_INDEX=$((i + 1))
    break
  fi
done

if [ -z "$START_INDEX" ]; then
  echo "⚠️  PR target $PR_TARGET is not in promotion chain. Stopping."
  exit 0
fi

for ((i=$START_INDEX; i<${#BRANCHES[@]}; i++)); do
  TARGET="${BRANCHES[$i]}"
  
  PROMOTION_STEP_COMPLETE=false
  PR_CREATED=false
  CURSOR_CHECK_COMPLETE=false
  FINAL_VERIFICATION_COMPLETE=false
  PR_MERGE_COMPLETE=false
  
  echo "=========================================="
  echo "Promoting: $CURRENT_SOURCE → $TARGET"
  echo "=========================================="
  
  EXISTING_PR=$(gh pr list --base "$TARGET" --head "$CURRENT_SOURCE" --state open --json number -q '.[0].number' 2>/dev/null || echo "")
  
  if [ -n "$EXISTING_PR" ]; then
    echo "PR already exists: #$EXISTING_PR"
    NEXT_PR_NUMBER="$EXISTING_PR"
    PR_CREATED=true
  else
    PR_TITLE="Auto-promote: $CURRENT_SOURCE → $TARGET"
    PR_BODY="Automated promotion from $CURRENT_SOURCE to $TARGET branch.

This PR was created automatically by the branch promotion workflow.
Cursor bug bot will run automatically on this PR."
    
    echo "Creating PR: $CURRENT_SOURCE → $TARGET"
    set +e
    CREATE_OUTPUT=$(gh pr create \
      --base "$TARGET" \
      --head "$CURRENT_SOURCE" \
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
        EXISTING_PR=$(gh pr list --base "$TARGET" --head "$CURRENT_SOURCE" --state open --json number -q '.[0].number' 2>/dev/null || echo "")
        if [ -n "$EXISTING_PR" ]; then
          echo "✅ Found existing open PR #$EXISTING_PR. Using it."
          NEXT_PR_NUMBER="$EXISTING_PR"
        else
          echo "ℹ️  No existing open PR found. Branches may be in sync (no changes to promote)."
          echo "✅ Skipping promotion from $CURRENT_SOURCE to $TARGET (no changes)"
          CURRENT_SOURCE="$TARGET"
          continue
        fi
      else
        echo "⚠️  Trying alternative API method..."
        set +e
        PR_RESPONSE=$(gh api repos/$GITHUB_REPOSITORY/pulls \
          -X POST \
          -f base="$TARGET" \
          -f head="$CURRENT_SOURCE" \
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
            EXISTING_PR=$(gh pr list --base "$TARGET" --head "$CURRENT_SOURCE" --state open --json number -q '.[0].number' 2>/dev/null || echo "")
            if [ -n "$EXISTING_PR" ]; then
              echo "✅ Found existing open PR #$EXISTING_PR. Using it."
              NEXT_PR_NUMBER="$EXISTING_PR"
            else
              echo "❌ Failed to find existing open PR despite 'already exists' error"
              exit 1
            fi
          elif echo "$PR_RESPONSE" | grep -qiE "(no commits|no changes|nothing to compare|branches are the same|no difference)"; then
            echo "ℹ️  Branches are in sync (no changes to promote)."
            echo "✅ Skipping promotion from $CURRENT_SOURCE to $TARGET (no changes)"
            CURRENT_SOURCE="$TARGET"
            continue
          else
            echo "❌ Failed to create PR from $CURRENT_SOURCE to $TARGET"
            echo "❌ Unknown error. Please check the API response above."
            exit 1
          fi
        fi
      fi
    fi
    
    if [ -z "$NEXT_PR_NUMBER" ]; then
      echo "❌ Failed to create PR from $CURRENT_SOURCE to $TARGET"
      exit 1
    fi
    
    echo "✅ Created PR #$NEXT_PR_NUMBER: $CURRENT_SOURCE → $TARGET"
    PR_CREATED=true
  fi
  
  if [ "$PR_CREATED" != "true" ]; then
    echo "❌ Failed to create or find PR for $CURRENT_SOURCE → $TARGET. Cannot proceed."
    exit 1
  fi
  
  echo "=========================================="
  echo "✅ PR CREATION COMPLETE: PR #$NEXT_PR_NUMBER ($CURRENT_SOURCE → $TARGET)"
  echo "✅ Proceeding to Cursor bot check..."
  echo "=========================================="
  
  echo "Waiting for Cursor bug bot to run on PR #$NEXT_PR_NUMBER..."
  echo "ℹ️  Note: Cursor bot may take 30-60 seconds to appear on newly created PRs."
  echo "⏳ Waiting 30 seconds before first check to allow Cursor bot to initialize..."
  sleep 30
  
  MAX_WAIT=1200
  WAIT_INTERVAL=10
  LOG_INTERVAL=60
  ELAPSED=30
  LAST_LOG_ELAPSED=30
  CURSOR_CHECK_PASSED=false
  CURSOR_CHECK_FAILED=false
  CURSOR_CHECK_FOUND=false
  HEAD_SHA=$(gh pr view $NEXT_PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
  
  while [ $ELAPSED -lt $MAX_WAIT ]; do
    sleep $WAIT_INTERVAL
    ELAPSED=$((ELAPSED + WAIT_INTERVAL))
    
    SHOULD_LOG=false
    if [ $((ELAPSED - LAST_LOG_ELAPSED)) -ge $LOG_INTERVAL ]; then
      SHOULD_LOG=true
      LAST_LOG_ELAPSED=$ELAPSED
    fi
    
    PR_STATE=$(gh pr view $NEXT_PR_NUMBER --json state -q '.state' 2>/dev/null || echo "")
    
    if [ "$PR_STATE" = "closed" ] || [ "$PR_STATE" = "merged" ]; then
      echo "❌ PR #$NEXT_PR_NUMBER was merged/closed while workflow was running!"
      echo "❌ This should not happen - PR was merged before Cursor check completed."
      echo "❌ Stopping to prevent unsafe deployment."
      exit 1
    fi
    
    HEAD_SHA=$(gh pr view $NEXT_PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "$HEAD_SHA")
    
    STATUS_CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/statuses 2>/dev/null || echo "[]")
    
    if command -v jq &> /dev/null; then
      CURSOR_STATUS=$(echo "$STATUS_CHECKS_JSON" | jq -r '.[] | select(.context | ascii_downcase | contains("cursor")) | .state' | head -1 || echo "")
    else
      CURSOR_STATUS=$(echo "$STATUS_CHECKS_JSON" | grep -i "cursor" | grep -oP '"state":\s*"\K[^"]+' | head -1 || echo "")
    fi
    
    if [ -n "$CURSOR_STATUS" ]; then
      CURSOR_CHECK_FOUND=true
      if [ "$CURSOR_STATUS" = "success" ]; then
        echo "✅ Cursor bug check passed (status check)!"
        CURSOR_CHECK_PASSED=true
        break
      elif [ "$CURSOR_STATUS" = "failure" ] || [ "$CURSOR_STATUS" = "error" ]; then
        echo "❌ Cursor bug check failed (status check: $CURSOR_STATUS)!"
        CURSOR_CHECK_FAILED=true
        break
      fi
    fi
    
    CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
    
    if command -v jq &> /dev/null; then
      CURSOR_CHECK_STATUS=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.name | ascii_downcase | contains("cursor")) | .status // empty' | head -1 || echo "")
      CURSOR_CHECK_CONCLUSION=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.name | ascii_downcase | contains("cursor")) | .conclusion // empty' | head -1 || echo "")
    else
      CURSOR_CHECK_STATUS=$(echo "$CHECKS_JSON" | grep -i "cursor" -A 10 | grep -oP '"status":\s*"\K[^"]+' | head -1 || echo "")
      CURSOR_CHECK_CONCLUSION=$(echo "$CHECKS_JSON" | grep -i "cursor" -A 10 | grep -oP '"conclusion":\s*"\K[^"]+' | head -1 || echo "")
    fi
    
    if [ -n "$CURSOR_CHECK_STATUS" ]; then
      CURSOR_CHECK_FOUND=true
      if [ "$CURSOR_CHECK_STATUS" = "completed" ]; then
        if [ "$CURSOR_CHECK_CONCLUSION" = "failure" ] || [ "$CURSOR_CHECK_CONCLUSION" = "action_required" ]; then
          echo "❌ Cursor bug check failed (check run: $CURSOR_CHECK_CONCLUSION)!"
          CURSOR_CHECK_FAILED=true
          break
        elif [ "$CURSOR_CHECK_CONCLUSION" = "success" ]; then
          echo "✅ Cursor bug check passed (check run: $CURSOR_CHECK_CONCLUSION)!"
          CURSOR_CHECK_PASSED=true
          break
        elif [ "$CURSOR_CHECK_CONCLUSION" = "neutral" ]; then
          echo "❌ Cursor check completed with neutral conclusion. Only 'success' conclusion is accepted. Stopping workflow."
          CURSOR_CHECK_FAILED=true
          break
      elif [ -z "$CURSOR_CHECK_CONCLUSION" ] || [ "$CURSOR_CHECK_CONCLUSION" = "null" ]; then
        echo "⚠️  Cursor check completed but conclusion is null/unexpected. Treating as failure for safety."
        CURSOR_CHECK_FAILED=true
        break
      fi
      elif [ "$CURSOR_CHECK_STATUS" != "completed" ]; then
        if [ "$SHOULD_LOG" = "true" ]; then
          echo "⏳ Cursor check is in progress (status: $CURSOR_CHECK_STATUS). Waiting..."
        fi
      fi
    fi
    
    
    if [ "$SHOULD_LOG" = "true" ]; then
      echo "Waiting for Cursor check... (${ELAPSED}s/${MAX_WAIT}s)"
    fi
  done
  
  if [ "$CURSOR_CHECK_FAILED" = "true" ]; then
    echo "=========================================="
    echo "❌ Cursor bug check FAILED for PR #$NEXT_PR_NUMBER"
    echo "Stopping promotion chain."
    echo "Please fix bugs and restart the workflow."
    echo "PR: https://github.com/$GITHUB_REPOSITORY/pull/$NEXT_PR_NUMBER"
    echo "=========================================="
    exit 1
  fi
  
  if [ "$CURSOR_CHECK_PASSED" = "false" ]; then
    echo "=========================================="
    if [ "$CURSOR_CHECK_FOUND" = "false" ]; then
      echo "❌ Cursor bot did not appear on PR #$NEXT_PR_NUMBER within timeout (${MAX_WAIT}s)."
      echo "⚠️  This may indicate that Cursor bot is not configured to run on bot-created PRs."
      echo "💡 Possible solutions:"
      echo "   1. Check Cursor bot settings to allow running on bot-created PRs"
      echo "   2. Manually trigger Cursor bot by commenting on the PR"
      echo "   3. The PR may need to be created by a user account instead of a bot"
    else
      echo "❌ Cursor check did not complete within timeout (${MAX_WAIT}s)."
      echo "⚠️  Cursor bot appeared but did not finish (status: in_progress)."
      echo "💡 This may indicate Cursor bot is stuck or taking longer than expected."
    fi
    echo "Stopping promotion chain for safety."
    echo "PR: https://github.com/$GITHUB_REPOSITORY/pull/$NEXT_PR_NUMBER"
    echo "=========================================="
    exit 1
  fi
  
  CURSOR_CHECK_COMPLETE=true
  echo "=========================================="
  echo "✅ CURSOR CHECK COMPLETE: PR #$NEXT_PR_NUMBER passed"
  echo "✅ Proceeding to final verification..."
  echo "=========================================="
  
  echo "✅ Cursor check passed. Performing FINAL VERIFICATION before merge..."
  
  echo "🔍 FINAL VERIFICATION: Checking Cursor Bugbot one last time before merge..."
  
  HEAD_SHA=$(gh pr view $NEXT_PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
  
  CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
  
  if command -v jq &> /dev/null; then
    CURSOR_CHECK_CONCLUSION=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.name | ascii_downcase | contains("cursor")) | .conclusion // empty' | head -1 || echo "")
  else
    CURSOR_CHECK_CONCLUSION=$(echo "$CHECKS_JSON" | grep -i "cursor" -A 10 | grep -oP '"conclusion":\s*"\K[^"]+' | head -1 || echo "")
  fi
  
  if [ "$CURSOR_CHECK_CONCLUSION" = "failure" ] || [ "$CURSOR_CHECK_CONCLUSION" = "action_required" ]; then
    echo "❌❌❌ FINAL CHECK FAILED: Cursor Bugbot reports FAILURE. BLOCKING MERGE."
    exit 1
  fi
  
  if [ -z "$CURSOR_CHECK_CONCLUSION" ] || [ "$CURSOR_CHECK_CONCLUSION" = "null" ] || [ "$CURSOR_CHECK_CONCLUSION" = "cancelled" ] || [ "$CURSOR_CHECK_CONCLUSION" = "skipped" ] || [ "$CURSOR_CHECK_CONCLUSION" = "timed_out" ] || [ "$CURSOR_CHECK_CONCLUSION" = "stale" ]; then
    echo "❌❌❌ FINAL CHECK FAILED: Cursor check has unexpected conclusion ($CURSOR_CHECK_CONCLUSION). BLOCKING MERGE for safety."
    exit 1
  fi
  
  if [ "$CURSOR_CHECK_CONCLUSION" != "success" ]; then
    echo "❌❌❌ FINAL CHECK FAILED: Cursor check conclusion is not 'success' ($CURSOR_CHECK_CONCLUSION). BLOCKING MERGE."
    exit 1
  else
    echo "✅ Final verification passed. Merging PR #$NEXT_PR_NUMBER: $CURRENT_SOURCE → $TARGET"
    FINAL_VERIFICATION_COMPLETE=true
  fi
  
  if [ "$FINAL_VERIFICATION_COMPLETE" != "true" ]; then
    echo "❌ Final verification did not complete successfully. Cannot proceed to merge."
    exit 1
  fi
  
  echo "=========================================="
  echo "✅ FINAL VERIFICATION COMPLETE: PR #$NEXT_PR_NUMBER"
  echo "✅ Proceeding to merge..."
  echo "=========================================="
  
  PR_STATE_BEFORE_MERGE=$(gh pr view $NEXT_PR_NUMBER --json state -q '.state' 2>/dev/null || echo "")
  
  if [ "$PR_STATE_BEFORE_MERGE" = "merged" ] || [ "$PR_STATE_BEFORE_MERGE" = "closed" ]; then
    echo "✅ PR #$NEXT_PR_NUMBER was already merged. Verifying all actions have stopped..."
    
    HEAD_SHA=$(gh pr view $NEXT_PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
    CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
    
    if command -v jq &> /dev/null; then
      RUNNING_CHECKS=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.status != "completed") | .name' 2>/dev/null || echo "")
    else
      RUNNING_CHECKS=$(echo "$CHECKS_JSON" | grep -i "status" | grep -v "completed" | head -1 || echo "")
    fi
    
    if [ -n "$RUNNING_CHECKS" ]; then
      echo "❌ PR #$NEXT_PR_NUMBER is merged but actions are still running: $RUNNING_CHECKS"
      echo "❌ Cannot proceed - all actions must be stopped before continuing."
      exit 1
    fi
    
    echo "✅ PR #$NEXT_PR_NUMBER merge verified complete. All actions stopped. Continuing to next branch..."
    PR_MERGE_COMPLETE=true
  else
    set +e
    MERGE_OUTPUT=$(gh pr merge $NEXT_PR_NUMBER --merge --delete-branch=false 2>&1)
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
        
        PR_STATE_AFTER_MERGE=$(gh pr view $NEXT_PR_NUMBER --json state -q '.state' 2>/dev/null || echo "")
        
        if [ "$PR_STATE_AFTER_MERGE" = "merged" ]; then
          echo "✅ PR #$NEXT_PR_NUMBER confirmed merged. Verifying all actions have stopped..."
          
          HEAD_SHA=$(gh pr view $NEXT_PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
          CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
          
          if command -v jq &> /dev/null; then
            RUNNING_CHECKS=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.status != "completed") | .name' 2>/dev/null || echo "")
          else
            RUNNING_CHECKS=$(echo "$CHECKS_JSON" | grep -i "status" | grep -v "completed" | head -1 || echo "")
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
        echo "❌ PR #$NEXT_PR_NUMBER merge verification failed."
        echo "❌ PR state: ${PR_STATE_AFTER_MERGE:-unknown}"
        if [ -n "$RUNNING_CHECKS" ]; then
          echo "❌ Running checks still present: $RUNNING_CHECKS"
        fi
        echo "❌ Cannot proceed - merge not confirmed complete and all actions stopped."
        exit 1
      fi
      
      echo "✅ PR #$NEXT_PR_NUMBER: $CURRENT_SOURCE → $TARGET merge verified complete. All actions stopped."
      PR_MERGE_COMPLETE=true
    elif echo "$MERGE_OUTPUT" | grep -qi "already merged\|already been merged"; then
      echo "✅ PR #$NEXT_PR_NUMBER was already merged (detected during merge attempt). Verifying complete..."
      PR_STATE_AFTER_MERGE=$(gh pr view $NEXT_PR_NUMBER --json state -q '.state' 2>/dev/null || echo "")
      if [ "$PR_STATE_AFTER_MERGE" != "merged" ]; then
        echo "❌ PR state verification failed. Expected 'merged', got: ${PR_STATE_AFTER_MERGE:-unknown}"
        exit 1
      fi
      
      HEAD_SHA=$(gh pr view $NEXT_PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")
      CHECKS_JSON=$(gh api repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/check-runs 2>/dev/null || echo "{}")
      
      if command -v jq &> /dev/null; then
        RUNNING_CHECKS=$(echo "$CHECKS_JSON" | jq -r '.check_runs[] | select(.status != "completed") | .name' 2>/dev/null || echo "")
      else
        RUNNING_CHECKS=$(echo "$CHECKS_JSON" | grep -i "status" | grep -v "completed" | head -1 || echo "")
      fi
      
      if [ -n "$RUNNING_CHECKS" ]; then
        echo "❌ PR #$NEXT_PR_NUMBER is merged but actions are still running: $RUNNING_CHECKS"
        echo "❌ Cannot proceed - all actions must be stopped before continuing."
        exit 1
      fi
      
      echo "✅ PR #$NEXT_PR_NUMBER merge verified complete. All actions stopped."
      PR_MERGE_COMPLETE=true
    else
      echo "❌ Failed to merge PR #$NEXT_PR_NUMBER (exit code: $MERGE_EXIT_CODE)"
      echo "Merge output: $MERGE_OUTPUT"
      exit 1
    fi
  fi
  
  if [ "$PR_MERGE_COMPLETE" != "true" ]; then
    echo "❌ PR merge did not complete successfully. Cannot proceed to next branch."
    exit 1
  fi
  
  PROMOTION_STEP_COMPLETE=true
  
  echo "=========================================="
  echo "✅ PROMOTION STEP COMPLETE: $CURRENT_SOURCE → $TARGET"
  echo "✅ All sub-steps completed:"
  echo "   - PR created: $PR_CREATED"
  echo "   - Cursor check: $CURSOR_CHECK_COMPLETE"
  echo "   - Final verification: $FINAL_VERIFICATION_COMPLETE"
  echo "   - PR merged: $PR_MERGE_COMPLETE"
  echo "✅ Merge verified complete. All actions stopped."
  echo "✅ Ready to proceed to next branch."
  echo "=========================================="
  
  CURRENT_SOURCE="$TARGET"
  
  if [ "$TARGET" = "prod" ]; then
    echo "=========================================="
    echo "✅ Successfully promoted through all branches!"
    echo "Final: $PR_SOURCE → dev → main → staging → prod"
    echo "=========================================="
    break
  fi
  
  echo "⏳ Waiting 10 seconds before starting next promotion to ensure stability..."
  sleep 10
done

