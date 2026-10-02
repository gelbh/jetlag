import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMapOverlayState } from "./useMapOverlayState";

describe("useMapOverlayState sheet stack", () => {
  it("replace openers clear prior sheets", () => {
    const { result } = renderHook(() => useMapOverlayState());

    act(() => {
      result.current.openSettings();
    });
    expect(result.current.sheet).toBe("settings");
    expect(result.current.settingsInStack).toBe(true);

    act(() => {
      result.current.openChat();
    });
    expect(result.current.sheet).toBe("chat");
    expect(result.current.settingsInStack).toBe(false);
    expect(result.current.sheetStack).toEqual(["chat"]);
  });

  it("push keeps prior sheet and close pops back", () => {
    const { result } = renderHook(() => useMapOverlayState());

    act(() => {
      result.current.openSettings();
      result.current.pushSheet("map-tools-guide");
    });
    expect(result.current.sheet).toBe("map-tools-guide");
    expect(result.current.isMapToolsGuideOpen).toBe(true);
    expect(result.current.isSettingsOpen).toBe(false);
    expect(result.current.settingsInStack).toBe(true);
    expect(result.current.sheetStack).toEqual(["settings", "map-tools-guide"]);

    act(() => {
      result.current.closeSheet();
    });
    expect(result.current.sheet).toBe("settings");
    expect(result.current.isSettingsOpen).toBe(true);
    expect(result.current.settingsInStack).toBe(true);

    act(() => {
      result.current.closeSheet();
    });
    expect(result.current.sheet).toBe("none");
    expect(result.current.sheetStack).toEqual([]);
  });

  it("closeAllSheets clears the stack", () => {
    const { result } = renderHook(() => useMapOverlayState());

    act(() => {
      result.current.openSettings();
      result.current.pushSheet("report-problem");
      result.current.closeAllSheets();
    });
    expect(result.current.sheet).toBe("none");
    expect(result.current.sheetStack).toEqual([]);
  });

  it("push of the same top is a no-op", () => {
    const { result } = renderHook(() => useMapOverlayState());

    act(() => {
      result.current.openSettings();
      result.current.pushSheet("curse-reference");
      result.current.pushSheet("curse-reference");
    });
    expect(result.current.sheetStack).toEqual(["settings", "curse-reference"]);
  });
});
