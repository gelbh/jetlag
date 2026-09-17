import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { ChoiceButton } from "./ChoiceButton";

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

describe("ChoiceButton", () => {
  it("keeps Survey button path when flag is off", () => {
    render(
      <ChoiceButton selected activeClassName="bg-flag text-flag-ink">
        Match
      </ChoiceButton>,
    );
    const button = screen.getByRole("button", { name: "Match" });
    expect(button.getAttribute("data-player-ux-world")).toBeNull();
    expect(button).toHaveClass("bg-flag");
  });

  it("mounts Mantine chip when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    const onClick = vi.fn();
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <ChoiceButton selected onClick={onClick}>
          Match
        </ChoiceButton>
      </MantineProvider>,
    );
    const button = screen.getByRole("button", { name: "Match" });
    expect(button.getAttribute("data-player-ux-world")).toBe("mantine");
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
