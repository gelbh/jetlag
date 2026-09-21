import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AskInlineError, askInlineErrorCopy } from "./AskInlineError";

const { mockUsePlayerUiMantine } = vi.hoisted(() => ({
  mockUsePlayerUiMantine: vi.fn(() => false),
}));

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
}));

beforeEach(() => {
  mockUsePlayerUiMantine.mockReturnValue(false);
});

describe("askInlineErrorCopy", () => {
  it("rewrites GPS timeout into actionable copy", () => {
    const copy = askInlineErrorCopy(
      "Timed out while waiting for your location.",
    );
    expect(copy.title).toBe("Location timed out");
    expect(copy.detail.toLowerCase()).toContain("tap the map");
  });
});

describe("AskInlineError", () => {
  it("renders a soft callout under Mantine", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <AskInlineError message="Timed out while waiting for your location." />,
    );
    const alert = screen.getByTestId("ask-inline-error");
    expect(alert.getAttribute("data-player-ux-world")).toBe("mantine");
    expect(screen.getByText("Location timed out")).toBeInTheDocument();
  });
});
