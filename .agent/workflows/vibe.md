---
description: [Turbo] 세션 시작 및 자율 모드 활성화 (One-Stop Start)
---

# 🚀 Vibe Global Start (Autonomous Mode)

이 워크플로우는 세션 시작(`session-start`)과 자율 모드(`turbo-rules`)를 한 번에 실행합니다.

// turbo-all
1. **Infrastructure Sync**: `A-Team` 중앙 저장소의 최신 할 일(`TODO.md`)과 워크플로우를 가져와 동기화합니다.
   - `git -C A-Team pull origin master` 실행
2. **Context Loading**: `.context/CURRENT.md` 및 `.context/DECISIONS.md`를 정독하여 즉시 맥락을 탑재합니다.
3. **State Analysis**: `git status`와 로그를 분석하여 마지막 중단 지점을 정확히 파악합니다.

3. **Task Classification**: `CURRENT.md`의 Next Tasks를 아래 기준으로 분류하고 `.context/GEMINI_TASKS.md`를 생성/갱신합니다.

   **Opus 태스크 (Claude Opus — 고난이도):**
   - 아키텍처 설계 / 복잡한 리팩토링
   - 보안 취약점 분석 및 수정
   - 신규 핵심 기능 구현 (멀티파일)
   - 복잡한 버그 디버깅 (원인 불명)
   - A-Team 오케스트레이션이 필요한 작업
   - 성능 최적화 (profiling 기반)

   **Gemini 태스크 (위임 가능 — 단순/반복):**
   - 문서/README 작성 및 업데이트
   - CSS/스타일 조정 (레이아웃 없음)
   - 단순 설정 파일 수정 (config, env)
   - 테스트 케이스 작성 (구조 확정 후)
   - 단순 CRUD 구현 (패턴 명확)
   - 번역 / 주석 보완
   - 린팅 에러 일괄 수정
   - 마이너 버그 수정 (원인 명확, 단일 파일)

4. **GEMINI_TASKS.md 업데이트**: 분류 결과를 `.context/GEMINI_TASKS.md`에 기록. 토큰 소진 전 언제든 열람 가능.
5. **Autonomous Activation**: `turbo-auto.md` 규칙을 활성화하여 사용자 개입 없이 다음 태스크를 즉시 수행합니다.
6. **Immediate Action**: 브리핑을 생략하거나 극도로 축약하고, **Opus 태스크 중 최우선 과제**를 바로 실행합니다.
