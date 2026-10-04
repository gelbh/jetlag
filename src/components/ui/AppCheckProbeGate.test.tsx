import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  markAppCheckArmed,
  resetAppCheckArmedStateForTests,
} from "@/services/core/firebase/appCheckArmedState";
import { AppCheckProbeGate } from "./feedback/AppCheckProbeGate";

const probeAppCheckAvailability = vi.fn();

vi.mock("./feedback/ContentBlockerErrorPage", () => ({
  ContentBlockerErrorPage: () => <div data-testid="content-blocker" />,
}));

vi.mock("../../services/core/firebase/appCheckProbe", () => ({
  probeAppCheckAvailability: (...args: unknown[]) => probeAppCheckAvailability(...args),
}));

describe("AppCheckProbeGate", () => {
  beforeEach(() => {
    probeAppCheckAvailability.mockReset();
    resetAppCheckArmedStateForTests();
  });

  it("does not probe (or load reCAPTCHA) until a consumer arms App Check", async () => {
    probeAppCheckAvailability.mockResolvedValue({ ok: false, reason: "blocked" });

    render(
      <AppCheckProbeGate>
        <div data-testid="app-shell">routes</div>
      </AppCheckProbeGate>,
    );
    await act(async () => {});

    expect(probeAppCheckAvailability).not.toHaveBeenCalled();
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();

    act(() => {
      markAppCheckArmed();
    });

    await waitFor(() => {
      expect(probeAppCheckAvailability).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(screen.getByTestId("content-blocker")).toBeInTheDocument();
    });
  });

  it("keeps children mounted while App Check probe is pending", async () => {
    markAppCheckArmed();
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
