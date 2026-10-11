import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
import { jetlagTheme } from "../../../theme/theme";
import { AdminSessionRow } from "./AdminSessionRow";

function makeSummary(overrides: Partial<AdminSessionSummary> = {}): AdminSessionSummary {
  return {
    sessionId: "session-1",
    code: "7G2LJH",
    hostUid: "host-1",
    tier: "free",
    gameSize: "small",
    createdAt: "2026-10-11T12:00:00Z",
    memberCount: 2,
    roleCounts: { seeker: 1, hider: 1, observer: 0, admin: 0 },
    timerAccumulatedMs: 0,
    timerRunningSince: null,
    endGameStartedAt: null,
    endGameRequestedAt: null,
    hostAppVersion: null,
    hidingPeriodMinutes: null,
    regionPackId: null,
    regionPackSubregionId: null,
    transitMetroId: null,
    gameAreaLabel: null,
    phase: "seek",
    lastActivityAt: null,
    lastLocationAt: null,
    lastAnnotationAt: null,
    activeAnnotationCount: 0,
    mode: "multiplayer",
    isLive: true,
    liveMultiplayer: true,
    ...overrides,
  };
}

function renderRows(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("AdminSessionRow", () => {
  it("marks the selected row with aria-current", () => {
    renderRows(
      <>
        <AdminSessionRow
          summary={makeSummary()}
          observingCode={null}
          selected
          onMonitor={vi.fn()}
        />
        <AdminSessionRow
          summary={makeSummary({ sessionId: "session-2", code: "ABCDEF" })}
          observingCode={null}
          onMonitor={vi.fn()}
        />
      </>,
    );

    const [selectedRow, otherRow] = screen.getAllByRole("button");
    expect(selectedRow).toHaveAttribute("aria-current", "true");
    expect(otherRow).not.toHaveAttribute("aria-current");
  });

  it("joining shows Joining… and disables all rows' buttons via observingCode", () => {
    renderRows(
      <>
        <AdminSessionRow summary={makeSummary()} observingCode="7G2LJH" onMonitor={vi.fn()} />
        <AdminSessionRow
          summary={makeSummary({ sessionId: "session-2", code: "ABCDEF" })}
          observingCode="7G2LJH"
          onMonitor={vi.fn()}
        />
      </>,
    );

    const [joiningRow, otherRow] = screen.getAllByRole("button");
    expect(joiningRow).toBeDisabled();
    expect(otherRow).toBeDisabled();
    expect(within(joiningRow).getByText("Joining…")).toBeInTheDocument();
    expect(within(otherRow).queryByText("Joining…")).toBeNull();
    expect(within(otherRow).getByText("Monitor")).toBeInTheDocument();
  });

  it("shows the Live chip only when the session is live", () => {
    renderRows(
      <>
        <AdminSessionRow summary={makeSummary()} observingCode={null} onMonitor={vi.fn()} />
        <AdminSessionRow
          summary={makeSummary({ sessionId: "session-2", code: "ABCDEF", isLive: false })}
          observingCode={null}
          onMonitor={vi.fn()}
        />
      </>,
    );

    const [liveRow, idleRow] = screen.getAllByRole("button");
    expect(within(liveRow).getByText("Live")).toBeInTheDocument();
    expect(liveRow).toHaveAttribute("data-live", "true");
    expect(within(idleRow).queryByText("Live")).toBeNull();
    expect(idleRow).not.toHaveAttribute("data-live");
  });
});
