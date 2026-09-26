import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AskInlineError, askInlineErrorCopy } from "./AskInlineError";

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
  it("renders a soft callout", () => {
    render(
      <AskInlineError message="Timed out while waiting for your location." />,
    );
    const alert = screen.getByTestId("ask-inline-error");
    expect(alert.getAttribute("data-player-ux-world")).toBe("mantine");
    expect(screen.getByText("Location timed out")).toBeInTheDocument();
  });
});
