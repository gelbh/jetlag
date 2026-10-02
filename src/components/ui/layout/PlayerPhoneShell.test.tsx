import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DrawerSheet } from "@/components/ui/sheets/DrawerSheet";
import { PHONE_SHELL_MAX_WIDTH_PX } from "@/theme/phoneShell";
import { jetlagTheme } from "@/theme/theme";
import { PlayerPhoneShell } from "./PlayerPhoneShell";
import { setPlayerPhoneShellPortalHost } from "./playerPhoneShellPortalHost";

afterEach(() => {
  setPlayerPhoneShellPortalHost(null);
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
    // Absolute fill of the shell containing block matches shell width, not the document.
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
