import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { IncidentRecord } from "../../domain/incident/incidentTypes";
import { jetlagTheme } from "../../theme/theme";
import { AdminIncidentInbox } from "./AdminIncidentInbox";

function makeIncident(overrides: Partial<IncidentRecord> = {}): IncidentRecord {
  return {
    id: "inc-abc12345",
    status: "open",
    createdAt: "2026-07-25T12:00:00Z",
    updatedAt: "2026-07-25T12:05:00Z",
    sessionId: "sess-1",
    sessionCode: "7G2LJH",
    reporterUid: "uid-1",
    reporterRole: "seeker",
    playerNote: "map froze",
    diagnostics: {
      appVersion: "0.9.5",
      route: "/map",
      sessionId: "sess-1",
      sessionCode: "7G2LJH",
      playerRole: "seeker",
      uid: "uid-1",
      userAgent: "TestAgent/1.0",
      platform: "web",
      online: true,
      visibilityState: "visible",
      lastClientErrors: [],
      recentOps: [],
      reportedAt: "2026-07-25T12:00:00Z",
    },
    adminPrompt: "## Incident report",
    ...overrides,
  };
}

function renderInbox(props: Partial<ComponentProps<typeof AdminIncidentInbox>> = {}) {
  const defaults = {
    incidents: [] as IncidentRecord[],
    selectedId: null,
    openCount: 0,
    loading: false,
    error: null,
    onSelect: vi.fn(),
  };

  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <AdminIncidentInbox {...defaults} {...props} />
    </MantineProvider>,
  );
}

function follows(earlier: HTMLElement, later: HTMLElement) {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("AdminIncidentInbox empty structure", () => {
  it("keeps empty as title plus one help line with Show closed after", () => {
    renderInbox();

    const title = screen.getByText("No incidents");
    const help = screen.getByText("Player reports appear here when submitted.");
    const showClosed = screen.getByLabelText("Show closed");
    const empty = screen.getByTestId("admin-incident-inbox-empty");

    expect(empty.querySelectorAll(".jl-incident-empty-title")).toHaveLength(1);
    expect(empty.querySelectorAll(".jl-incident-empty-body")).toHaveLength(1);
    expect(follows(title, help)).toBe(true);
    expect(follows(help, showClosed)).toBe(true);
    expect(showClosed.closest(".jl-incident-queue-filter--secondary")).not.toBeNull();
  });

  it("keeps Show closed after empty when only closed incidents are hidden", () => {
    renderInbox({
      incidents: [makeIncident({ id: "inc-closed", status: "resolved" })],
      openCount: 0,
    });

    const title = screen.getByText("No incidents");
    const help = screen.getByText("Player reports appear here when submitted.");
    const showClosed = screen.getByLabelText("Show closed");

    expect(follows(title, help)).toBe(true);
    expect(follows(help, showClosed)).toBe(true);

    fireEvent.click(showClosed);

    expect(screen.getByText(/INC-/i)).toBeInTheDocument();
    expect(screen.queryByTestId("admin-incident-inbox-empty")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Show closed").closest(".jl-incident-queue-filter--secondary")).toBeNull();
  });

  it("places Show closed before rows when the queue has visible incidents", () => {
    renderInbox({
      incidents: [makeIncident()],
      openCount: 1,
    });

    const showClosed = screen.getByLabelText("Show closed");
    const rowId = screen.getByText(/INC-/i);

    expect(screen.queryByTestId("admin-incident-inbox-empty")).not.toBeInTheDocument();
    expect(follows(showClosed, rowId)).toBe(true);
    expect(showClosed.closest(".jl-incident-queue-filter--secondary")).toBeNull();
  });
});
