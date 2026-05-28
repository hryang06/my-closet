import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BodySizeForm } from "./BodySizeForm";

const onSave = vi.fn();
const onCancel = vi.fn();

beforeEach(() => vi.clearAllMocks());

describe("BodySizeForm", () => {
  it("renders all 5 optional fields", () => {
    render(<BodySizeForm onSave={onSave} onCancel={onCancel} />);
    expect(screen.getByLabelText(/키/)).toBeInTheDocument();
    expect(screen.getByLabelText(/몸무게/)).toBeInTheDocument();
    expect(screen.getByLabelText(/가슴 둘레/)).toBeInTheDocument();
    expect(screen.getByLabelText(/허리 둘레/)).toBeInTheDocument();
    expect(screen.getByLabelText(/신발 사이즈/)).toBeInTheDocument();
  });

  it("disables save button when all fields are empty", () => {
    render(<BodySizeForm onSave={onSave} onCancel={onCancel} />);
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("enables save button when at least one field has value", async () => {
    render(<BodySizeForm onSave={onSave} onCancel={onCancel} />);
    await userEvent.type(screen.getByLabelText(/키/), "170");
    expect(screen.getByRole("button", { name: "저장" })).toBeEnabled();
  });

  it("calls onSave with numeric values when saved", async () => {
    render(<BodySizeForm onSave={onSave} onCancel={onCancel} />);
    await userEvent.type(screen.getByLabelText(/키/), "170");
    await userEvent.type(screen.getByLabelText(/몸무게/), "65");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ height: 170, weight: 65 })
    );
  });

  it("restores initialValues into fields", () => {
    render(
      <BodySizeForm
        onSave={onSave}
        onCancel={onCancel}
        initialValues={{ height: 170, weight: 65 }}
      />
    );
    expect(screen.getByLabelText(/키/)).toHaveValue(170);
    expect(screen.getByLabelText(/몸무게/)).toHaveValue(65);
  });

  it("restores partial initialValues (shoeSize only)", () => {
    render(
      <BodySizeForm
        onSave={onSave}
        onCancel={onCancel}
        initialValues={{ shoeSize: 265 }}
      />
    );
    expect(screen.getByLabelText(/신발 사이즈/)).toHaveValue(265);
  });
});
