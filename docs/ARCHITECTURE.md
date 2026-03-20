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
| `Terminal.tsx` | xterm.js 터미널 렌더링, 모바일 safe area + 줌 컨트롤 |
| `ProviderSwitch.tsx` | provider 전환 확인 모달 (의도치 않은 전환 방지) |
| `SessionList.tsx` | 세션 목록 + 신규 생성 / Attach |
| `ServerSelect.tsx` | 서버 추가/삭제/선택 + `/health` 상태 인디케이터 |
| `Dashboard.tsx` | CPU/Memory 메트릭 실시간 시각화 (5s 폴링) |
| `useRelay.ts` | WebSocket 연결 + 지수 백오프 자동 재연결 |
| `useServerConfig.ts` | localStorage 서버 설정 영속 |

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
  | { type: 'switch_provider'; provider: 'claude' | 'gemini' | 'shell' }
  | { type: 'new_session'; provider: 'claude' | 'gemini' | 'shell'; cwd: string }
  | { type: 'attach_session'; sessionId: string }

// Server → Client
type ServerMessage =
  | { type: 'output'; data: string }
  | { type: 'provider_switched'; provider: string; sessionId: string }
  | { type: 'session_created'; sessionId: string; provider: string; cwd: string }
  | { type: 'session_attached'; sessionId: string; provider: string; cwd: string }
  | { type: 'handover_detected'; handover: { path: string; label: string; timestamp: number; sessionId?: string } }
  | { type: 'handover_cleared' }
  | { type: 'error'; message: string }
```

## 자동 재연결 플로우

```
1. WebSocket 연결 끊김 감지 (onclose)
2. useRelay: reconnectAttempts++ → delay = min(1000 * 2^n, 30000)ms 대기
3. 새 WebSocket 생성 → 서버 재연결
4. 연결 성공 시 attach_session(lastSessionId) 자동 전송
5. 서버: 세션 메모리에 보존 중이면 session_attached 응답
6. 터미널 버퍼 재출력 없이 그대로 이어서 입력 가능
```

## RC Handover 플로우

```
1. Mac 터미널: `rc` 명령 실행 (bin/rc 스크립트)
2. POST /api/handover { path, label, sessionId }
3. 서버: lastHandover 저장 + 연결된 WS 클라이언트에 브로드캐스트
4. iPhone PWA: handover_detected 수신 → 홈 화면 RC Mode 카드 활성화
5. 사용자: RC Mode 카드 탭 → attach_session 또는 new_session 전송
6. 작업 완료 후 "RETURN TO MAC" → POST /api/handover-back
7. 서버: lastHandover 초기화 + handover_cleared 브로드캐스트
```

## Server Dashboard 메트릭

```
GET /api/metrics → {
  cpu: { loadAvg1, loadAvg5, loadAvg15, cores }
  memory: { total, free, used, usedPercent }
  uptime: seconds
  sessions: count
}
```
- iPhone PWA의 Dashboard.tsx가 5초마다 폴링
- CPU 게이지 (0~4 Load Avg), Memory 원형 SVG 프로그레스

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
