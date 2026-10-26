import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "@/domain/map/annotations";
import { JOIN_PREVIEW_PLACEHOLDER_AREA } from "@/domain/session/join/joinPreviewGameArea";
import { buildJoinPreviewSession } from "@/domain/session/join/joinPreviewSession";
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

describe("JoinSession", () => {
  it("renders session code without Continue or Join before a preview", () => {
    renderJoin();

    expect(screen.getByLabelText(/session code/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^continue$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^join session$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^join$/i })).toBeInTheDocument();
  });

  it("shows session details and RolePicker when preview resolves", () => {
    previewState.value = {
      ...previewState.value,
      previewSession: createTestRemoteSession({
        gameAreaLabel: "Sydney, Australia",
        gameSize: "medium",
        memberRoles: {},
      }),
    };

    renderJoin();
    fireEvent.change(screen.getByLabelText(/session code/i), { target: { value: "ABCD" } });

    expect(screen.getByText("Classic Jet Lag")).toBeInTheDocument();
    expect(screen.getByText(/Location: Sydney, Australia/)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /Player side/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^join session$/i })).toBeDisabled();
  });

  it("enables Join after a role is chosen", () => {
    previewState.value = {
      ...previewState.value,
      previewSession: createTestRemoteSession({ memberRoles: {} }),
    };

    renderJoin();
    fireEvent.change(screen.getByLabelText(/session code/i), { target: { value: "ABCD" } });
    fireEvent.click(screen.getByRole("radio", { name: /^Seeker\./i }));

    expect(screen.getByRole("button", { name: /^join session$/i })).not.toBeDisabled();
    expect(screen.queryByLabelText(/role code/i)).not.toBeInTheDocument();
  });

  it("hides role code until a side is chosen even when seeker is occupied", () => {
    previewState.value = {
      ...previewState.value,
      previewSession: createTestRemoteSession({ memberRoles: { host: "seeker" } }),
    };

    renderJoin();
    fireEvent.change(screen.getByLabelText(/session code/i), { target: { value: "ABCD" } });

    expect(screen.queryByLabelText(/role code/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /request access/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /^Seeker\./i }));

    expect(screen.getByLabelText(/role code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request access/i })).toBeInTheDocument();
  });

  it("asks for a teammate's code when the chosen side is occupied", () => {
    previewState.value = {
      ...previewState.value,
      previewSession: createTestRemoteSession({ memberRoles: { leader: "hider" } }),
    };

    renderJoin();
    fireEvent.change(screen.getByLabelText(/session code/i), { target: { value: "ABCD" } });
    fireEvent.click(screen.getByRole("radio", { name: /^Hider\./i }));

    expect(screen.getByText("Ask a teammate on that side for the role code.")).toBeInTheDocument();
    expect(screen.queryByText(/Leave it blank only if/)).not.toBeInTheDocument();
  });

  it("keeps Observer in the same row as Seeker and Hider", () => {
    previewState.value = {
      ...previewState.value,
      previewSession: createTestRemoteSession({ memberRoles: {} }),
    };

    renderJoin();
    fireEvent.change(screen.getByLabelText(/session code/i), { target: { value: "ABCD" } });

    const group = screen.getByRole("radiogroup", { name: /Player side/i });
    expect(screen.getByRole("radio", { name: /^Seeker\./i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Hider\./i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Observer\./i })).toBeInTheDocument();
    expect(group.className).toContain("grid-cols-3");
  });

  it("does not show role code when occupancy is unknown", () => {
    previewState.value = {
      ...previewState.value,
      previewSession: createTestRemoteSession({
        gameArea: JOIN_PREVIEW_PLACEHOLDER_AREA,
        memberRoles: {},
      }),
    };

    renderJoin();
    fireEvent.change(screen.getByLabelText(/session code/i), { target: { value: "ABCD" } });
    fireEvent.click(screen.getByRole("radio", { name: /^Seeker\./i }));

    expect(screen.queryByLabelText(/role code/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Leave it blank only if/)).not.toBeInTheDocument();
  });

  it("shows Castle Siege details and seat picker without Continue", () => {
    previewState.value = {
      ...previewState.value,
      previewSession: createTestRemoteSession({
        mode: "castleSiege",
        seriesLength: 3,
      }),
    };

    renderJoin();
    fireEvent.change(screen.getByLabelText(/session code/i), { target: { value: "ABCD" } });

    expect(screen.getByText("Castle Siege")).toBeInTheDocument();
    expect(screen.getByText("Best of 3")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /Castle Siege seat/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^continue$/i })).not.toBeInTheDocument();
  });

  it("shows Castle Siege seat picker for code-record-shaped preview", () => {
    previewState.value = {
      ...previewState.value,
      previewSession: buildJoinPreviewSession("sess-1", "ABCD", {
        hostUid: "host",
        mode: "castleSiege",
        seriesLength: 3,
      }),
    };

    renderJoin();
    fireEvent.change(screen.getByLabelText(/session code/i), { target: { value: "ABCD" } });

    expect(screen.getByText("Castle Siege")).toBeInTheDocument();
    expect(screen.getByText("Best of 3")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /Castle Siege seat/i })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: /Player side/i })).not.toBeInTheDocument();
  });
});
