export interface BodySize {
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  shoeSize?: number;
}

export interface SizeRow {
  label: string;
  measurements: Record<string, number>;
}

export interface ProductInfo {
  brand: string;
  name: string;
  description: string;
  sizeTable: { headers: string[]; rows: SizeRow[] } | null;
}

export interface Recommendation {
  size: string;
  reason: string;
}
