import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import { jetlagTheme } from "@/theme/theme";
import { Home } from "./Home";

const handleLeaveAndUpdate = vi.fn();
const continueSession = vi.hoisted(() => ({
  session: { id: "sess-1", code: "ABCD" } as { id: string; code: string } | null,
}));
const updateState = vi.hoisted(() => ({
  needsRefresh: true,
  applyUpdate: vi.fn(),
}));

vi.mock("@/hooks/session/useContinueActiveSession", () => ({
  useContinueActiveSession: () => ({
    session: continueSession.session,
    myRole: "seeker",
    continueError: null,
    continuing: false,
    handleContinue: vi.fn(),
  }),
}));

vi.mock("@/hooks/session/useLeaveSessionAndUpdate", () => ({
  useLeaveSessionAndUpdate: () => ({
    leaving: false,
    handleLeaveAndUpdate,
  }),
}));

vi.mock("@/hooks/app/useAppUpdateState", () => ({
  useAppUpdateState: () => ({
    needsRefresh: updateState.needsRefresh,
    safeToReload: false,
    showGlobalBanner: false,
    applyUpdate: updateState.applyUpdate,
    hotfixGraceActive: false,
    hotfixGraceSecondsRemaining: null,
    hotfixRequiredMinAppVersion: null,
  }),
}));

vi.mock("@/navigation/useRouteTransition", () => ({
  useRouteTransition: () => ({ phase: "idle" }),
}));

vi.mock("@/services/core/firebase/authBootstrapState", () => ({
  isFirebaseConfigured: () => false,
  isAuthBootstrapReady: () => true,
  subscribeAuthBootstrapReady: () => () => undefined,
}));

beforeEach(() => {
  handleLeaveAndUpdate.mockClear();
  continueSession.session = { id: "sess-1", code: "ABCD" };
  updateState.needsRefresh = true;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
});

function renderHome() {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("Home leave session & update", () => {
  it("shows Leave session & update when session and needsRefresh", () => {
    renderHome();
    expect(
      screen.getByRole("button", { name: appUpdateCopy.leaveAndUpdateAction }),
    ).toBeInTheDocument();
  });

  it("hides Leave session & update when needsRefresh is false", () => {
    updateState.needsRefresh = false;
    renderHome();
    expect(screen.queryByRole("button", { name: appUpdateCopy.leaveAndUpdateAction })).toBeNull();
  });

  it("hides Leave session & update when there is no session", () => {
    continueSession.session = null;
    renderHome();
    expect(screen.queryByRole("button", { name: appUpdateCopy.leaveAndUpdateAction })).toBeNull();
  });

  it("calls handleLeaveAndUpdate when the leave CTA is clicked", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: appUpdateCopy.leaveAndUpdateAction }));
    expect(handleLeaveAndUpdate).toHaveBeenCalledTimes(1);
  });
});
