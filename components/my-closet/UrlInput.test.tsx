import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UrlInput } from "./UrlInput";

const base = {
  value: "",
  onChange: vi.fn(),
  onFetch: vi.fn(),
  onClear: vi.fn(),
  isLoading: false,
  hasResult: false,
};

beforeEach(() => vi.clearAllMocks());

describe("UrlInput", () => {
  it("shows placeholder and disabled 조회 button when value is empty", () => {
    render(<UrlInput {...base} />);
    expect(
      screen.getByPlaceholderText("의류 제품 URL 붙여넣기")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "조회" })).toBeDisabled();
  });

  it("calls onChange when user types", async () => {
    const onChange = vi.fn();
    render(<UrlInput {...base} onChange={onChange} />);
    await userEvent.type(
      screen.getByPlaceholderText("의류 제품 URL 붙여넣기"),
      "h"
    );
    expect(onChange).toHaveBeenCalled();
  });

  it("enables 조회 button when value is present", () => {
    render(<UrlInput {...base} value="https://example.com" />);
    expect(screen.getByRole("button", { name: "조회" })).toBeEnabled();
  });

  it("calls onFetch when 조회 button clicked", async () => {
    const onFetch = vi.fn();
    render(<UrlInput {...base} value="https://example.com" onFetch={onFetch} />);
    await userEvent.click(screen.getByRole("button", { name: "조회" }));
    expect(onFetch).toHaveBeenCalled();
  });

  it("disables input and 조회 button when loading", () => {
    render(<UrlInput {...base} value="https://example.com" isLoading />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "조회" })).toBeDisabled();
  });

  it("shows disabled input and 지우기 button when hasResult", () => {
    render(<UrlInput {...base} value="https://example.com" hasResult />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: /지우기/ })).toBeInTheDocument();
  });

  it("calls onClear when 지우기 button clicked", async () => {
    const onClear = vi.fn();
    render(
      <UrlInput {...base} value="https://example.com" hasResult onClear={onClear} />
    );
    await userEvent.click(screen.getByRole("button", { name: /지우기/ }));
    expect(onClear).toHaveBeenCalled();
  });
});
