# CURRENT — claude-remote

이 문서는 프로젝트의 현재 상태를 나타내는 살아있는 문서입니다.
세션 시작 시 가장 먼저 읽고, 세션 종료 시 반드시 최신화하세요.

---

## Goal
iPhone에서 Claude Code + Gemini CLI 원격 조작 PWA. Claude 토큰 소진 시 Gemini로 전환.
Mac(집) / Windows(회사) / iPhone(외출) 3기기 연속 개발 환경.

## Status
**멀티 디바이스 지원 완료 / 빌드 통과 / Tailscale 실 접속 테스트 대기**

---

## Access URLs
- Local: http://localhost:5173 (web PWA)
- Server: ws://localhost:3001 (relay server)

---

## 완성된 구조

```
packages/
  server/src/
    index.ts           — Bun + Hono WebSocket + Tailscale IP 감지 + QR
    session.ts         — PTY 세션 + .session-state.json 파일 저장
    providers/index.ts — Claude/Gemini provider 정의
  web/src/
    App.tsx            — 서버선택 → 세션시작 → 터미널 3단계 플로우
    components/
      Terminal.tsx       — xterm.js 터미널
      ProviderSwitch.tsx — provider 전환 UI
      ServerSelect.tsx   — 서버 목록 관리 (추가/삭제/선택)
    hooks/
      useRelay.ts        — WebSocket 연결 훅
      useServerConfig.ts — localStorage 서버 설정 영속
```

---

## In Progress Files
- (없음)

---

## Last Completions
- **T3: 모바일 터미널 UX 개선** (2026-03-21)
  - Safe area inset 적용 및 100dvh 대응
  - 플로팅 글래스모피즘 줌 컨트롤 추가
  - ResizeObserver 보정 및 지연 로딩 처리
- **T4: Provider 전환 확인 모달 구현** (2026-03-21)
  - 의도치 않은 전환 방지를 위한 디자인된 모달 추가
  - 전환 시 세션 재생성 안내 문구 포함
- **T5: 인프라 노드 Health Check 구현** (2026-03-21)
  - `/health` 엔드포인트 자동 폴링 (10s 주기)
  - 🟢/🔴/🟡 상태 인디케이터 및 애니메이션 적용
- **T1: WebSocket 자동 재연결 구현** (2026-03-20)
- **T2: 세션 목록 & 재연결 UI 구현** (2026-03-20)

---

## Next Tasks

1. [ ] **Tailscale 실 접속 테스트** — iPhone Safari 연동 확인 (사용자 환경 필요)
2. [ ] **Documentation Sync** — ARCHITECTURE.md 상세 시퀀스 다이어그램 업데이트
3. [ ] **Server Dashboard 확장** — CPU/Memory 메트릭 실시간 시각화

---

## Blockers
- Tailscale 미설치 상태 → 외출 중 iPhone 접속 불가 (설치 필요)
  → https://tailscale.com/download (Mac, Windows, iPhone 모두 설치)
