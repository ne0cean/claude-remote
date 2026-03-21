# CURRENT — claude-remote

이 문서는 프로젝트의 현재 상태를 나타내는 살아있는 문서입니다.
세션 시작 시 가장 먼저 읽고, 세션 종료 시 반드시 최신화하세요.

---

## Goal
iPhone에서 Claude Code + Gemini CLI 원격 조작 PWA. Claude 토큰 소진 시 Gemini로 전환.
Mac(집) / Windows(회사) / iPhone(외출) 3기기 연속 개발 환경.

## Status
**모바일 UX 완성 / AI 이름 제안 완성 / GitHub 연동 (public+private) / 터미널 Ready 패턴 적용 / 빌드 통과**

---

## Access URLs
- Local: http://localhost:5173 (web PWA)
- Server: ws://localhost:3001 (relay server)

---

## 완성된 구조

```
packages/
  server/src/
    index.ts           — Bun + Hono WebSocket + GitHub API + /api/new-project + /api/suggest-names
  web/src/
    App.tsx            — 서버선택 → 세션시작 → 터미널 3단계 + GitHub + NewProject + pendingSessionRef
    components/
      Terminal.tsx       — xterm.js + 모바일 입력바 + QuickCommand + onReady 콜백
      NewProject.tsx     — 3단계 wizard (아이디어 → AI 이름 제안 → 자동 생성 + 실제 프로그레스)
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
- **터미널 Ready 후 세션 생성** (2026-03-21)
  - pendingSessionRef로 세션 생성을 터미널 초기화 후로 지연 → 레이스 컨디션 해소
  - onPointerDown/Up → onTouchStart/onClick 전환 (iOS 터치 안정성)
- **AI 이름 제안 실제 작동** (2026-03-21)
  - claude -p 중첩 세션 차단 해결 (CLAUDECODE env 제거)
  - 한글 키워드 → 영문 매핑 40+ 단어 fallback
  - GitHub 403/422 에러에 구체적 안내 메시지
- **GitHub repos public+private 지원** (2026-03-21)
  - 페이지네이션 (100개 초과 레포), 5분 캐시
  - 토큰 없이 ?username= 으로 public repos 조회 가능
- **New Project AI 플로우 전면 개선** (2026-03-21)
  - /api/suggest-names: claude -p 활용 AI 이름 제안
  - /api/new-project: 단계별 상태 반환
  - 가짜 프로그레스 제거 → 서버 응답 기반 실시간 상태

---

## Next Tasks

1. [ ] **Tailscale 실 접속 테스트** — iPhone Safari 연동 확인
2. [ ] **GITHUB_TOKEN 권한 수정** — Fine-grained token에 Administration: Read & Write 추가 필요 (현재 403)
3. [ ] **안티그래비티 모바일 지원** — 별도 프로젝트 (todo 메모 참조)
4. [ ] **README.md 최종 스펙 업데이트** — reconnection, session list, AI 이름 제안 등 반영
5. [ ] **docs/ARCHITECTURE.md 업데이트** — Provider 전환 및 재연결 시퀀스 다이어그램

---

## Blockers
- Tailscale 미설치 → 외출 중 iPhone 접속 불가
- GITHUB_TOKEN 권한 부족 (403) → 레포 생성 불가 (조회는 정상)
