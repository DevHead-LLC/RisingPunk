#!/bin/bash
set -e

PR_NUMBER="$1"
PR_SOURCE="$2"
PR_TARGET="$3"
GITHUB_REPOSITORY="$4"

echo "=========================================="
echo "Processing PR #$PR_NUMBER: $PR_SOURCE → $PR_TARGET"
echo "=========================================="

echo "🔍 FINAL VERIFICATION: Checking Cursor Bugbot one last time before merge..."

HEAD_SHA=$(gh pr view $PR_NUMBER --json headRefOid -q '.headRefOid' 2>/dev/null || echo "")

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

PR_COMMENTS_JSON=$(gh api repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER/comments 2>/dev/null || echo "[]")

if command -v jq &> /dev/null; then
  CURSOR_COMMENTS=$(echo "$PR_COMMENTS_JSON" | jq -r '.[] | select(.user.login | ascii_downcase | contains("cursor") or (contains("[bot]") and contains("cursor"))) | .body' 2>/dev/null || echo "")
else
  CURSOR_COMMENTS=$(echo "$PR_COMMENTS_JSON" | grep -i "cursor" -A 5 | grep -oP '"body":\s*"\K[^"]+' || echo "")
fi

if [ -n "$CURSOR_COMMENTS" ]; then
  echo "🔍 DEBUG: Final verification - checking comments for bugs..."
  echo "🔍 DEBUG: Comment preview: $(echo "$CURSOR_COMMENTS" | head -c 500)..."
  
  HAS_NO_BUGS_STATEMENT=false
  if echo "$CURSOR_COMMENTS" | grep -qiE "\b(no\s+(bugs?|issues?|errors?|problems?)\s+(found|detected|identified)|all\s+clear|no\s+problems?\s+found|passed|success)\b"; then
    HAS_NO_BUGS_STATEMENT=true
    echo "🔍 DEBUG: Found 'no bugs' statement in comments"
  fi
  
  COMMENT_WITHOUT_NO_BUG=$(echo "$CURSOR_COMMENTS" | sed -e 's/no\s\+\(bugs\?\|issues\?\|errors\?\|problems\?\)\s\+\(found\|detected\|identified\)//gi' -e 's/all\s\+clear//gi' -e 's/no\s\+problems\?\s\+found//gi' -e 's/\bpassed\b//gi' -e 's/\bsuccess\b//gi')
  
  if echo "$COMMENT_WITHOUT_NO_BUG" | grep -qiE "(bugs?\s+(found|detected|identified)|issues?\s+(found|detected|identified|with)|errors?\s+(found|detected|identified)|problems?\s+(found|detected|identified)|(blocking|critical)\s+(bug|issue|error|problem)|must\s+fix|(failed|failing)\s+(check|test|validation))"; then
    echo "❌❌❌ FINAL CHECK FAILED: Cursor comments contain bug-specific phrases! BLOCKING MERGE."
    echo "🔍 DEBUG: Bug phrases found in: $(echo "$COMMENT_WITHOUT_NO_BUG" | grep -iE "(bugs?\s+(found|detected|identified)|issues?\s+(found|detected|identified|with)|errors?\s+(found|detected|identified)|problems?\s+(found|detected|identified)|(blocking|critical)\s+(bug|issue|error|problem)|must\s+fix|(failed|failing)\s+(check|test|validation))" | head -c 300)"
    exit 1
  fi
fi

if [ "$CURSOR_CHECK_CONCLUSION" = "neutral" ]; then
  if [ -z "$CURSOR_COMMENTS" ]; then
    echo "❌❌❌ FINAL CHECK FAILED: Cursor check is neutral with no comments. BLOCKING MERGE for safety."
    exit 1
  elif [ "$HAS_NO_BUGS_STATEMENT" != "true" ]; then
    echo "❌❌❌ FINAL CHECK FAILED: Cursor check is neutral but no explicit 'no bugs' statement. BLOCKING MERGE."
    exit 1
  else
    echo "✅ Final verification passed. Neutral conclusion with 'no bugs' statement confirmed. Proceeding with merge..."
  fi
elif [ "$CURSOR_CHECK_CONCLUSION" != "success" ]; then
  echo "❌❌❌ FINAL CHECK FAILED: Cursor check conclusion is not 'success' ($CURSOR_CHECK_CONCLUSION). BLOCKING MERGE."
  exit 1
else
  echo "✅ Final verification passed. Proceeding with merge..."
