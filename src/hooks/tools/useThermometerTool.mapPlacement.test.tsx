import { act, renderHook, waitFor } from "@testing-library/react";
import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { useThermometerTool } from "./useThermometerTool";

describe("useThermometerTool map-first", () => {
  it("suppresses the Ask sheet after choosing a distance", async () => {
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
      (() => {
        const panel = result.current.panel;
        if (!isValidElement(panel)) throw new Error("expected panel element");
        (panel.props as { onDistanceChange: (n: number) => void }).onDistanceChange(1609.344);
      })();
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });
    expect(result.current.hud.mapOverlay).not.toBeNull();
    expect(result.current.hud.modeBody).toBeNull();

    act(() => {
      (() => {
        const overlay = result.current.hud.mapOverlay;
        if (!isValidElement(overlay)) throw new Error("expected overlay");
        (overlay.props as { onPlacementModeChange: (m: "manual") => void }).onPlacementModeChange(
          "manual",
        );
      })();
    });
    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });
    act(() => {
      result.current.handleMapClick([53.36, -6.25]);
    });

    await waitFor(() => {
      expect(result.current.draft.thermoA).toEqual([53.35, -6.26]);
      expect(result.current.draft.thermoB).toEqual([53.36, -6.25]);
    });
  });

  it("returns to distance sheet when change-setup clears pins", async () => {
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

    act(() => {
      (() => {
        const panel = result.current.panel;
        if (!isValidElement(panel)) throw new Error("expected panel element");
        (panel.props as { onDistanceChange: (n: number) => void }).onDistanceChange(1609.344);
      })();
    });
    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });

    act(() => {
      (() => {
        const overlay = result.current.hud.mapOverlay;
        if (!isValidElement(overlay)) throw new Error("expected overlay");
        (overlay.props as { onChangeSetup: () => void }).onChangeSetup();
      })();
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBeFalsy();
    });
    expect(result.current.hud.modeBody).not.toBeNull();
  });

  it("threads GPS/commit errors into the map overlay while suppressSheet", async () => {
    const mocks = createToolHookMocks();
    const { result, rerender } = renderHook(
      ({ gpsError }: { gpsError: string | null }) =>
        useThermometerTool({
          active: true,
          annotations: mocks.annotations,
          sessionRules: { gameSize: "large" },
          createAnnotation: mocks.createAnnotation,
          distanceUnit: mocks.distanceUnit,
          finishPlacement: mocks.finishPlacement,
          setMapError: mocks.setMapError,
          awaitHiderAnswer: false,
          gpsError,
        }),
      { initialProps: { gpsError: null as string | null } },
    );

    act(() => {
      (() => {
        const panel = result.current.panel;
        if (!isValidElement(panel)) throw new Error("expected panel element");
        (panel.props as { onDistanceChange: (n: number) => void }).onDistanceChange(1609.344);
      })();
    });
    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });

    expect(result.current.hud.error).toBeNull();
    expect(
      (result.current.hud.mapOverlay as { props: { error?: string | null } } | null)?.props.error ??
        null,
    ).toBeNull();

    rerender({ gpsError: "Current location is unavailable." });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
      expect(result.current.hud.error).toBeNull();
      const overlay = result.current.hud.mapOverlay;
      if (!isValidElement(overlay)) throw new Error("expected overlay");
      expect((overlay.props as { error?: string | null }).error).toBe(
        "Current location is unavailable.",
      );
    });
  });
});
