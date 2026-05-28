# My Closet — URL 기반 사이즈 추천기

## Problem Statement
쇼핑몰마다 제각각인 사이즈 기준 때문에 실패하는 구매를,
URL 하나로 "이 옷이 내 몸에 맞는가"라는 단 하나의 답으로 바꿀 수 있을까?

## Recommended Direction
URL 입력 → 서버사이드 HTML fetch → Claude API로 제품명·브랜드·사이즈 테이블 파싱
→ 테이블 렌더링 → 내 신체 사이즈(localStorage)와 비교해 Gemini API로 사이즈 추천.

**API 역할 분리:**
- **Claude API** — HTML에서 제품 정보·사이즈 테이블 구조화 파싱
- **Gemini API** — 신체 사이즈 + 사이즈 차트 기반 사이즈 추천

Next.js App Router + 멀티 LLM API 패턴을 실용적 유스케이스로 학습하는
포트폴리오 프로젝트. 완성 후 "옷장 저장" 기능(my-closet의 B 방향)으로 자연 확장 가능.

## Key Assumptions to Validate
- [ ] 무신사·29CM·Amazon 등 주요 몰 HTML을 서버 fetch로 가져올 수 있다
      (봇 차단 여부 즉시 테스트)
- [ ] Claude API가 비정형 사이즈 테이블을 구조화된 JSON으로 변환할 수 있다
      (다른 구조의 3개 쇼핑몰 파싱 테스트)
- [ ] 신체 사이즈 + 사이즈 차트 → 추천이 실제로 유용하다
      (직접 구매 경험과 대조)

## MVP Scope
1. URL 입력 / 리셋
2. 서버 API route로 HTML fetch → Claude API 파싱
3. 제품명·브랜드·사이즈 테이블 렌더링
4. 신체 사이즈 입력창 (로컬 저장)
5. 사이즈 추천 버튼 → Gemini API 추천 결과

## Not Doing (and Why)
- 프롬프트 프리셋 (요약/번역/설명) — 사이즈 추천 컨셉과 무관, 사용자가 제거 결정
- 옷장 저장·관리 — MVP 검증 후 확장, 지금은 scope 불필요
- 브라우저 익스텐션 — 학습 복잡도 불필요하게 높임
- 로그인·계정 — 개인 도구, localStorage로 충분

## Open Questions
- 어떤 쇼핑몰을 1순위로 지원할 것인가? (무신사? Amazon?)
- 봇 차단 시 fallback 전략: 에러 메시지로 끝낼 것인가, puppeteer까지 쓸 것인가?
- 사이즈 추천 시 핏 유형(슬림·레귤러·루즈 선호)도 입력받을 것인가?
