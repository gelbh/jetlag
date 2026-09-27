import { fireEvent, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { renderWithRouter } from "@/test/renderWithRouter";
import { MapFirstRunSheet } from "./MapFirstRunSheet";

const STORAGE_KEY = "jetlag.mapFirstRunDismissed";

function renderGuide(ui: ReactElement) {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("MapFirstRunSheet", () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("renders iOS entry chrome and dismisses with Got it", () => {
    const onDismiss = vi.fn();

    renderGuide(<MapFirstRunSheet open onDismiss={onDismiss} />);

    expect(
      screen.getByRole("heading", { name: "Map tools" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hunt dock")).toBeInTheDocument();
    expect(screen.getByText("Zone, Pin, Freehand")).toBeInTheDocument();
    expect(screen.getByText("Map, Game, Session")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Got it" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("1");
  });

  it("reopens from Settings with Done after dismiss", () => {
    localStorage.setItem(STORAGE_KEY, "1");

    renderGuide(<MapFirstRunSheet open onDismiss={vi.fn()} forceOpen />);

    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
  });
});
