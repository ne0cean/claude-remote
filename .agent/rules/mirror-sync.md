# Mirror Sync Rules (CC Mirror)

## 1. 개요
"Context is more valuable than code." 
모델 중단, 토큰 소진, 혹은 예기치 않은 시스템 종료 시에도 작업 맥락을 보존하기 위한 자동 동기화 규칙입니다.

## 2. 자동 동기화 (`auto-sync.sh`)
- **실행 원칙**: 백그라운드 데몬으로 실행되거나 세션 종료 훅(`stop-check.sh`)과 연동됩니다.
- **커밋 메시지**: `sync: auto-commit [시간]` 포맷을 사용합니다.
- **기록 필수**: `.context/SESSIONS.md`에 `[auto-sync]` 항목을 자동으로 추가하여 작업 흐름의 공백을 방지합니다.

## 3. 모델 핸드오프 (`model-exit.sh`)
- **트리거**: 사용자가 `/handoff` 혹은 `/end` 명령을 내릴 때 실행됩니다.
- **역할**:
    1. 현재 `CURRENT.md`를 기반으로 `HANDOFF_PROMPT.txt`를 생성합니다.
    2. 생성된 프롬프트를 시스템 클립보드에 자동으로 복사합니다 (OS별 호환성 지원).
    3. 최종 동기화 커밋을 수행합니다.

## 4. 맥락 복원 (Resumption)
- 새 세션 시작 시 에이전트는 반드시 `git pull`을 통해 최신 "Mirror" 상태를 가져와야 합니다.
- `A-Team/TODO.md`의 최우선 항목과 `CURRENT.md`의 `Next Tasks`를 대조하여 작업을 재개합니다.

---
*A-Team Context Continuity Protocol 제13조에 의거함.*
