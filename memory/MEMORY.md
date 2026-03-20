# claude-remote - Project Memory

## Overview
- **Root repo**: claude-remote
- **Product**: iPhone PWA — Claude Code + Gemini CLI 원격 조작. provider 전환 지원.

## Tech Stack
- **Server**: Bun + Hono + node-pty (Mac relay server)
- **Web**: React + Vite + xterm.js + Tailwind (iPhone PWA)
- **통신**: WebSocket (WSS)
- **연결**: Tailscale 환경 권장

## Key Files
- `packages/server/src/index.ts` — WebSocket 서버 진입점
- `packages/server/src/session.ts` — PTY 세션 생성/전환/종료
- `packages/server/src/providers/index.ts` — Claude/Gemini provider 정의
- `packages/web/src/App.tsx` — 메인 UI
- `packages/web/src/hooks/useRelay.ts` — WebSocket 연결 훅
- `packages/web/src/components/ProviderSwitch.tsx` — provider 전환 UI
- `packages/web/src/components/Terminal.tsx` — xterm.js 터미널
- `docs/ARCHITECTURE.md` — 시스템 설계 상세

## Architecture
- tiann/hapi 구조 참조 (Claude + Gemini dual support)
- Mac relay server → iPhone PWA 패턴
- provider 전환: 기존 PTY kill → 새 PTY spawn (동일 CWD 유지)
- 빌드: `bun install` → `bun run server` + `bun run web`

---

## Vibe Toolkit
→ See `vibe-toolkit.md` for full reference

### Key principles to always apply:
1. **DDD**: 코드 전에 문서/계획 먼저 (PRD → Tasks → Code)
2. **Coding Safety**: 파일 전체 읽고 나서 수정, 수정 후 빌드 검증
3. **Visual Verification**: 프론트엔드 작업 후 반드시 브라우저 확인 + URL 보고
4. **Commit Format**: `[type]: summary` + NOW/NEXT/BLOCK 구조
5. **Context Continuity**: `.context/CURRENT.md`를 항상 최신 상태로
6. **Atomic Changes**: 한 번에 하나씩, 검증 후 다음 단계
