import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useZoneTool } from "./useZoneTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";

describe("useZoneTool", () => {
  it("collects polygon vertices from map taps", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useZoneTool({
        active: true,
        createAnnotation: mocks.createAnnotation,
        finishPlacement: mocks.finishPlacement,
      }),
    );

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
      result.current.handleMapClick([53.36, -6.25]);
    });

    expect(result.current.draft.zoneVertices).toHaveLength(2);
  });

  it("creates a zone annotation after closing the polygon", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useZoneTool({
        active: true,
        createAnnotation: mocks.createAnnotation,
        finishPlacement: mocks.finishPlacement,
      }),
    );

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
      result.current.handleMapClick([53.36, -6.25]);
      result.current.handleMapClick([53.34, -6.24]);
      result.current.panel.props.onLabelChange("Search zone");
    });

    await act(async () => {
      await result.current.panel.props.onClosePolygon();
    });

    expect(mocks.createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({ type: "zone" }),
    );
  });
});
