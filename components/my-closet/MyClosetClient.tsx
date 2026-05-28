"use client";

import { useState } from "react";
import { Shirt, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UrlInput } from "./UrlInput";
import { ProductCard } from "./ProductCard";
import { BodySizeForm } from "./BodySizeForm";
import type { ProductInfo, Recommendation } from "@/types";
import { useBodySize } from "@/hooks/useBodySize";

type Status = "idle" | "fetching" | "success" | "error" | "recommending" | "recommended";

export function MyClosetClient() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { bodySize, setBodySize } = useBodySize();
  const [showBodyForm, setShowBodyForm] = useState(false);

  const handleFetch = async () => {
    setStatus("fetching");
    setProductInfo(null);
    setRecommendation(null);
    setErrorMessage(null);
    setShowBodyForm(false);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "알 수 없는 오류가 발생했습니다.");
        setStatus("error");
        return;
      }
      setProductInfo(data);
      setStatus("success");
    } catch {
      setErrorMessage("제품 정보를 가져오지 못했습니다. 다시 시도해 주세요.");
      setStatus("error");
    }
  };

  const handleClear = () => {
    setUrl("");
    setStatus("idle");
    setProductInfo(null);
    setRecommendation(null);
    setErrorMessage(null);
    setShowBodyForm(false);
  };

  const handleRecommend = async (savedBodySize = bodySize) => {
    if (!savedBodySize || !productInfo) return;
    setStatus("recommending");
    setShowBodyForm(false);
    setRecommendation(null);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productInfo, bodySize: savedBodySize }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("success");
        return;
      }
      setRecommendation(data);
      setStatus("recommended");
    } catch {
      setStatus("success");
    }
  };

  const handleRecommendClick = () => {
    if (bodySize) {
      handleRecommend(bodySize);
    } else {
      setShowBodyForm(true);
    }
  };

  const hasResult = status === "success" || status === "error" || status === "recommending" || status === "recommended";

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <UrlInput
        value={url}
        onChange={setUrl}
        onFetch={handleFetch}
        onClear={handleClear}
        isLoading={status === "fetching"}
        hasResult={hasResult}
      />

      {status === "idle" && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Shirt className="size-10" />
          <p className="text-sm text-center">
            URL을 입력하고 조회하면
            <br />
            제품 정보와 사이즈를 확인합니다
          </p>
        </div>
      )}

      {status === "fetching" && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {status === "error" && errorMessage && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted text-sm text-muted-foreground">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {productInfo && status !== "fetching" && (
        <>
          <ProductCard
            productInfo={productInfo}
            onRecommend={handleRecommendClick}
            highlightedSize={recommendation?.size}
            isRecommending={status === "recommending"}
          />

          {showBodyForm && (
            <BodySizeForm
              initialValues={bodySize ?? undefined}
              onSave={(size) => {
                setBodySize(size);
                setShowBodyForm(false);
                handleRecommend(size);
              }}
              onCancel={() => setShowBodyForm(false)}
            />
          )}

          {status === "recommending" && (
            <div className="flex items-center gap-2 py-3">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          )}

          {status === "recommended" && recommendation && (
            <RecommendationPlaceholder recommendation={recommendation} />
          )}
        </>
      )}
    </div>
  );
}

// Task 4에서 실제 구현으로 교체될 플레이스홀더
function RecommendationPlaceholder({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  return null;
}
