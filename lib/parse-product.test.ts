import { describe, it, expect } from "vitest";
import { parseFromJsonLd, parseSizeFromHtml } from "./parse-product";

// ─── parseFromJsonLd ─────────────────────────────────────────────────────────

describe("parseFromJsonLd", () => {
  it("단순 Product JSON-LD에서 brand/name/description 추출", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "슬림 린넨 셔츠",
          "brand": { "@type": "Brand", "name": "무신사 스탠다드" },
          "description": "여름용 린넨 소재 셔츠입니다."
        }
      </script>
    `;
    const result = parseFromJsonLd(html);
    expect(result).toEqual({
      brand: "무신사 스탠다드",
      name: "슬림 린넨 셔츠",
      description: "여름용 린넨 소재 셔츠입니다.",
    });
  });

  it("brand가 문자열인 경우도 처리", () => {
    const html = `
      <script type="application/ld+json">
        { "@type": "Product", "name": "오버핏 티셔츠", "brand": "29CM" }
      </script>
    `;
    expect(parseFromJsonLd(html)?.brand).toBe("29CM");
  });

  it("@graph 배열 안의 Product 추출", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebSite", "name": "쇼핑몰" },
            { "@type": "Product", "name": "와이드 팬츠", "brand": { "name": "브랜드A" } }
          ]
        }
      </script>
    `;
    expect(parseFromJsonLd(html)?.name).toBe("와이드 팬츠");
  });

  it("JSON-LD가 없으면 null 반환", () => {
    expect(parseFromJsonLd("<html><body>상품 없음</body></html>")).toBeNull();
  });

  it("Product가 아닌 타입이면 null 반환", () => {
    const html = `
      <script type="application/ld+json">
        { "@type": "Organization", "name": "회사" }
      </script>
    `;
    expect(parseFromJsonLd(html)).toBeNull();
  });

  it("name이 없는 Product는 null 반환", () => {
    const html = `
      <script type="application/ld+json">
        { "@type": "Product", "brand": "브랜드" }
      </script>
    `;
    expect(parseFromJsonLd(html)).toBeNull();
  });

  it("JSON-LD가 깨진 경우 null 반환 (에러 미전파)", () => {
    const html = `<script type="application/ld+json">{ invalid json }</script>`;
    expect(parseFromJsonLd(html)).toBeNull();
  });
});

// ─── parseSizeFromHtml (테이블 파싱) ─────────────────────────────────────────

describe("parseSizeFromHtml - 테이블", () => {
  it("사이즈 테이블을 올바르게 파싱", () => {
    const html = `
      <table>
        <tr><th>사이즈</th><th>어깨너비</th><th>가슴둘레</th></tr>
        <tr><td>S</td><td>42</td><td>94</td></tr>
        <tr><td>M</td><td>44</td><td>98</td></tr>
        <tr><td>L</td><td>46</td><td>102</td></tr>
      </table>
    `;
    const result = parseSizeFromHtml(html);
    expect(result).toEqual({
      headers: ["사이즈", "어깨너비", "가슴둘레"],
      rows: [
        { label: "S", measurements: { 어깨너비: 42, 가슴둘레: 94 } },
        { label: "M", measurements: { 어깨너비: 44, 가슴둘레: 98 } },
        { label: "L", measurements: { 어깨너비: 46, 가슴둘레: 102 } },
      ],
    });
  });

  it("숫자 레이블(90/95/100) 사이즈 파싱", () => {
    const html = `
      <table>
        <tr><th>size</th><th>총장</th><th>가슴</th></tr>
        <tr><td>90</td><td>65</td><td>96</td></tr>
        <tr><td>95</td><td>67</td><td>100</td></tr>
      </table>
    `;
    const result = parseSizeFromHtml(html);
    expect(result?.rows[0].label).toBe("90");
    expect(result?.rows[0].measurements["총장"]).toBe(65);
  });

  it("FREE SIZE 레이블 파싱", () => {
    const html = `
      <table>
        <tr><th>사이즈</th><th>어깨</th><th>가슴</th></tr>
        <tr><td>FREE SIZE</td><td>48</td><td>108</td></tr>
      </table>
    `;
    expect(parseSizeFromHtml(html)?.rows[0].label).toBe("FREE SIZE");
  });

  it("숫자 없는 테이블은 null 반환", () => {
    const html = `
      <table>
        <tr><th>항목</th><th>내용</th></tr>
        <tr><td>소재</td><td>면 100%</td></tr>
      </table>
    `;
    expect(parseSizeFromHtml(html)).toBeNull();
  });

  it("사이즈 레이블 없는 테이블은 null 반환", () => {
    const html = `
      <table>
        <tr><th>항목</th><th>값</th></tr>
        <tr><td>무게</td><td>200</td></tr>
        <tr><td>길이</td><td>150</td></tr>
      </table>
    `;
    expect(parseSizeFromHtml(html)).toBeNull();
  });

  it("테이블 없으면 null 반환", () => {
    expect(parseSizeFromHtml("<div>테이블 없음</div>")).toBeNull();
  });

  it("여러 테이블 중 사이즈 테이블만 선택", () => {
    const html = `
      <table>
        <tr><th>배송</th><th>기간</th></tr>
        <tr><td>일반</td><td>3-5일</td></tr>
      </table>
      <table>
        <tr><th>사이즈</th><th>총장</th></tr>
        <tr><td>M</td><td>70</td></tr>
        <tr><td>L</td><td>72</td></tr>
      </table>
    `;
    const result = parseSizeFromHtml(html);
    expect(result?.rows[0].label).toBe("M");
  });

  it("셀 안의 HTML 태그 제거", () => {
    const html = `
      <table>
        <tr><th>SIZE</th><th>어깨</th></tr>
        <tr><td><strong>S</strong></td><td><span>42</span></td></tr>
      </table>
    `;
    const result = parseSizeFromHtml(html);
    expect(result?.rows[0].label).toBe("S");
    expect(result?.rows[0].measurements["어깨"]).toBe(42);
  });
});

// ─── parseSizeFromHtml (통합: 테이블 우선, 인라인 텍스트 폴백) ───────────────

describe("parseSizeFromHtml", () => {
  it("인라인 텍스트 사이즈 정보 추출 (tannat.kr 패턴)", () => {
    const html = `
      <div>SIZE GUIDE 총장 55.2cm 어깨 39cm 가슴 40cm 암홀 19.6cm 소매 60.5cm 소매 단 11.5cm 밑단 40.1cm</div>
    `;
    const result = parseSizeFromHtml(html);
    expect(result).not.toBeNull();
    expect(result?.rows[0].label).toBe("FREE");
    expect(result?.rows[0].measurements["총장"]).toBe(55.2);
    expect(result?.rows[0].measurements["어깨"]).toBe(39);
    expect(result?.rows[0].measurements["소매 단"]).toBe(11.5);
    expect(result?.rows[0].measurements["소매"]).toBe(60.5);
  });

  it("테이블이 있으면 테이블 우선", () => {
    const html = `
      <div>총장 55cm 어깨 39cm 가슴 40cm</div>
      <table>
        <tr><th>사이즈</th><th>총장</th></tr>
        <tr><td>M</td><td>70</td></tr>
      </table>
    `;
    const result = parseSizeFromHtml(html);
    expect(result?.rows[0].label).toBe("M");
  });

  it("3개 미만 측정값이면 null 반환", () => {
    const html = `<div>총장 55cm 어깨 39cm</div>`;
    expect(parseSizeFromHtml(html)).toBeNull();
  });
});
