#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 [--repo owner/repo] [--pr number] [--head-sha sha] [--no-comment]" >&2
}

extract_bug_count() {
  local text="$1"
  local count
  count=$(echo "$text" | grep -oiE "([0-9]+)[[:space:]]+bug(s?)[[:space:]]+reported" | grep -oE "[0-9]+" | head -1 || true)
  if [ -z "$count" ]; then
    count=$(echo "$text" | grep -oiE "posted[[:space:]]+analysis[[:space:]]+results[^0-9]*([0-9]+)[[:space:]]+bug" | grep -oE "[0-9]+" | head -1 || true)
  fi
  if [ -z "$count" ]; then
    count=$(echo "$text" | grep -oiE "found[[:space:]]+[0-9]+[[:space:]]+potential[[:space:]]+issues?" | grep -oE "[0-9]+" | head -1 || true)
  fi
  if [ -z "$count" ]; then
    count=0
  fi
  echo "$count"
}

REPO="${GITHUB_REPOSITORY:-}"
EVENT_NAME="${GITHUB_EVENT_NAME:-}"
EVENT_PATH="${GITHUB_EVENT_PATH:-}"
PR_NUMBER=""
HEAD_SHA=""
NO_COMMENT="false"
REQUESTED_BY="${GITHUB_ACTOR:-manual}"

while [ $# -gt 0 ]; do
  case "$1" in
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --pr)
      PR_NUMBER="${2:-}"
      shift 2
      ;;
    --head-sha)
      HEAD_SHA="${2:-}"
      shift 2
      ;;
    --no-comment)
      NO_COMMENT="true"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [ -z "$REPO" ]; then
  echo "Repository is required (GITHUB_REPOSITORY or --repo)." >&2
  exit 1
fi

if [ -z "$PR_NUMBER" ]; then
  if [ "$EVENT_NAME" = "workflow_dispatch" ]; then
    PR_NUMBER="${INPUT_PR_NUMBER:-}"
  else
    if [ -z "$EVENT_PATH" ] || [ ! -f "$EVENT_PATH" ]; then
      echo "Missing GITHUB_EVENT_PATH for issue_comment trigger." >&2
      exit 1
    fi

    ISSUE_PR_URL="$(jq -r '.issue.pull_request.url // empty' "$EVENT_PATH")"
    COMMENT_BODY="$(jq -r '.comment.body // ""' "$EVENT_PATH")"
    REQUESTED_BY="$(jq -r '.comment.user.login // "unknown"' "$EVENT_PATH")"

    if [ -z "$ISSUE_PR_URL" ]; then
      echo "Comment is not on a PR. Skipping."
      exit 0
    fi

    if [[ ! "$COMMENT_BODY" =~ (^|[[:space:]])/babysit([[:space:]]|$) ]]; then
      echo "No /babysit command found. Skipping."
      exit 0
    fi

    PR_NUMBER="$(jq -r '.issue.number // empty' "$EVENT_PATH")"
  fi
fi

if [ -z "$PR_NUMBER" ]; then
  echo "Could not resolve PR number." >&2
  exit 1
fi

PR_JSON="$(gh pr view "$PR_NUMBER" --repo "$REPO" --json number,url,headRefName,baseRefName,headRefOid)"
PR_URL="$(echo "$PR_JSON" | jq -r '.url')"
HEAD_REF="$(echo "$PR_JSON" | jq -r '.headRefName')"
BASE_REF="$(echo "$PR_JSON" | jq -r '.baseRefName')"
if [ -z "$HEAD_SHA" ]; then
  HEAD_SHA="$(echo "$PR_JSON" | jq -r '.headRefOid')"
fi

if [ -z "$HEAD_SHA" ] || [ "$HEAD_SHA" = "null" ]; then
  echo "Unable to resolve PR head SHA." >&2
  exit 1
fi

CHECK_RUNS_JSON="$(gh api "repos/$REPO/commits/$HEAD_SHA/check-runs?per_page=100")"
CURSOR_RUN_IDS="$(echo "$CHECK_RUNS_JSON" | jq -r '.check_runs[]? | select(.name | ascii_downcase | test("cursor|bugbot")) | .id')"

BUGS_REPORTED=0
RUN_SUMMARY_LINES=""
BLOCKING_SOURCE="none"

for RUN_ID in $CURSOR_RUN_IDS; do
  RUN_JSON="$(gh api "repos/$REPO/check-runs/$RUN_ID")"
  RUN_NAME="$(echo "$RUN_JSON" | jq -r '.name // "unknown"')"
  RUN_STATUS="$(echo "$RUN_JSON" | jq -r '.status // "unknown"')"
  RUN_CONCLUSION="$(echo "$RUN_JSON" | jq -r '.conclusion // "none"')"
  RUN_TEXT="$(echo "$RUN_JSON" | jq -r '.output.summary // .output.text // ""')"

  RUN_SUMMARY_LINES="${RUN_SUMMARY_LINES}- ${RUN_NAME} (id ${RUN_ID}): status=${RUN_STATUS}, conclusion=${RUN_CONCLUSION}
