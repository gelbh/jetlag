import { TextInput } from "@mantine/core";
import { fireEvent, screen, within } from "@testing-library/react";
import { type ComponentProps, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AdminWorld } from "@/components/admin/shared/AdminWorld";
import type { IncidentRecord } from "@/domain/incident/incidentTypes";
import type { PreloadRequest } from "@/domain/preloadRequest/preloadRequestTypes";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AdminNeedsYou, type NeedsYouGroup } from "./AdminNeedsYou";

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

const updateStatus = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@/services/preloadRequest/preloadRequestApi", () => ({
  updatePreloadRequestStatus: updateStatus,
}));

function makeRequest(overrides: Partial<PreloadRequest> = {}): PreloadRequest {
  return {
    id: "req-abc12345",
    createdAt: today,
    updatedAt: today,
    status: "open",
    reporterUid: "uid-1",
    presetSnapshot: { name: "Dublin core", gameSize: "medium", distanceUnit: "metric" },
    ...overrides,
  } as PreloadRequest;
}

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
    preloadRequests: [],
    preloadLoading: false,
    preloadError: null,
    selectedPreload: null,
    onSelectPreload: vi.fn(),
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
    function Harness({
      incidents = [],
      requests = [],
      groups = ["incidents"],
    }: {
      incidents?: IncidentRecord[];
      requests?: PreloadRequest[];
      groups?: NeedsYouGroup[];
    }) {
      const [selectedId, setSelectedId] = useState<string | null>(null);
      const [preloadId, setPreloadId] = useState<string | null>(null);
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
            preloadRequests={requests}
            preloadLoading={false}
            preloadError={null}
            selectedPreload={requests.find((row) => row.id === preloadId) ?? null}
            onSelectPreload={setPreloadId}
            openGroups={groups}
            onOpenGroupsChange={vi.fn()}
          />
        </AdminWorld>
      );
    }

    it("returns focus to the preload row and keeps its Show closed after a drill-in", () => {
      renderWithAppUi(
        <Harness
          requests={[makeRequest({ id: "req-done1", status: "shipped" })]}
          groups={["preload"]}
        />,
      );
      const panel = () => screen.getByRole("region", { name: "Preload requests" });

      fireEvent.click(within(panel()).getByRole("checkbox", { name: "Show closed" }));
      fireEvent.click(within(panel()).getByRole("button", { name: /Dublin core/ }));
      expect(screen.getByRole("button", { name: "Back" })).toHaveFocus();

      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(within(panel()).getByRole("checkbox", { name: "Show closed" })).toBeChecked();
      expect(within(panel()).getByRole("button", { name: /Dublin core/ })).toHaveFocus();
    });

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

  describe("preload requests", () => {
    const renderPreload = (props: Partial<ComponentProps<typeof AdminNeedsYou>>) =>
      renderNeedsYou({ openGroups: ["preload"], ...props });
    const panel = () => screen.getByRole("region", { name: "Preload requests" });

    it("renders the empty plate with a teaching body", () => {
      renderPreload({});

      expect(within(panel()).getByText("No preload requests")).toBeInTheDocument();
      expect(
        within(panel()).getByText(
          "Preload requests from players appear here when they submit one.",
        ),
      ).toBeInTheDocument();
    });

    it("points at Show closed when only closed requests exist", () => {
      renderPreload({ preloadRequests: [makeRequest({ status: "shipped" })] });

      expect(within(panel()).queryByText("No preload requests")).not.toBeInTheDocument();
      expect(within(panel()).getByText("No open preload requests")).toBeInTheDocument();
      expect(
        within(panel()).getByText("Turn on Show closed to see shipped and declined requests."),
      ).toBeInTheDocument();
    });

    it("keeps retained rows when the list errors", () => {
      renderPreload({ preloadRequests: [makeRequest()], preloadError: "permission-denied" });

      const alert = within(panel()).getByRole("alert");
      expect(alert).toHaveAttribute("data-tone", "mispunch");
      expect(within(alert).getByText("Couldn't load preload requests")).toBeInTheDocument();
      expect(within(alert).getByText("permission-denied")).toBeInTheDocument();
      expect(within(panel()).getByText("Dublin core")).toBeInTheDocument();
    });

    it("lists open requests with a status mark and age, closed only after Show closed", () => {
      renderPreload({
        preloadRequests: [
          makeRequest({ id: "req-open1" }),
          makeRequest({
            id: "req-done1",
            status: "shipped",
            presetSnapshot: { name: "Cork loop", gameSize: "small", distanceUnit: "metric" },
          } as Partial<PreloadRequest>),
        ],
      });

      const row = within(panel()).getByRole("button", { name: /Dublin core/ });
      expect(within(row).getByText("OPEN").closest("[data-tone]")).toHaveAttribute(
        "data-tone",
        "mispunch",
      );
      expect(row.querySelector("time")).toHaveAttribute("datetime", today);
      expect(within(panel()).queryByText("Cork loop")).not.toBeInTheDocument();

      fireEvent.click(within(panel()).getByRole("checkbox", { name: "Show closed" }));

      expect(within(panel()).getByText("Cork loop")).toBeInTheDocument();
    });

    it("selects a request from its row", () => {
      const { onSelectPreload } = renderPreload({
        preloadRequests: [makeRequest({ id: "req-pick" })],
      });

      fireEvent.click(within(panel()).getByRole("button", { name: /Dublin core/ }));

      expect(onSelectPreload).toHaveBeenCalledWith("req-pick");
    });

    it("drills into detail with status actions and goes back on Escape", () => {
      const request = makeRequest();
      const { onSelectPreload } = renderPreload({
        preloadRequests: [request],
        selectedPreload: request,
      });

      expect(screen.getByRole("heading", { name: "Dublin core" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Mark declined" })).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Preload requests" })).not.toBeInTheDocument();

      fireEvent.keyDown(document.body, { key: "Escape" });
      expect(onSelectPreload).toHaveBeenCalledWith(null);
    });

    it("shows a titled mispunch Alert when a status update fails", async () => {
      updateStatus.mockRejectedValueOnce(new Error("network down"));
      const request = makeRequest();
      renderPreload({ preloadRequests: [request], selectedPreload: request });

      fireEvent.click(screen.getByRole("button", { name: "Mark accepted" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveAttribute("data-tone", "mispunch");
      expect(within(alert).getByText("Couldn't update request")).toBeInTheDocument();
      expect(within(alert).getByText("network down")).toBeInTheDocument();
      expect(updateStatus).toHaveBeenCalledWith("req-abc12345", "accepted");
    });
  });
});
