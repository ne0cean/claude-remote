#!/usr/bin/env bash
# subagent-dod.sh — SubagentStop 훅: 서브에이전트 종료 시 DoD 체크
# Exit 0 = 통과, Exit 2 = 차단 (에이전트 재실행 또는 에스컬레이션)
# JSON stdin으로 에이전트 출력 수신

PROJ_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
PLAN_FILE="$PROJ_ROOT/PARALLEL_PLAN.md"

# PARALLEL_PLAN.md 없으면 DoD 체크 불필요 (단일 에이전트 작업)
if [ ! -f "$PLAN_FILE" ]; then
  exit 0
fi

# stdin에서 에이전트 JSON 출력 읽기
INPUT=$(cat)
AGENT_OUTPUT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('output',''))" 2>/dev/null || echo "")

# PARALLEL_PLAN.md에서 미완료 DoD 항목 확인
INCOMPLETE=$(grep -c "^\- \[ \]" "$PLAN_FILE" 2>/dev/null || echo "0")
TOTAL=$(grep -c "^\- \[" "$PLAN_FILE" 2>/dev/null || echo "0")

if [ "$INCOMPLETE" -gt 0 ] && [ "$TOTAL" -gt 0 ]; then
  # 미완료 항목이 있으면 경고 (차단하지 않음 — 다른 에이전트가 처리 중일 수 있음)
  INCOMPLETE_ITEMS=$(grep "^\- \[ \]" "$PLAN_FILE" | head -3)
  printf '{"systemMessage":"[SubagentDoD] 미완료 항목 %d/%d개:\\n%s\\n완료 후 /end 실행 권장"}\n' \
    "$INCOMPLETE" "$TOTAL" "$INCOMPLETE_ITEMS"
fi

exit 0
