# CURRENT — claude-remote

이 문서는 프로젝트의 현재 상태를 나타내는 살아있는 문서입니다.
세션 시작 시 가장 먼저 읽고, 세션 종료 시 반드시 최신화하세요.

---

## Goal
iPhone에서 Claude Code + Gemini CLI 원격 조작 PWA. Claude 토큰 소진 시 Gemini로 전환.
Mac(집) / Windows(회사) / iPhone(외출) 3기기 연속 개발 환경.

## Status
**모바일 UX 완성 / 신규 프로젝트 플로우 완성 / GitHub 연동 완성 / 빌드 통과 / 훅 버그 수정 완료**

---

## Access URLs
- Local: http://localhost:5173 (web PWA)
- Server: ws://localhost:3001 (relay server)

---

## 완성된 구조

```
packages/
  server/src/
    index.ts           — Bun + Hono WebSocket + GitHub API + /api/new-project
  web/src/
    App.tsx            — 서버선택 → 세션시작 → 터미널 3단계 + GitHub + NewProject
    components/
      Terminal.tsx       — xterm.js + 모바일 입력바 (chips + input + A-/A+) + QuickCommand
      NewProject.tsx     — 3단계 wizard (아이디어 → 이름 제안 → 자동 생성)
      ProviderSwitch.tsx — provider 전환 UI (헤더에 통합)
      ServerSelect.tsx   — 서버 목록 관리
    hooks/
      useRelay.ts        — WebSocket 연결 훅 (자동 재연결)
      useServerConfig.ts — localStorage 서버 설정 영속
```

---

## In Progress Files
- (없음)

---

## Last Completions
- **pre-bash.sh 훅 버그 수정** (2026-03-21)
  - macOS bash v3 `declare -A` 미지원 → `Format-Volume` 패턴이 index 0에 저장되어 "0" 포함 명령 전부 차단되던 버그
  - `ne0cean` (0 포함) → 모든 `gh api` 명령이 차단되는 실제 증상
  - 연관 배열 → 패턴/이유 쌍 indexed 배열 방식으로 재작성 (bash 3 완전 호환)
- **/todo 스킬 안전 강화** (2026-03-21)
  - 메모 추가 시 `Write` 툴 덮어쓰기 → `Bash echo >>` append 방식으로 명시
  - 모든 서브커맨드(done/del/clear)에 "Write 툴 사용 금지" 경고 추가
- **레포 CURRENT.md 일괄 정정** (2026-03-21)
  - A-Team init.sh가 기존 개발 내용 덮어쓴 7개 레포 수정
  - VDI-Switcher, HSC_macro, HSC_Clicker_Mobile, auto-login-mydesk, MMS2Clipboard → "개발 완료. 실사용 중"
  - AI-lighthaus → "기획 단계", desktop-tutorial → "실습용 레포" 로 정정
- **글로벌 슬래시 명령어 연동** (2026-03-21)
  - `/todo`, `/prjt` → `~/.claude/commands/`에 글로벌 셋팅 확인
  - A-Team `.claude/commands/todo.md`, `prjt.md` → 심볼릭 링크로 교체
  - `~/.claude/settings.json` SessionStart 훅 정리
- **모바일 입력바 + QuickCommand** (2026-03-21)
  - Terminal.tsx: chips(/vibe, /end, ← PC) + text input + A-/A+ + ↵
  - iOS 키보드 포커스 수정 (input 요소 직접 포커스)
- **RC 모드 개선** (2026-03-21)
  - auto-vibe: `/vibe\r` (슬래시 수정)
  - RETURN TO MAC → quickCommands ← PC 버튼
- **GitHub Projects** (2026-03-21)
  - Private repos 지원 (GITHUB_TOKEN)
  - 레포 클릭 → 세션 → auto-vibe, PRIVATE 배지, localPath 자동 감지
- **신규 프로젝트 플로우** (2026-03-21)
  - NewProject.tsx: 아이디어 → 이름 제안 3개 → 자동 생성
  - /api/new-project: GitHub 레포 생성 + 클론 + CLAUDE.md + CURRENT.md
  - 완료 → 터미널 → auto-vibe
- **Server Dashboard 메트릭** (2026-03-21)
- **vitest 설정** (2026-03-21)

---

## Next Tasks

1. [ ] **Tailscale 실 접속 테스트** — iPhone Safari 연동 확인
2. [ ] **GITHUB_TOKEN 설정** — `.env` 파일 추가 시 private repos 동작
3. [ ] **안티그래비티 모바일 지원** — 별도 프로젝트 (todo 메모 참조)

---

## Blockers
- Tailscale 미설치 → 외출 중 iPhone 접속 불가
- GITHUB_TOKEN 미설정 → GitHub Projects 화면 empty
