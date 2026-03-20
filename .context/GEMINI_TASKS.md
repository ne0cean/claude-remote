# GEMINI_TASKS — claude-remote

> A-Team 프로토콜 (`vibe.md`)에 따른 태스크 분류
> **Gemini 2.5 Pro / Flash 배정 가능 태스크**

## 📝 문서화 (Documentation)
- [ ] `README.md` 최종 스펙 및 구조 업데이트 (reconnection, session list 추가)
- [ ] `memory/MEMORY.md` 핵심 파일 및 흐름 최우선 가시화
- [ ] `.context/CURRENT.md` 작업 완료 내역 및 다음 할 일 동기화
- [ ] `docs/ARCHITECTURE.md` Provider 전환 및 재연결 상세 시퀀스 다이어그램 업데이트

## 🎨 스타일 및 단순 UI (CSS/Simple UI)
- [x] `packages/web/src/components/ServerSelect.tsx`: 서버별 `/health` 상태 표시 (🟢/🔴) — **DONE**
- [x] `packages/web/src/components/ProviderSwitch.tsx`: 전환 전 재확인 모달 UI (Confirm Box) — **DONE**
- [x] `packages/web/src/index.css`: 모바일 최적화 스펙 (Z-index, Safe Insets) 미세 조정 — **DONE**

## 🔧 설정 및 테스트 (Config/Test)
- [ ] `package.json` 버전 및 메타데이터 정돈
- [ ] `packages/server/.env.example` 생성 및 필요 환경변수 (MACHINE_LABEL 등) 정리
- [ ] `vitest` 설정 및 유틸 함수 단위 테스트 스켈레톤 작성

---

**이외의 "Opus 태스크" (Claude Sonnet/Opus):**
- [x] 모바일 가로/세로 전환 시 터미널 `pty.resize` 정밀 조율 (T3) — **DONE**
- [x] Provider 전환 시 PTY 세션 detach/attach 안전성 확보 — **DONE**
- [ ] 실제 Tailscale 연동 E2E 테스트 및 디버깅
