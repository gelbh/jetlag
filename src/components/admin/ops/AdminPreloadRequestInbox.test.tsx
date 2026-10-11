import { MantineProvider } from "@mantine/core";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PreloadRequest } from "../../../domain/preloadRequest/preloadRequestTypes";
import { renderWithRouter } from "../../../test/renderWithRouter";
import { jetlagTheme } from "../../../theme/theme";
import { AdminPreloadRequestInbox } from "./AdminPreloadRequestInbox";

const authState = vi.hoisted(() => ({
  state: "loading" as "loading" | "unsigned" | "denied" | "admin",
  user: null as { email: string } | null,
  authReady: true,
  isPermanent: false,
}));

const listState = vi.hoisted(() => ({
  rows: [] as PreloadRequest[],
  error: null as Error | null,
}));

vi.mock("../../../hooks/admin/useAdminAccessState", () => ({
  useAdminAccessState: () => authState,
}));

vi.mock("../../../services/admin/adminPreloadRequests", async () => {
  const actual = await vi.importActual<
    typeof import("../../../services/admin/adminPreloadRequests")
  >("../../../services/admin/adminPreloadRequests");
  return {
    ...actual,
    subscribePreloadRequestList: (
      onChange: (rows: PreloadRequest[]) => void,
      onError: (error: Error) => void,
    ) => {
      onChange(listState.rows);
      if (listState.error) {
        onError(listState.error);
      }
      return () => undefined;
    },
  };
});

vi.mock("../../../services/preloadRequest/preloadRequestApi", () => ({
  updatePreloadRequestStatus: vi.fn(async () => undefined),
}));

vi.mock("../../../services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseAuth: () => ({}),
}));

vi.mock("../../billing/PremiumSignInGate", () => ({
  PremiumSignInGate: ({ continuePath }: { continuePath: string }) => (
    <div data-testid="premium-sign-in-gate">{continuePath}</div>
  ),
}));

function makeRequest(overrides: Partial<PreloadRequest> = {}): PreloadRequest {
  return {
    id: "req-abc12345",
    createdAt: "2026-10-01T12:00:00Z",
    updatedAt: "2026-10-01T12:05:00Z",
    status: "open",
    reporterUid: "uid-1",
    presetSnapshot: { name: "Dublin core", gameSize: "medium", distanceUnit: "kilometers" },
    ...overrides,
  } as PreloadRequest;
}

function renderInbox() {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <AdminPreloadRequestInbox />
    </MantineProvider>,
    { route: "/admin/preload-requests" },
  );
}

afterEach(() => {
  authState.state = "loading";
  authState.user = null;
  listState.rows = [];
  listState.error = null;
});

describe("AdminPreloadRequestInbox", () => {
  it("renders a skeleton while access loads", () => {
    renderInbox();
    expect(screen.getByRole("link", { name: "Back" })).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByText(/Checking admin access/)).not.toBeInTheDocument();
  });

  it("renders the sign-in gate for unsigned users", () => {
    authState.state = "unsigned";
    renderInbox();
    expect(screen.getByTestId("premium-sign-in-gate")).toHaveTextContent("/admin/preload-requests");
    expect(screen.queryByText("Admin access required")).not.toBeInTheDocument();
  });

  it("renders a desk-style denied state without a red alert", () => {
    authState.state = "denied";
    authState.user = { email: "player@example.com" };
    renderInbox();
    expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.queryByText("Admin access required")).not.toBeInTheDocument();
    expect(screen.getByText(/player@example\.com/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back home" })).toBeInTheDocument();
  });

  it("renders the empty plate with a teaching body", () => {
    authState.state = "admin";
    renderInbox();
    expect(screen.getByText("No preload requests")).toBeInTheDocument();
    expect(
      screen.getByText("Preload requests from players appear here when they submit one."),
    ).toBeInTheDocument();
  });

  it("keeps retained rows when the list errors", () => {
    authState.state = "admin";
    listState.rows = [makeRequest()];
    listState.error = new Error("permission-denied");
    renderInbox();
    expect(screen.getByText("permission-denied")).toBeInTheDocument();
    expect(screen.getByText("Dublin core")).toBeInTheDocument();
  });
});
