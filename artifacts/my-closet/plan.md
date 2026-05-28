# My Closet 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| URL 파싱 방식 | 서버 fetch + Claude API | 대상 쇼핑몰(카페24 등)이 SSR — headless browser 불필요 |
| 페이지 구조 | 단일 페이지 (`app/page.tsx`) | 모든 상태가 URL 하나에서 흐름으로 이어짐 |
| 클라이언트 경계 | `components/my-closet/MyClosetClient.tsx` | URL 입력·로딩·추천 등 전 흐름이 클라이언트 state — page.tsx는 Server Component, 내부 interactive 영역은 `'use client'` |
| 신체 사이즈 저장 | localStorage (versioned key `bodySize:v1`) | 로그인 없는 개인 도구 — 서버 저장 불필요 |
| LLM 파싱 | Claude API (`claude-sonnet-4-6`) | HTML → 구조화 JSON 추출 |
| LLM 추천 | Gemini API (`gemini-2.0-flash`) | 제품 설명·사이즈 테이블·신체 사이즈 종합 추천 |

## 인프라 리소스

| 리소스 | 유형 | 선언 위치 | 생성 Task |
|---|---|---|---|
| ANTHROPIC_API_KEY | Env var | `.env.local` | Task 1 |
| GEMINI_API_KEY | Env var | `.env.local` | Task 1 |

## 데이터 모델

### BodySize
- `height?: number` (cm)
- `weight?: number` (kg)
- `chest?: number` (cm)
- `waist?: number` (cm)
- `shoeSize?: number` (mm)

### SizeRow
- `label: string` (예: "M")
- `measurements: Record<string, number>` (예: `{ 가슴: 106, 어깨: 48, 총장: 67 }`)

### ProductInfo
- `brand: string`
- `name: string`
- `description: string`
- `sizeTable: { headers: string[]; rows: SizeRow[] } | null`

### Recommendation
- `size: string`
- `reason: string`

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| next-best-practices | 2, 4 | RSC boundary, Route Handler 규칙 |
| shadcn | 2, 3, 4 | Button, Input, Table, Card, Skeleton, FieldGroup·Field |
| vercel-react-best-practices | 1 | localStorage versioned key, try-catch 패턴 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `.env.local` | New | 1 |
| `types/index.ts` | New | 1 |
| `hooks/useBodySize.ts` | New | 1 |
| `hooks/useBodySize.test.ts` | New | 1 |
| `app/api/parse/route.ts` | New | 2 |
| `components/my-closet/UrlInput.tsx` | New | 2 |
| `components/my-closet/UrlInput.test.tsx` | New | 2 |
| `components/my-closet/ProductCard.tsx` | New | 2 |
| `components/my-closet/ProductCard.test.tsx` | New | 2 |
| `components/my-closet/MyClosetClient.tsx` | New | 2 |
| `app/page.tsx` | New | 2 |
| `components/my-closet/BodySizeForm.tsx` | New | 3 |
| `components/my-closet/BodySizeForm.test.tsx` | New | 3 |
| `app/api/recommend/route.ts` | New | 4 |
| `components/my-closet/RecommendationResult.tsx` | New | 4 |
| `components/my-closet/RecommendationResult.test.tsx` | New | 4 |
| `e2e/my-closet.spec.ts` | New | 5 |

## Tasks

### Task 1: 타입 정의 + 신체 사이즈 localStorage hook

- **담당 시나리오**: Scenario 5 (storage — 저장·복원 hook)
- **크기**: S (2 파일 + test)
- **의존성**: None
- **참조**:
  - vercel-react-best-practices — `client-localstorage-schema` (versioned key, try-catch)
- **구현 대상**:
  - `types/index.ts` — `BodySize`, `SizeRow`, `ProductInfo`, `Recommendation` 타입 정의
  - `hooks/useBodySize.ts` — `bodySize:v1` 키로 저장·불러오기, `useState` + `useEffect` 패턴
  - `hooks/useBodySize.test.ts`
  - `.env.local` — `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` 플레이스홀더
- **수용 기준**:
  - [ ] 키·몸무게·가슴·허리·신발 사이즈 값을 저장하면 `localStorage['bodySize:v1']`에 JSON으로 기록된다
  - [ ] 페이지 재로드(jsdom 재생성) 후 `useBodySize()`가 저장된 값을 반환한다
  - [ ] 가슴·허리·신발 사이즈만 저장해도 페이지 재로드 후 해당 값이 복원된다
  - [ ] `localStorage`를 사용할 수 없는 환경(예: 예외 throw)에서도 에러 없이 `null`을 반환한다
- **검증**: `bun run test -- useBodySize`

---

### Task 2: URL 입력 → 제품 정보 표시

