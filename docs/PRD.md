# PRD — claude-remote

> 작성일: 2026-03-20
> 상태: 설계 확정

## 문제 정의

Claude Code는 Mac 터미널에서만 실행 가능. iPhone에서 작업을 이어가려면 SSH 설정이 복잡하고, Claude 토큰 소진 시 Gemini로 전환하는 흐름이 없다.

## 목표

iPhone Safari에서 Claude Code / Gemini CLI를 자연스럽게 사용할 수 있는 PWA 클라이언트를 만든다.

## 사용자 스토리

1. **원격 접속**: 카페에서 iPhone으로 Mac의 Claude Code 세션에 접속해 코드를 계속 작성한다.
2. **provider 전환**: Claude 토큰이 소진되면 "Gemini로 전환" 버튼 한 번으로 Gemini CLI가 동일 프로젝트를 이어서 작업한다.
3. **다중 세션**: Claude 세션과 Gemini 세션을 탭으로 나눠 동시에 운용한다.

## 기능 범위 (v1)

### 필수 (Must Have)
- [ ] Mac 릴레이 서버 실행 (`bun run server`)
- [ ] iPhone PWA 접속 (Tailscale IP 또는 로컬 IP)
- [ ] Claude Code CLI 세션 생성 + 터미널 I/O
- [ ] Gemini CLI 세션 생성 + 터미널 I/O
- [ ] 세션 중 provider 전환 (Claude ↔ Gemini)
- [ ] iPhone 홈 화면 추가 (PWA manifest)

### 2순위 (Should Have)
- [ ] 연결 QR 코드 (Mac 터미널에 표시)
- [ ] 세션 목록 + 전환
- [ ] 자동 재연결 (네트워크 끊김 복구)

### 나중에 (Could Have)
- [ ] 음성 입력
- [ ] 토큰 사용량 자동 감지 → 전환 제안
- [ ] Android 지원

## 비기능 요구사항

- 초기 연결: 30초 이내
- 터미널 I/O 지연: 100ms 이하 (LAN 환경)
- 모바일 키보드 최적화 (세로/가로 모드)
- Tailscale 환경에서만 접근 가능 (외부 노출 최소화)

## 비고

- tiann/hapi 구조 참조 (Claude + Gemini dual support, WireGuard relay 개념)
- slopus/happy 참조 (E2E 암호화, push notification 구조)
- 직접 구현 — 서드파티 릴레이 서버 의존도 최소화
