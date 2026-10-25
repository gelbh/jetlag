import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createIdleSiegeCapture,
  submitSiegeCapture,
} from "@/domain/session/castleSiege/siegeCapture";
import {
  createSiegeClocks,
  DUSK_HEAD_START_SECONDS,
} from "@/domain/session/castleSiege/siegeClocks";
import { createInitialSiegeGuards } from "@/domain/session/castleSiege/siegeGuards";
import { SiegeChrome } from "./SiegeChrome";

describe("SiegeChrome", () => {
  it("renders nothing when inactive (classic)", () => {
    const { container } = render(<SiegeChrome active={false} clock={null} capture={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders mast, pressure, capture slate, and safety stop when active", () => {
    const clock = createSiegeClocks({
      nowMs: Date.now(),
      limitSeconds: 1800,
      endgame: {
        kind: "headStart",
        teamId: "teamB",
        headStartSeconds: DUSK_HEAD_START_SECONDS,
      },
    });
    const submitted = submitSiegeCapture({
      capture: createIdleSiegeCapture(),
      clock,
      guards: createInitialSiegeGuards(),
      nowMs: Date.now(),
      attackingTeamId: "teamB",
      submittedByUid: "uid-b",
      photoStoragePath: "sessions/s1/siegeCaptures/b.jpg",
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) {
      return;
    }

    const onSafetyStop = vi.fn();
    render(
      <SiegeChrome
        active
        clock={clock}
        capture={submitted.capture}
        guardFlash={{ severity: "soft", kind: "travel" }}
        pressure={{ scalar: 42, band: "flag" }}
        onSafetyStop={onSafetyStop}
        onConfirmCapture={vi.fn()}
        onDisputeCapture={vi.fn()}
      />,
    );

    expect(screen.getByTestId("castle-siege-siege-chrome")).toBeInTheDocument();
    expect(screen.getByTestId("castle-siege-siege-mast")).toHaveTextContent(/Siege/);
    expect(screen.getByTestId("castle-siege-siege-mast")).toHaveTextContent(/Head start Team B/);
    expect(screen.getByTestId("castle-siege-guard-flash")).toHaveTextContent(/Soft travel/);
    expect(screen.getByTestId("castle-siege-pressure-plate")).toHaveTextContent(/42/);
    expect(screen.getByTestId("castle-siege-capture-slate")).toHaveTextContent(/pending/);
    expect(screen.getByTestId("castle-siege-capture-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("castle-siege-safety-stop")).toBeInTheDocument();
  });
});
