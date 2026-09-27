import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it } from "vitest";
import { PlayerPhoneShell } from "./PlayerPhoneShell";
import { PHONE_SHELL_MAX_WIDTH_PX } from "@/theme/phoneShell";
import { jetlagTheme } from "@/theme/theme";

describe("PlayerPhoneShell", () => {
  it("constrains children to phone max width", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <PlayerPhoneShell>
          <div data-testid="child">x</div>
        </PlayerPhoneShell>
      </MantineProvider>,
    );
    const shell = screen.getByTestId("player-phone-shell");
    // Mantine rem-scales maw={390} → 24.375rem.
    expect(shell).toHaveStyle({
      maxWidth: `calc(${PHONE_SHELL_MAX_WIDTH_PX / 16}rem * var(--mantine-scale))`,
    });
    expect(shell).toHaveAttribute("data-player-phone-shell");
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
