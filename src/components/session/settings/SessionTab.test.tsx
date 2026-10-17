import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { MapSettingsSessionTab, type MapSettingsSessionTabProps } from "./SessionTab";

const baseProps: MapSettingsSessionTabProps = {
  remoteSession: true,
  keepScreenAwake: false,
  onKeepScreenAwakeChange: vi.fn(),
  lowPowerMode: false,
  onLowPowerModeChange: vi.fn(),
  isHost: true,
  onEndSession: vi.fn(),
};

function renderTab(props: Partial<MapSettingsSessionTabProps> = {}) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MapSettingsSessionTab {...baseProps} {...props} />
    </MantineProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
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

describe("MapSettingsSessionTab", () => {
  it("enables End session for everyone when no end is in flight", () => {
    renderTab();

    expect(screen.getByRole("button", { name: "End session for everyone" })).toBeEnabled();
  });

  it("disables End session for everyone while an end is in flight", () => {
    renderTab({ endSessionInFlight: true });

    expect(screen.getByRole("button", { name: "End session for everyone" })).toBeDisabled();
  });
});
