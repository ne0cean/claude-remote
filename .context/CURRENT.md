# CURRENT — claude-remote

이 문서는 프로젝트의 현재 상태를 나타내는 살아있는 문서입니다.
세션 시작 시 가장 먼저 읽고, 세션 종료 시 반드시 최신화하세요.

---

## Goal
iPhone에서 Claude Code + Gemini CLI 원격 조작 PWA. Claude 토큰 소진 시 Gemini로 전환.

## Status
**아키텍처 설계 완료 / 스캐폴딩 완료 / 구현 대기**

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
- **아키텍처 설계** (2026-03-20)
  - tiann/hapi 기반 구조 확정 (Claude + Gemini dual support)
  - docs/ARCHITECTURE.md, docs/PRD.md 작성
  - server + web 스캐폴딩 완료

---

## Next Tasks

1. [ ] `bun install` 후 서버/웹 실행 테스트
2. [ ] Tailscale IP 환경에서 iPhone 접속 테스트
3. [ ] Provider 전환 E2E 테스트 (Claude → Gemini)
4. [ ] Tailwind 설정 완성 (tailwind.config.js 추가)
5. [ ] PWA 아이콘 이미지 추가 (icon-192.png, icon-512.png)

---

## Blockers
- 없음
