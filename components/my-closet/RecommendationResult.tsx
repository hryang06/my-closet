"use client";

import type { Recommendation } from "@/types";

interface RecommendationResultProps {
  recommendation: Recommendation;
}

export function RecommendationResult({ recommendation }: RecommendationResultProps) {
  return (
    <div className="border-2 rounded-lg p-4 space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="text-xs text-muted-foreground">추천 사이즈</span>
        <span className="text-4xl font-bold">{recommendation.size}</span>
      </div>
      <p className="text-sm leading-relaxed">{recommendation.reason}</p>
    </div>
  );
}
