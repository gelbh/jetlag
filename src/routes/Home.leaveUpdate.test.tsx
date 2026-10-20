import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import { jetlagTheme } from "@/theme/theme";
import { Home } from "./Home";

const requestLeaveAndUpdate = vi.fn();
const dismissLeaveAndUpdatePrompt = vi.fn();
const confirmLeaveAndUpdate = vi.fn(async () => undefined);
const leaveUpdateState = vi.hoisted(() => ({
  leaving: false,
  prompt: null as { title: string; body: string } | null,
}));
const continueSession = vi.hoisted(() => ({
  session: {
    id: "sess-1",
    code: "ABCD",
    gameAreaLabel: "Dublin City",
  } as { id: string; code: string; gameAreaLabel?: string } | null,
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
    leaving: leaveUpdateState.leaving,
    prompt: leaveUpdateState.prompt,
    requestLeaveAndUpdate,
    dismissLeaveAndUpdatePrompt,
    confirmLeaveAndUpdate,
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
  requestLeaveAndUpdate.mockClear();
  dismissLeaveAndUpdatePrompt.mockClear();
  confirmLeaveAndUpdate.mockClear();
  leaveUpdateState.leaving = false;
  leaveUpdateState.prompt = null;
  continueSession.session = { id: "sess-1", code: "ABCD", gameAreaLabel: "Dublin City" };
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
  it("shows a compact Update ready callout with Leave & refresh when session and needsRefresh", () => {
    renderHome();
    expect(screen.getByText(appUpdateCopy.readyTitle)).toBeInTheDocument();
    expect(screen.queryByText(appUpdateCopy.leaveAndUpdateBody)).toBeNull();
    expect(
      screen.getByRole("button", { name: appUpdateCopy.leaveAndUpdateAction }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Return to map for session ABCD in Dublin City/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dublin City/)).toBeInTheDocument();
  });

  it("hides the update callout when needsRefresh is false", () => {
    updateState.needsRefresh = false;
    renderHome();
    expect(screen.queryByText(appUpdateCopy.readyTitle)).toBeNull();
    expect(screen.queryByRole("button", { name: appUpdateCopy.leaveAndUpdateAction })).toBeNull();
    expect(screen.getByRole("button", { name: /Return to map/i })).toBeInTheDocument();
  });

  it("hides Leave & refresh when there is no session", () => {
    continueSession.session = null;
    renderHome();
    expect(screen.queryByRole("button", { name: appUpdateCopy.leaveAndUpdateAction })).toBeNull();
  });

  it("requests leave-and-update when the leave CTA is clicked", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: appUpdateCopy.leaveAndUpdateAction }));
    expect(requestLeaveAndUpdate).toHaveBeenCalledTimes(1);
  });

  it("shows the in-app confirm sheet when a prompt is open", () => {
    leaveUpdateState.prompt = {
      title: appUpdateCopy.leaveAndUpdateConfirmTitle,
      body: appUpdateCopy.leaveAndUpdateConfirmMember,
    };
    renderHome();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(appUpdateCopy.leaveAndUpdateConfirmMember)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^Leave & refresh$/i }));
    expect(confirmLeaveAndUpdate).toHaveBeenCalled();
  });
});
