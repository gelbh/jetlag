import { MantineProvider } from "@mantine/core";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  IncidentDiagnostics,
  IncidentMessageRecord,
  IncidentRecord,
} from "../../../domain/incident/incidentTypes";
import { renderWithRouter } from "../../../test/renderWithRouter";
import { jetlagTheme } from "../../../theme/theme";
import { AdminOpsDesk } from "../ops/AdminOpsDesk";
import { AdminIncidentActions } from "./AdminIncidentActions";
import { AdminIncidentDetail } from "./AdminIncidentDetail";

function renderAdmin(ui: ReactElement, route?: string) {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
    route ? { route } : undefined,
  );
}

function renderDesk(route: string) {
  return renderAdmin(
    <Routes>
      <Route path="/admin/incidents" element={<AdminOpsDesk />} />
      <Route path="/admin/incidents/:incidentId" element={<AdminOpsDesk />} />
    </Routes>,
    route,
  );
}

const diagnostics: IncidentDiagnostics = {
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
  lastClientErrors: [
    {
      name: "GeolocationError",
      message: "permission denied",
      at: "2026-07-25T11:59:00Z",
    },
  ],
  recentOps: ["open-map"],
  reportedAt: "2026-07-25T12:00:00Z",
};

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
    diagnostics,
    adminPrompt: "## Incident report\n\nPinned prompt for admins.",
    ...overrides,
  };
}

const authState = vi.hoisted(() => ({
  state: "loading" as "loading" | "unsigned" | "denied" | "admin",
  user: null as { email: string; emailVerified: boolean } | null,
  authReady: true,
  isPermanent: false,
}));

const listState = vi.hoisted(() => ({
  incidents: [] as IncidentRecord[],
  error: null as Error | null,
}));

vi.mock("../../../hooks/admin/useAdminAccessState", () => ({
  useAdminAccessState: () => authState,
}));

vi.mock("../../../hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => authState,
}));

vi.mock("../../../components/billing/PremiumSignInGate", () => ({
  PremiumSignInGate: ({ continuePath }: { continuePath: string }) => (
    <div data-testid="premium-sign-in-gate">{continuePath}</div>
  ),
}));

vi.mock("../../../services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseAuth: () => ({}),
  ensureAnonymousUser: vi.fn(async () => ({ uid: "anon-test" })),
}));

vi.mock("../../../services/admin/adminIncidents", async () => {
  const actual = await vi.importActual<typeof import("../../../services/admin/adminIncidents")>(
    "../../../services/admin/adminIncidents",
  );
  return {
    ...actual,
    subscribeIncidentList: (
      onChange: (incidents: IncidentRecord[]) => void,
      onError: (error: Error) => void,
    ) => {
      if (listState.error) {
        onError(listState.error);
      } else {
        onChange(listState.incidents);
      }
      return () => {};
    },
  };
});

vi.mock("../../../services/admin/adminPreloadRequests", async () => {
  const actual = await vi.importActual<
    typeof import("../../../services/admin/adminPreloadRequests")
  >("../../../services/admin/adminPreloadRequests");
  return {
    ...actual,
    subscribePreloadRequestList: (onChange: (requests: []) => void) => {
      onChange([]);
      return () => {};
    },
  };
});

vi.mock("../../../hooks/incident/useIncidentThread", () => ({
  useIncidentThread: () => ({
    incident: null,
    messages: [],
    error: null,
    sending: false,
    sendMessage: vi.fn(),
  }),
}));

vi.mock("../../../hooks/incident/useSupportThread", () => ({
  useSupportThread: () => ({
    incident: null,
    messages: [],
    error: null,
    sending: false,
    summonId: null,
    sendTurn: vi.fn(),
  }),
}));

vi.mock("../../../hooks/incident/useHotfixThread", () => ({
  useHotfixThread: () => ({
    messages: [],
    error: null,
  }),
}));

