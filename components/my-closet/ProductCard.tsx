"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductInfo } from "@/types";

interface ProductCardProps {
  productInfo: ProductInfo;
  onRecommend: () => void;
  highlightedSize?: string;
  isRecommending?: boolean;
}

export function ProductCard({
  productInfo,
  onRecommend,
  highlightedSize,
  isRecommending,
}: ProductCardProps) {
  const { brand, name, description, sizeTable } = productInfo;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">{brand}</p>
        <p className="text-xl font-bold">{name}</p>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

      <hr className="border-border" />

      {sizeTable ? (
        <div>
          <p className="text-xs text-muted-foreground mb-2">사이즈 정보 (cm)</p>
          <Table>
            <TableHeader>
              <TableRow>
                {sizeTable.headers.map((h) => (
                  <TableHead key={h} className="text-center">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizeTable.rows.map((row) => (
                <TableRow
                  key={row.label}
                  className={
                    highlightedSize === row.label ? "bg-muted font-bold" : ""
                  }
                >
                  <TableCell className="text-center">{row.label}</TableCell>
                  {sizeTable.headers.slice(1).map((h) => (
                    <TableCell key={h} className="text-center">
                      {row.measurements[h]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" />
          <span>사이즈 정보를 찾을 수 없습니다</span>
        </div>
      )}

      <hr className="border-border" />

      <Button
        className="w-full"
        onClick={onRecommend}
        disabled={!sizeTable || isRecommending}
      >
        사이즈 추천
      </Button>
    </div>
  );
}
