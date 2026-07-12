import { describe, expect, it } from "vitest";
import {
  PANEL_MINIMIZE_VELOCITY_PX_MS,
  PANEL_SNAP_FRACTION,
  shouldExpandPanelSnap,
  shouldMinimizePanelSnap,
} from "./usePanelDrag";

describe("usePanelDrag", () => {
  const panelHeight = 320;

  it("minimizes when dragged past the snap fraction", () => {
    expect(
      shouldMinimizePanelSnap(panelHeight * PANEL_SNAP_FRACTION, panelHeight, 0),
    ).toBe(true);
    expect(
      shouldMinimizePanelSnap(
        panelHeight * PANEL_SNAP_FRACTION - 1,
        panelHeight,
        0,
      ),
    ).toBe(false);
  });

  it("minimizes on a fast downward flick", () => {
    expect(
      shouldMinimizePanelSnap(
        0,
        panelHeight,
        PANEL_MINIMIZE_VELOCITY_PX_MS + 0.05,
      ),
    ).toBe(true);
  });

  it("expands when dragged up past the snap fraction", () => {
    expect(
      shouldExpandPanelSnap(-panelHeight * PANEL_SNAP_FRACTION, panelHeight, 0),
    ).toBe(true);
    expect(
      shouldExpandPanelSnap(
        -(panelHeight * PANEL_SNAP_FRACTION - 1),
        panelHeight,
        0,
      ),
    ).toBe(false);
  });

  it("expands on a fast upward flick", () => {
    expect(
      shouldExpandPanelSnap(
        0,
        panelHeight,
        -(PANEL_MINIMIZE_VELOCITY_PX_MS + 0.05),
      ),
    ).toBe(true);
  });
});
