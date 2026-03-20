#!/usr/bin/env bash
# notify-log.sh — 세션 감사 로그
# Notification hook: Claude 알림을 .claude/session.log에 기록

LOG_FILE=".claude/session.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

input=$(cat)

# 알림 메시지 추출
if command -v python3 &>/dev/null; then
  message=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    # Try common notification fields
    msg = d.get('message') or d.get('notification') or d.get('content', '')
    print(str(msg)[:200])  # truncate to 200 chars
except:
    print('')
" 2>/dev/null)
fi

[ -z "$message" ] && message="(알림)"

# 로그에 추가
echo "[$TIMESTAMP] $message" >> "$LOG_FILE" 2>/dev/null || true

exit 0
