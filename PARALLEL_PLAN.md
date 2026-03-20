# Parallel Task Plan: [프로젝트명]

> 작성일: YYYY-MM-DD
> 목적: [이번 병렬 작업의 목표 한 줄 요약]
> 세션 종료 후 `.context/CURRENT.md` + `SESSIONS.md`에 결과 기록

---

## 에이전트 구성

| 에이전트 | 모델 | 역할 | 집중 영역 |
|----------|------|------|-----------|
| Leader | Claude Sonnet | 설계 / 배분 / 통합 | 전체 조율 |
| Worker A | Claude Sonnet | 아키텍처 / 신규 기능 | 시스템 설계, 복잡한 로직 |
| Worker B | Gemini Pro | 최적화 / 클린업 | 코드 품질, 성능, 배포 |
| Worker C | Claude Haiku | 리서치 / 문서 | 조사, 정리 (선택) |

---

## 파일 소유권 선언

> ⚠️ 같은 파일이 두 에이전트에 등장하면 → 직렬 처리 블록으로 이동

### Worker A 파일 소유권
- `path/to/file-a.js`  ← 신규 생성
- `path/to/file-b.jsx` ← 수정

### Worker B 파일 소유권
- `path/to/file-c.js`  ← 수정
- `path/to/file-d.jsx` ← 수정

---

## 태스크 목록

### Worker A

**Focus**: [집중 영역]

1. **[태스크유형] 태스크명**
   - 목표: [한 문장]
   - 기술 명세: [엔드포인트/컴포넌트/함수명, 입출력]
   - 완료 기준(DoD):
     - [ ] [검증 조건 1]
     - [ ] [검증 조건 2]
     - [ ] 빌드 통과
   - 의존: [없음 / 태스크 ID]
   - 산출물: [파일명]

2. **[태스크유형] 태스크명**
   - ...

### Worker B

**Focus**: [집중 영역]

1. **[태스크유형] 태스크명**
   - 목표: [한 문장]
   - 기술 명세: ...
   - 완료 기준(DoD):
     - [ ] ...
   - 의존: [없음 / 태스크 ID]
   - 산출물: [파일명]

---

## 의존성 그래프

```
[T1: 선행 태스크] (Worker A)
    ├──→ [T2: 후행 A] (Worker A)  blocked-by: T1
    └──→ [T3: 후행 B] (Worker B)  blocked-by: T1  ← 병렬 가능
              ↓
         [T4: 통합] (Leader)       blocked-by: T2, T3
```

---

## 직렬 처리 블록

<!-- 파일 소유권이 겹치거나 의존성이 있는 태스크 -->

1. Worker A가 `[파일명]` 수정 완료 → CURRENT.md 갱신
2. Worker B가 CURRENT.md 확인 후 `[파일명]` 기반 작업 착수

---

## ClawTeam 등록 스크립트 (선택)

```bash
# 팀 생성
clawteam team spawn-team {team-name} -n leader

# 태스크 등록
T1=$(clawteam --json task create {team-name} "[T1 설명]" -o worker-a | jq -r '.id')
T2=$(clawteam --json task create {team-name} "[T2 설명]" -o worker-a --blocked-by $T1 | jq -r '.id')
T3=$(clawteam --json task create {team-name} "[T3 설명]" -o worker-b --blocked-by $T1 | jq -r '.id')
clawteam task create {team-name} "[T4 통합]" -o leader --blocked-by $T2,$T3

# 워커 스폰
clawteam spawn --team {team-name} --agent-name worker-a --task "[T1 설명 + 기술 명세]"
clawteam spawn --team {team-name} --agent-name worker-b --task "[T3 설명 + 기술 명세]"

# 모니터링
clawteam board attach {team-name}
```

---

## 시작 조건

- **Worker A** 첫 태스크: [태스크명] — 즉시 시작 가능
- **Worker B** 첫 태스크: [태스크명] — [즉시 / T1 완료 후] 시작
- **병렬 시작 가능**: Yes / No

---

## 레트로스펙티브 (완료 후 기록)

**잘 된 것**:
-

**개선점**:
-

**다음 번에 바꿀 것**:
-
