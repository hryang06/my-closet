import type { ProductInfo, BodySize, Recommendation } from "@/types";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function buildPrompt(productInfo: ProductInfo, bodySize: BodySize): string {
  const bodySizeText = [
    bodySize.height && `키: ${bodySize.height}cm`,
    bodySize.weight && `몸무게: ${bodySize.weight}kg`,
    bodySize.chest && `가슴 둘레: ${bodySize.chest}cm`,
    bodySize.waist && `허리 둘레: ${bodySize.waist}cm`,
    bodySize.shoeSize && `신발 사이즈: ${bodySize.shoeSize}mm`,
  ]
    .filter(Boolean)
    .join(", ");

  const sizeTableText = productInfo.sizeTable
    ? `사이즈 테이블:\n${productInfo.sizeTable.rows
        .map(
          (row) =>
            `${row.label}: ${Object.entries(row.measurements)
              .map(([k, v]) => `${k}=${v}cm`)
              .join(", ")}`
        )
        .join("\n")}`
    : "사이즈 테이블 없음";

  return `다음 의류 제품과 신체 사이즈를 기반으로 적합한 사이즈를 추천하라.

제품: ${productInfo.brand} ${productInfo.name}
설명: ${productInfo.description}
${sizeTableText}

신체 사이즈: ${bodySizeText}

중요: size 필드에는 위 사이즈 테이블의 label 값(예: S, M, L, XL)을 정확히 그대로 사용하라.

JSON 형식으로만 반환 (다른 텍스트 없이):
{
  "size": "추천 사이즈 라벨 (사이즈 테이블의 label과 동일하게)",
  "reason": "추천 이유 (2~3문장, 신체 사이즈와 제품 사이즈 수치를 근거로 포함)"
}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const productInfo: ProductInfo = body?.productInfo;
  const bodySize: BodySize = body?.bodySize;

  if (!productInfo || !bodySize) {
    return Response.json(
      { error: "productInfo와 bodySize가 필요합니다." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "서버 설정 오류" }, { status: 500 });
  }

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(productInfo, bodySize) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!geminiRes.ok) {
      const errMsg = geminiRes.status === 429
        ? "AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요."
        : `추천에 실패했습니다. (${geminiRes.status})`;
      return Response.json({ error: errMsg }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return Response.json({ error: "AI가 응답하지 않았습니다." }, { status: 502 });
    }
    const recommendation: Recommendation = JSON.parse(text);
    if (!recommendation.size || !recommendation.reason) {
      return Response.json({ error: "추천 결과를 파싱하지 못했습니다." }, { status: 502 });
    }
    return Response.json(recommendation);
  } catch {
    return Response.json({ error: "추천에 실패했습니다." }, { status: 502 });
  }
}
