import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./ProductCard";
import type { ProductInfo } from "@/types";

const withTable: ProductInfo = {
  brand: "무신사 스탠다드",
  name: "오버사이즈 크루넥 스웨트셔츠",
  description: "소프트한 기모 안감의 오버사이즈 스웨트셔츠.",
  sizeTable: {
    headers: ["사이즈", "가슴", "어깨", "총장"],
    rows: [
      { label: "S", measurements: { 가슴: 102, 어깨: 46, 총장: 65 } },
      { label: "M", measurements: { 가슴: 106, 어깨: 48, 총장: 67 } },
    ],
  },
};

const withoutTable: ProductInfo = {
  brand: "나이키",
  name: "에어포스 1",
  description: "클래식한 로우탑 스니커즈.",
  sizeTable: null,
};

describe("ProductCard — with size table", () => {
  it("renders brand, name, description", () => {
    render(<ProductCard productInfo={withTable} onRecommend={vi.fn()} hasBodySize />);
    expect(screen.getByText("무신사 스탠다드")).toBeInTheDocument();
    expect(screen.getByText("오버사이즈 크루넥 스웨트셔츠")).toBeInTheDocument();
    expect(screen.getByText(/소프트한 기모 안감/)).toBeInTheDocument();
  });

  it("renders size table with labels and measurements", () => {
    render(<ProductCard productInfo={withTable} onRecommend={vi.fn()} hasBodySize />);
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("102")).toBeInTheDocument();
  });

  it("shows enabled 사이즈 추천 button when body size exists", () => {
    render(<ProductCard productInfo={withTable} onRecommend={vi.fn()} hasBodySize />);
    expect(screen.getByRole("button", { name: "사이즈 추천" })).toBeEnabled();
  });

  it("calls onRecommend when 사이즈 추천 clicked", async () => {
    const onRecommend = vi.fn();
    render(<ProductCard productInfo={withTable} onRecommend={onRecommend} hasBodySize />);
    await userEvent.click(screen.getByRole("button", { name: "사이즈 추천" }));
    expect(onRecommend).toHaveBeenCalled();
  });

  it("사이즈 추천 button is not disabled but dim when no body size", () => {
    render(<ProductCard productInfo={withTable} onRecommend={vi.fn()} hasBodySize={false} />);
    const btn = screen.getByRole("button", { name: "사이즈 추천" });
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveClass("opacity-50");
  });

  it("calls onRecommend when clicking dim button (no body size)", async () => {
    const onRecommend = vi.fn();
    render(<ProductCard productInfo={withTable} onRecommend={onRecommend} hasBodySize={false} />);
    await userEvent.click(screen.getByRole("button", { name: "사이즈 추천" }));
    expect(onRecommend).toHaveBeenCalled();
  });
});

describe("ProductCard — without size table", () => {
  it("renders brand, name, description", () => {
    render(<ProductCard productInfo={withoutTable} onRecommend={vi.fn()} hasBodySize />);
    expect(screen.getByText("나이키")).toBeInTheDocument();
    expect(screen.getByText("에어포스 1")).toBeInTheDocument();
  });

  it("shows 사이즈 정보를 찾을 수 없습니다", () => {
    render(<ProductCard productInfo={withoutTable} onRecommend={vi.fn()} hasBodySize />);
    expect(
      screen.getByText("사이즈 정보를 찾을 수 없습니다")
    ).toBeInTheDocument();
  });

  it("shows disabled 사이즈 추천 button", () => {
    render(<ProductCard productInfo={withoutTable} onRecommend={vi.fn()} hasBodySize />);
    expect(screen.getByRole("button", { name: "사이즈 추천" })).toBeDisabled();
  });
});
