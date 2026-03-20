# 세션 로그 — claude-remote

새로운 작업 세션이 끝날 때마다 결과를 남깁니다.

---

## [2026-03-20] 초기화

**완료**: A-Team + Vibe-Toolkit 통합 프레임워크로 프로젝트 스캐폴딩
**에이전트**: orchestrator, researcher, coder, reviewer, architect 설치
**거버넌스**: coding-safety, sync-and-commit, turbo-auto 규칙 설치

---

## [2026-03-20] 구현 세션 1

**완료**:
- A-Team init.sh 버그 수정 (스크립트 이름 오류 + 대상 디렉토리 인자 지원)
- 빌드 환경 구축: bun 설치, tsconfig, tailwind.config.js, PWA 아이콘, vite-env.d.ts
- 서버: Tailscale IP 우선 감지, QR 코드, MACHINE_LABEL, /api/info, session 파일 저장
- 웹: ServerSelect 컴포넌트, useServerConfig 훅 — 멀티 서버 저장/전환 UI
- 서버/웹 빌드 통과, GitHub push

**이슈**:
- A-Team 로컬 버전 구버전 → git pull 해결 (init.sh 이미 존재)
- bun PATH 미등록 → ~/.bun/bin/bun 절대경로 우회
- tsconfig 없어 tsc 도움말 출력 → tsconfig.json 생성으로 해결
- node-pty bun build 타겟 미지정 → --target bun 추가

**다음**: Tailscale 설치 후 iPhone 실 접속 테스트, Windows 서버 실행 테스트

---

## [2026-03-21] 글로벌 슬래시 명령어 연동

**완료**:
- `/todo`, `/prjt` 글로벌 명령어 위치(`~/.claude/commands/`) 확인 및 진단
- 프로젝트별 `.claude/commands/`가 있을 때 글로벌 명령어 미인식 문제 파악
- A-Team `todo.md`, `prjt.md` → 글로벌 파일 심볼릭 링크로 교체
- `~/.claude/settings.json` SessionStart cp 훅 제거 (심볼릭 링크로 대체)

**이슈**: 없음
**빌드**: ✅ (설정 파일 변경만, 빌드 불필요)

---

## [2026-03-21] 훅 버그 수정 + 레포 현황 정정

**완료**:
- `pre-bash.sh` macOS bash v3 호환 버그 수정 — `declare -A` 미지원으로 `gh api ne0cean/...` 명령 전체 차단되던 문제 해결
- `/todo` 스킬 안전 강화 — `Write` 툴 덮어쓰기 방지, `Bash echo >>` append 방식 명시
- `/prjt` 실행 후 7개 레포 CURRENT.md 오류 발견 및 일괄 수정 (A-Team init.sh가 기존 개발 내용 위에 빈 템플릿 덮어쓴 문제)
  - 실제 개발 완료 레포 4개 정정: VDI-Switcher, HSC_macro, HSC_Clicker_Mobile, auto-login-mydesk, MMS2Clipboard
  - 기획/실습 레포 2개 정정: AI-lighthaus, desktop-tutorial

**이슈**: `ne0cean` 유저명에 `0`이 포함 → bash v3 버그로 모든 `gh api` 명령 차단
**빌드**: ✅ (코드 변경 없음, 설정/훅 파일만 수정)
