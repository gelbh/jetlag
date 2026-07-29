import { fireEvent, screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  IncidentDiagnostics,
  IncidentMessageRecord,
  IncidentRecord,
} from "../../domain/incident/incidentTypes";
import { renderWithRouter } from "../../test/renderWithRouter";
import { AdminIncidentDetail } from "./AdminIncidentDetail";
import { AdminIncidentDesk } from "./AdminIncidentDesk";
import { AdminIncidentActions } from "./AdminIncidentActions";

function renderDesk(route: string) {
  return renderWithRouter(
    <Routes>
      <Route path="/admin/incidents" element={<AdminIncidentDesk />} />
      <Route
        path="/admin/incidents/:incidentId"
        element={<AdminIncidentDesk />}
      />
    </Routes>,
    { route },
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

function makeIncident(
  overrides: Partial<IncidentRecord> = {},
): IncidentRecord {
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

vi.mock("../../hooks/admin/useAdminAccessState", () => ({
  useAdminAccessState: () => authState,
}));

vi.mock("../../hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => authState,
}));

vi.mock("../../components/billing/PremiumSignInGate", () => ({
  PremiumSignInGate: ({ continuePath }: { continuePath: string }) => (
    <div data-testid="premium-sign-in-gate">{continuePath}</div>
  ),
}));

vi.mock("../../services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseAuth: () => ({}),
  ensureAnonymousUser: vi.fn(async () => ({ uid: "anon-test" })),
}));

vi.mock("../../services/admin/adminIncidents", async () => {
  const actual = await vi.importActual<
    typeof import("../../services/admin/adminIncidents")
  >("../../services/admin/adminIncidents");
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

vi.mock("../../hooks/incident/useIncidentThread", () => ({
  useIncidentThread: () => ({
    incident: null,
    messages: [],
    error: null,
    sending: false,
    sendMessage: vi.fn(),
  }),
}));

vi.mock("../../hooks/incident/useSupportThread", () => ({
  useSupportThread: () => ({
    incident: null,
    messages: [],
    error: null,
    sending: false,
    summonId: null,
    sendTurn: vi.fn(),
  }),
}));

vi.mock("../../hooks/incident/useHotfixThread", () => ({
  useHotfixThread: () => ({
    messages: [],
    error: null,
  }),
}));

vi.mock("../../hooks/incident/usePendingHostConfirm", () => ({
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
    renderWithRouter(<AdminIncidentDetail incidentId={null} />);

    expect(screen.getByText("Select an incident")).toBeInTheDocument();
    expect(
      screen.getByText(/Choose a report from the queue/i),
    ).toBeInTheDocument();
  });

  it("shows error state when the incident fails to load", () => {
    renderWithRouter(
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

    renderWithRouter(
      <AdminIncidentDetail
        incidentId="inc-abc12345"
        incidentOverride={makeIncident()}
        messagesOverride={messages}
      />,
    );

    expect(screen.getByText("inc-abc12345")).toBeInTheDocument();
    expect(screen.getByText("OPEN")).toBeInTheDocument();
    expect(
      screen.getByText(/Pinned prompt for admins/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Still stuck on the map")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Send" }),
    ).toBeInTheDocument();
  });

  it("switches to support, hotfix, diagnostics, and timeline tabs", () => {
    renderWithRouter(
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
});

describe("AdminIncidentActions", () => {
  it("keeps Launch Cursor agent disabled and wires mitigation + hotfix", async () => {
    const applyMitigationFn = vi.fn().mockResolvedValue({
      mitigationId: "m1",
      type: "soft_reload",
    });
    const publishHotfixFn = vi.fn().mockResolvedValue({
      toVersion: "0.9.5.1",
      graceSeconds: 30,
      fannedOutSessionCount: 2,
    });

    renderWithRouter(
      <AdminIncidentActions
        incidentId="inc-1"
        applyMitigationFn={applyMitigationFn}
        publishHotfixFn={publishHotfixFn}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Launch Cursor agent" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Apply mitigation" }));
    expect(applyMitigationFn).toHaveBeenCalledWith(
      "inc-1",
      "soft_reload",
    );

    fireEvent.change(screen.getByLabelText("Hotfix target version"), {
      target: { value: "0.9.5.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish hotfix" }));
    expect(publishHotfixFn).toHaveBeenCalledWith("inc-1", "0.9.5.1", 30);
  });
});

describe("AdminIncidentDesk gate + mobile stack", () => {
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

    expect(
      screen.getByText(/Sign in with your Google account/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("premium-sign-in-gate")).toHaveTextContent(
      "/admin/incidents",
    );
  });

  it("shows access denied for non-admin users", () => {
    stubMatchMedia(true);
    authState.state = "denied";
    authState.isPermanent = true;
    authState.user = { email: "player@example.com", emailVerified: true };

    renderDesk("/admin/incidents");

    expect(
      screen.getByRole("heading", { name: "Access denied" }),
    ).toBeInTheDocument();
  });

  it("shows empty queue for admin with no incidents", () => {
    stubMatchMedia(true);
    authState.state = "admin";
    authState.isPermanent = true;
    authState.user = { email: "admin@example.com", emailVerified: true };

    renderDesk("/admin/incidents");

    expect(screen.getByText("No incidents")).toBeInTheDocument();
    expect(screen.getByText("Select an incident")).toBeInTheDocument();
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

  it("opens mobile desk on the detail panel for a deep-linked incident", () => {
    stubMatchMedia(false);
    authState.state = "admin";
    authState.isPermanent = true;
    authState.user = { email: "admin@example.com", emailVerified: true };
    listState.incidents = [makeIncident()];

    renderDesk("/admin/incidents/inc-abc12345");

    expect(screen.getByTestId("admin-ops-desk")).toHaveAttribute(
      "data-layout",
      "mobile",
    );
    expect(screen.getByTestId("admin-ops-mobile")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Detail" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByLabelText("Incident queue")).not.toBeInTheDocument();
  });
});
