#!/usr/bin/env bash
# pre-bash.sh — 위험한 Bash 명령 차단
# PreToolUse hook: Bash 도구 실행 전 검사
# Exit 2 = Claude에게 에러 메시지 전달 + 실행 차단

input=$(cat)

# JSON에서 command 추출
if command -v python3 &>/dev/null; then
  cmd=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except:
    print('')
" 2>/dev/null)
else
  cmd="$input"
fi

[ -z "$cmd" ] && exit 0

# ── 위험 패턴 목록 ────────────────────────────────────────────
declare -A DANGEROUS
DANGEROUS["rm -rf /"]="루트 삭제 시도"
DANGEROUS["rm -rf ~"]="홈 디렉토리 삭제 시도"
DANGEROUS["rm -rf \*"]="와일드카드 재귀 삭제"
DANGEROUS["rm -rf \."]="현재 디렉토리 삭제"
DANGEROUS["git reset --hard"]="하드 리셋 (작업 유실 위험)"
DANGEROUS["git push.*--force"]="강제 푸시"
DANGEROUS["git push.*-f "]="강제 푸시"
DANGEROUS["git push origin main$"]="main 직접 푸시 (PR 없이)"
DANGEROUS["git push origin master$"]="master 직접 푸시"
DANGEROUS["DROP TABLE"]="DB 테이블 삭제"
DANGEROUS["DROP DATABASE"]="DB 삭제"
DANGEROUS["mkfs"]="파일시스템 포맷"
DANGEROUS["dd if="]="디스크 직접 쓰기"
DANGEROUS[":\(\){ :|:&"]="Fork 폭탄"
DANGEROUS["chmod -R 777 /"]="루트 권한 개방"
DANGEROUS["Remove-Item.*-Recurse.*-Force.*C:"]="Windows 드라이브 삭제"
DANGEROUS["Format-Volume"]="볼륨 포맷"

for pattern in "${!DANGEROUS[@]}"; do
  if echo "$cmd" | grep -qiE "$pattern"; then
    reason="${DANGEROUS[$pattern]}"
    printf '{"decision":"block","reason":"🛡️ 위험 명령 차단 [%s]: `%s`\n\n정말 필요하다면 터미널에서 직접 실행하세요."}\n' \
      "$reason" "$cmd" >&2
    exit 2
  fi
done

# ── 경고 패턴 (차단하지 않고 시스템 메시지만) ─────────────────
WARN_PATTERNS=(
  "git push"
  "npm publish"
  "docker push"
  "vercel deploy"
  "railway up"
)
for pattern in "${WARN_PATTERNS[@]}"; do
  if echo "$cmd" | grep -qiE "$pattern"; then
    printf '{"systemMessage":"⚠️ 배포/푸시 명령 감지: `%s`\n의도한 명령이 맞는지 확인 후 실행하세요."}\n' "$cmd"
    exit 0
  fi
done

exit 0
