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

- **Claude Code + Gemini CLI** 원격 조작 (PTY 기반)
- **세션 자동 재연결**: 네트워크 끊김 시 지수 백오프 적용 자동 복구
- **세션 목록 & 재부착**: 기존 세션 목록을 불러와 중단 지점에서 재개 (Attach)
- **iPhone PWA 최적화**: 홈 화면 추가, 모바일 터치 터미널 지원
- **Provider 전환**: 세션 중 한 번의 탭으로 Claude ↔ Gemini 즉시 전환
- **멀티 디바이스**: Tailscale IP 자동 감지 및 QR 코드 연결

## 상태

> v1 핵심 코드 구현 완료 — 안정성 및 모바일 UX 고도화 중 (2026-03-20)
