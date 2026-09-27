import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { cueExcludesCostTokens } from "@/domain/ask/askHudModes";
import { jetlagTheme } from "@/theme/theme";
import { AskModeCueTicker } from "./AskModeCueTicker";

beforeEach(() => {
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

function renderCue(cue: string) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <AskModeCueTicker cue={cue} />
    </MantineProvider>,
  );
}

describe("AskModeCueTicker", () => {
  it("renders verb-only cue and is not a button", () => {
    renderCue("TAP MAP TO SET CENTER");

    const cue = screen.getByTestId("ask-mode-cue-ticker");
    expect(cue).toHaveTextContent("TAP MAP TO SET CENTER");
    expect(cue.tagName).not.toBe("BUTTON");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(cueExcludesCostTokens(cue.textContent ?? "")).toBe(true);
  });

  it("excludes DnPm / cost tokens from the cue surface", () => {
    renderCue("PICK CATEGORY");

    const text = screen.getByTestId("ask-mode-cue-ticker").textContent ?? "";
    expect(text).not.toMatch(/\bD\d/i);
    expect(text).not.toContain("·");
    expect(cueExcludesCostTokens(text)).toBe(true);
  });

  it("mounts Mantine cue chrome", () => {
    renderCue("PICK CATEGORY");

    const cue = screen.getByTestId("ask-mode-cue-ticker");
    expect(cue).toHaveTextContent("PICK CATEGORY");
  });
});
