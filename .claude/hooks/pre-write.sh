#!/usr/bin/env bash
# pre-write.sh — 민감 파일 보호 + 보안 경고
# PreToolUse hook: Write|Edit 도구 실행 전 검사
# Exit 2 = 차단 / Exit 0 + systemMessage = 경고 후 허용

input=$(cat)

# JSON에서 file_path 추출
if command -v python3 &>/dev/null; then
  file_path=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except:
    print('')
" 2>/dev/null)
else
  file_path="$input"
fi

[ -z "$file_path" ] && exit 0

# 파일명만 추출 (경로 제거)
filename=$(basename "$file_path")

# ── 절대 차단 파일 ────────────────────────────────────────────
BLOCKED_PATTERNS=(
  "^\.env$"
  "^\.env\.local$"
  "^\.env\.production$"
  "^\.env\.staging$"
  "\.env\.secret"
  "^id_rsa$"
  "^id_ed25519$"
  "^id_dsa$"
  "\.pem$"
  "credentials\.json$"
  "service.account.*\.json$"
  "^secrets\.json$"
  "^\.netrc$"
  "^\.npmrc$"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$filename" | grep -qiE "$pattern"; then
    printf '{"decision":"block","reason":"🔒 민감 파일 보호: `%s` 직접 수정 차단\n\n- 환경변수: .env.example 사용 후 팀에 공유\n- 키파일: 절대 버전 관리에 포함하지 마세요"}\n' \
      "$file_path" >&2
    exit 2
  fi
done

# ── .git/ 내부 직접 수정 차단 ─────────────────────────────────
if echo "$file_path" | grep -qE "\.git/"; then
  printf '{"decision":"block","reason":"🔒 .git/ 내부 파일 직접 수정 차단\ngit 명령어를 사용하세요."}\n' >&2
  exit 2
fi

# ── PARALLEL_PLAN.md 파일 소유권 검사 ─────────────────────────
PLAN_FILE=".context/PARALLEL_PLAN.md"
if [ -f "$PLAN_FILE" ] && command -v python3 &>/dev/null; then
  agent_id=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('agent_id', ''))
except:
    print('')
" 2>/dev/null)

  if [ -n "$agent_id" ] && [ "$agent_id" != "orchestrator" ]; then
    # 에이전트가 있고 orchestrator가 아닌 경우, 소유권 체크 알림
    printf '{"systemMessage":"📋 PARALLEL_PLAN.md 활성 중. `%s` 파일이 에이전트 `%s`의 소유권 범위 내에 있는지 확인하세요."}\n' \
      "$file_path" "$agent_id"
  fi
fi

# ── 보안 민감 파일 경고 (허용하되 주의 메시지) ────────────────
SECURITY_PATTERNS=(
  "auth"
  "middleware"
  "crypto"
  "jwt"
  "token"
  "password"
  "permission"
  "rbac"
  "oauth"
)

for pattern in "${SECURITY_PATTERNS[@]}"; do
  if echo "$file_path" | grep -qiE "$pattern"; then
    printf '{"systemMessage":"🔐 보안 민감 파일 수정 중: `%s`\n\n수정 완료 후 reviewer 에이전트 검증을 권장합니다."}\n' \
      "$file_path"
    exit 0
  fi
done

exit 0
