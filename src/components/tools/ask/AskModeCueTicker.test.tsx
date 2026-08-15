import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { cueExcludesCostTokens } from "@/domain/ask/askHudModes";
import { AskModeCueTicker } from "./AskModeCueTicker";

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
    // Component must never be fed cost in cue; assert rendered text stays clean.
    render(<AskModeCueTicker cue="PICK CATEGORY" />);

    const text = screen.getByTestId("ask-mode-cue-ticker").textContent ?? "";
    expect(text).not.toMatch(/\bD\d/i);
    expect(text).not.toContain("·");
    expect(cueExcludesCostTokens(text)).toBe(true);
  });
});
