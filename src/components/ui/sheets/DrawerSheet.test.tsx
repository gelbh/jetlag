import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { DrawerSheet, resolveDrawerSheetTransitionProps } from "./DrawerSheet";
import { jetlagTheme } from "@/theme/theme";
import { resetAllStores } from "@/test/helpers/storeReset";
import { useMapStore } from "@/state/mapStore";
import { MOTION_SHEET_PRESENT_MS } from "@/domain/device/motion/motionTokens";

function withAppUi(ui: ReactNode) {
  return (
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>
  );
}

function stubMatchMedia(prefersReducedMotion: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: prefersReducedMotion && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

function dragGrabberDown(handle: HTMLElement, deltaY: number) {
  fireEvent.pointerDown(handle, {
    pointerId: 1,
    button: 0,
    clientY: 100,
  });
  fireEvent.pointerMove(handle, {
    pointerId: 1,
    clientY: 100 + deltaY,
  });
  fireEvent.pointerUp(handle, {
    pointerId: 1,
    clientY: 100 + deltaY,
  });
}

describe("DrawerSheet", () => {
  beforeEach(() => {
    resetAllStores();
    stubMatchMedia(false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  it("dismisses when grabber is dragged past the sheet fraction (Verify #1)", () => {
    const onClose = vi.fn();
    render(
      withAppUi(
        <DrawerSheet open onClose={onClose} ariaLabel="Settings">
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    const handle = screen.getByRole("button", {
      name: "Drag sheet down to dismiss",
    });
    // Default sheetHeight in useSheetGesture is 320; 0.28 * 320 ≈ 90.
    dragGrabberDown(handle, 120);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss from gesture when dismissible is false (Verify #2)", () => {
    const onClose = vi.fn();
    render(
      withAppUi(
        <DrawerSheet
          open
          onClose={onClose}
          ariaLabel="Forced"
          dismissible={false}
        >
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    expect(
      screen.queryByRole("button", { name: "Drag sheet down to dismiss" }),
    ).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not dismiss from gesture when decorativeAnimate is false (Verify #2)", () => {
    useMapStore.getState().setLowPowerMode(true);
    const onClose = vi.fn();
    render(
      withAppUi(
        <DrawerSheet open onClose={onClose} ariaLabel="Settings">
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    // Decorative-only grabber bar remains; interactive dismiss button stays off.
    expect(
      screen.queryByRole("button", {
        name: "Drag sheet down to dismiss",
      }),
    ).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps mapInteractive overlay pointer-events none and still dismisses via grabber (Verify #3)", () => {
    const onClose = vi.fn();
    render(
      withAppUi(
        <DrawerSheet
          open
          onClose={onClose}
          ariaLabel="Ask"
          mapInteractive
        >
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    const overlay = document.querySelector(".mantine-Drawer-overlay");
    expect(overlay).toBeTruthy();
    expect((overlay as HTMLElement).style.pointerEvents).toBe("none");

    const handle = screen.getByRole("button", {
      name: "Drag sheet down to dismiss",
    });
    dragGrabberDown(handle, 120);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("resolves open/close transition from sheet tokens and reduced-motion (Verify #4)", () => {
    expect(resolveDrawerSheetTransitionProps(true)).toEqual({
      duration: MOTION_SHEET_PRESENT_MS,
      timingFunction: "var(--ease-ios-standard)",
    });
    expect(resolveDrawerSheetTransitionProps(false)).toEqual({
      duration: 0,
      timingFunction: "var(--ease-ios-standard)",
    });
  });
});
