import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Terms } from "./Terms";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { renderWithRouter } from "../test/renderWithRouter";
import { RouteTransitionTestProvider } from "../test/RouteTransitionTestProvider";

const { mockUsePlayerUiMantine } = vi.hoisted(() => ({
  mockUsePlayerUiMantine: vi.fn(() => false),
}));

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
}));

beforeEach(() => {
  mockUsePlayerUiMantine.mockReturnValue(false);
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

describe("Terms gate", () => {
  it("renders Legacy LegalDocumentPage when flag is off", () => {
    renderWithRouter(<Terms />);
    expect(
      screen.getByRole("heading", { name: "Terms of Service" }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-player-ux-world="mantine"]')).toBeNull();
  });

  it("renders Mantine shell when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <RouteTransitionTestProvider>
            <Terms />
          </RouteTransitionTestProvider>
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Terms of Service" }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-player-ux-world="mantine"]'),
    ).toBeTruthy();
  });
});
