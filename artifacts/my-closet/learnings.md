# my-closet learnings

---

category: task-ordering
applied: not-yet
---
## Task 2 전 shadcn 컴포넌트 누락 발견

**상황**: Step 2 의존성 분석 중. plan에 table·skeleton이 필요하다고 명시됐지만 `components/ui/`에 없었음.
**판단**: Task 2 시작 전에 `bunx shadcn@latest add table skeleton`으로 선설치. 중간에 발견했으면 구현 흐름이 끊겼을 것.
**다시 마주칠 가능성**: 높음 — plan에 shadcn 컴포넌트를 나열해도 실제 설치 여부를 별도로 확인하지 않으면 항상 발생.

---

category: tooling
applied: not-yet
---
## Vitest가 e2e/·tests/ Playwright 파일을 픽업하는 문제

**상황**: Task 2 커밋 후 `bun run test` 실행 시 `e2e/smoke.spec.ts`가 Vitest에 픽업되어 실패. 이후 code review fixes 커밋 후 `tests/example.spec.ts`도 동일 문제.
**판단**: `vitest.config.ts`의 exclude에 `"e2e/**"`, `"tests/**"` 추가로 해결. 두 번 반복된 패턴.
**다시 마주칠 가능성**: 높음 — Next.js 프로젝트에서 Playwright와 Vitest를 함께 쓸 때마다 발생. 초기 설정 시 exclude 목록에 포함해야 함.

---

category: code-review
applied: rule  <!-- .claude/rules/ssrf-guard.md -->
---
## SSRF 방어: 서버사이드 URL fetch 전 프로토콜 화이트리스트 필수

**상황**: Step 4, code-reviewer가 C-1으로 SSRF 지적. `new URL(url)` 문법 검사만으로는 `file://`, `gopher://`, RFC1918 주소 등을 막지 못함.
**판단**: `["http:", "https:"].includes(parsed.protocol)` 화이트리스트 추가. 1줄로 막을 수 있어 즉시 수정.
**다시 마주칠 가능성**: 높음 — 사용자 입력 URL을 서버에서 fetch하는 패턴 어디서나 재발.

---

category: code-review
applied: not-yet
---
## LLM 추천 라벨 ↔ 사이즈 테이블 label 불일치 위험

**상황**: Step 4, code-reviewer I-2. Gemini가 "M size"·"Medium" 형태로 반환하면 ProductCard 하이라이트가 작동하지 않음.
**판단**: 프롬프트에 "사이즈 테이블의 label 값 그대로 사용"을 명시하는 것으로 완화. 완전한 해결은 아님(LLM 응답 정규화 로직이 더 견고).
**다시 마주칠 가능성**: 중간 — LLM 출력값을 UI에서 직접 매칭하는 패턴마다 재발 가능.

---

category: code-review
applied: not-yet
---
## MyClosetClient 통합 테스트 부재

**상황**: Step 4, code-reviewer I-4. MyClosetClient의 상태 머신 비정상 경로(추천 실패 → 에러 표시 등)가 단위 테스트에 없음. E2E가 일부 커버하나 빠른 피드백 루프 없음.
**판단**: 이번엔 E2E로 대체. 다음 feature에서 fetch mock 기반 MyClosetClient 통합 테스트 패턴 도입 검토.
**다시 마주칠 가능성**: 높음 — 상태 관리 클라이언트 컴포넌트 공통 패턴.

---

category: code-review
applied: not-yet
---
## Status 단일 열거가 두 라이프사이클 혼재

**상황**: Step 4, code-reviewer S-4. `"idle"|"fetching"|"success"|"error"|"recommending"|"recommended"` 하나로 URL fetch와 추천을 관리하면 `hasResult` 계산이 복잡해지고 에러 처리가 섞임.
**판단**: 이번엔 수정하지 않음(scope 밖). 다음 feature에서 상태 관리가 2개 이상 라이프사이클을 가지면 분리된 status로 설계.
**다시 마주칠 가능성**: 중간 — 단일 페이지에 여러 비동기 흐름이 있을 때 재발.
