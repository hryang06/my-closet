import { render, screen } from "@testing-library/react";
import { RecommendationResult } from "./RecommendationResult";
import type { Recommendation } from "@/types";

const recommendation: Recommendation = {
  size: "M",
  reason:
    "키 170cm, 몸무게 65kg 기준으로 M 사이즈를 추천합니다. 가슴 실측이 체형에 잘 맞습니다.",
};

describe("RecommendationResult", () => {
  it("renders recommended size label", () => {
    render(<RecommendationResult recommendation={recommendation} />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("renders reason text", () => {
    render(<RecommendationResult recommendation={recommendation} />);
    expect(screen.getByText(/키 170cm/)).toBeInTheDocument();
  });

  it("renders 추천 사이즈 label", () => {
    render(<RecommendationResult recommendation={recommendation} />);
    expect(screen.getByText("추천 사이즈")).toBeInTheDocument();
  });
});
