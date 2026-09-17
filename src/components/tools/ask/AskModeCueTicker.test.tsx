import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { cueExcludesCostTokens } from "@/domain/ask/askHudModes";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { AskModeCueTicker } from "./AskModeCueTicker";

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
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

describe("AskModeCueTicker", () => {
  it("renders verb-only cue and is not a button", () => {
    render(<AskModeCueTicker cue="TAP MAP TO SET CENTER" />);

    const cue = screen.getByTestId("ask-mode-cue-ticker");
    expect(cue).toHaveTextContent("TAP MAP TO SET CENTER");
    expect(cue.tagName).not.toBe("BUTTON");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(cueExcludesCostTokens(cue.textContent ?? "")).toBe(true);
  });

  it("excludes DnPm / cost tokens from the cue surface", () => {
    render(<AskModeCueTicker cue="PICK CATEGORY" />);

    const text = screen.getByTestId("ask-mode-cue-ticker").textContent ?? "";
    expect(text).not.toMatch(/\bD\d/i);
    expect(text).not.toContain("·");
    expect(cueExcludesCostTokens(text)).toBe(true);
  });

  it("mounts Mantine cue chrome when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <AskModeCueTicker cue="PICK CATEGORY" />
      </MantineProvider>,
    );

    const cue = screen.getByTestId("ask-mode-cue-ticker");
    expect(cue.getAttribute("data-player-ux-world")).toBe("mantine");
    expect(cue).toHaveTextContent("PICK CATEGORY");
  });
});
