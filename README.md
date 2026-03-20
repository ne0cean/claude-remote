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
- **iPhone PWA 최적화**: 홈 화면 추가, safe area inset, 모바일 터치 터미널 + 플로팅 줌 컨트롤
- **Provider 전환 모달**: 세션 중 한 번의 탭으로 Claude ↔ Gemini 즉시 전환 (확인 모달 포함)
- **Health Check**: 서버별 `/health` 자동 폴링 + 🟢/🔴/🟡 상태 인디케이터
- **Server Dashboard**: CPU Load Average, Memory 사용률, 세션 수, 업타임 실시간 시각화
- **멀티 디바이스**: Tailscale IP 자동 감지 및 QR 코드 연결 (Mac / Windows / iPhone)
- **RC Handover**: Mac에서 `rc` 명령으로 프로젝트 컨텍스트를 iPhone으로 즉시 전달

## 상태

> v1 핵심 구현 + 모바일 UX 고도화 완료 — Tailscale E2E 테스트 대기 중 (2026-03-21)
