"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UrlInputProps {
  value: string;
  onChange: (url: string) => void;
  onFetch: () => void;
  onClear: () => void;
  isLoading: boolean;
  hasResult: boolean;
}

export function UrlInput({
  value,
  onChange,
  onFetch,
  onClear,
  isLoading,
  hasResult,
}: UrlInputProps) {
  const showClear = hasResult && !isLoading;

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !isLoading && value.trim() && onFetch()}
        placeholder="의류 제품 URL 붙여넣기"
        disabled={isLoading}
        className="flex-1"
      />
      {showClear ? (
        <Button variant="outline" onClick={onClear}>
          <X className="size-3" />
          지우기
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={onFetch}
          disabled={!value.trim() || isLoading}
        >
          조회
        </Button>
      )}
    </div>
  );
}
