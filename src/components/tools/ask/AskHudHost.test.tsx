import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { AskHudHost } from "./AskHudHost";

const { mockUsePlayerUiMantine } = vi.hoisted(() => ({
  mockUsePlayerUiMantine: vi.fn(() => false),
}));

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
}));

const hostProps = {
  cue: "Pick a direction",
  toolLabel: "Radar",
  costLabel: "1 token",
  canCommit: true,
  commitLabel: "Send",
  onCommit: vi.fn(),
};

beforeEach(() => {
  mockUsePlayerUiMantine.mockReturnValue(false);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

describe("AskHudHost Mantine gate", () => {
  it("keeps Survey ask HUD when flag is off", () => {
    const { container } = render(<AskHudHost {...hostProps} />);

    const host = screen.getByTestId("ask-hud-host");
    expect(host).toBeInTheDocument();
    expect(host.getAttribute("data-survey")).toBe("true");
    expect(host.classList.contains("ask-hud-host")).toBe(true);
    expect(container.querySelector('[data-testid="ask-hud-host-mantine"]')).toBeNull();
    expect(container.querySelector('[data-player-ux-world="mantine"]')).toBeNull();
  });

  it("mounts Mantine ask HUD chrome when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    const { container } = render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <AskHudHost {...hostProps} />
      </MantineProvider>,
    );

    const host = screen.getByTestId("ask-hud-host");
    expect(host.getAttribute("data-player-ux-world")).toBe("mantine");
    expect(host.classList.contains("ask-hud-host")).toBe(true);
    expect(host.getAttribute("data-survey")).toBeNull();
    expect(container.querySelector('[data-testid="ask-hud-host-mantine"]')).toBeNull();
  });
});
