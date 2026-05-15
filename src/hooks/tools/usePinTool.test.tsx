import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePinTool } from "./usePinTool";

describe("usePinTool", () => {
  it("stores the tapped map point in draft state", () => {
    const { result } = renderHook(() =>
      usePinTool({
        active: true,
        createAnnotation: async (draft) => ({
          id: "ann-pin",
          sessionId: "local",
          status: "active",
          ...draft,
        }),
        finishPlacement: () => {},
      }),
    );

    act(() => {
      result.current.handleMapClick([51.5, -0.12]);
    });

    expect(result.current.draft.pinPoint).toEqual([51.5, -0.12]);
    expect(result.current.placementCrosshair).toBe(false);
  });
});
