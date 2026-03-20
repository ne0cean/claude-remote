# claude-remote — Claude Code Governance

## 세션 시작 시 반드시 읽기
1. `memory/MEMORY.md` — 프로젝트 요약 + 툴킷 핵심 원칙
2. `.context/CURRENT.md` — 현재 상태/진행 작업/다음 할 일

## 핵심 원칙
- **DDD**: 코드 전에 문서/계획 먼저
- **Coding Safety**: 파일 전체 읽고 수정, 수정 후 `npm run build` 검증
- **Visual Verification**: 프론트 작업 후 브라우저 확인 + URL 보고
- **Commit Format**: `[type]: 요약` + NOW/NEXT/BLOCK 구조

## 거버넌스 파일
- `.agent/rules/` — 코딩 안전, 동기화, 자율 실행 규칙
- `.agent/workflows/` — 세션 시작/종료 워크플로우

## A-Team 에이전트 (언제 쓸까?)

| 상황 | 에이전트 호출 방법 |
|------|-----------------|
| 복잡한 멀티파일 작업 | "이 작업을 A-Team으로 처리해줘" → orchestrator |
| 리서치/조사만 필요 | "researcher에게 맡겨줘" |
| 설계/아키텍처 결정 | "architect한테 물어봐줘" |
| 코드 리뷰/보안 검토 | "reviewer로 검증해줘" |
| 단순 작업 | 에이전트 불필요 — 직접 진행 |

### 에이전트 구성
- **orchestrator** — 멀티에이전트 총괄, PARALLEL_PLAN.md 작성 + governance 주입
- **researcher** — 리서치 전문 (Haiku, 비용 효율)
- **coder** — 구현/수정 전문 (Sonnet)
- **reviewer** — 품질 검증 + 보안 감사 (Sonnet)
- **architect** — 설계/아키텍처 (Opus)

## 프로젝트 구조
[프로젝트 구조 설명 — 직접 채우기]

## 빌드 명령
```bash
npm run build
npm run test
```
