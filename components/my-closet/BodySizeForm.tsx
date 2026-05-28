"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BodySize } from "@/types";

interface BodySizeFormProps {
  onSave: (size: BodySize) => void;
  onCancel: () => void;
  initialValues?: BodySize;
}

interface Field {
  key: keyof BodySize;
  label: string;
  unit: string;
  placeholder: string;
}

const FIELDS: Field[] = [
  { key: "height", label: "키", unit: "cm", placeholder: "170" },
  { key: "weight", label: "몸무게", unit: "kg", placeholder: "65" },
  { key: "chest", label: "가슴 둘레", unit: "cm", placeholder: "90" },
  { key: "waist", label: "허리 둘레", unit: "cm", placeholder: "75" },
  { key: "shoeSize", label: "신발 사이즈", unit: "mm", placeholder: "265" },
];

export function BodySizeForm({ onSave, onCancel, initialValues }: BodySizeFormProps) {
  const [values, setValues] = useState<Partial<Record<keyof BodySize, string>>>(() =>
    Object.fromEntries(
      FIELDS.map((f) => [
        f.key,
        initialValues?.[f.key] != null ? String(initialValues[f.key]) : "",
      ])
    )
  );

  const hasAny = FIELDS.some((f) => values[f.key]?.trim());

  const handleSave = () => {
    const size: BodySize = {};
    for (const f of FIELDS) {
      const v = values[f.key];
      if (v?.trim()) {
        const n = Number(v);
        if (isFinite(n)) size[f.key] = n;
      }
    }
    onSave(size);
  };

  return (
    <div className="space-y-4">
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label htmlFor={`bodysize-${f.key}`}>
            {f.label}{" "}
            <span className="text-muted-foreground font-normal">(선택)</span>
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`bodysize-${f.key}`}
              type="number"
              placeholder={f.placeholder}
              value={values[f.key]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">{f.unit}</span>
          </div>
        </div>
      ))}

      <p className="text-xs text-muted-foreground">
        하나 이상 입력하면 저장할 수 있습니다
      </p>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleSave} disabled={!hasAny}>
          저장
        </Button>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}
