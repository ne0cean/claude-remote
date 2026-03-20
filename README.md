# claude-remote

iPhone에서 Claude Code + Gemini CLI를 원격 조작하는 PWA 모바일 클라이언트.

Claude 토큰 소진 시 Gemini로 전환해 작업을 이어나갈 수 있다.

## 개념

```
iPhone (PWA/Safari)
    └─ WebSocket over HTTPS
         └─ Mac relay server (Node.js)
              ├─ Claude Code CLI  ← 기본
              └─ Gemini CLI       ← 토큰 소진 시 전환
```

## 영감

- [tiann/hapi](https://github.com/tiann/hapi) — Claude + Gemini dual support, WireGuard relay
- [slopus/happy](https://github.com/slopus/happy) — E2E 암호화, 푸시 알림

## 구조

```
packages/
  server/   # Mac 릴레이 서버 (Bun + Hono)
  web/      # iPhone PWA (React + Vite)
```

## 빠른 시작

```bash
# 설치
bun install

# Mac 서버 시작
bun run server

# PWA 빌드 (iPhone에서 localhost:5173 접속)
bun run web
```

## 주요 기능

- Claude Code + Gemini CLI 모두 지원
- 세션 중 provider 전환 (Claude → Gemini)
- iPhone 홈 화면 추가 (PWA)
- 암호화 WebSocket 통신
- 다중 세션 동시 실행

## 상태

> 설계 단계 — 구현 진행 중
