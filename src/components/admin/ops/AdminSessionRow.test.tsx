import { Table } from "@mantine/core";
import { screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import type { AdminSessionSummary } from "@/services/admin/adminSessions";
import { renderWithAppUi } from "@/test/renderWithAppUi";
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

function renderRows(rows: ReactNode) {
  return renderWithAppUi(
    <AdminWorld>
      <Table>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </AdminWorld>,
  );
}

describe("AdminSessionRow", () => {
  it("reverses the monitored row and outlines the cursor row", () => {
    renderRows(
      <>
        <AdminSessionRow
          summary={makeSummary()}
          observingCode={null}
          monitored
          onMonitor={vi.fn()}
        />
        <AdminSessionRow
          summary={makeSummary({ sessionId: "session-2", code: "ABCDEF" })}
          observingCode={null}
          cursor
          onMonitor={vi.fn()}
        />
      </>,
    );

    const [monitoredRow, cursorRow] = screen.getAllByRole("row");
    expect(monitoredRow).toHaveAttribute("aria-current", "true");
    expect(monitoredRow.style.background).toContain("var(--adm-ink)");
    expect(monitoredRow).not.toHaveAttribute("aria-selected");
    expect(cursorRow).not.toHaveAttribute("aria-current");
    expect(cursorRow).toHaveAttribute("aria-selected", "true");
    expect(cursorRow.style.outline).toContain("var(--adm-overprint)");
  });

  it("loads the joining row and disables every row while a join is pending", () => {
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

    const joining = screen.getByRole("button", { name: "Monitor 7G2LJH" });
    const other = screen.getByRole("button", { name: "Monitor ABCDEF" });
    expect(joining).toBeDisabled();
    expect(joining).toHaveAttribute("data-loading");
    expect(other).toBeDisabled();
    expect(other).not.toHaveAttribute("data-loading");
  });

  it("keeps opaque status marks out of the monitored row's reversed ink", () => {
    renderRows(
      <AdminSessionRow
        summary={makeSummary({ isLive: false })}
        observingCode={null}
        monitored
        mispunchCount={1}
        onMonitor={vi.fn()}
      />,
    );

    const row = screen.getByRole("row");
    const marks = [within(row).getByText("Seek, idle"), within(row).getByText("1")].map(
      (label) => label.closest("[data-tone]") as HTMLElement,
    );
    for (const mark of marks) {
      expect(mark.parentElement?.tagName).toBe("TD");
      expect(mark.style.getPropertyValue("--badge-bg")).toContain("var(--adm-paper)");
      expect(mark.style.getPropertyValue("--badge-bg")).not.toContain("transparent");
      for (let node: HTMLElement | null = mark; node && node !== row; node = node.parentElement) {
        expect(node.style.getPropertyValue("--adm-ink")).toBe("");
      }
    }
    const button = screen.getByRole("button", { name: "Monitor 7G2LJH" });
    expect(button.closest("td")?.style.getPropertyValue("--adm-ink")).toBe("var(--adm-paper)");
  });

  it("names the monitor button with the area when there is one", () => {
    renderRows(
      <>
        <AdminSessionRow
          summary={makeSummary({ gameAreaLabel: "Dublin" })}
          observingCode={null}
          onMonitor={vi.fn()}
        />
        <AdminSessionRow
          summary={makeSummary({ sessionId: "session-2", code: "ABCDEF" })}
          observingCode={null}
          onMonitor={vi.fn()}
        />
      </>,
    );

    expect(screen.getByRole("button", { name: "Monitor 7G2LJH, Dublin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Monitor ABCDEF" })).toBeInTheDocument();
  });

  it("labels idle sessions in words, not only by tone", () => {
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

    const [liveRow, idleRow] = screen.getAllByRole("row");
    expect(within(liveRow).getByText("Seek").closest("[data-tone]")).toHaveAttribute(
      "data-tone",
      "live",
    );
    expect(within(liveRow).queryByText(/idle/)).toBeNull();
    expect(within(idleRow).getByText("Seek, idle").closest("[data-tone]")).toHaveAttribute(
      "data-tone",
      "neutral",
    );
  });
});
