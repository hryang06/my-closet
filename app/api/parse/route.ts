import type { ProductInfo, SizeRow } from "@/types";

// ─── JSON-LD 규칙 기반 파싱 ──────────────────────────────────────────────────

function findProductSchema(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "Product" || (Array.isArray(type) && (type as string[]).includes("Product"))) {
    return obj;
  }
  if (Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"] as unknown[]) {
      const found = findProductSchema(item);
      if (found) return found;
    }
  }
  if (Array.isArray(data)) {
    for (const item of data as unknown[]) {
      const found = findProductSchema(item);
      if (found) return found;
    }
  }
  return null;
}

function parseFromJsonLd(html: string): Pick<ProductInfo, "brand" | "name" | "description"> | null {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const match of matches) {
    try {
      const product = findProductSchema(JSON.parse(match[1].trim()));
      if (!product?.name) continue;
      const b = product.brand;
      const brand =
        typeof b === "string" ? b : (b as Record<string, unknown>)?.name as string ?? "";
      return {
        brand: brand || "",
        name: product.name as string,
        description: (product.description as string) || "",
      };
    } catch {
      // 파싱 실패 시 다음 JSON-LD 시도
    }
  }
  return null;
}

// ─── HTML 사이즈 테이블 파싱 ─────────────────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .trim();
}

const SIZE_LABEL_RE = /^(XS|S|M|L|XL|2XL|3XL|XXL|XXXL|\d{2,3}|FREE|ONE|ONE SIZE|FREE SIZE)$/i;

function parseHtmlTable(tableHtml: string): NonNullable<ProductInfo["sizeTable"]> | null {
  const rows: string[][] = [];
  for (const rowMatch of tableHtml.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowMatch[2].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
      stripTags(m[2])
    );
    if (cells.length > 1) rows.push(cells);
  }
  if (rows.length < 2) return null;

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // 숫자 측정치가 있는 행이 없으면 사이즈 테이블이 아님
  const hasNumeric = dataRows.some((r) => r.slice(1).some((c) => /^\d+\.?\d*$/.test(c.trim())));
  if (!hasNumeric) return null;

  // 첫 열이 사이즈 레이블이어야 함
  const hasSizeLabel = dataRows.some((r) => SIZE_LABEL_RE.test(r[0]?.trim() ?? ""));
  if (!hasSizeLabel) return null;

  const sizeRows: SizeRow[] = dataRows.map((cells) => ({
    label: cells[0],
    measurements: Object.fromEntries(
      headers.slice(1).map((h, i) => {
        const num = parseFloat((cells[i + 1] ?? "").replace(/[^\d.]/g, ""));
        return [h, isNaN(num) ? 0 : num];
      })
    ),
  }));

  return { headers, rows: sizeRows };
}

function parseSizeTableFromHtml(html: string): ProductInfo["sizeTable"] {
  for (const match of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const parsed = parseHtmlTable(match[0]);
    if (parsed) return parsed;
  }
  return null;
}

// ─── Gemini 폴백 ─────────────────────────────────────────────────────────────

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

function extractPageContent(html: string): string {
  const ldJsonMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  const ldJson = ldJsonMatch?.[1]?.trim() ?? "";

  const nextDataMatch = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  const nextData = nextDataMatch?.[1]?.trim() ?? "";

  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
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

async function parseWithGemini(html: string, apiKey: string): Promise<ProductInfo> {
  const content = extractPageContent(html);
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
    const errMsg =
      geminiRes.status === 429
        ? "AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요."
        : `AI 파싱에 실패했습니다. (${geminiRes.status})`;
    throw new GeminiError(errMsg, geminiRes.status);
  }

  const geminiData = await geminiRes.json();
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("AI가 응답하지 않았습니다.");

  const parsed = JSON.parse(text);
  if (!parsed.name || !parsed.brand) throw new Error("제품 정보를 파싱하지 못했습니다.");
  return parsed as ProductInfo;
}

class GeminiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// ─── Fetch Headers ───────────────────────────────────────────────────────────

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

// ─── Route Handler ───────────────────────────────────────────────────────────

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

  const isNaver = parsedUrl.hostname.includes("naver.com");
  const primaryHeaders = isNaver ? FETCH_HEADERS_MOBILE : FETCH_HEADERS_DESKTOP;
  const fallbackHeaders = isNaver ? FETCH_HEADERS_DESKTOP : FETCH_HEADERS_MOBILE;

  let html: string;
  try {
    let res = await fetch(url, {
      headers: primaryHeaders,
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok || (await res.clone().text()).includes("시스템오류")) {
      res = await fetch(url, {
        headers: fallbackHeaders,
        signal: AbortSignal.timeout(12000),
      });
    }

    if (!res.ok) {
      return Response.json(
        {
          error: `페이지를 가져오지 못했습니다. (${res.status}) 해당 사이트가 외부 접근을 차단했을 수 있습니다.`,
        },
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

  // 1단계: JSON-LD + HTML 테이블 규칙 기반 파싱 (Gemini 호출 없음)
  const jsonLdInfo = parseFromJsonLd(html);
  if (jsonLdInfo?.name) {
    const sizeTable = parseSizeTableFromHtml(html);
    return Response.json({ ...jsonLdInfo, sizeTable } satisfies ProductInfo);
  }

  // 2단계: JSON-LD 실패 시 Gemini 폴백
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "서버 설정 오류" }, { status: 500 });
  }

  try {
    const productInfo = await parseWithGemini(html, apiKey);
    return Response.json(productInfo);
  } catch (err) {
    if (err instanceof GeminiError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    return Response.json({ error: "제품 정보 파싱에 실패했습니다." }, { status: 502 });
  }
}
