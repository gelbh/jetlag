import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { RadarLearnDemo } from "./RadarLearnDemo";

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

describe("RadarLearnDemo", () => {
  it("lets a reader pick a distance then answer Yes or No", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <RadarLearnDemo />
      </MantineProvider>,
    );

    expect(screen.getByTestId("radar-hud-body")).toBeInTheDocument();
    expect(screen.getByTestId("ask-catalog-rail")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /500 m/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Yes$/i }));
    expect(screen.getByRole("button", { name: /^Yes$/i })).toHaveAttribute("aria-pressed", "true");
  });
});
