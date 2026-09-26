import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Privacy } from "./Privacy";
import { jetlagTheme } from "@/theme/theme";
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

describe("Privacy", () => {
  it("renders Mantine shell", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <RouteTransitionTestProvider>
            <Privacy />
          </RouteTransitionTestProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeInTheDocument();
  });
});
