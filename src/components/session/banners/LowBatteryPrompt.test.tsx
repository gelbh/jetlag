import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LowBatteryPrompt } from "./LowBatteryPrompt";
import { useMapStore } from "@/state/mapStore";
import { resetAllStores } from "@/test/helpers/storeReset";
import { renderWithAppUi } from "../../../test/renderWithAppUi";

const batteryStatus = {
  supported: true,
  level: 0.15,
  charging: false,
};

vi.mock("../../../hooks/location/useBatteryStatus", () => ({
  useBatteryStatus: () => batteryStatus,
}));

describe("LowBatteryPrompt", () => {
  beforeEach(() => {
    resetAllStores();
    sessionStorage.clear();
    batteryStatus.supported = true;
    batteryStatus.level = 0.15;
    batteryStatus.charging = false;
  });

  it("prompts on the map when battery is low", () => {
    const { container } = renderWithAppUi(
      <MemoryRouter initialEntries={["/map"]}>
        <LowBatteryPrompt />
      </MemoryRouter>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Battery low \(15%\)/)).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/map-float-alert|btn-primary/);
  });

  it("does not prompt off the map route", () => {
    renderWithAppUi(
      <MemoryRouter initialEntries={["/"]}>
        <LowBatteryPrompt />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("enables low power mode when accepted", () => {
    renderWithAppUi(
      <MemoryRouter initialEntries={["/map"]}>
        <LowBatteryPrompt />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enable low power" }));

    expect(useMapStore.getState().lowPowerMode).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dismisses for the session when declined", () => {
    renderWithAppUi(
      <MemoryRouter initialEntries={["/map"]}>
        <LowBatteryPrompt />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(useMapStore.getState().lowPowerMode).toBe(false);
    expect(sessionStorage.getItem("jetlag.lowBatteryPromptDismissed")).toBe("1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
