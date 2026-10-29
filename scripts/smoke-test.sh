#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-}"
if [[ -z "$API_URL" ]]; then
  API_URL="$(terraform output -raw api_url 2>/dev/null || true)"
fi
if [[ -z "$API_URL" ]]; then
  echo "Usage: $0 <API_URL>" >&2
  echo "Or run from the Terraform directory so 'terraform output -raw api_url' works." >&2
  exit 1
fi
API_URL="${API_URL%/}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
BODY_FILE="$TMP_DIR/body.json"

request() {
  local method="$1" path="$2" payload="${3:-}"
  local args=(-sS -o "$BODY_FILE" -w '%{http_code}' -X "$method" "$API_URL$path")
  if [[ -n "$payload" ]]; then
    args+=(-H 'Content-Type: application/json' -d "$payload")
  fi
  STATUS="$(curl "${args[@]}")"
  BODY="$(cat "$BODY_FILE")"
}

assert_status() {
  local expected="$1" label="$2"
  if [[ "$STATUS" != "$expected" ]]; then
    echo "FAIL $label: expected HTTP $expected, got $STATUS" >&2
    echo "Body: $BODY" >&2
    exit 1
  fi
  echo "ok   $label (HTTP $STATUS)"
}

json_field() {
  python3 -c 'import json,sys; print(json.load(sys.stdin)[sys.argv[1]])' "$1" <<<"$BODY"
}

echo "Testing API at $API_URL"

request GET /health
assert_status 200 "health"
[[ "$(json_field status)" == "ok" ]] || { echo "FAIL health payload: $BODY" >&2; exit 1; }

request POST /tasks '{"title":"Smoke test task","priority":"high"}'
assert_status 201 "create task"
TASK_ID="$(json_field id)"
echo "     created task id=$TASK_ID"

request GET "/tasks/$TASK_ID"
assert_status 200 "get task"

request PATCH "/tasks/$TASK_ID" '{"completed":true,"title":"Smoke test task (updated)"}'
assert_status 200 "update task"
[[ "$(json_field completed)" == "True" ]] || { echo "FAIL completed was not updated" >&2; exit 1; }

request GET /tasks
assert_status 200 "list tasks"
grep -q "$TASK_ID" <<<"$BODY" || { echo "FAIL created task missing from list" >&2; exit 1; }

request POST /tasks '{"title":""}'
assert_status 400 "validation rejects empty title"

request DELETE "/tasks/$TASK_ID"
assert_status 204 "delete task"

request GET "/tasks/$TASK_ID"
assert_status 404 "deleted task is gone"

echo "All smoke tests passed."
