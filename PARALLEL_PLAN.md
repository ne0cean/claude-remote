# Parallel Task Plan: claude-remote v1 기능 완성

> 작성일: 2026-03-20
> 목적: iPhone ↔ Mac 원격 터미널 PWA를 실 사용 가능한 v1으로 완성
> 세션 종료 후 `.context/CURRENT.md` + `SESSIONS.md`에 결과 기록

---

## 현재 상태

| 완료 | 항목 |
|------|------|
| ✅ | 서버 스캐폴딩 (Bun + Hono + node-pty) |
| ✅ | 웹 스캐폴딩 (React + Vite + xterm.js + Tailwind) |
| ✅ | Provider 정의 (Claude / Gemini) |
| ✅ | 세션 생성 + WebSocket I/O |
| ✅ | Provider 전환 (switch_provider) |
| ✅ | 멀티 디바이스 — ServerSelect UI + useServerConfig |
| ✅ | Tailscale IP 감지 + QR 코드 |
| ✅ | 빌드 통과 (server + web) |

---

## 에이전트 구성 (이번 세션)

| 에이전트 | 역할 | 집중 영역 |
|----------|------|-----------|
| Orchestrator (나) | 설계 + 배분 + 구현 | 전체 조율 + 코딩 |

---

## 태스크 목록 (우선순위순)

### Phase 1: 안정성 + 실사용 필수 기능

#### T1. 🔌 WebSocket 자동 재연결
- **목표**: 네트워크 끊김 시 자동 복구 (iPhone 이동 중 필수)
- **파일**: `packages/web/src/hooks/useRelay.ts`
- **명세**:
  - exponential backoff (1s → 2s → 4s → max 30s)
  - 연결 상태 UI 표시 (연결 중 / 재연결 시도 / 오류)
  - 재연결 시 기존 세션 자동 attach
- **완료 기준**:
  - [ ] 서버 재시작해도 자동 복구
  - [ ] 연결 상태 indicator UI
  - [ ] 빌드 통과

#### T2. 📋 세션 목록 + 재연결 UI
- **목표**: 이전 세션 목록 표시 + 선택해서 재연결
- **파일**: `packages/web/src/components/SessionList.tsx` (신규), `App.tsx`
- **명세**:
  - `/api/sessions` 호출 → 활성 세션 목록 표시
  - 세션 클릭 → attach_session WS 메시지
  - 세션별 provider, 생성시간, CWD 표시
- **완료 기준**:
  - [ ] 세션 목록 UI 컴포넌트
  - [ ] attach 동작 확인
  - [ ] 빌드 통과

#### T3. 🎨 모바일 터미널 UX 개선
- **목표**: iPhone 세로/가로 모드에서 터미널이 자연스럽게 동작
- **파일**: `packages/web/src/components/Terminal.tsx`, `index.css`
- **명세**:
  - Safe area inset 처리 (노치, 하단 바)
  - 키보드 올라올 때 터미널 리사이즈
  - 모바일 터치 스크롤 지원
  - 폰트 사이즈 조절 (핀치 줌 or 버튼)
- **완료 기준**:
  - [ ] iPhone Safari에서 키보드 + 터미널 정상 동작
  - [ ] 건드리면 키보드 올라옴
  - [ ] 빌드 통과

### Phase 2: Provider 전환 강화

#### T4. 🔄 Provider 전환 확인 모달
- **목표**: 실수 방지 — "정말 전환하시겠습니까?" 확인
- **파일**: `packages/web/src/components/ProviderSwitch.tsx`
- **명세**:
  - 전환 버튼 탭 → 확인 모달
  - 현재 provider + 전환 대상 표시
  - "현재 세션은 종료됩니다" 경고
- **완료 기준**:
  - [ ] 모달 UI
  - [ ] 확인/취소 동작
  - [ ] 빌드 통과

#### T5. 📊 서버 연결 상태 대시보드 개선
- **목표**: 서버 선택 화면에서 각 서버의 온라인 상태 표시
- **파일**: `packages/web/src/components/ServerSelect.tsx`
- **명세**:
  - 서버 목록 렌더 시 `/health` 핑 → 온라인/오프라인 표시
  - 마지막 접속 서버 자동 선택 + 연결 시도
- **완료 기준**:
  - [ ] 온라인/오프라인 인디케이터 (🟢/🔴)
  - [ ] 빌드 통과

---

## 실행 순서

```
T1 (재연결) ─ 즉시 시작, 가장 중요
    ↓
T2 (세션 목록) ─ T1 완료 후 (attach 로직 공유)
    ↓
T3 (모바일 UX) ─ T2 완료 후 (UI 통합)
    ↓
T4 (전환 모달) + T5 (서버 상태) ─ 병렬 가능
```

---

## 시작 조건

- **T1**: 즉시 시작 가능 — `useRelay.ts` 수정
- **빌드 검증**: 각 태스크 완료 후 `bun run build`
