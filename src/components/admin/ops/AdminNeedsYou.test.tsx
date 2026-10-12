import { TextInput } from "@mantine/core";
import { fireEvent, screen, within } from "@testing-library/react";
import { type ComponentProps, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import type { IncidentRecord } from "@/domain/incident/incidentTypes";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AdminNeedsYou } from "./AdminNeedsYou";

vi.mock("../incident/AdminIncidentDetail", () => ({
  AdminIncidentDetail: ({ incidentId }: { incidentId: string | null }) => (
    <div data-testid="admin-incident-detail">
      {incidentId}
      <TextInput label="Reply" />
    </div>
  ),
}));

vi.mock("../incident/AdminIncidentActions", () => ({
  AdminIncidentActions: () => <aside aria-label="Incident actions" />,
}));

const today = new Date().toISOString();

function makeIncident(overrides: Partial<IncidentRecord> = {}): IncidentRecord {
  return {
    id: "inc-abc12345",
    status: "open",
    createdAt: today,
    updatedAt: today,
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
      reportedAt: today,
    },
    adminPrompt: "## Incident report",
    ...overrides,
  };
}

function renderNeedsYou(props: Partial<ComponentProps<typeof AdminNeedsYou>> = {}) {
  const defaults: ComponentProps<typeof AdminNeedsYou> = {
    incidents: [],
    incidentsLoading: false,
    incidentsError: null,
    selectedIncidentId: null,
    selectedIncident: null,
    onSelectIncident: vi.fn(),
    onBackFromIncident: vi.fn(),
    openGroups: ["incidents"],
    onOpenGroupsChange: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  renderWithAppUi(
    <AdminWorld>
      <AdminNeedsYou {...merged} />
    </AdminWorld>,
  );
  return merged;
}

const groupNotes = (name: string) =>
  within(screen.getByRole("list", { name }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("AdminNeedsYou", () => {
  it("groups incidents by progress and hides closed until Show closed", () => {
    renderNeedsYou({
      incidents: [
        makeIncident({ id: "inc-new", playerNote: "map froze" }),
        makeIncident({ id: "inc-diag", status: "mitigating", playerNote: "timer stuck" }),
        makeIncident({ id: "inc-fix", status: "hotfix_pending", playerNote: "radar wrong" }),
        makeIncident({ id: "inc-today", status: "resolved", playerNote: "pins vanished" }),
        makeIncident({
          id: "inc-old",
          status: "dismissed",
          updatedAt: "2020-01-01T00:00:00Z",
          playerNote: "old report",
        }),
      ],
    });

    expect(screen.getAllByRole("list").map((list) => list.getAttribute("aria-label"))).toEqual([
      "New",
      "Diagnosed",
      "Fix proposed",
      "Resolved today",
    ]);
    expect(groupNotes("New").join()).toContain("map froze");
    expect(groupNotes("Diagnosed").join()).toContain("timer stuck");
    expect(groupNotes("Fix proposed").join()).toContain("radar wrong");
    expect(groupNotes("Resolved today").join()).toContain("pins vanished");
    expect(screen.queryByText("old report")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Show closed" }));

    expect(groupNotes("Closed").join()).toContain("old report");
  });

  it("shows the session code, a status mark and the age on each row", () => {
    renderNeedsYou({ incidents: [makeIncident()] });

    const row = screen.getByRole("button", { name: /map froze/ });
    expect(within(row).getByText("7G2LJH")).toBeInTheDocument();
    expect(within(row).getByText("OPEN").closest("[data-tone]")).toHaveAttribute(
      "data-tone",
      "mispunch",
    );
    expect(row.querySelector("time")).toHaveAttribute("datetime", today);
  });

  it("shows an empty state with a single Show closed control", () => {
    renderNeedsYou({
      incidents: [makeIncident({ status: "resolved", updatedAt: "2020-01-01T00:00:00Z" })],
    });

    expect(screen.getByText("No incidents")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: "Show closed" })).toHaveLength(1);
  });

  it("selects an incident from its row", () => {
    const { onSelectIncident } = renderNeedsYou({
      incidents: [makeIncident({ id: "inc-pick" })],
    });

    fireEvent.click(screen.getByRole("button", { name: /map froze/ }));

    expect(onSelectIncident).toHaveBeenCalledWith("inc-pick");
  });

  it("opens only the groups it is given and reports toggles", () => {
    const { onOpenGroupsChange } = renderNeedsYou({ openGroups: [] });

    const control = screen.getByRole("button", { name: /^Incidents/ });
    expect(control).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(control);

    expect(onOpenGroupsChange).toHaveBeenCalledWith(["incidents"]);
  });

  describe("drill-in", () => {
    const selected = makeIncident({ id: "inc-drill1" });

    function renderDrillIn() {
      return renderNeedsYou({
        incidents: [selected],
        selectedIncidentId: selected.id,
        selectedIncident: selected,
      });
    }

    it("replaces the queue with detail and actions", () => {
      renderDrillIn();

      expect(screen.getByTestId("admin-incident-detail")).toHaveTextContent("inc-drill1");
      expect(screen.getByRole("complementary", { name: "Incident actions" })).toBeInTheDocument();
      expect(screen.queryByRole("checkbox", { name: "Show closed" })).not.toBeInTheDocument();
    });

    it("goes back from the Back button", () => {
      const { onBackFromIncident } = renderDrillIn();

      fireEvent.click(screen.getByRole("button", { name: "Back" }));

      expect(onBackFromIncident).toHaveBeenCalledTimes(1);
    });

    it("goes back on Escape but not from Escape typed in a text field", () => {
      const { onBackFromIncident } = renderDrillIn();

      fireEvent.keyDown(screen.getByRole("textbox", { name: "Reply" }), { key: "Escape" });
      expect(onBackFromIncident).not.toHaveBeenCalled();

      fireEvent.keyDown(document.body, { key: "Escape" });
      expect(onBackFromIncident).toHaveBeenCalledTimes(1);
    });

    it("leaves Escape to another open dialog", () => {
      const { onBackFromIncident } = renderDrillIn();
      const other = document.createElement("div");
      other.setAttribute("role", "dialog");
      other.setAttribute("aria-modal", "true");
      document.body.append(other);
      try {
        fireEvent.keyDown(other, { key: "Escape" });
        expect(onBackFromIncident).not.toHaveBeenCalled();
      } finally {
        other.remove();
      }
    });
  });

  describe("focus", () => {
    function Harness({ incidents }: { incidents: IncidentRecord[] }) {
      const [selectedId, setSelectedId] = useState<string | null>(null);
      return (
        <AdminWorld>
          <AdminNeedsYou
            incidents={incidents}
            incidentsLoading={false}
            incidentsError={null}
            selectedIncidentId={selectedId}
            selectedIncident={incidents.find((row) => row.id === selectedId) ?? null}
            onSelectIncident={setSelectedId}
            onBackFromIncident={() => setSelectedId(null)}
            openGroups={["incidents"]}
            onOpenGroupsChange={vi.fn()}
          />
        </AdminWorld>
      );
    }

    it("focuses Back on entering and the row on leaving the drill-in", () => {
      renderWithAppUi(<Harness incidents={[makeIncident({ id: "inc-focus1" })]} />);

      fireEvent.click(screen.getByRole("button", { name: /map froze/ }));
      expect(screen.getByRole("button", { name: "Back" })).toHaveFocus();

      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(screen.getByRole("button", { name: /map froze/ })).toHaveFocus();
    });

    it("keeps Show closed across a drill-in", () => {
      renderWithAppUi(
        <Harness
          incidents={[
            makeIncident({ id: "inc-old", status: "dismissed", updatedAt: "2020-01-01T00:00:00Z" }),
          ]}
        />,
      );

      fireEvent.click(screen.getByRole("checkbox", { name: "Show closed" }));
      fireEvent.click(screen.getByRole("button", { name: /map froze/ }));
      fireEvent.click(screen.getByRole("button", { name: "Back" }));

      expect(screen.getByRole("checkbox", { name: "Show closed" })).toBeChecked();
      expect(screen.getByRole("button", { name: /map froze/ })).toHaveFocus();
    });

    it("focuses the Incidents control when the left incident has no row", () => {
      const { rerender } = renderWithAppUi(<Harness incidents={[makeIncident()]} />);
      fireEvent.click(screen.getByRole("button", { name: /map froze/ }));

      rerender(<Harness incidents={[]} />);
      fireEvent.click(screen.getByRole("button", { name: "Back" }));

      expect(screen.getByRole("button", { name: "Incidents" })).toHaveFocus();
    });
  });
});
