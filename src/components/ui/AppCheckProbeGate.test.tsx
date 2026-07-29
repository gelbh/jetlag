import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppCheckProbeGate } from "./feedback/AppCheckProbeGate";

vi.mock("../../hooks/app/useAuthBootstrapReady", () => ({
  useAuthBootstrapReady: () => true,
}));

const probeAppCheckAvailability = vi.fn();

vi.mock("../../services/core/firebase/appCheckProbe", () => ({
  probeAppCheckAvailability: (...args: unknown[]) =>
    probeAppCheckAvailability(...args),
}));

describe("AppCheckProbeGate", () => {
  beforeEach(() => {
    probeAppCheckAvailability.mockReset();
  });

  it("keeps children mounted while App Check probe is pending", async () => {
    let resolveProbe: (value: { ok: true }) => void = () => {};
    probeAppCheckAvailability.mockReturnValue(
      new Promise<{ ok: true }>((resolve) => {
        resolveProbe = resolve;
      }),
    );

    render(
      <AppCheckProbeGate>
        <div data-testid="app-shell">routes</div>
      </AppCheckProbeGate>,
    );

    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    resolveProbe({ ok: true });
    await waitFor(() => {
      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    });
  });
});
