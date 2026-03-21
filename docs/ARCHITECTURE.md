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
| `index.ts` | Hono HTTP + WebSocket 서버 + GitHub API + AI 이름 제안 |
| `session.ts` | PTY Worker 기반 세션 생성/조회/종료, provider 전환 (async) |
| `pty-worker.mjs` | Node 자식 프로세스 — node-pty 실행 (Bun 이벤트 루프 비호환 우회) |
| `providers/index.ts` | Provider 인터페이스 정의 (claude, gemini, shell) |

### Web (packages/web)

| 컴포넌트 | 역할 |
|----------|------|
| `Terminal.tsx` | xterm.js 터미널 + 모바일 입력바 + QuickCommand + onReady 콜백 |
| `NewProject.tsx` | 3단계 wizard (아이디어 → AI 이름 제안 → GitHub+로컬 생성) |
| `ProviderSwitch.tsx` | provider 전환 확인 모달 (의도치 않은 전환 방지) |
| `ServerSelect.tsx` | 서버 추가/삭제/선택 + `/health` 상태 인디케이터 |
| `Dashboard.tsx` | CPU/Memory 메트릭 실시간 시각화 (5s 폴링) |
| `useRelay.ts` | WebSocket 연결 + 지수 백오프 자동 재연결 |
| `useServerConfig.ts` | localStorage 서버 설정 영속 |

## PTY Worker 아키텍처

```
Bun 메인 프로세스 (index.ts + session.ts)
    │ JSON-line IPC (stdin/stdout)
    ▼
Node 자식 프로세스 (pty-worker.mjs)
    │ node-pty (네이티브 모듈)
    ├─ PTY A → claude CLI
    ├─ PTY B → gemini CLI
    └─ PTY C → shell
```

Bun의 이벤트 루프가 node-pty의 onData 이벤트를 지원하지 않아,
PTY 관리를 Node 자식 프로세스로 위임. JSON 라인 프로토콜로 통신:

| 방향 | 메시지 타입 | 용도 |
|------|------------|------|
| → Worker | `spawn` | PTY 세션 생성 (command, args, cols, rows, cwd, env) |
| → Worker | `write` | PTY 입력 전달 |
| → Worker | `resize` | 터미널 크기 변경 |
| → Worker | `kill` | PTY 종료 |
| ← Worker | `spawned` | PTY 생성 완료 (pid 반환) |
| ← Worker | `data` | PTY 출력 데이터 |
| ← Worker | `exit` | PTY 종료 (exitCode, signal) |
| ← Worker | `error` | 에러 메시지 |

## Provider 전환 플로우

```
1. 사용자: "Gemini로 전환" 버튼 탭
2. ProviderSwitch 모달 → 확인
3. WS 메시지: { type: 'switch_provider', provider: 'gemini' }
4. Server:
   a. 현재 PTY 세션 kill (Worker에 kill 명령)
   b. 새 PTY 세션 spawn (동일 CWD, 새 provider)
   c. 응답: { type: 'provider_switched', provider: 'gemini', sessionId }
5. iPhone 터미널: Gemini CLI 프롬프트로 전환
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

## 터미널 Ready 패턴 (pendingSessionRef)

```
1. 사용자: 세션 시작 버튼 탭
2. App.tsx: pendingSessionRef에 세션 설정 저장 (provider, cwd, attachId)
3. App.tsx: view를 'terminal'로 전환 → Terminal 컴포넌트 마운트
4. Terminal.tsx: xterm 초기화 완료 → onReady() 콜백 호출
5. App.tsx handleTerminalReady:
   a. pendingSessionRef.current 읽고 null로 초기화
   b. attachId 있으면 → attachSession(attachId)
   c. 없으면 → newSession(cwd, provider)
   d. autoVibe 플래그 있으면 → 1.5초 후 '/vibe\r' 자동 입력
6. WS → 서버: new_session 또는 attach_session
7. 서버: PTY Worker를 통해 세션 생성 → session_created 응답
```

이 패턴으로 터미널이 초기화되기 전에 서버에서 출력이 도착하는 레이스 컨디션을 해소.

## AI 이름 제안 플로우 (New Project)

```
1. 사용자: 프로젝트 아이디어 입력 (한글/영어)
2. POST /api/suggest-names { description }
3. 서버:
   a. claude -p 실행 (CLAUDECODE env 제거하여 중첩 차단 우회)
   b. 15초 타임아웃 (Promise.race)
   c. JSON 배열 파싱 → 3개 이름 반환
   d. 실패 시: koreanToKeywords() 한글→영문 매핑 fallback
4. 사용자: 이름 선택 또는 직접 입력
5. POST /api/new-project { name, description, private }
6. 서버:
   a. Step 1: GitHub 레포 생성 + git clone (토큰 있을 때)
   b. Step 2: 로컬 폴더 생성 + git init (clone 실패 시)
   c. Step 3: CLAUDE.md + .context/CURRENT.md 템플릿 생성
   d. 각 step 상태 반환 { steps, githubError, hasToken }
```

## 보안

- Tailscale 환경에서만 노출 권장 (외부 인터넷 노출 불필요)
- QR 코드로 접속 URL 간편 공유
- GITHUB_TOKEN 런타임 설정 가능 (POST /api/config/github-token)

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| Server runtime | Bun | 빠른 시작, TS 네이티브 지원 |
| Server framework | Hono | 경량, WS 지원 |
| PTY 관리 | node-pty (via Node Worker) | Bun 이벤트 루프 비호환 우회 |
| Web bundler | Vite | 빠른 HMR, PWA 플러그인 |
| UI | React + CSS | 모바일 터치 최적화 |
| Terminal | xterm.js + xterm-addon-fit | 검증된 브라우저 터미널 |
| PWA | vite-plugin-pwa | 홈 화면 추가, 오프라인 지원 |
