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

export function parseFromJsonLd(
  html: string
): Pick<ProductInfo, "brand" | "name" | "description"> | null {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const match of matches) {
    try {
      const product = findProductSchema(JSON.parse(match[1].trim()));
      if (!product?.name) continue;
      const b = product.brand;
      const brand =
        typeof b === "string" ? b : ((b as Record<string, unknown>)?.name as string) ?? "";
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
      stripTags(m[1])
    );
    if (cells.length > 1) rows.push(cells);
  }
  if (rows.length < 2) return null;

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const hasNumeric = dataRows.some((r) => r.slice(1).some((c) => /^\d+\.?\d*$/.test(c.trim())));
  if (!hasNumeric) return null;

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

export function parseSizeTableFromHtml(html: string): ProductInfo["sizeTable"] {
  for (const match of html.matchAll(/<table[\s\S]*?<\/table>/gi)) {
    const parsed = parseHtmlTable(match[0]);
    if (parsed) return parsed;
  }
  return null;
}
