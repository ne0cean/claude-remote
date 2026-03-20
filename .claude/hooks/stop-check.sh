#!/usr/bin/env bash
# stop-check.sh — 세션 종료 전 빌드 검증 게이트 (프로젝트 독립적 템플릿)
# Stop hook: Claude가 멈추려 할 때 빌드 상태 확인
# Exit 2 = 차단 (에러를 Claude에 전달해 수정 유도)
#
# ⚙️  프로젝트별 설정: BUILD_TARGETS 배열을 수정하세요
# 형식: "파일_glob패턴|빌드_명령|빌드_디렉토리(proj root 기준)"

PROJ_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

BUILD_TARGETS=(
  # 예시: "client/src/.*\.(js|jsx|ts|tsx|css)|npm run build|client"
  # 예시: "server/.*\.js|node --check server.js|."
  "src/.*\.(js|jsx|ts|tsx|css)|npm run build|."
)

# ── 변경 파일 탐지 ────────────────────────────────────────────
ALL_CHANGED=$(git -C "$PROJ_ROOT" diff --name-only 2>/dev/null)$'\n'$(git -C "$PROJ_ROOT" diff --name-only --cached 2>/dev/null)

if [ -z "$(echo "$ALL_CHANGED" | tr -d '[:space:]')" ]; then
  exit 0
fi

BUILD_FAILED=false
HEADER_PRINTED=false

for target in "${BUILD_TARGETS[@]}"; do
  IFS='|' read -r pattern cmd dir <<< "$target"
  MATCHED=$(echo "$ALL_CHANGED" | grep -E "$pattern" || true)
  [ -z "$MATCHED" ] && continue

  if [ "$HEADER_PRINTED" = "false" ]; then
    echo "═══════════════════════════════════════════" >&2
    echo "  빌드 검증 게이트 (Stop Hook)" >&2
    echo "═══════════════════════════════════════════" >&2
    HEADER_PRINTED=true
  fi

  echo "변경 감지 → $cmd (in $dir):" >&2
  echo "$MATCHED" | head -5 | sed 's/^/  • /' >&2

  build_dir="$PROJ_ROOT/$dir"
  if [ -d "$build_dir" ]; then
    if (cd "$build_dir" && eval "$cmd" 2>&1); then
      echo "✅ 통과: $cmd" >&2
    else
      echo "❌ 실패: $cmd" >&2
      BUILD_FAILED=true
      break
    fi
  else
    echo "⚠️  디렉토리 없음: $build_dir (스킵)" >&2
  fi
done

if [ "$BUILD_FAILED" = "true" ]; then
  printf '{"decision":"block","reason":"빌드 검증 실패. 위 에러를 수정한 뒤 다시 작업을 완료하세요."}\n' >&2
  exit 2
fi

[ "$HEADER_PRINTED" = "true" ] && echo "  모든 빌드 검증 통과 ✅" >&2
exit 0