- **담당 시나리오**: Scenario 1 (full), Scenario 2 (full), Scenario 3 (full)
- **크기**: M (5 파일 + tests)
- **의존성**: Task 1 (타입)
- **참조**:
  - next-best-practices — `rsc-boundaries` (Client Component 선언), `route-handlers`
  - shadcn — Button, Input, Table, Card, Skeleton (`bunx --bun shadcn@latest add` 로 설치)
  - Claude API 문서: `https://docs.anthropic.com/en/api/messages` (응답 JSON 파싱 구조)
- **구현 대상**:
  - `app/api/parse/route.ts` — `POST /api/parse` body: `{ url }` → fetch HTML → Claude API → `ProductInfo` JSON 반환
  - `components/my-closet/UrlInput.tsx` — URL 입력창 + 조회/지우기 버튼 (`'use client'`)
  - `components/my-closet/UrlInput.test.tsx`
  - `components/my-closet/ProductCard.tsx` — 브랜드·제품명·설명·사이즈 테이블·추천 버튼 표시 (`'use client'`)
  - `components/my-closet/ProductCard.test.tsx`
  - `components/my-closet/MyClosetClient.tsx` — 전체 상태 관리 (`url`, `productInfo`, `status`: idle/loading/success/error) (`'use client'`)
  - `app/page.tsx` — Server Component, `MyClosetClient` 렌더링
- **수용 기준**:
  - [ ] URL 미입력 초기 상태 → 셔츠 아이콘과 안내 문구로 구성된 빈 상태 UI가 표시된다
  - [ ] URL 조회 시작 → Skeleton(로딩 인디케이터)이 화면에 표시되고 URL 입력창이 비활성화된다
  - [ ] URL 조회 완료 → Skeleton이 사라진다
  - [ ] 사이즈 테이블 있는 URL 조회 완료 → 브랜드명이 화면에 표시된다
  - [ ] 사이즈 테이블 있는 URL 조회 완료 → 제품명이 화면에 표시된다
  - [ ] 사이즈 테이블 있는 URL 조회 완료 → 제품 설명이 제품명과 사이즈 테이블 사이에 표시된다
  - [ ] 사이즈 테이블 있는 URL 조회 완료 → 사이즈 라벨과 실측치가 담긴 테이블이 표시된다
  - [ ] 사이즈 테이블 있는 URL 조회 완료 → "사이즈 추천" 버튼이 보인다
  - [ ] 사이즈 테이블 없는 URL 조회 완료 → 제품명·브랜드·설명이 표시되고 "사이즈 정보를 찾을 수 없습니다" 문구가 표시된다
  - [ ] 사이즈 테이블 없는 URL 조회 완료 → "사이즈 추천" 버튼이 비활성화된다
  - [ ] 잘못된 형식의 URL 조회 → 에러 메시지가 표시되고 제품 정보는 표시되지 않는다
  - [ ] fetch 실패(4xx·5xx 응답) → 에러 메시지가 표시되고 제품 정보는 표시되지 않는다
  - [ ] 지우기 버튼 클릭 → URL 입력창이 비워지고 제품 정보가 사라진다
- **검증**:
  - `bun run test -- UrlInput`
  - `bun run test -- ProductCard`
  - Browser MCP — `https://tannat.kr/product/detail.html?product_no=2066&cate_no=204&display_group=1` 조회 후 브랜드·제품명·설명·사이즈 테이블 렌더링 확인, 스크린샷 `artifacts/my-closet/evidence/task-2.png` 저장

---

### Checkpoint: Tasks 1–2 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] URL 입력 → 로딩 → 제품 정보 표시가 브라우저에서 end-to-end로 동작

---

### Task 3: 신체 사이즈 입력 패널

- **담당 시나리오**: Scenario 4 (full), Scenario 5 (form — 폼 닫힘·UI 복원)
- **크기**: S (2 파일 + test)
- **의존성**: Task 1 (`useBodySize`), Task 2 (`MyClosetClient` — 버튼 클릭 시 패널 표시)
- **참조**:
  - shadcn — FieldGroup, Field, FieldLabel, Input, Button
  - shadcn — `rules/forms.md` (FieldGroup + Field 패턴, data-invalid)
- **구현 대상**:
  - `components/my-closet/BodySizeForm.tsx` — 키·몸무게·가슴·허리·신발 사이즈 입력 필드(모두 선택), 하나 이상 입력 시 저장 버튼 활성 (`'use client'`)
  - `components/my-closet/BodySizeForm.test.tsx`
  - `components/my-closet/MyClosetClient.tsx` 수정 — 신체 사이즈 미저장 시 추천 버튼 → `BodySizeForm` 표시
