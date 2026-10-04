import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { PlayerStickyErrorAlert } from "./PlayerStickyErrorAlert";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

describe("PlayerStickyErrorAlert", () => {
  it("calls primary and secondary action callbacks on click", () => {
    const onAction = vi.fn();
    const onSecondaryAction = vi.fn();

    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <PlayerStickyErrorAlert
          error={{
            title: "Sync failed",
            message: "Could not sync with the session.",
            action: "retry",
            actionLabel: "Retry",
            secondaryAction: "rejoin",
            secondaryActionLabel: "Return to join",
          }}
          onAction={onAction}
          onSecondaryAction={onSecondaryAction}
        />
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Return to join" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onSecondaryAction).toHaveBeenCalledTimes(1);
  });
});
