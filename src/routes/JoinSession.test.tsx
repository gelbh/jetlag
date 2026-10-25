import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "@/domain/map/annotations";
import { JOIN_PREVIEW_PLACEHOLDER_AREA } from "@/domain/session/join/joinPreviewGameArea";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { createTestRemoteSession } from "@/test/fixtures/sessions";
import { jetlagTheme } from "@/theme/theme";
import { JoinSession } from "./JoinSession";

const previewState = vi.hoisted(() => ({
  value: {
    previewSession: null as SessionRecord | null,
    previewPremium: false,
    lookupLoading: false,
    existingRole: null as PlayerRole | null,
    existingCastleSiegeRole: null,
  },
}));

vi.mock("@/hooks/navigation/useAppNavigate", () => ({
  useAppNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/session/useJoinSessionPreview", () => ({
  useJoinSessionPreview: () => previewState.value,
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureFreshAnonymousUser: vi.fn(),
}));

function renderJoin() {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MemoryRouter>
        <JoinSession />
      </MemoryRouter>
    </MantineProvider>,
  );
}

beforeEach(() => {
  previewState.value = {
    previewSession: null,
    previewPremium: false,
    lookupLoading: false,
    existingRole: null,
    existingCastleSiegeRole: null,
  };
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
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function advanceToPasscodeStep() {
  fireEvent.change(screen.getByLabelText(/session code/i), { target: { value: "ABCD" } });
  fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
  fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
  fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
}

describe("JoinSession", () => {
  it("renders session code field and step continue control", () => {
    renderJoin();

    expect(screen.getByLabelText(/session code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^continue$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^join$/i })).toBeInTheDocument();
  });

  it("disables Continue while the session preview is loading", () => {
    previewState.value = { ...previewState.value, lookupLoading: true };

    renderJoin();

    expect(screen.getByRole("button", { name: /^continue$/i })).toBeDisabled();
  });

  it("asks for a teammate's code when the chosen side is occupied", () => {
    previewState.value = {
      ...previewState.value,
      previewSession: createTestRemoteSession({ memberRoles: { leader: "hider" } }),
    };

    renderJoin();
    advanceToPasscodeStep();

    expect(screen.getByText("Ask a teammate on that side for the role code.")).toBeInTheDocument();
    expect(screen.queryByText(/Leave it blank only if/)).not.toBeInTheDocument();
  });

  it("asks for the role code first when occupancy is unknown", () => {
    previewState.value = {
      ...previewState.value,
      previewSession: createTestRemoteSession({
        gameArea: JOIN_PREVIEW_PLACEHOLDER_AREA,
        memberRoles: {},
      }),
    };

    renderJoin();
    advanceToPasscodeStep();

    expect(
      screen.getByText(
        "If anyone is already on that side, ask them for the role code. Leave it blank only if you know you're first.",
      ),
    ).toBeInTheDocument();
  });

  it("shows Castle Siege seat picker on the seat step", () => {
    previewState.value = {
      ...previewState.value,
      previewSession: createTestRemoteSession({
        mode: "castleSiege",
        seriesLength: 3,
      }),
    };

    renderJoin();
    fireEvent.change(screen.getByLabelText(/session code/i), { target: { value: "ABCD" } });
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(screen.getByText("Castle Siege")).toBeInTheDocument();
    expect(screen.getByText("Best of 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(screen.getByRole("radiogroup", { name: /Castle Siege seat/i })).toBeInTheDocument();
  });
});
