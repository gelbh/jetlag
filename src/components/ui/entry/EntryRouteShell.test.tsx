import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntryRouteShell } from "./EntryRouteShell";
import { jetlagTheme } from "@/theme/theme";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
});

describe("EntryRouteShell", () => {
  it("renders title header and body children", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <EntryRouteShell title="Friends">
            <div>body-slot</div>
          </EntryRouteShell>
        </MemoryRouter>
      </MantineProvider>,
    );

    expect(screen.getByRole("heading", { name: /^friends$/i })).toBeInTheDocument();
    expect(screen.getByText("body-slot")).toBeInTheDocument();
  });
});
