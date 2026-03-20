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
