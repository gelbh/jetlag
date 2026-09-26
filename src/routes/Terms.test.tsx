import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Terms } from "./Terms";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { RouteTransitionTestProvider } from "../test/RouteTransitionTestProvider";

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
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <RouteTransitionTestProvider>
            <Terms />
          </RouteTransitionTestProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Terms of Service" }),
    ).toBeInTheDocument();
  });
});
