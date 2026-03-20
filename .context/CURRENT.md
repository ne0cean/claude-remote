# CURRENT — claude-remote

이 문서는 프로젝트의 현재 상태를 나타내는 살아있는 문서입니다.
세션 시작 시 가장 먼저 읽고, 세션 종료 시 반드시 최신화하세요.

---

## Goal
iPhone에서 Claude Code + Gemini CLI 원격 조작 PWA. Claude 토큰 소진 시 Gemini로 전환.

## Status
**빌드 완료 / 서버+웹 실행 중 / iPhone 접속 테스트 진행**

---

## Access URLs
- Local: http://localhost:5173 (web PWA)
- Server: ws://localhost:3001 (relay server)

---

## 완성된 구조

```
packages/
  server/src/
    index.ts           — Bun + Hono WebSocket 서버
    session.ts         — PTY 세션 생성/전환/종료
    providers/index.ts — Claude/Gemini provider 정의
  web/src/
    App.tsx            — 메인 UI
    components/
      Terminal.tsx       — xterm.js 터미널
      ProviderSwitch.tsx — provider 전환 UI
    hooks/
      useRelay.ts        — WebSocket 연결 훅
```

---

## Last Completions
- **빌드 환경 완성** (2026-03-20)
  - bun install (898 패키지), tsconfig.json, tailwind.config.js, vite-env.d.ts
  - PWA 아이콘 생성 (192/512), .gitignore
  - 서버(3001) + 웹(5173) 실행 확인
  - GitHub push 완료
- **아키텍처 설계** (2026-03-20)
  - tiann/hapi 기반 구조 확정 (Claude + Gemini dual support)
  - docs/ARCHITECTURE.md, docs/PRD.md 작성
  - server + web 스캐폴딩 완료

---

## Next Tasks

1. [x] `bun install` 후 서버/웹 실행 테스트 ✅
2. [x] Tailwind config + PWA 아이콘 추가 ✅
3. [ ] Tailscale IP 환경에서 iPhone 접속 테스트
4. [ ] Provider 전환 E2E 테스트 (Claude → Gemini)
5. [ ] QR 코드 연결 (서버 시작 시 터미널에 표시)

---

## Blockers
- 없음
