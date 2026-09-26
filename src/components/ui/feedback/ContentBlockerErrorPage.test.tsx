import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { RouteTransitionProvider } from "@/navigation/RouteTransitionContext";
import { ContentBlockerErrorPage } from "./ContentBlockerErrorPage";

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

describe("ContentBlockerErrorPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Safari how-to steps and reloads on Try again", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, host: "localhost", reload });

    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <RouteTransitionProvider>
            <ContentBlockerErrorPage />
          </RouteTransitionProvider>
        </MemoryRouter>
      </MantineProvider>,
    );

    expect(
      screen.getByRole("heading", { name: /Content blocker detected/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Settings → Apps → Safari → Content Blockers/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/localhost/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