"

  N="$(extract_bug_count "$RUN_TEXT")"
  if [ "$N" -gt "$BUGS_REPORTED" ] 2>/dev/null; then
    BUGS_REPORTED="$N"
    BLOCKING_SOURCE="check_run:${RUN_NAME}:${RUN_ID}"
  fi
done

ISSUE_COMMENTS_JSON="$(gh api "repos/$REPO/issues/$PR_NUMBER/comments?per_page=200")"
CURSOR_COMMENTS="$(echo "$ISSUE_COMMENTS_JSON" | jq -r '.[] | select(.user.login | ascii_downcase | contains("cursor")) | .body')"
COMMENT_BUGS="$(extract_bug_count "$CURSOR_COMMENTS")"
if [ "$COMMENT_BUGS" -gt "$BUGS_REPORTED" ] 2>/dev/null; then
  BUGS_REPORTED="$COMMENT_BUGS"
  BLOCKING_SOURCE="issue_comment:cursor"
fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "pr_number=$PR_NUMBER"
    echo "head_sha=$HEAD_SHA"
    echo "base_ref=$BASE_REF"
    echo "bug_count=$BUGS_REPORTED"
    echo "blocking_source=$BLOCKING_SOURCE"
  } >> "$GITHUB_OUTPUT"
fi

if [ "$NO_COMMENT" = "true" ]; then
  if [ "$BUGS_REPORTED" -gt 0 ] 2>/dev/null; then
    echo "BLOCKED: detected $BUGS_REPORTED bug(s)/issues from $BLOCKING_SOURCE"
    exit 2
  fi
  echo "CLEAR: no blocker patterns detected"
  exit 0
fi

if [ -z "$CURSOR_RUN_IDS" ]; then
  COMMENT_BODY="$(cat <<EOF
## Babysit Status (Detect Only)

PR: $PR_URL
Head: \`$HEAD_REF\` -> Base: \`$BASE_REF\`
Head SHA: \`$HEAD_SHA\`

No Cursor/Bugbot check runs were found for this head commit yet.

Next step: wait for Bugbot to finish, then run \`/babysit\` again.
EOF
)"
  gh pr comment "$PR_NUMBER" --repo "$REPO" --body "$COMMENT_BODY"
  exit 0
fi

REVIEWS_JSON="$(gh api --paginate "repos/$REPO/pulls/$PR_NUMBER/reviews?per_page=100" | jq -s 'add')"
LATEST_REVIEW_ID="$(echo "$REVIEWS_JSON" | jq -r 'map(select(.user.login=="cursor[bot]")) | sort_by(.submitted_at) | last | .id // empty')"

ACTIONABLE_LINKS="(none)"
if [ -n "$LATEST_REVIEW_ID" ]; then
  COMMENTS_JSON="$(gh api --paginate "repos/$REPO/pulls/$PR_NUMBER/comments?per_page=100" | jq -s 'add')"
  ACTIONABLE_LINKS="$(echo "$COMMENTS_JSON" | jq -r --arg sha "$HEAD_SHA" --argjson rid "$LATEST_REVIEW_ID" '
    .[]
    | select(.pull_request_review_id == $rid and .commit_id == $sha and .user.login == "cursor[bot]")
    | "- [" + .path + "](" + .html_url + ")"
  ')"
  if [ -z "$ACTIONABLE_LINKS" ]; then
    ACTIONABLE_LINKS="(none)"
  fi
fi

STATUS_LINE="No Bugbot blocker detected."
NEXT_STEP_LINE="No action needed right now."
if [ "$BUGS_REPORTED" -gt 0 ] 2>/dev/null; then
  STATUS_LINE="Bugbot reports ${BUGS_REPORTED} potential issue(s)."
  NEXT_STEP_LINE="Fix the actionable items on your feature branch, push, and re-run /babysit."
fi

COMMENT_BODY="$(cat <<EOF
## Babysit Status (Detect Only)

Requester: @$REQUESTED_BY
PR: $PR_URL
Head: \`$HEAD_REF\` -> Base: \`$BASE_REF\`
Head SHA: \`$HEAD_SHA\`

**Status:** $STATUS_LINE
**Next step:** $NEXT_STEP_LINE

### Cursor/Bugbot Runs on Head Commit
$RUN_SUMMARY_LINES
### Actionable Bugbot Links (latest review + current head commit)
$ACTIONABLE_LINKS
EOF
)"

gh pr comment "$PR_NUMBER" --repo "$REPO" --body "$COMMENT_BODY"
echo "Posted detect-only babysit status to PR #$PR_NUMBER"
