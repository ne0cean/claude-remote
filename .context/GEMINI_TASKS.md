# GEMINI_TASKS — claude-remote

> A-Team 프로토콜 (`vibe.md`)에 따른 태스크 분류
> 최종 갱신: 2026-03-21

## 📝 문서화 (Documentation)
- [ ] `README.md` 최종 스펙 및 구조 업데이트 (AI 이름 제안, pendingSession, reconnection 등)
- [ ] `memory/MEMORY.md` 핵심 파일 및 흐름 최우선 가시화
- [ ] `docs/ARCHITECTURE.md` Provider 전환 및 재연결 상세 시퀀스 다이어그램 업데이트

## 🎨 스타일 및 단순 UI (CSS/Simple UI)
- [x] `packages/web/src/components/ServerSelect.tsx`: 서버별 `/health` 상태 표시 (🟢/🔴) — **DONE**
- [x] `packages/web/src/components/ProviderSwitch.tsx`: 전환 전 재확인 모달 UI — **DONE**
- [x] `packages/web/src/index.css`: 모바일 최적화 스펙 미세 조정 — **DONE**

## 🔧 설정 및 테스트 (Config/Test)
- [ ] `package.json` 버전 및 메타데이터 정돈
- [x] `packages/server/.env.example` 생성 — GITHUB_TOKEN 포함 — **DONE**
- [x] `vitest` 설정 및 유틸 함수 단위 테스트 스켈레톤 작성 — **DONE**

---

**이외의 "Opus 태스크" (Claude Sonnet/Opus):**
- [x] 모바일 가로/세로 전환 시 터미널 `pty.resize` 정밀 조율 — **DONE**
- [x] Provider 전환 시 PTY 세션 detach/attach 안전성 확보 — **DONE**
- [x] pre-bash.sh bash v3 호환 수정 — **DONE**
- [x] AI 이름 제안 (claude -p 연동 + 한글 fallback) — **DONE**
- [x] GitHub repos public+private 페이지네이션 — **DONE**
- [x] 터미널 Ready 후 세션 생성 (pendingSessionRef) — **DONE**
- [ ] **Tailscale 실 접속 E2E 테스트** — iPhone Safari 연동 (BLOCKER: Tailscale 미설치)
- [ ] **GITHUB_TOKEN 권한 수정** → Fine-grained token Administration 권한 추가
