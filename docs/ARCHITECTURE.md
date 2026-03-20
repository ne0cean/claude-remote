# Architecture — claude-remote

## 시스템 개요

```
┌─────────────────────────────────────────────┐
│                  iPhone                      │
│  ┌─────────────────────────────────────┐    │
│  │         PWA (Safari)                │    │
│  │  ┌──────────┐  ┌────────────────┐  │    │
│  │  │ Terminal │  │ProviderSwitch  │  │    │
│  │  │ (xterm)  │  │ Claude/Gemini  │  │    │
│  │  └──────────┘  └────────────────┘  │    │
│  └─────────────┬───────────────────────┘    │
└────────────────│────────────────────────────┘
                 │ WSS (암호화)
┌────────────────┴────────────────────────────┐
│                  Mac                         │
│  ┌──────────────────────────────────────┐   │
│  │         Relay Server (Bun)           │   │
│  │                                      │   │
│  │  SessionManager                      │   │
│  │  ├─ Session A → claude (pty)         │   │
│  │  └─ Session B → gemini (pty)         │   │
│  │                                      │   │
│  │  ProviderRegistry                    │   │
│  │  ├─ ClaudeProvider (claude CLI)      │   │
│  │  └─ GeminiProvider (gemini CLI)      │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## 핵심 컴포넌트

### Server (packages/server)

| 모듈 | 역할 |
|------|------|
| `index.ts` | Hono HTTP + WebSocket 서버 진입점 |
| `relay.ts` | WebSocket 연결 → PTY 세션 바인딩 |
| `session.ts` | 세션 생성/조회/종료, provider 전환 |
| `providers/index.ts` | Provider 인터페이스 정의 |
| `providers/claude.ts` | `claude` CLI를 node-pty로 spawn |
| `providers/gemini.ts` | `gemini` CLI를 node-pty로 spawn |

### Web (packages/web)

| 컴포넌트 | 역할 |
|----------|------|
| `Terminal.tsx` | xterm.js 터미널 렌더링 |
| `ProviderBadge.tsx` | 현재 provider 표시 (Claude/Gemini) |
| `ProviderSwitch.tsx` | provider 전환 모달 |
| `SessionList.tsx` | 세션 목록 + 신규 생성 |
| `useRelay.ts` | WebSocket 연결 관리 |
| `useProvider.ts` | provider 상태 + 전환 로직 |
| `useTerminal.ts` | xterm 인스턴스 관리 |

## Provider 전환 플로우

```
1. 사용자: "Gemini로 전환" 버튼 탭
2. ProviderSwitch 모달 → 확인
3. useProvider.switchProvider('gemini') 호출
4. WS 메시지: { type: 'switch_provider', provider: 'gemini' }
5. Server SessionManager:
   a. 현재 Claude PTY 세션 일시정지 (kill signal 없이 detach)
   b. Gemini PTY 세션 spawn, 동일 CWD 사용
   c. 응답: { type: 'provider_switched', provider: 'gemini' }
6. iPhone 터미널: Gemini CLI 프롬프트로 전환
```

## 통신 프로토콜

### WebSocket 메시지 타입

```typescript
// Client → Server
type ClientMessage =
  | { type: 'input'; data: string }
  | { type: 'resize'; cols: number; rows: number }
  | { type: 'switch_provider'; provider: 'claude' | 'gemini' }
  | { type: 'new_session'; provider: 'claude' | 'gemini'; cwd: string }
  | { type: 'attach_session'; sessionId: string }

// Server → Client
type ServerMessage =
  | { type: 'output'; data: string }
  | { type: 'provider_switched'; provider: string }
  | { type: 'session_created'; sessionId: string; provider: string }
  | { type: 'error'; message: string }
```

## 보안

- Mac에서 `https` + 자체서명 인증서 사용 (mkcert)
- 랜덤 1회용 연결 토큰 (QR 코드로 표시)
- Tailscale 환경에서만 노출 권장 (외부 인터넷 노출 불필요)

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| Server runtime | Bun | 빠른 시작, TS 네이티브 지원 |
| Server framework | Hono | 경량, WS 지원 |
| PTY 관리 | node-pty | Claude/Gemini CLI 대화형 실행 |
| Web bundler | Vite | 빠른 HMR, PWA 플러그인 |
| UI | React + Tailwind | 모바일 터치 최적화 |
| Terminal | xterm.js + xterm-addon-fit | 검증된 브라우저 터미널 |
| PWA | vite-plugin-pwa | 홈 화면 추가, 오프라인 지원 |