- **수용 기준**:
  - [ ] 신체 사이즈 미저장 상태에서 추천 버튼 클릭 → BodySizeForm이 화면에 나타난다
  - [ ] 키·몸무게·가슴·허리·신발 사이즈 필드가 모두 선택으로 표시된다
  - [ ] 모든 필드가 빈 상태 → 저장 버튼이 비활성화된다
  - [ ] 키(170)·몸무게(65) 입력 후 저장 → 폼이 닫힌다
  - [ ] 저장 후 페이지 재로드 → BodySizeForm 재오픈 시 키(170)·몸무게(65) 필드가 채워져 있다
  - [ ] 신발 사이즈(265) 저장 후 재로드 → 신발 사이즈 필드에 265가 복원된다
- **검증**:
  - `bun run test -- BodySizeForm`
  - Browser MCP — 추천 버튼 클릭 → 폼 표시 → 값 입력 → 저장 → 재로드 후 복원 확인

---

### Task 4: 사이즈 추천

- **담당 시나리오**: Scenario 6 (full)
- **크기**: M (3 파일 + test)
- **의존성**: Task 2 (ProductInfo), Task 3 (BodySize)
- **참조**:
  - next-best-practices — `route-handlers`
  - Gemini API 문서: `https://ai.google.dev/gemini-api/docs/text-generation` (REST endpoint)
  - shadcn — Skeleton (추천 로딩), Card (추천 결과 박스 — wireframe의 카드형 레이아웃)
- **구현 대상**:
  - `app/api/recommend/route.ts` — `POST /api/recommend` body: `{ productInfo, bodySize }` → Gemini API → `Recommendation` JSON 반환
  - `components/my-closet/RecommendationResult.tsx` — 추천 사이즈 라벨 + 이유 텍스트 + 사이즈 테이블 하이라이트 (`'use client'`)
  - `components/my-closet/RecommendationResult.test.tsx`
  - `components/my-closet/MyClosetClient.tsx` 수정 — 신체 사이즈 저장됨 + 추천 버튼 클릭 → 추천 API 호출 → 결과 표시
- **수용 기준**:
  - [ ] 신체 사이즈 저장된 상태에서 추천 버튼 클릭 → Skeleton(로딩 인디케이터)이 표시된다
  - [ ] 추천 완료 → Skeleton이 사라진다
  - [ ] 추천 완료 → 추천 사이즈 라벨(예: "M")이 화면에 표시된다
  - [ ] 추천 완료 → 추천 이유 텍스트가 표시된다
  - [ ] 추천 완료 → 사이즈 테이블에서 추천 사이즈 행이 강조(하이라이트)된다
- **검증**:
  - `bun run test -- RecommendationResult`
  - Browser MCP — 전체 흐름(URL 조회 → 추천 버튼 → 결과) end-to-end 확인, 스크린샷 `artifacts/my-closet/evidence/task-4.png` 저장

---

### Checkpoint: Tasks 3–4 이후
- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] URL 조회 → 신체 사이즈 입력 → 추천 결과까지 end-to-end로 동작

---

### Task 5: URL 리셋 + 로딩 불변 규칙 + E2E

- **담당 시나리오**: Scenario 7 (full), 불변 규칙 (로딩 표시)
- **크기**: S (1 파일 + e2e test)
- **의존성**: Tasks 1–4 (전체 기능 완성 후)
- **참조**:
  - Playwright 문서: `https://playwright.dev/docs/writing-tests`
- **구현 대상**:
  - `components/my-closet/MyClosetClient.tsx` 수정 — 지우기 버튼 클릭 시 url·productInfo·recommendation 상태 모두 초기화
  - `e2e/my-closet.spec.ts` — 주요 흐름 E2E 시나리오
- **수용 기준**:
  - [ ] 지우기 버튼 클릭 → URL 입력창이 비워진다
  - [ ] 지우기 버튼 클릭 → 제품명·브랜드·사이즈 테이블이 사라진다
  - [ ] 지우기 버튼 클릭 → 추천 결과가 표시된 상태에서도 함께 사라진다
  - [ ] URL 조회 중 로딩 인디케이터가 표시되고, 완료 후 사라진다 (불변 규칙)
  - [ ] 추천 중 로딩 인디케이터가 표시되고, 완료 후 사라진다 (불변 규칙)
- **검증**: `bun run test:e2e`

---

### Final Checkpoint
- [ ] 모든 테스트 통과: `bun run test`
- [ ] E2E 통과: `bun run test:e2e`
- [ ] 빌드 성공: `bun run build`
- [ ] URL 입력 → 제품 조회 → 신체 사이즈 입력 → 추천 → 리셋 전체 흐름이 브라우저에서 동작

---

## 미결정 항목

없음