fi

PR_STATE_BEFORE_MERGE=$(gh pr view $PR_NUMBER --json state -q '.state' 2>/dev/null || echo "")

if [ "$PR_STATE_BEFORE_MERGE" = "merged" ] || [ "$PR_STATE_BEFORE_MERGE" = "closed" ]; then
  echo "✅ PR #$PR_NUMBER was already merged. Continuing to next branch..."
else
  echo "Merging PR #$PR_NUMBER: $PR_SOURCE → $PR_TARGET"
  
  MERGE_OUTPUT=$(gh pr merge $PR_NUMBER --merge --delete-branch=false 2>&1)
  MERGE_EXIT_CODE=$?
  
  if [ $MERGE_EXIT_CODE -eq 0 ]; then
    echo "✅ Successfully merged PR #$PR_NUMBER: $PR_SOURCE → $PR_TARGET"
  elif echo "$MERGE_OUTPUT" | grep -qi "already merged\|already been merged"; then
    echo "✅ PR #$PR_NUMBER was already merged (detected during merge attempt). Continuing..."
  else
    echo "❌ Failed to merge PR #$PR_NUMBER (exit code: $MERGE_EXIT_CODE)"
    echo "Merge output: $MERGE_OUTPUT"
    exit 1
  fi
fi

BRANCHES=("dev" "main" "staging" "prod")
CURRENT_SOURCE="$PR_TARGET"

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
  
  echo "=========================================="
  echo "Promoting: $CURRENT_SOURCE → $TARGET"
  echo "=========================================="
  
  EXISTING_PR=$(gh pr list --base "$TARGET" --head "$CURRENT_SOURCE" --state open --json number -q '.[0].number' 2>/dev/null || echo "")
  
  if [ -n "$EXISTING_PR" ]; then
    echo "PR already exists: #$EXISTING_PR"
    NEXT_PR_NUMBER="$EXISTING_PR"
  else
    PR_TITLE="Auto-promote: $CURRENT_SOURCE → $TARGET"
    PR_BODY="Automated promotion from $CURRENT_SOURCE to $TARGET branch.

