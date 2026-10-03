import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { ClientUpdateRequiredPage } from "./ClientUpdateRequiredPage";

const applyUpdate = vi.fn();

vi.mock("@/hooks/app/useAppUpdateState", () => ({
  useAppUpdateState: () => ({
    applyUpdate,
    inActiveMapSession: false,
    safeToReload: true,
    showGlobalBanner: false,
    hotfixGraceActive: false,
    hotfixGraceSecondsRemaining: null,
    hotfixRequiredMinAppVersion: null,
  }),
}));

beforeEach(() => {
  applyUpdate.mockClear();
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

describe("ClientUpdateRequiredPage", () => {
  it("Refresh applies the service-worker update path (not soft reload alone)", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <ClientUpdateRequiredPage minVersion="0.11.0" />
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});
