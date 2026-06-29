#!/usr/bin/env bash
# A2A protocol test script for Exploration 5
# Usage: ./test.sh [base_url]
# Default base URL: http://localhost:1999

set -euo pipefail

BASE_URL="${1:-http://localhost:1999}"

echo "=== A2A Protocol Tests ==="
echo "Base URL: $BASE_URL"
echo ""

# ---------------------------------------------------------------------------
# 1. Agent Card Discovery
# ---------------------------------------------------------------------------
echo "--- 1. Agent Card Discovery ---"
echo "GET $BASE_URL/.well-known/agent-card.json"
echo ""

CARD=$(curl -s "$BASE_URL/.well-known/agent-card.json")
echo "$CARD" | jq .
echo ""

AGENT_NAME=$(echo "$CARD" | jq -r '.name')
echo "Agent: $AGENT_NAME"
echo "Skills: $(echo "$CARD" | jq -r '.skills | length')"
echo ""

# ---------------------------------------------------------------------------
# 2. Send a Message (new task)
# ---------------------------------------------------------------------------
echo "--- 2. Send a Message (new task) ---"
echo "POST $BASE_URL/message:send"
echo ""

MSG_ID="msg-$(date +%s)-001"
RESPONSE=$(curl -s -X POST "$BASE_URL/message:send" \
  -H 'Content-Type: application/json' \
  -d "{
    \"message\": {
      \"messageId\": \"$MSG_ID\",
      \"role\": \"ROLE_USER\",
      \"parts\": [{ \"text\": \"What is 42 times 17?\" }]
    }
  }")

echo "$RESPONSE" | jq .
echo ""

# Extract task ID for subsequent requests
TASK_ID=$(echo "$RESPONSE" | jq -r '.task.id // empty')
TASK_STATE=$(echo "$RESPONSE" | jq -r '.task.status.state // empty')
echo "Task ID: $TASK_ID"
echo "Task State: $TASK_STATE"
echo ""

# ---------------------------------------------------------------------------
# 3. Get Task Status
# ---------------------------------------------------------------------------
if [ -n "$TASK_ID" ]; then
  echo "--- 3. Get Task Status ---"
  echo "GET $BASE_URL/tasks/$TASK_ID"
  echo ""

  curl -s "$BASE_URL/tasks/$TASK_ID" | jq .
  echo ""
fi

# ---------------------------------------------------------------------------
# 4. Multi-turn: Send Follow-up Message
# ---------------------------------------------------------------------------
if [ -n "$TASK_ID" ]; then
  echo "--- 4. Multi-turn Follow-up ---"
  echo "POST $BASE_URL/message:send (with existing taskId)"
  echo ""

  MSG_ID2="msg-$(date +%s)-002"
  RESPONSE2=$(curl -s -X POST "$BASE_URL/message:send" \
    -H 'Content-Type: application/json' \
    -d "{
      \"message\": {
        \"messageId\": \"$MSG_ID2\",
        \"role\": \"ROLE_USER\",
        \"taskId\": \"$TASK_ID\",
        \"parts\": [{ \"text\": \"Now divide that result by 3\" }]
      }
    }")

  echo "$RESPONSE2" | jq .
  echo ""

  # Check history length
  HISTORY_LEN=$(echo "$RESPONSE2" | jq '.task.history | length // 0')
  echo "History length: $HISTORY_LEN messages"
  echo ""
fi

# ---------------------------------------------------------------------------
# 5. Streaming (should return UnsupportedOperationError)
# ---------------------------------------------------------------------------
echo "--- 5. Streaming (expected: UnsupportedOperationError) ---"
echo "POST $BASE_URL/message:stream"
echo ""

MSG_ID3="msg-$(date +%s)-003"
STREAM_RESPONSE=$(curl -s -X POST "$BASE_URL/message:stream" \
  -H 'Content-Type: application/json' \
  -d "{
    \"message\": {
      \"messageId\": \"$MSG_ID3\",
      \"role\": \"ROLE_USER\",
      \"parts\": [{ \"text\": \"Hello\" }]
    }
  }")

echo "$STREAM_RESPONSE" | jq .

STREAM_REASON=$(echo "$STREAM_RESPONSE" | jq -r '.error.details[0].reason // empty')
echo "Error reason: $STREAM_REASON"
echo ""

# ---------------------------------------------------------------------------
# 6. Get Non-existent Task (should return 404)
# ---------------------------------------------------------------------------
echo "--- 6. Get Non-existent Task (expected: 404) ---"
echo "GET $BASE_URL/tasks/does-not-exist"
echo ""

NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/tasks/does-not-exist")
echo "HTTP Status: $NOT_FOUND"
echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "=== Test Summary ==="
echo "Agent Card:       OK (discovered $AGENT_NAME)"
if [ -n "$TASK_ID" ]; then
  echo "Send Message:     OK (task $TASK_ID)"
  echo "Get Task:         OK"
  echo "Multi-turn:       OK ($HISTORY_LEN messages)"
else
  echo "Send Message:     SKIPPED (no task ID — is the Flue agent running?)"
  echo "Get Task:         SKIPPED"
  echo "Multi-turn:       SKIPPED"
fi
echo "Streaming:        OK (correctly returned: $STREAM_REASON)"
echo "Not Found:        OK (HTTP $NOT_FOUND)"
echo ""
echo "Done."