This PR was created automatically by the branch promotion workflow.
Cursor bug bot will run automatically on this PR."
    
    echo "Creating PR: $CURRENT_SOURCE → $TARGET"
    NEXT_PR_NUMBER=$(gh pr create \
      --base "$TARGET" \
      --head "$CURRENT_SOURCE" \
      --title "$PR_TITLE" \
      --body "$PR_BODY" \
      --draft false 2>&1 | grep -oP 'pull/\K[0-9]+' || echo "")
    
    if [ -z "$NEXT_PR_NUMBER" ]; then
      echo "Failed to create PR. Trying alternative method..."
      PR_RESPONSE=$(gh api repos/$GITHUB_REPOSITORY/pulls \
        -X POST \
        -f base="$TARGET" \
        -f head="$CURRENT_SOURCE" \
        -f title="$PR_TITLE" \
        -f body="$PR_BODY" 2>&1)
      NEXT_PR_NUMBER=$(echo "$PR_RESPONSE" | grep -oP '"number":\s*\K[0-9]+' || echo "")
    fi
    
    if [ -z "$NEXT_PR_NUMBER" ]; then
      echo "❌ Failed to create PR from $CURRENT_SOURCE to $TARGET"
      exit 1
    fi
    
    echo "✅ Created PR #$NEXT_PR_NUMBER: $CURRENT_SOURCE → $TARGET"
  fi
  
  echo "Waiting for Cursor bug bot to run on PR #$NEXT_PR_NUMBER..."
  
  MAX_WAIT=600
  WAIT_INTERVAL=10
  LOG_INTERVAL=60
  ELAPSED=0
  LAST_LOG_ELAPSED=0
  CURSOR_CHECK_PASSED=false
  CURSOR_CHECK_FAILED=false
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
    
    if [ -n "$CURSOR_CHECK_STATUS" ] && [ "$CURSOR_CHECK_STATUS" = "completed" ]; then
      if [ "$CURSOR_CHECK_CONCLUSION" = "failure" ] || [ "$CURSOR_CHECK_CONCLUSION" = "action_required" ]; then
        echo "❌ Cursor bug check failed (check run: $CURSOR_CHECK_CONCLUSION)!"
        CURSOR_CHECK_FAILED=true
        break
      elif [ "$CURSOR_CHECK_CONCLUSION" = "success" ]; then
        echo "✅ Cursor bug check passed (check run: $CURSOR_CHECK_CONCLUSION)!"
        CURSOR_CHECK_PASSED=true
        break
      elif [ "$CURSOR_CHECK_CONCLUSION" = "neutral" ]; then
        echo "⚠️  Cursor check completed with neutral conclusion. Checking comments for bugs..."
        
        PR_COMMENTS_JSON=$(gh api repos/$GITHUB_REPOSITORY/pulls/$NEXT_PR_NUMBER/comments 2>/dev/null || echo "[]")
        
        if command -v jq &> /dev/null; then
          CURSOR_COMMENTS=$(echo "$PR_COMMENTS_JSON" | jq -r '.[] | select(.user.login | ascii_downcase | contains("cursor") or (contains("[bot]") and contains("cursor"))) | .body' 2>/dev/null || echo "")
        else
          CURSOR_COMMENTS=$(echo "$PR_COMMENTS_JSON" | grep -i "cursor" -A 5 | grep -oP '"body":\s*"\K[^"]+' || echo "")
        fi
        
        if [ -n "$CURSOR_COMMENTS" ]; then
          echo "🔍 DEBUG: Found Cursor comments. Analyzing for bugs..."
          echo "🔍 DEBUG: Comment preview: $(echo "$CURSOR_COMMENTS" | head -c 500)..."
          
          HAS_NO_BUGS_STATEMENT=false
          if echo "$CURSOR_COMMENTS" | grep -qiE "\b(no\s+(bugs?|issues?|errors?|problems?)\s+(found|detected|identified)|all\s+clear|no\s+problems?\s+found|passed|success)\b"; then
            HAS_NO_BUGS_STATEMENT=true
            echo "🔍 DEBUG: Found 'no bugs' statement in comments"
          fi
          
          COMMENT_WITHOUT_NO_BUG=$(echo "$CURSOR_COMMENTS" | sed -e 's/no\s\+\(bugs\?\|issues\?\|errors\?\|problems\?\)\s\+\(found\|detected\|identified\)//gi' -e 's/all\s\+clear//gi' -e 's/no\s\+problems\?\s\+found//gi' -e 's/\bpassed\b//gi' -e 's/\bsuccess\b//gi')
          
          if echo "$COMMENT_WITHOUT_NO_BUG" | grep -qiE "(bugs?\s+(found|detected|identified)|issues?\s+(found|detected|identified|with)|errors?\s+(found|detected|identified)|problems?\s+(found|detected|identified)|(blocking|critical)\s+(bug|issue|error|problem)|must\s+fix|(failed|failing)\s+(check|test|validation))"; then
            echo "❌❌❌ BUG DETECTED: Cursor comments contain bug-specific phrases!"
            echo "🔍 DEBUG: Bug phrases found in: $(echo "$COMMENT_WITHOUT_NO_BUG" | grep -iE "(bugs?\s+(found|detected|identified)|issues?\s+(found|detected|identified|with)|errors?\s+(found|detected|identified)|problems?\s+(found|detected|identified)|(blocking|critical)\s+(bug|issue|error|problem)|must\s+fix|(failed|failing)\s+(check|test|validation))" | head -c 300)"
            echo "❌ Stopping workflow - bugs found!"
            CURSOR_CHECK_FAILED=true
            break
          fi
          
          if [ "$HAS_NO_BUGS_STATEMENT" = "true" ]; then
            echo "✅ Cursor comments explicitly state no bugs found. Proceeding with promotion."
            CURSOR_CHECK_PASSED=true
            break
          else
            echo "⚠️  Cursor check completed with neutral conclusion and comments exist, but no explicit 'no bugs' statement."
            echo "🔍 DEBUG: Comments found but no clear 'no bugs' confirmation. Treating as failure for safety."
            CURSOR_CHECK_FAILED=true
            break
          fi
        else
          echo "⚠️  Cursor check completed with neutral conclusion but no comments found. Treating as failure for safety."
          CURSOR_CHECK_FAILED=true
          break
        fi
      elif [ -z "$CURSOR_CHECK_CONCLUSION" ] || [ "$CURSOR_CHECK_CONCLUSION" = "null" ]; then
        echo "⚠️  Cursor check completed but conclusion is null/unexpected. Treating as failure for safety."
        CURSOR_CHECK_FAILED=true
        break
      fi
    elif [ -n "$CURSOR_CHECK_STATUS" ] && [ "$CURSOR_CHECK_STATUS" != "completed" ]; then
      if [ "$SHOULD_LOG" = "true" ]; then
        echo "⏳ Cursor check is in progress (status: $CURSOR_CHECK_STATUS). Waiting..."
      fi
    fi
    
    PR_COMMENTS_JSON=$(gh api repos/$GITHUB_REPOSITORY/pulls/$NEXT_PR_NUMBER/comments 2>/dev/null || echo "[]")
    
    if command -v jq &> /dev/null; then
      CURSOR_COMMENTS=$(echo "$PR_COMMENTS_JSON" | jq -r '.[] | select(.user.login | ascii_downcase | contains("cursor") or (contains("[bot]") and contains("cursor"))) | .body' 2>/dev/null || echo "")
    else
      CURSOR_COMMENTS=$(echo "$PR_COMMENTS_JSON" | grep -i "cursor" -A 5 | grep -oP '"body":\s*"\K[^"]+' || echo "")
    fi
    
    if [ -n "$CURSOR_COMMENTS" ]; then
      HAS_NO_BUGS_STATEMENT=false
      if echo "$CURSOR_COMMENTS" | grep -qiE "\b(no\s+(bugs?|issues?|errors?|problems?)\s+(found|detected|identified)|all\s+clear|no\s+problems?\s+found|passed|success)\b"; then
        HAS_NO_BUGS_STATEMENT=true
        echo "🔍 DEBUG: Found 'no bugs' statement in comments"
      fi
      
      COMMENT_WITHOUT_NO_BUG=$(echo "$CURSOR_COMMENTS" | sed -e 's/no\s\+\(bugs\?\|issues\?\|errors\?\|problems\?\)\s\+\(found\|detected\|identified\)//gi' -e 's/all\s\+clear//gi' -e 's/no\s\+problems\?\s\+found//gi' -e 's/\bpassed\b//gi' -e 's/\bsuccess\b//gi')
      
      if echo "$COMMENT_WITHOUT_NO_BUG" | grep -qiE "(bugs?\s+(found|detected|identified)|issues?\s+(found|detected|identified|with)|errors?\s+(found|detected|identified)|problems?\s+(found|detected|identified)|(blocking|critical)\s+(bug|issue|error|problem)|must\s+fix|(failed|failing)\s+(check|test|validation))"; then
        echo "❌❌❌ BUG DETECTED: Cursor comments contain bug-specific phrases!"
        echo "🔍 DEBUG: Bug phrases found. Stopping workflow."
        CURSOR_CHECK_FAILED=true
        break
      elif [ "$HAS_NO_BUGS_STATEMENT" = "true" ]; then
        echo "✅ Cursor comments explicitly state no bugs found. Proceeding with promotion."
        CURSOR_CHECK_PASSED=true
        break
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
    echo "❌ Cursor check did not complete within timeout (${MAX_WAIT}s)."
    echo "Stopping promotion chain for safety."
    echo "Please ensure Cursor bot runs and completes before merging."
    echo "PR: https://github.com/$GITHUB_REPOSITORY/pull/$NEXT_PR_NUMBER"
    echo "=========================================="
    exit 1
  fi
  
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
  
  PR_COMMENTS_JSON=$(gh api repos/$GITHUB_REPOSITORY/pulls/$NEXT_PR_NUMBER/comments 2>/dev/null || echo "[]")
  
  if command -v jq &> /dev/null; then
    CURSOR_COMMENTS=$(echo "$PR_COMMENTS_JSON" | jq -r '.[] | select(.user.login | ascii_downcase | contains("cursor") or (contains("[bot]") and contains("cursor"))) | .body' 2>/dev/null || echo "")
  else
    CURSOR_COMMENTS=$(echo "$PR_COMMENTS_JSON" | grep -i "cursor" -A 5 | grep -oP '"body":\s*"\K[^"]+' || echo "")
  fi
  
  if [ -n "$CURSOR_COMMENTS" ]; then
    echo "🔍 DEBUG: Final verification - checking comments for bugs..."
    echo "🔍 DEBUG: Comment preview: $(echo "$CURSOR_COMMENTS" | head -c 500)..."
    
    HAS_NO_BUGS_STATEMENT=false
    if echo "$CURSOR_COMMENTS" | grep -qiE "\b(no\s+(bugs?|issues?|errors?|problems?)\s+(found|detected|identified)|all\s+clear|no\s+problems?\s+found|passed|success)\b"; then
      HAS_NO_BUGS_STATEMENT=true
      echo "🔍 DEBUG: Found 'no bugs' statement in comments"
    fi
    
    COMMENT_WITHOUT_NO_BUG=$(echo "$CURSOR_COMMENTS" | sed -e 's/no\s\+\(bugs\?\|issues\?\|errors\?\|problems\?\)\s\+\(found\|detected\|identified\)//gi' -e 's/all\s\+clear//gi' -e 's/no\s\+problems\?\s\+found//gi' -e 's/\bpassed\b//gi' -e 's/\bsuccess\b//gi')
    
    if echo "$COMMENT_WITHOUT_NO_BUG" | grep -qiE "(bugs?\s+(found|detected|identified)|issues?\s+(found|detected|identified|with)|errors?\s+(found|detected|identified)|problems?\s+(found|detected|identified)|(blocking|critical)\s+(bug|issue|error|problem)|must\s+fix|(failed|failing)\s+(check|test|validation))"; then
      echo "❌❌❌ FINAL CHECK FAILED: Cursor comments contain bug-specific phrases! BLOCKING MERGE."
      echo "🔍 DEBUG: Bug phrases found in: $(echo "$COMMENT_WITHOUT_NO_BUG" | grep -iE "(bugs?\s+(found|detected|identified)|issues?\s+(found|detected|identified|with)|errors?\s+(found|detected|identified)|problems?\s+(found|detected|identified)|(blocking|critical)\s+(bug|issue|error|problem)|must\s+fix|(failed|failing)\s+(check|test|validation))" | head -c 300)"
      exit 1
    fi
  fi
  
  if [ "$CURSOR_CHECK_CONCLUSION" = "neutral" ]; then
    if [ -z "$CURSOR_COMMENTS" ]; then
      echo "❌❌❌ FINAL CHECK FAILED: Cursor check is neutral with no comments. BLOCKING MERGE for safety."
      exit 1
    elif [ "$HAS_NO_BUGS_STATEMENT" != "true" ]; then
      echo "❌❌❌ FINAL CHECK FAILED: Cursor check is neutral but no explicit 'no bugs' statement. BLOCKING MERGE."
      exit 1
    else
      echo "✅ Final verification passed. Neutral conclusion with 'no bugs' statement confirmed. Proceeding with merge..."
    fi
  elif [ "$CURSOR_CHECK_CONCLUSION" != "success" ]; then
    echo "❌❌❌ FINAL CHECK FAILED: Cursor check conclusion is not 'success' ($CURSOR_CHECK_CONCLUSION). BLOCKING MERGE."
    exit 1
  else
    echo "✅ Final verification passed. Merging PR #$NEXT_PR_NUMBER: $CURRENT_SOURCE → $TARGET"
  fi
  
  PR_STATE_BEFORE_MERGE=$(gh pr view $NEXT_PR_NUMBER --json state -q '.state' 2>/dev/null || echo "")
  
  if [ "$PR_STATE_BEFORE_MERGE" = "merged" ] || [ "$PR_STATE_BEFORE_MERGE" = "closed" ]; then
    echo "✅ PR #$NEXT_PR_NUMBER was already merged. Continuing to next branch..."
  else
    MERGE_OUTPUT=$(gh pr merge $NEXT_PR_NUMBER --merge --delete-branch=false 2>&1)
    MERGE_EXIT_CODE=$?
    
    if [ $MERGE_EXIT_CODE -eq 0 ]; then
      echo "✅ Successfully merged PR #$NEXT_PR_NUMBER: $CURRENT_SOURCE → $TARGET"
    elif echo "$MERGE_OUTPUT" | grep -qi "already merged\|already been merged"; then
      echo "✅ PR #$NEXT_PR_NUMBER was already merged (detected during merge attempt). Continuing..."
    else
      echo "❌ Failed to merge PR #$NEXT_PR_NUMBER (exit code: $MERGE_EXIT_CODE)"
      echo "Merge output: $MERGE_OUTPUT"
      exit 1
    fi
  fi
  
  CURRENT_SOURCE="$TARGET"
  
  if [ "$TARGET" = "prod" ]; then
    echo "=========================================="
    echo "✅ Successfully promoted through all branches!"
    echo "Final: $PR_SOURCE → dev → main → staging → prod"
    echo "=========================================="
    break
  fi
  
  echo "Waiting 5 seconds before next promotion..."
  sleep 5
done

