import type { ProductInfo } from "@/types";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const EXTRACT_PROMPT = `아래 HTML에서 의류 제품 정보를 추출해 JSON으로 반환하라.

반환 형식 (다른 텍스트 없이 JSON만):
{
  "brand": "브랜드명",
  "name": "제품명",
  "description": "제품 설명 (2~4문장)",
  "sizeTable": {
    "headers": ["사이즈", "측정항목1", ...],
    "rows": [
      { "label": "S", "measurements": { "측정항목1": 숫자, ... } }
    ]
  }
}

사이즈 테이블이 없으면 "sizeTable": null 로 반환.
measurements의 값은 숫자(number) 타입으로 반환.

HTML:
`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url: string = body?.url;

  if (!url) {
    return Response.json({ error: "url이 필요합니다." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json(
      { error: "유효하지 않은 URL입니다." },
      { status: 400 }
    );
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return Response.json(
      { error: "http/https URL만 지원합니다." },
      { status: 400 }
    );
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return Response.json(
        { error: `페이지를 가져오지 못했습니다. (${res.status})` },
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

  // 스크립트·스타일·불필요 태그 제거로 토큰 절감
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .slice(0, 80000);

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
        contents: [{ parts: [{ text: EXTRACT_PROMPT + stripped }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!geminiRes.ok) {
      return Response.json(
        { error: "AI 파싱에 실패했습니다." },
        { status: 502 }
      );
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
