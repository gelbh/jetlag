import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JoinMantine } from "./JoinMantine";
import { jetlagMantineTheme } from "@/theme/mantineTheme";

vi.mock("@/hooks/navigation/useAppNavigate", () => ({
  useAppNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/session/useJoinSessionPreview", () => ({
  useJoinSessionPreview: () => ({
    previewSession: null,
    previewPremium: false,
    lookupLoading: false,
    existingRole: null,
  }),
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureFreshAnonymousUser: vi.fn(),
}));

beforeEach(() => {
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

describe("JoinMantine", () => {
  it("renders session code field and Join submit control", () => {
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <JoinMantine />
        </MemoryRouter>
      </MantineProvider>,
    );

    expect(screen.getByLabelText(/^code$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /join session/i }),
    ).toBeInTheDocument();
  });
});
