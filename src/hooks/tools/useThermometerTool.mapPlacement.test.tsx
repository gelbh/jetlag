import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useThermometerTool } from "./useThermometerTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => true,
}));

describe("useThermometerTool map-first", () => {
  it("suppresses the Ask sheet when both manual pins are ready", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useThermometerTool({
        active: true,
        annotations: mocks.annotations,
        sessionRules: { gameSize: "large" },
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        awaitHiderAnswer: false,
      }),
    );

    expect(result.current.hud.suppressSheet).toBeFalsy();

    act(() => {
      result.current.panel.props.onPlacementModeChange("manual");
    });
    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });
    act(() => {
      result.current.handleMapClick([53.36, -6.25]);
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });

    expect(result.current.hud.mapOverlay).not.toBeNull();
    expect(result.current.hud.modeBody).toBeNull();
  });
});
