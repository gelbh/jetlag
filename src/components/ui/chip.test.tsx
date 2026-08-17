import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Chip, chipVariants } from "./chip";

describe("Chip", () => {
  it("maps default / flag / ghost variants to Survey class tokens", () => {
    expect(chipVariants({ variant: "default" })).toContain("rounded-full");
    expect(chipVariants({ variant: "default" })).toContain("bg-canvas");
    expect(chipVariants({ variant: "flag" })).toContain("bg-flag");
    expect(chipVariants({ variant: "ghost" })).toContain("text-field-ink-muted");
  });

  it("maps densify size for dock chrome", () => {
    expect(chipVariants({ size: "densify" })).toContain("h-6");
  });

  it("renders a chip button with variant classes", () => {
    render(
      <Chip variant="flag" size="densify">
        Train
      </Chip>,
    );
    const node = screen.getByRole("button", { name: "Train" });
    expect(node).toHaveAttribute("data-slot", "chip");
    expect(node).toHaveAttribute("type", "button");
    expect(node.className).toContain("bg-flag");
    expect(node.className).toContain("h-6");
  });

  it("forwards asChild onto an anchor", () => {
    render(
      <Chip asChild variant="flag">
        <a href="/train">Train link</a>
      </Chip>,
    );
    const node = screen.getByRole("link", { name: "Train link" });
    expect(node).toHaveAttribute("href", "/train");
    expect(node).toHaveAttribute("data-slot", "chip");
    expect(node.className).toContain("bg-flag");
  });

  it("preserves an explicit submit type", () => {
    render(<Chip type="submit">Save filter</Chip>);
    expect(
      screen.getByRole("button", { name: "Save filter" }),
    ).toHaveAttribute("type", "submit");
  });

  it("disables slotted anchors without native disabled", () => {
    const parentClick = vi.fn();
    const childClick = vi.fn();
    render(
      <Chip asChild disabled onClick={parentClick}>
        <a href="/train" tabIndex={0} onClick={childClick}>
          Locked
        </a>
      </Chip>,
    );
    const node = screen.getByRole("link", { name: "Locked" });
    expect(node).toHaveAttribute("aria-disabled", "true");
    expect(node).toHaveAttribute("tabindex", "-1");
    expect(node).not.toHaveAttribute("disabled");
    fireEvent.click(node);
    expect(parentClick).not.toHaveBeenCalled();
    expect(childClick).not.toHaveBeenCalled();
    for (const key of ["Enter", " "] as const) {
      fireEvent.keyDown(node, { key });
      expect(parentClick).not.toHaveBeenCalled();
      expect(childClick).not.toHaveBeenCalled();
    }
  });
});
