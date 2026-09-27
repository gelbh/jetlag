import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Stats } from "./Stats";
import { jetlagTheme } from "@/theme/theme";

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => false,
}));

vi.mock("@/hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => ({
    user: null,
    isPermanent: false,
    authReady: true,
  }),
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

describe("Stats", () => {
  it("renders Mantine shell", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <Stats />
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(screen.getByRole("heading", { name: "Stats" })).toBeInTheDocument();
  });
});
