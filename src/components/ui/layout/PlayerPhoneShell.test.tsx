import { MantineProvider } from "@mantine/core";
import { act, render, screen } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DrawerSheet } from "@/components/ui/sheets/DrawerSheet";
import { LANDSCAPE_MAP_DOMINANT_MEDIA, PHONE_SHELL_MAX_WIDTH_PX } from "@/theme/phoneShell";
import { jetlagTheme } from "@/theme/theme";
import { PlayerPhoneShell } from "./PlayerPhoneShell";
import { setPlayerPhoneShellPortalHost } from "./playerPhoneShellPortalHost";

afterEach(() => {
  setPlayerPhoneShellPortalHost(null);
  vi.unstubAllGlobals();
});

describe("PlayerPhoneShell", () => {
  it("uses the locked phone shell max width", () => {
    expect(PHONE_SHELL_MAX_WIDTH_PX).toBe(440);
  });

  it("constrains children to phone max width", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <PlayerPhoneShell>
          <div data-testid="child">x</div>
        </PlayerPhoneShell>
      </MantineProvider>,
    );
    const shell = screen.getByTestId("player-phone-shell");
    // Mantine rem-scales maw={PHONE_SHELL_MAX_WIDTH_PX} via the token.
    expect(shell).toHaveStyle({
      maxWidth: `calc(${PHONE_SHELL_MAX_WIDTH_PX / 16}rem * var(--mantine-scale))`,
    });
    expect(shell).toHaveAttribute("data-player-phone-shell");
    expect(shell).toHaveStyle({ transform: "translateZ(0)" });
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("drops the max width in phone landscape", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === LANDSCAPE_MAP_DOMINANT_MEDIA,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <PlayerPhoneShell>
          <div>x</div>
        </PlayerPhoneShell>
      </MantineProvider>,
    );
    expect(screen.getByTestId("player-phone-shell").style.maxWidth).toBe("");
  });

  it("drops the max width after hydrating portrait prerender markup in phone landscape", async () => {
    const tree = (
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <PlayerPhoneShell>
          <div>x</div>
        </PlayerPhoneShell>
      </MantineProvider>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.appendChild(container);
    expect(
      container.querySelector<HTMLElement>('[data-testid="player-phone-shell"]')!.style.maxWidth,
    ).not.toBe("");

    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === LANDSCAPE_MAP_DOMINANT_MEDIA,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    let root: Root | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, tree);
      });

      expect(
        container.querySelector<HTMLElement>('[data-testid="player-phone-shell"]')!.style.maxWidth,
      ).toBe("");
    } finally {
      act(() => root?.unmount());
      container.remove();
    }
  });

  it("keeps an open drawer overlay width within the phone shell", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <div style={{ width: 1280 }}>
          <PlayerPhoneShell>
            <DrawerSheet open onClose={() => {}} ariaLabel="Shell drawer">
              sheet body
            </DrawerSheet>
          </PlayerPhoneShell>
        </div>
      </MantineProvider>,
    );

    const shell = screen.getByTestId("player-phone-shell");
    const overlay = document.querySelector(".mantine-Drawer-overlay") as HTMLElement | null;
    expect(overlay).not.toBeNull();
    expect(shell.contains(overlay!)).toBe(true);
    expect(getComputedStyle(overlay!).position).toBe("absolute");

    Object.defineProperty(shell, "clientWidth", {
      configurable: true,
      value: PHONE_SHELL_MAX_WIDTH_PX,
    });
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(overlay!, "clientWidth", {
      configurable: true,
      get() {
        return shell.clientWidth;
      },
    });

    expect(overlay!.clientWidth).toBe(shell.clientWidth);
    expect(overlay!.clientWidth).toBeLessThanOrEqual(PHONE_SHELL_MAX_WIDTH_PX);
    expect(overlay!.clientWidth).toBeLessThan(document.documentElement.clientWidth);
  });
});
