# claude-remote

iPhone에서 Claude Code + Gemini CLI를 원격 조작하는 PWA 모바일 클라이언트.

Claude 토큰 소진 시 Gemini로 전환해 작업을 이어나갈 수 있다.

## 개념

```
iPhone (PWA/Safari)
    └─ WebSocket over Tailscale/LAN
         └─ Mac relay server (Bun + Hono)
              ├─ Claude Code CLI  ← 기본
              └─ Gemini CLI       ← 토큰 소진 시 전환
```

## 구조

```
packages/
  server/src/
    index.ts           — Bun + Hono WebSocket relay + REST API
    session.ts         — PTY 세션 관리 (node-pty)
    providers/         — Claude / Gemini / Shell 프로바이더
  web/src/
    App.tsx            — 메인 라우터 (Home → Terminal / GitHub / NewProject / Dashboard)
    components/
      Terminal.tsx       — xterm.js + 모바일 입력바 + QuickCommand + onReady
      NewProject.tsx     — AI 이름 제안 → GitHub 레포 + 로컬 폴더 생성
      ProviderSwitch.tsx — Claude ↔ Gemini 전환 (확인 모달)
      ServerSelect.tsx   — 서버 목록 관리 + Health Check
      Dashboard.tsx      — 서버 메트릭 실시간 시각화
    hooks/
      useRelay.ts        — WebSocket 연결 (자동 재연결 + 지수 백오프)
      useServerConfig.ts — localStorage 서버 설정 영속
```

## 빠른 시작

```bash
# 설치
bun install

# 환경 설정
cp packages/server/.env.example packages/server/.env
# .env에서 GITHUB_TOKEN 등 설정

# 개발 (서버 + 웹 동시)
bun run dev

# 또는 개별 실행
bun run server   # Mac 릴레이 서버 (:3001)
bun run web      # PWA 개발 서버 (:5188)

# 빌드
bun run build
```

## 주요 기능

### 원격 터미널
- **Claude Code + Gemini CLI** 원격 조작 (PTY 기반)
- **세션 자동 재연결**: 네트워크 끊김 시 지수 백오프 적용 자동 복구
- **세션 목록 & 재부착**: 기존 세션 목록을 불러와 중단 지점에서 재개
- **Provider 전환**: 세션 중 한 번의 탭으로 Claude ↔ Gemini 즉시 전환

### 모바일 UX
- **iPhone PWA 최적화**: 홈 화면 추가, safe area inset, 모바일 터치 터미널
- **모바일 입력바**: QuickCommand 칩 + 텍스트 입력 + 폰트 줌 (A-/A+)
- **터미널 Ready 패턴**: 터미널 초기화 완료 후 세션 생성 (레이스 컨디션 방지)

### GitHub 연동
- **레포 브라우저**: public + private 레포 조회 (페이지네이션, 5분 캐시)
- **신규 프로젝트**: AI 이름 제안 (`claude -p`) → GitHub 레포 생성 → 로컬 폴더 + CLAUDE.md 자동 생성
- **localPath 감지**: 로컬에 클론된 레포 자동 감지 + 바로 세션 시작

### 인프라
- **Health Check**: 서버별 `/health` 자동 폴링 + 상태 인디케이터
- **Server Dashboard**: CPU, Memory, 세션 수, 업타임 실시간 시각화
- **멀티 디바이스**: Tailscale IP 자동 감지 + QR 코드 연결
- **RC Handover**: Mac에서 `rc` 명령으로 프로젝트를 iPhone으로 즉시 전달

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |
| GET | `/api/info` | 서버 정보 (label, platform, sessions) |
| GET | `/api/metrics` | CPU/Memory/Uptime 메트릭 |
| GET | `/api/sessions` | 활성 세션 목록 |
| GET | `/api/github/repos` | GitHub 레포 목록 (token 또는 ?username=) |
| POST | `/api/suggest-names` | AI 프로젝트 이름 제안 |
| POST | `/api/new-project` | 신규 프로젝트 생성 (GitHub + local) |
| POST | `/api/config/github-token` | GitHub 토큰 런타임 설정 |
| POST | `/api/handover` | RC 핸드오버 시작 |
| POST | `/api/handover-back` | RC 핸드오버 반환 |

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 3001 | 서버 포트 |
| `WEB_PORT` | 5188 | 웹 클라이언트 포트 (QR 코드용) |
| `MACHINE_LABEL` | hostname | 서버 선택 화면 레이블 |
| `GITHUB_TOKEN` | — | GitHub Personal Access Token |
| `PROJECTS_BASE` | ~/Desktop/Projects | 프로젝트 기본 경로 |

## 영감

- [tiann/hapi](https://github.com/tiann/hapi) — Claude + Gemini dual support, WireGuard relay
- [slopus/happy](https://github.com/slopus/happy) — E2E 암호화, 푸시 알림
