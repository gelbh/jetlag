import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientUpdateRequiredPage } from "./ClientUpdateRequiredPage";

const applyUpdate = vi.fn();

vi.mock("@/hooks/app/useAppUpdateState", () => ({
  useAppUpdateState: () => ({
    applyUpdate,
    inActiveMapSession: false,
    safeToReload: true,
    showMapChip: false,
    showGlobalBanner: false,
    dismissDeferred: () => {},
    hotfixGraceActive: false,
    hotfixGraceSecondsRemaining: null,
    hotfixRequiredMinAppVersion: null,
  }),
}));

describe("ClientUpdateRequiredPage", () => {
  it("Refresh applies the service-worker update path (not soft reload alone)", () => {
    render(<ClientUpdateRequiredPage minVersion="0.11.0" />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});
