import { Component, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { RouteTransitionProvider } from "@/navigation/RouteTransitionContext";
import { MapErrorBoundary } from "./MapErrorBoundary";

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

class Boom extends Component {
  render(): ReactNode {
    throw new Error("map boom");
  }
}

describe("MapErrorBoundary", () => {
  it("renders AppErrorPage without Survey float chrome", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <RouteTransitionProvider>
            <MapErrorBoundary>
              <Boom />
            </MapErrorBoundary>
          </RouteTransitionProvider>
        </MemoryRouter>
      </MantineProvider>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /refresh now/i }),
    ).toBeInTheDocument();
    expect(container.querySelector(".map-float-alert")).toBeNull();
    expect(container.querySelector(".mantine-Title-root")).toBeTruthy();
    spy.mockRestore();
  });
});
