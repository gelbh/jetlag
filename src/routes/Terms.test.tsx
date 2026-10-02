import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { RouteTransitionTestProvider } from "../test/RouteTransitionTestProvider";
import { Terms } from "./Terms";

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

describe("Terms", () => {
  it("renders Mantine shell", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <RouteTransitionTestProvider>
            <Terms />
          </RouteTransitionTestProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(screen.getByRole("heading", { name: "Terms of Service" })).toBeInTheDocument();
  });
});
