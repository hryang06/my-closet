import type { ProductInfo } from "@/types";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const EXTRACT_PROMPT = `아래 페이지 데이터에서 의류 제품 정보를 추출해 JSON으로 반환하라.

데이터 소스 우선순위:
1. "구조화 데이터(JSON-LD)" 섹션이 있으면 최우선으로 활용
2. "페이지 데이터(__NEXT_DATA__)" 섹션이 있으면 두 번째로 활용
3. "페이지 텍스트" 섹션에서 보완

반환 형식 (다른 텍스트 없이 JSON만):
{
  "brand": "브랜드명",
  "name": "제품명",
  "description": "제품 설명 (2~4문장, 소재·핏·특징 중심)",
  "sizeTable": {
    "headers": ["사이즈", "측정항목1", ...],
    "rows": [
      { "label": "S", "measurements": { "측정항목1": 숫자, ... } }
    ]
  }
}

규칙:
- 사이즈 테이블은 숫자 측정치(cm·mm 단위)가 담긴 표만 포함. 없으면 null.
- measurements 값은 number 타입으로 반환.
- brand·name이 불분명하면 빈 문자열("") 반환.

페이지 데이터:
`;

/** HTML에서 구조화 데이터 + 텍스트를 추출해 Gemini에 보낼 최적 콘텐츠 생성 */
function extractPageContent(html: string): string {
  // 1. JSON-LD 구조화 데이터 (brand.naver 제외 대부분의 쇼핑몰 지원)
  const ldJsonMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  const ldJson = ldJsonMatch?.[1]?.trim() ?? "";

  // 2. Next.js __NEXT_DATA__ (Naver 브랜드스토어 등)
  const nextDataMatch = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  const nextData = nextDataMatch?.[1]?.trim() ?? "";

  // 3. 노이즈 제거 후 텍스트 추출
  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // 블록 요소는 줄바꿈으로 대체 (테이블 구조 보존)
    .replace(/<\/(tr|th|td|li|p|div|section|article|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 40000);

  const parts: string[] = [];
  if (ldJson) parts.push(`=== 구조화 데이터(JSON-LD) ===\n${ldJson}`);
  if (nextData) parts.push(`=== 페이지 데이터(__NEXT_DATA__) ===\n${nextData.slice(0, 8000)}`);
  parts.push(`=== 페이지 텍스트 ===\n${textOnly}`);

  return parts.join("\n\n");
}

const FETCH_HEADERS_DESKTOP = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

const FETCH_HEADERS_MOBILE = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9",
  Referer: "https://www.naver.com/",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url: string = body?.url;

  if (!url) {
    return Response.json({ error: "url이 필요합니다." }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return Response.json({ error: "유효하지 않은 URL입니다." }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return Response.json({ error: "http/https URL만 지원합니다." }, { status: 400 });
  }

  // Naver 계열은 모바일 UA + Referer로 먼저 시도
  const isNaver = parsedUrl.hostname.includes("naver.com");
  const primaryHeaders = isNaver ? FETCH_HEADERS_MOBILE : FETCH_HEADERS_DESKTOP;
  const fallbackHeaders = isNaver ? FETCH_HEADERS_DESKTOP : FETCH_HEADERS_MOBILE;

  let html: string;
  try {
    let res = await fetch(url, {
      headers: primaryHeaders,
      signal: AbortSignal.timeout(12000),
    });

    // 봇 차단 감지 시 폴백 UA로 재시도
    if (!res.ok || (await res.clone().text()).includes("시스템오류")) {
      res = await fetch(url, {
        headers: fallbackHeaders,
        signal: AbortSignal.timeout(12000),
      });
    }

    if (!res.ok) {
      return Response.json(
        { error: `페이지를 가져오지 못했습니다. (${res.status}) 해당 사이트가 외부 접근을 차단했을 수 있습니다.` },
        { status: 502 }
      );
    }
    html = await res.text();
  } catch {
    return Response.json(
      { error: "제품 정보를 가져오지 못했습니다. URL을 확인하거나 다시 시도해 주세요." },
      { status: 502 }
    );
  }

  const content = extractPageContent(html);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "서버 설정 오류" }, { status: 500 });
  }

  let productInfo: ProductInfo;
  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: EXTRACT_PROMPT + content }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!geminiRes.ok) {
      const errMsg = geminiRes.status === 429
        ? "AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요."
        : `AI 파싱에 실패했습니다. (${geminiRes.status})`;
      return Response.json({ error: errMsg }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return Response.json({ error: "AI가 응답하지 않았습니다." }, { status: 502 });
    }
    const parsed2 = JSON.parse(text);
    if (!parsed2.name || !parsed2.brand) {
      return Response.json({ error: "제품 정보를 파싱하지 못했습니다." }, { status: 502 });
    }
    productInfo = parsed2;
  } catch {
    return Response.json(
      { error: "제품 정보 파싱에 실패했습니다." },
      { status: 502 }
    );
  }

  return Response.json(productInfo);
}
