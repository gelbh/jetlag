import { screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { renderWithRouter } from "../test/renderWithRouter";
import { DevScenarios } from "./DevScenarios";

const gateState = vi.hoisted(() => ({
  enabled: true,
}));

vi.mock("../test/scenarios/devGate", () => ({
  isDevScenariosEnabled: () => gateState.enabled,
}));

vi.mock("@/config/env", () => ({
  clientEnvUsesFirebaseEmulator: () => false,
}));

beforeEach(() => {
  gateState.enabled = true;
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

describe("DevScenarios", () => {
  it("redirects home when the gate is off", () => {
    gateState.enabled = false;
    renderWithRouter(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <DevScenarios />
      </MantineProvider>,
      { route: "/dev/scenarios" },
    );
    expect(screen.queryByRole("heading", { name: /scenarios/i })).toBeNull();
  });

  it("lists dublin-local-map when the gate is on", () => {
    renderWithRouter(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <DevScenarios />
      </MantineProvider>,
      { route: "/dev/scenarios" },
    );
    expect(
      screen.getByRole("heading", { name: /scenarios/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /dublin local map/i }),
    ).toBeInTheDocument();
  });
});