vi.mock("../../../hooks/incident/usePendingHostConfirm", () => ({
  usePendingHostConfirm: () => ({
    pending: null,
    confirms: [],
    error: null,
  }),
}));

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("AdminIncidentDetail", () => {
  it("shows empty state when no incident is selected", () => {
    renderAdmin(<AdminIncidentDetail incidentId={null} />);

    expect(screen.getByText("Select an incident")).toBeInTheDocument();
    expect(screen.getByText(/Choose a report from the queue/i)).toBeInTheDocument();
  });

  it("shows error state when the incident fails to load", () => {
    renderAdmin(
      <AdminIncidentDetail
        incidentId="inc-missing"
        incidentOverride={null}
        errorOverride={new Error("Permission denied")}
      />,
    );

    expect(screen.getByText("Incident error")).toBeInTheDocument();
    expect(screen.getByText("Permission denied")).toBeInTheDocument();
  });

  it("renders pinned prompt, chat tab, and composer", () => {
    const messages: IncidentMessageRecord[] = [
      {
        id: "msg-1",
        incidentId: "inc-abc12345",
        sender: "player",
        createdAt: "2026-07-25T12:01:00Z",
        text: "Still stuck on the map",
        kind: "chat",
      },
    ];

    renderAdmin(
      <AdminIncidentDetail
        incidentId="inc-abc12345"
        incidentOverride={makeIncident()}
        messagesOverride={messages}
      />,
    );

    expect(screen.getByText("inc-abc12345")).toBeInTheDocument();
    // Same tone as the incident's row in Needs you (new = mispunch).
    expect(screen.getByText("OPEN").closest("[data-tone]")).toHaveAttribute(
      "data-tone",
      "mispunch",
    );
    expect(screen.getByText("7G2LJH")).toBeInTheDocument();
    expect(screen.getByText(/Pinned prompt for admins/i)).toBeInTheDocument();
    expect(screen.getByText("Still stuck on the map")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("switches to support, hotfix, diagnostics, and timeline tabs", () => {
    renderAdmin(
      <AdminIncidentDetail
        incidentId="inc-abc12345"
        incidentOverride={makeIncident({
          mitigations: [
            {
              id: "mit-1",
              type: "soft_reload",
              appliedAt: "2026-07-25T12:06:00Z",
              appliedByUid: "admin-1",
            },
          ],
        })}
        messagesOverride={[]}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Support" }));
    expect(screen.getByTestId("support-agent-chat")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Hotfix" }));
    expect(screen.getByTestId("admin-hotfix-thread")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Diagnostics" }));
    expect(screen.getByText("App version")).toBeInTheDocument();
    expect(screen.getByText("0.9.5")).toBeInTheDocument();
    expect(screen.getByText("/map")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Timeline" }));
    expect(screen.getByText(/Mitigation applied: soft_reload/i)).toBeInTheDocument();
  });

  it("links the PostHog issue on diagnostics for alert-sourced incidents", () => {
    const url = "https://eu.posthog.com/project/232295/error_tracking/fingerprint/fp-1";
    renderAdmin(
      <AdminIncidentDetail
        incidentId="posthog-iss-1"
        incidentOverride={makeIncident({
          id: "posthog-iss-1",
          posthogIssue: { id: "iss-1", name: "TypeError", url },
        })}
        messagesOverride={[]}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Diagnostics" }));
    expect(screen.getByRole("link", { name: "TypeError" })).toHaveAttribute("href", url);
  });
});

describe("AdminIncidentActions", () => {
  it("launches Cursor agent and wires mitigation + hotfix", async () => {
    const applyMitigationFn = vi.fn().mockResolvedValue({
      mitigationId: "m1",
      type: "soft_reload",
    });
    const publishHotfixFn = vi.fn().mockResolvedValue({
      toVersion: "0.9.5.1",
      graceSeconds: 30,
      fannedOutSessionCount: 2,
    });
    const launchCursorAgentFn = vi.fn().mockResolvedValue({
      launched: true,
      agentId: "bc-1",
      agentUrl: "https://cursor.com/agents/bc-1",
      status: "launched",
    });

    renderAdmin(
      <AdminIncidentActions
        incidentId="inc-1"
        applyMitigationFn={applyMitigationFn}
        publishHotfixFn={publishHotfixFn}
        launchCursorAgentFn={launchCursorAgentFn}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Launch agent" }));
    expect(launchCursorAgentFn).toHaveBeenCalledWith("inc-1");
    expect(await screen.findByRole("button", { name: "Open agent" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply mitigation" }));
    expect(applyMitigationFn).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Apply Soft reload" }));
    await waitFor(() => expect(applyMitigationFn).toHaveBeenCalledWith("inc-1", "soft_reload"));

    fireEvent.change(screen.getByLabelText("Hotfix target version"), {
      target: { value: "0.9.5.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish hotfix" }));
    expect(publishHotfixFn).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Publish 0.9.5.1" }));
    await waitFor(() => expect(publishHotfixFn).toHaveBeenCalledWith("inc-1", "0.9.5.1", 30));
  });

  it("dismisses only after confirm, and Cancel calls nothing", async () => {
    const updateStatusFn = vi.fn().mockResolvedValue({ status: "dismissed" });
    renderAdmin(
      <AdminIncidentActions incidentId="inc-1" status="open" updateStatusFn={updateStatusFn} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(updateStatusFn).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss incident" }));
    await waitFor(() => expect(updateStatusFn).toHaveBeenCalledWith("inc-1", "dismissed"));
  });

  it("names the session when ending it", async () => {
    renderAdmin(
      <AdminIncidentActions
        incidentId="inc-1"
        status="open"
        sessionCode="ABCD"
        applyMitigationFn={vi.fn().mockResolvedValue({ mitigationId: "m", type: "end_session" })}
      />,
    );
    fireEvent.change(screen.getByLabelText("Mitigation type"), {
      target: { value: "end_session" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply mitigation" }));
    expect(await screen.findByText("Start the end game for ABCD now?")).toBeInTheDocument();
  });

  it("resolves without a confirm and is the only filled action", () => {
    const updateStatusFn = vi.fn().mockResolvedValue({ status: "resolved" });
    renderAdmin(
      <AdminIncidentActions incidentId="inc-1" status="open" updateStatusFn={updateStatusFn} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    expect(updateStatusFn).toHaveBeenCalledWith("inc-1", "resolved");
    for (const name of ["Dismiss", "Apply mitigation", "Publish hotfix"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("data-variant", "default");
    }
  });

  it("closes the dismiss confirm when the incident is resolved elsewhere", async () => {
    const { rerender } = renderAdmin(
      <AdminIncidentActions incidentId="inc-1" status="open" updateStatusFn={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(await screen.findByRole("button", { name: "Dismiss incident" })).toBeInTheDocument();
    rerender(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <AdminIncidentActions incidentId="inc-1" status="resolved" updateStatusFn={vi.fn()} />
      </MantineProvider>,
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Dismiss incident" })).not.toBeInTheDocument(),
    );
  });

  it("opens Cursor agent when already launched", () => {
    const openExternalUrlFn = vi.fn();
    renderAdmin(
      <AdminIncidentActions
        incidentId="inc-1"
        agent={{
          status: "launched",
          cursorAgentId: "bc-live",
          cursorAgentUrl: "https://cursor.com/agents/bc-live",
        }}
        openExternalUrlFn={openExternalUrlFn}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open agent" }));
    expect(openExternalUrlFn).toHaveBeenCalledWith("https://cursor.com/agents/bc-live");
  });

  it("shows Retry launch when misconfigured", async () => {
    const launchCursorAgentFn = vi.fn().mockResolvedValue({
      launched: true,
      agentId: "bc-retry",
      agentUrl: "https://cursor.com/agents/bc-retry",
      status: "launched",
    });

    renderAdmin(
      <AdminIncidentActions
        incidentId="inc-1"
        agent={{ status: "misconfigured", error: "CURSOR_HOTFIX_MISCONFIGURED" }}
        launchCursorAgentFn={launchCursorAgentFn}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry launch" }));
    expect(launchCursorAgentFn).toHaveBeenCalledWith("inc-1");
    expect(await screen.findByRole("button", { name: "Open agent" })).toBeInTheDocument();
  });

  it("shows a waiting state when the agent launched without a link", () => {
    const launchCursorAgentFn = vi.fn();
    renderAdmin(
      <AdminIncidentActions
        incidentId="inc-1"
        agent={{ status: "launched", cursorAgentId: "bc-1", cursorAgentUrl: null }}
        launchCursorAgentFn={launchCursorAgentFn}
      />,
    );
    expect(screen.getByRole("button", { name: "Agent launched, waiting for link" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(launchCursorAgentFn).toHaveBeenCalledWith("inc-1");
  });
});

describe("AdminOpsDesk gate + mobile stack", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    listState.incidents = [];
    listState.error = null;
    authState.state = "unsigned";
    authState.authReady = true;
    authState.user = null;
    authState.isPermanent = false;
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it("shows sign-in gate when signed out", () => {
    stubMatchMedia(true);
    renderDesk("/admin/incidents");

    expect(screen.getByText(/Sign in with your Google account/i)).toBeInTheDocument();
    expect(screen.getByTestId("premium-sign-in-gate")).toHaveTextContent("/admin/incidents");
  });

  it("shows access denied for non-admin users", () => {
    stubMatchMedia(true);
    authState.state = "denied";
    authState.isPermanent = true;
    authState.user = { email: "player@example.com", emailVerified: true };

    renderDesk("/admin/incidents");

    expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
  });

  it("shows empty queue for admin with no incidents", () => {
    stubMatchMedia(true);
    authState.state = "admin";
    authState.isPermanent = true;
    authState.user = { email: "admin@example.com", emailVerified: true };

    renderDesk("/admin/incidents");

    expect(screen.getByText("No incidents")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-incident-detail")).not.toBeInTheDocument();
  });

  it("shows queue error state", () => {
    stubMatchMedia(true);
    authState.state = "admin";
    authState.isPermanent = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    listState.error = new Error("Firestore unavailable");

    renderDesk("/admin/incidents");

    expect(screen.getByText("Queue error")).toBeInTheDocument();
    expect(screen.getByText("Firestore unavailable")).toBeInTheDocument();
  });

  it("opens the mobile incident drill-down for a deep-linked incident", () => {
    stubMatchMedia(false);
    authState.state = "admin";
    authState.isPermanent = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    listState.incidents = [makeIncident()];

    renderDesk("/admin/incidents/inc-abc12345");

    expect(screen.getByTestId("admin-ops-desk")).toHaveAttribute("data-layout", "mobile");
    expect(screen.getByRole("radio", { name: "Needs you" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Incidents" })).not.toBeInTheDocument();
  });
});
