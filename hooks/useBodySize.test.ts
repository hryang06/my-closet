import { renderHook, act } from "@testing-library/react";
import { useBodySize } from "./useBodySize";

const STORAGE_KEY = "bodySize:v1";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("useBodySize", () => {
  it("saves all fields to localStorage as JSON", () => {
    const { result } = renderHook(() => useBodySize());

    act(() => {
      result.current.setBodySize({
        height: 170,
        weight: 65,
        chest: 90,
        waist: 75,
        shoeSize: 265,
      });
    });

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual({
      height: 170,
      weight: 65,
      chest: 90,
      waist: 75,
      shoeSize: 265,
    });
  });

  it("restores all fields after page reload (remount)", () => {
    const { result: first } = renderHook(() => useBodySize());
    act(() => {
      first.current.setBodySize({ height: 170, weight: 65 });
    });

    const { result: second } = renderHook(() => useBodySize());
    expect(second.current.bodySize).toEqual({ height: 170, weight: 65 });
  });

  it("restores partial fields when only some are stored", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ chest: 90, waist: 75, shoeSize: 265 })
    );

    const { result } = renderHook(() => useBodySize());
    expect(result.current.bodySize).toEqual({
      chest: 90,
      waist: 75,
      shoeSize: 265,
    });
  });

  it("returns null when localStorage throws on read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    const { result } = renderHook(() => useBodySize());
    expect(result.current.bodySize).toBeNull();
  });
});
