# CURRENT — claude-remote

이 문서는 프로젝트의 현재 상태를 나타내는 살아있는 문서입니다.
세션 시작 시 가장 먼저 읽고, 세션 종료 시 반드시 최신화하세요.

---

## Goal
iPhone에서 Claude Code + Gemini CLI 원격 조작 PWA. Claude 토큰 소진 시 Gemini로 전환.
Mac(집) / Windows(회사) / iPhone(외출) 3기기 연속 개발 환경.

## Status
**멀티 디바이스 지원 완료 / 빌드 통과 / Tailscale 실 접속 테스트 대기**

---

## Access URLs
- Local: http://localhost:5173 (web PWA)
- Server: ws://localhost:3001 (relay server)

---

## 완성된 구조

```
packages/
  server/src/
    index.ts           — Bun + Hono WebSocket + Tailscale IP 감지 + QR
    session.ts         — PTY 세션 + .session-state.json 파일 저장
    providers/index.ts — Claude/Gemini provider 정의
  web/src/
    App.tsx            — 서버선택 → 세션시작 → 터미널 3단계 플로우
    components/
      Terminal.tsx       — xterm.js 터미널
      ProviderSwitch.tsx — provider 전환 UI
      ServerSelect.tsx   — 서버 목록 관리 (추가/삭제/선택)
    hooks/
      useRelay.ts        — WebSocket 연결 훅
      useServerConfig.ts — localStorage 서버 설정 영속
```

---

## In Progress Files
- (없음)

---

## Last Completions
- **멀티 디바이스 지원** (2026-03-20)
  - 서버: Tailscale IP(100.x.x.x) 우선 감지, MACHINE_LABEL 환경변수
  - 서버: /api/info + /api/sessions 엔드포인트, attach_session 재연결
  - 서버: .session-state.json으로 세션 메타 영속
  - 웹: ServerSelect UI — 여러 서버 저장/전환 (Mac 집 / Windows 회사)
  - 웹: useServerConfig — localStorage 영속, 마지막 서버 기억
  - 빌드 통과 + GitHub push
- **빌드 환경 완성** (2026-03-20)
  - bun install, tsconfig.json, tailwind.config.js, PWA 아이콘, .gitignore

---

## Next Tasks

1. [x] bun install + 빌드 통과 ✅
2. [x] Tailwind config + PWA 아이콘 ✅
3. [x] QR 코드 + Tailscale IP 감지 ✅
4. [x] 멀티 디바이스 — ServerSelect UI + useServerConfig ✅
5. [ ] **Tailscale 설치 후 iPhone 실 접속 테스트** ← 다음
6. [ ] Provider 전환 E2E 테스트 (Claude → Gemini)
7. [ ] Windows PC에서 서버 실행 테스트 (`bun run dev`)
8. [ ] 세션 재연결 UI — 이전 세션 목록 표시 + attach

---

## Blockers
- Tailscale 미설치 상태 → 외출 중 iPhone 접속 불가 (설치 필요)
  → https://tailscale.com/download (Mac, Windows, iPhone 모두 설치)
