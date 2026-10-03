import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOTION_SHEET_PRESENT_MS } from "@/domain/device/motion/motionTokens";
import { useMapStore } from "@/state/mapStore";
import { resetAllStores } from "@/test/helpers/storeReset";
import { jetlagTheme } from "@/theme/theme";
import { DrawerSheet } from "./DrawerSheet";
import { resolveDrawerSheetTransitionProps } from "./drawerSheetTransition";

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

/** Flush drag offset updates that schedule via rAF. */
function stubSyncRaf() {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
}

describe("DrawerSheet", () => {
  beforeEach(() => {
    resetAllStores();
    stubMatchMedia(false);
    stubSyncRaf();
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  it("applies translateY on the chrome wrapper while dragging (Verify #1 live follow)", () => {
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
    fireEvent.pointerDown(handle, {
      pointerId: 1,
      button: 0,
      clientY: 100,
    });
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      clientY: 160,
    });

    const sheet = screen.getByTestId("mantine-drawer-sheet");
    expect(sheet.style.transform).toContain("translateY(60px)");
    expect(sheet.style.backgroundColor).toBe("var(--color-canvas)");
    expect(sheet.style.borderTopLeftRadius).toBe("24px");
    expect(onClose).not.toHaveBeenCalled();
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

  it("clears stale drag translateY when reopening after grabber dismiss", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      withAppUi(
        <DrawerSheet open onClose={onClose} ariaLabel="Changelog">
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    const handle = screen.getByRole("button", {
      name: "Drag sheet down to dismiss",
    });
    dragGrabberDown(handle, 120);
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      withAppUi(
        <DrawerSheet open={false} onClose={onClose} ariaLabel="Changelog">
          <p>body</p>
        </DrawerSheet>,
      ),
    );
    rerender(
      withAppUi(
        <DrawerSheet open onClose={onClose} ariaLabel="Changelog">
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    const sheet = screen.getByTestId("mantine-drawer-sheet");
    expect(sheet.style.transform).not.toContain("translateY");
  });

  it("dismisses from grabber even when the host body is scrolled", () => {
    const onClose = vi.fn();
    render(
      withAppUi(
        <DrawerSheet open onClose={onClose} ariaLabel="Settings">
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    const sheet = screen.getByTestId("mantine-drawer-sheet");
    const scroll = sheet.querySelector(".jl-scroll");
    expect(scroll).toBeTruthy();
    Object.defineProperty(scroll, "scrollTop", {
      configurable: true,
      value: 80,
    });

    const handle = screen.getByRole("button", {
      name: "Drag sheet down to dismiss",
    });
    dragGrabberDown(handle, 120);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss from gesture when dismissible is false (Verify #2)", () => {
    const onClose = vi.fn();
    render(
      withAppUi(
        <DrawerSheet open onClose={onClose} ariaLabel="Forced" dismissible={false}>
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    expect(screen.queryByRole("button", { name: "Drag sheet down to dismiss" })).toBeNull();
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
        <DrawerSheet open onClose={onClose} ariaLabel="Ask" mapInteractive>
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

  it("exposes a finger-reliable full-width grabber hit target (Verify #6)", () => {
    render(
      withAppUi(
        <DrawerSheet open onClose={() => {}} ariaLabel="Settings">
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    const handle = screen.getByRole("button", {
      name: "Drag sheet down to dismiss",
    });
    // Tailwind min-h-11 = 2.75rem = 44px finger target; pill stays 36×5.
    expect(handle.className).toMatch(/min-h-11/);
    expect(handle.className).toMatch(/\bw-full\b/);
    const pill = handle.querySelector("[aria-hidden]") as HTMLElement | null;
    expect(pill).toBeTruthy();
    expect(pill!.style.width).toBe("36px");
    expect(pill!.style.height).toBe("5px");
  });

  it("insets scroll body horizontally so children are not edge-flush (Verify #7)", () => {
    render(
      withAppUi(
        <DrawerSheet open onClose={() => {}} ariaLabel="Settings">
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    const sheet = screen.getByTestId("mantine-drawer-sheet");
    const scroll = sheet.querySelector(".jl-scroll") as HTMLElement | null;
    expect(scroll).toBeTruthy();
    expect(scroll!.style.paddingInline).toBe("1rem");
  });

  it("applies bottom safe-area on scroll, not an empty gesture-wrapper bar (Verify #8)", () => {
    render(
      withAppUi(
        <DrawerSheet open onClose={() => {}} ariaLabel="Settings">
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    const sheet = screen.getByTestId("mantine-drawer-sheet");
    expect(sheet.style.paddingBottom).not.toContain("--safe-area-bottom");

    const scroll = sheet.querySelector(".jl-scroll") as HTMLElement | null;
    expect(scroll).toBeTruthy();
    expect(scroll!.style.paddingBottom).toContain("--safe-area-bottom");
  });

  it("uses contentStyle paddingBottom on scroll and skips safe-area stack (keyboard)", () => {
    render(
      withAppUi(
        <DrawerSheet open onClose={() => {}} ariaLabel="Chat" contentStyle={{ paddingBottom: 120 }}>
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    const sheet = screen.getByTestId("mantine-drawer-sheet");
    expect(sheet.style.paddingBottom).toBe("");

    const scroll = sheet.querySelector(".jl-scroll") as HTMLElement | null;
    expect(scroll).toBeTruthy();
    expect(scroll!.style.paddingBottom).toBe("120px");
    expect(scroll!.style.paddingBottom).not.toContain("--safe-area-bottom");
  });

  it("applies calc() contentStyle paddingBottom on scroll (keyboard CSS expression)", () => {
    render(
      withAppUi(
        <DrawerSheet
          open
          onClose={() => {}}
          ariaLabel="Chat"
          contentStyle={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom))" }}
        >
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    const scroll = screen
      .getByTestId("mantine-drawer-sheet")
      .querySelector(".jl-scroll") as HTMLElement | null;
    expect(scroll).toBeTruthy();
    expect(scroll!.style.paddingBottom).toBe("calc(120px + env(safe-area-inset-bottom))");
  });

  it("applies keyboard paddingBottom on child scrollMode body (Chat path)", () => {
    render(
      withAppUi(
        <DrawerSheet
          open
          onClose={() => {}}
          ariaLabel="Chat"
          scrollMode="child"
          contentStyle={{ paddingBottom: 96 }}
        >
          <p>body</p>
        </DrawerSheet>,
      ),
    );

    const sheet = screen.getByTestId("mantine-drawer-sheet");
    expect(sheet.style.paddingBottom).toBe("");
    expect(sheet.querySelector(".jl-scroll")).toBeNull();

    const body = sheet.querySelector(
      ".flex.min-h-0.flex-1.flex-col.overflow-hidden",
    ) as HTMLElement | null;
    expect(body).toBeTruthy();
    expect(body!.style.paddingBottom).toBe("96px");
    expect(body!.style.paddingBottom).not.toContain("--safe-area-bottom");
  });
});
