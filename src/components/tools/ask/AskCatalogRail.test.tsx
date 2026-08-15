import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AskCatalogRail } from "./AskCatalogRail";

const ROWS = [
  { id: "transit", label: "Transit stop" },
  { id: "park", label: "Park" },
  { id: "museum", label: "Museum" },
] as const;

describe("AskCatalogRail", () => {
  it("advances via row select and has no CONTINUE sibling control", () => {
    const onSelect = vi.fn();
    render(
      <AskCatalogRail
        rows={ROWS}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /continue/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Transit stop" }));
    expect(onSelect).toHaveBeenCalledWith("transit");
  });

  it("marks the selected row without requiring a second CTA", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <AskCatalogRail
        rows={ROWS}
        selectedId="park"
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole("button", { name: "Park" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: /continue/i }),
    ).not.toBeInTheDocument();
    // No sibling CONTINUE strip under the rail.
    expect(
      container.querySelector("[data-testid='ask-commit-strip']"),
    ).not.toBeInTheDocument();
  });
});
